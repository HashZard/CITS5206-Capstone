from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from app.services.llm_service import LLMService

db = SQLAlchemy()
llm_service = LLMService()


def init_extensions(app):
    # Initialize SQLAlchemy.
    db.init_app(app)
    # Initialize the shared LLM service.
    llm_service.init_app(app)
    # Enable CORS for API routes.
    CORS(app, resources={r"/api/*": {"origins": "*"}})
