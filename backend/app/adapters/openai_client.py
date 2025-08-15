# -*- coding: utf-8 -*-
# OpenAI 客户端封装（占位）
import httpx

class OpenAIClient:
    def __init__(self, api_key: str | None, base_url: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self.base_url = base_url

    async def chat(self, messages: list[dict], model: str) -> dict:
        if not self.api_key:
            return {"error": "OPENAI_API_KEY 未设置"}
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {"model": model, "messages": messages}
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            r.raise_for_status()
            return r.json()
