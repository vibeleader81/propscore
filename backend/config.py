from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    GOOGLE_MAPS_API_KEY: str
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]
    MORTGAGE_RATE: float = 0.065
    DOMAIN_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None


settings = Settings()
