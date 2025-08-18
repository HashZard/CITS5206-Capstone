# -*- coding: utf-8 -*-
# 主应用入口：装配 Flask 与路由
from flask import Flask
from app.api.query import bp as query_bp
from app.api.health import bp as health_bp

app = Flask(__name__)

# 注册 Blueprint 路由
app.register_blueprint(health_bp, url_prefix='/api')
app.register_blueprint(query_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
