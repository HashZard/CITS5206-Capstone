from abc import ABC, abstractmethod
from functools import wraps
from typing import Dict, Any, List
from dataclasses import dataclass
import openai
from google import genai
import logging
import asyncio

logger = logging.getLogger(__name__)

"""
LLM Service
This service is used to generate text using the LLM model for backend service.

Usage:
    from app.extensions import llm_service

    response = llm_service.generate(
        message="Hello",
        model="gpt-4o-mini",
        provider="openai",
        temperature=0.7,
        system_prompt="You are a helpful assistant.",
        max_tokens=1000,
    )
"""


@dataclass
class LLMRequest:
    """LLM Request Data Structure"""

    message: str
    model: str | None = None
    temperature: float | None = None
    system_prompt: str | None = None
    max_tokens: int | None = 1000


@dataclass
class LLMResponse:
    """LLM Response Data Structure"""

    content: str
    model_used: str
    tokens_used: int | None = None


def async_to_sync(func):
    """Async function to sync decorator"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            # If there is a running event loop, create a new event loop
            import threading

            result = {}
            exception = {}

            def run_in_thread():
                new_loop = asyncio.new_event_loop()
                try:
                    result["value"] = new_loop.run_until_complete(func(*args, **kwargs))
                except Exception as e:
                    exception["value"] = e
                finally:
                    new_loop.close()

            thread = threading.Thread(target=run_in_thread)
            thread.start()
            thread.join()

            if "value" in exception:
                raise exception["value"]
            return result["value"]
        else:
            return loop.run_until_complete(func(*args, **kwargs))

    return wrapper


class LLMProvider(ABC):
    """LLM Provider Abstract Base Class"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @abstractmethod
    async def generate(self, request: LLMRequest) -> LLMResponse:
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI Provider Implementation"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = openai.AsyncOpenAI(api_key=config["api_key"])

    async def generate(self, request: LLMRequest) -> LLMResponse:
        try:
            messages = []
            if request.system_prompt:
                messages.append({"role": "developer", "content": request.system_prompt})
            messages.append({"role": "user", "content": request.message})

            response = await self.client.responses.create(
                input=messages,
                model=request.model or self.config["default_model"],
                temperature=request.temperature if request.temperature else None,
                max_output_tokens=request.max_tokens,
            )

            return LLMResponse(
                content=response.output_text,
                model_used=response.model,
                tokens_used=response.usage.total_tokens if response.usage else None,
            )
        except Exception as e:
            logger.error(f"OpenAI API Error: {e}")
            raise


class GeminiProvider(LLMProvider):
    """Gemini Provider Implementation"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = genai.Client(api_key=str(config["api_key"]))

    async def generate(self, request: LLMRequest) -> LLMResponse:
        try:
            # Debug print: full request
            print("\n===== LLM Request (Gemini) =====")
            print(
                {
                    "model": request.model or self.config.get("default_model"),
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
                    "system_prompt": request.system_prompt,
                    "prompt": request.message,
                }
            )
            response = await self.client.models.generate_content(
                model=request.model,
                contents=request.message,
            )
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            raise

        # Debug print: raw response
        try:
            print("===== LLM Response (Gemini) =====")
            print(response)
            print("===== LLM Response Content =====")
            print(getattr(response, "content", None))
        except Exception:
            pass

        return LLMResponse(
            content=getattr(response, "content", ""),
            model_used=response.model,
            tokens_used=response.usage.total_tokens if response.usage else None,
        )


class LLMService:
    """LLM Service Main Class"""

    def __init__(self, app=None):
        self.providers = {}
        self.default_provider = None
        if app:
            self.init_app(app)

    def init_app(self, app):
        """Initialize Flask Application"""
        if "llm_service" in app.extensions:
            raise RuntimeError(
                "A 'LLMService' instance has already been registered on this Flask app."
                " Import and use that instance instead."
            )

        app.extensions["llm_service"] = self

        config = app.config.get("LLM_CONFIG", {})

        # Initialize Providers
        for provider_name, provider_config in config.items():
            if provider_name == "openai":
                self.providers[provider_name] = OpenAIProvider(provider_config)
            elif provider_name == "gemini":
                self.providers[provider_name] = GeminiProvider(provider_config)

        # Set Default Provider
        self.default_provider = config.get(
            "default", list(self.providers.keys())[0] if self.providers else None
        )

    async def generate_async(
        self, message: str, provider: str | None = None, **kwargs
    ) -> LLMResponse:
        """Generate Text"""
        provider = provider or self.default_provider

        if provider not in self.providers:
            raise ValueError(f"Unsupported Provider: {provider}")

        request = LLMRequest(message=message, **kwargs)
        return await self.providers[provider].generate(request)

    @async_to_sync
    async def generate(self, *args, **kwargs) -> LLMResponse:
        """Sync generate text (internal conversion to async call)"""
        return await self.generate_async(*args, **kwargs)

    def list_providers(self) -> List[str]:
        """List Available Providers"""
        return list(self.providers.keys())
