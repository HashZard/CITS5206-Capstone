# -*- coding: utf-8 -*-
# LLM 服务占位：正式实现中应补充 select_* 与 generate_sql 等方法
from typing import Any

class LLMService:
    async def generate_sql(self, prompt: dict) -> dict[str, Any]:
        # 占位返回，便于单元测试
        return {"sql": "SELECT 1", "params": [], "param_types": []}
