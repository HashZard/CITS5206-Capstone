from flask import Flask
from config import config
from .extensions import init_extensions

from app.services.llm_service import LLMService


def create_app(config_name):
    """Application Factory Function"""
    app = Flask(__name__)

    app.config.from_object(config[config_name])

    # Initialize extensions using unified function
    init_extensions(app)

    # Register Blueprints
    from .api.schema import schema_bp

    app.register_blueprint(schema_bp, url_prefix="/api/schema")

    from .api.query import query_bp

    app.register_blueprint(query_bp, url_prefix="/api")

    from .api.llm_test import llm_bp

    app.register_blueprint(llm_bp, url_prefix="/api/llm")

    return app
