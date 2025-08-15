# -*- coding: utf-8 -*-
# DTO：请求/响应模型定义（面向 API 契约）
from pydantic import BaseModel, Field
from typing import Any, Optional, List

class QueryIn(BaseModel):
    """
    输入：自然语言查询 + 可选参数（如半径、地名、limit）
    """
    query: str = Field(..., description="自然语言查询，例如 'rivers near Perth'")
    extras: Optional[dict] = Field(default=None, description="可选参数，如 radius_m, region_name, limit")
    session_id: Optional[str] = Field(default=None, description="会话标识")

class QueryOut(BaseModel):
    """
    输出：缺参提示 或 参数化 SQL + 结果（GeoJSON/表格）
    """
    missing_info: Optional[List[str]] = None
    sql: Optional[str] = None
    params: Optional[List[Any]] = None
    param_types: Optional[List[str]] = None
    result: Optional[dict] = None
