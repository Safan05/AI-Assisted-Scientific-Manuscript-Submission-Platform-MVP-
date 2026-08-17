# backend/app/services/llm/anthropic_service.py
"""Anthropic Claude LLM service implementation."""

import json
import logging
from typing import Any, Optional, Type

import anthropic
from pydantic import BaseModel

from app.core.config import settings
from app.services.llm.base import LLMService

logger = logging.getLogger(__name__)


class AnthropicLLMService(LLMService):
    """Anthropic Claude implementation of LLMService."""

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.LLM_API_KEY)
        # Default to a capable Haiku/Sonnet model; override via LLM_DEFAULT_MODEL
        self.default_model = settings.LLM_DEFAULT_MODEL or "claude-3-5-sonnet-latest"

    async def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        kwargs: dict[str, Any] = {
            "model": self.default_model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system

        response = await self.client.messages.create(**kwargs)
        return response.content[0].text if response.content else ""

    async def structured_extract(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system: Optional[str] = None,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        system_msg = system or (
            "You are a precise metadata extraction engine. "
            "Extract the requested fields and return ONLY valid JSON matching the schema. "
            "If a field cannot be found, use null. Never add commentary outside the JSON."
        )

        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        full_prompt = (
            f"Extract the following information from this scientific manuscript and return a JSON object "
            f"matching this exact schema:\n\n{schema_json}\n\n---\n\n{prompt}"
        )

        try:
            raw = await self.complete(full_prompt, system=system_msg, temperature=temperature)
            start = raw.index("{")
            end = raw.rindex("}") + 1
            return json.loads(raw[start:end])
        except Exception as e:
            logger.error("Anthropic structured extract failed: %s", e)
            return {}
