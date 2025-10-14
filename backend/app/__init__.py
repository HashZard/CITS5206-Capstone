from flask import Flask

from app.services.llm_service import LLMService
from config import config

from .extensions import init_extensions


def create_app(config_name):
    """Application factory function."""
    app = Flask(__name__)

    app.config.from_object(config[config_name])

    # Initialize shared extensions.
    init_extensions(app)

    # Register blueprints.
    from .api.schema import schema_bp

    app.register_blueprint(schema_bp, url_prefix="/api/schema")

    from .api.query import query_bp

    app.register_blueprint(query_bp, url_prefix="/api")

    from .api.llm_test import llm_bp

    app.register_blueprint(llm_bp, url_prefix="/api/llm")

    return app
