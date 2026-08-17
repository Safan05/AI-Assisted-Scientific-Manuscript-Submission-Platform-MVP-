# backend/app/services/llm/openai_service.py
"""OpenAI LLM service implementation."""

import json
import logging
from typing import Any, Optional, Type

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings
from app.services.llm.base import LLMService

logger = logging.getLogger(__name__)


class OpenAILLMService(LLMService):
    """OpenAI API implementation of LLMService."""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL or None,
        )
        self.default_model = settings.LLM_DEFAULT_MODEL

    async def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.default_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

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

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": full_prompt},
        ]

        try:
            # Use structured outputs if the model supports it (gpt-4o series)
            response = await self.client.chat.completions.create(
                model=self.default_model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
                max_tokens=4096,
            )
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:
            logger.warning("OpenAI structured extract failed: %s — falling back to plain completion", e)
            raw = await self.complete(full_prompt, system=system_msg, temperature=temperature)
            # Try to parse any JSON block in the response
            try:
                start = raw.index("{")
                end = raw.rindex("}") + 1
                return json.loads(raw[start:end])
            except (ValueError, json.JSONDecodeError):
                logger.error("Could not parse JSON from LLM response: %s", raw[:200])
                return {}
