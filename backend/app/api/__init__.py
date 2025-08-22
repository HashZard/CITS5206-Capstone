from .schema import schema_bp

def register_api(app):
    from .health import health_bp
    from .query import query_bp
    app.register_blueprint(health_bp)
    app.register_blueprint(schema_bp)   
    app.register_blueprint(query_bp)
