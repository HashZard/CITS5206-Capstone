from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import openai
from google import genai
import logging

logger = logging.getLogger(__name__)

"""
LLM Service
This service is used to generate text using the LLM model for backend service.

Usage:
    from flask import current_app

    response = current_app.llm_service.generate(
        prompt="Hello",
        model="gpt-4o-mini",
        provider="openai",
        temperature=0.7,
        system_prompt="You are a helpful assistant.",
    )
"""


@dataclass
class LLMRequest:
    """LLM Request Data Structure"""

    prompt: str
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    system_prompt: Optional[str] = None


@dataclass
class LLMResponse:
    """LLM Response Data Structure"""

    content: str
    model_used: str
    tokens_used: Optional[int] = None


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
                messages.append({"role": "system", "content": request.system_prompt})
            messages.append({"role": "user", "content": request.prompt})

            response = await self.client.chat.completions.create(
                model=request.model or self.config["default_model"],
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )

            return LLMResponse(
                content=response.choices[0].message.content,
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
            response = await self.client.models.generate_content(
                model=request.model,
                contents=request.prompt,
            )
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            raise

        return LLMResponse(
            content=response.content,
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

        # Bind to app
        app.llm_service = self

    async def generate(
        self, prompt: str, provider: Optional[str] = None, **kwargs
    ) -> LLMResponse:
        """Generate Text"""
        provider = provider or self.default_provider

        if provider not in self.providers:
            raise ValueError(f"Unsupported Provider: {provider}")

        request = LLMRequest(prompt=prompt, **kwargs)
        return await self.providers[provider].generate(request)

    def list_providers(self) -> List[str]:
        """List Available Providers"""
        return list(self.providers.keys())
