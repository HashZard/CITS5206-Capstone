from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()


def init_extensions(app):
    # SQLAlchemy
    db.init_app(app)
    # CORS（按需限制 origins）
    CORS(app, resources={r"/api/*": {"origins": "*"}})
