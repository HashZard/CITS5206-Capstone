# -*- coding: utf-8 -*-
# 主应用入口：装配 FastAPI 与路由
from fastapi import FastAPI
from app.api.query import router as query_router
from app.api.health import router as health_router

app = FastAPI(title="Geo LLM API", version="1.0.0")

# 健康检查
app.include_router(health_router, tags=["health"])
# 正式 API 路径（不区分 v1）
app.include_router(query_router, prefix="/api", tags=["query"])
