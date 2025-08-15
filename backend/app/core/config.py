# -*- coding: utf-8 -*-
# 配置中心：使用 pydantic-settings 从 .env 读取配置
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Geo LLM API"
    app_env: str = "dev"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    postgres_dsn: str = "postgresql://readonly:readonly@localhost:5432/postgis"
    redis_url: str = "redis://localhost:6379/0"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
