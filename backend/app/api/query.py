# -*- coding: utf-8 -*-
# 查询相关路由（Demo：演示参数化 SQL 生成）
from fastapi import APIRouter, Depends
from app.models.dto import QueryIn, QueryOut
from app.services.orchestrator import Orchestrator, get_orchestrator

router = APIRouter()

@router.post("/query/demo", response_model=QueryOut)
async def query_demo(qin: QueryIn, svc: Orchestrator = Depends(get_orchestrator)):
    """
    演示路由：模拟 L1→L2→L3→Detail 的选择过程，并返回参数化 SQL。
    注意：此 Demo 不依赖真实 LLM 调用与数据库执行，仅用于前后端联调演示。
    """
    return await svc.handle_query_demo(qin)
