# backend/app/services/llm/factory.py
"""LLM service factory — select provider via LLM_PROVIDER env var."""

from app.core.config import settings
from app.services.llm.base import LLMService


def get_llm_service() -> LLMService:
    """
    Return the configured LLM service instance.
    Set LLM_PROVIDER in .env to switch providers without code changes.

    Supported values:
      - "openai"     → OpenAILLMService (default)
      - "anthropic"  → AnthropicLLMService
    """
    provider = settings.LLM_PROVIDER.lower()

    if provider == "openai":
        from app.services.llm.openai_service import OpenAILLMService
        return OpenAILLMService()
    elif provider == "anthropic":
        from app.services.llm.anthropic_service import AnthropicLLMService
        return AnthropicLLMService()
    else:
        raise ValueError(
            f"Unknown LLM provider: '{provider}'. "
            "Set LLM_PROVIDER to 'openai' or 'anthropic' in your .env file."
        )
