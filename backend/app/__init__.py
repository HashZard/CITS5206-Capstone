from flask import Flask
from .extensions import db
from .api.health import health_bp
from .api.query import query_bp
from config import config


def create_app(config_name):
    """应用工厂函数"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(query_bp, url_prefix="/api")

    return app
