# -*- coding: utf-8 -*-
# 健康检查路由
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok"}
