"""
LunaGuard backend configuration.

Reads settings from environment variables (via .env file or system env).
Uses Pydantic Settings v2 for type-safe config.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration for LunaGuard backend.

    Values are read from environment variables.  See .env.example for
    documentation of each variable.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    lunaguard_env: str = Field(default="development", alias="LUNAGUARD_ENV")
    log_level: str = Field(default="info", alias="LOG_LEVEL")

    # CORS
    cors_origins: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
        description="Comma-separated list of allowed origins",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a Python list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # External knowledge + authentication
    nasa_api_key: str = Field(default="DEMO_KEY", alias="NASA_API_KEY")
    google_client_id: Optional[str] = Field(default=None, alias="GOOGLE_CLIENT_ID")

    # IBM watsonx / Granite (all optional)
    watsonx_api_key: Optional[str] = Field(default=None, alias="WATSONX_API_KEY")
    watsonx_project_id: Optional[str] = Field(default=None, alias="WATSONX_PROJECT_ID")
    watsonx_url: str = Field(
        default="https://us-south.ml.cloud.ibm.com",
        alias="WATSONX_URL",
    )
    watsonx_model_id: str = Field(
        default="ibm/granite-3-3-8b-instruct",
        alias="WATSONX_MODEL_ID",
    )

    @property
    def watsonx_enabled(self) -> bool:
        """True only when both API key and project ID are set."""
        return bool(self.watsonx_api_key and self.watsonx_project_id)

    # Optional IBM Watson Speech services. The browser has a graceful local
    # speech fallback, but these settings enable server-side IBM speech I/O.
    watson_tts_api_key: Optional[str] = Field(default=None, alias="WATSON_TTS_API_KEY")
    watson_tts_url: Optional[str] = Field(default=None, alias="WATSON_TTS_URL")
    watson_stt_api_key: Optional[str] = Field(default=None, alias="WATSON_STT_API_KEY")
    watson_stt_url: Optional[str] = Field(default=None, alias="WATSON_STT_URL")

    @property
    def watson_tts_enabled(self) -> bool:
        return bool(self.watson_tts_api_key and self.watson_tts_url)

    @property
    def watson_stt_enabled(self) -> bool:
        return bool(self.watson_stt_api_key and self.watson_stt_url)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton Settings instance (cached after first call)."""
    return Settings()
