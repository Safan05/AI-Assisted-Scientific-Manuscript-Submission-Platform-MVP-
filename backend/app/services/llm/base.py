# backend/app/services/llm/base.py
"""Abstract LLM service interface."""

from abc import ABC, abstractmethod
from typing import Any, Optional, Type
from pydantic import BaseModel


class LLMService(ABC):
    """Unified interface for LLM providers (OpenAI, Anthropic, Ollama)."""

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        """Send a prompt and return the raw text completion."""
        ...

    @abstractmethod
    async def structured_extract(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system: Optional[str] = None,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        """
        Extract structured data from text using the given Pydantic schema.
        Returns a dict that can be passed to schema(**result).
        """
        ...
