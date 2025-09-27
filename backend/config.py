import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

def _first_set(*keys, default=None):
    """Return the first non-empty env var among keys."""
    for k in keys:
        v = os.getenv(k)
        if v:
            return v
    return default

def _redact(url: str) -> str:
    """Hide password in a DB URL for safe logging."""
    try:
        p = urlparse(url)
        if p.password:
            netloc = p.hostname
            if p.username:
                netloc = f"{p.username}:***@{p.hostname}"
            if p.port:
                netloc += f":{p.port}"
            return p._replace(netloc=netloc).geturl()
    except Exception:
        pass
    return url

class Config:
    """Base configuration class"""

    SECRET_KEY = os.getenv("SECRET_KEY", "a-very-secret-key-that-should-be-changed")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Accept either SQLALCHEMY_DATABASE_URI or POSTGRES_DSN; fallback to local SQLite
    SQLALCHEMY_DATABASE_URI = _first_set(
        "SQLALCHEMY_DATABASE_URI",
        "POSTGRES_DSN",
        default="sqlite:///dev.db",
    )

    # LLM configuration
    LLM_CONFIG = {
        "default": "openai",
        "openai": {
            "api_key": os.getenv("OPENAI_API_KEY"),
            "default_model": os.getenv("OPENAI_DEFAULT_MODEL"),
        },
        "gemini": {
            "api_key": os.getenv("GEMINI_API_KEY"),
            "default_model": os.getenv("GEMINI_DEFAULT_MODEL"),
        },
    }

    @classmethod
    def log_effective(cls):
        print("== Flask Config ==")
        print("ENV:", os.getenv("FLASK_CONFIG", "development"))
        print("DB URI:", _redact(cls.SQLALCHEMY_DATABASE_URI))

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True  # echo SQL in console

config = {
    "development": DevelopmentConfig,
    "default": DevelopmentConfig,
}
