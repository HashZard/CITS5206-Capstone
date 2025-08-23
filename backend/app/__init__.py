from flask import Flask
from .extensions import init_extensions
from .api.query import query_bp
from .api.schema import schema_bp
from config import config


def create_app(config_name):
    """应用工厂函数"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions using unified function
    init_extensions(app)

    # Register Blueprints
    app.register_blueprint(schema_bp, url_prefix="/api/schema")
    app.register_blueprint(query_bp, url_prefix="/api")

    return app
