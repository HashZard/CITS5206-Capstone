from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

from app.services.llm_service import LLMService

db = SQLAlchemy()
llm_service = LLMService()


def init_extensions(app):
    # SQLAlchemy
    db.init_app(app)
    # Initialize LLM Service
    llm_service.init_app(app)
    # CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
