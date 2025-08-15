# -*- coding: utf-8 -*-
# SQL 执行服务（占位）：演示 asyncpg 的只读查询写法（未在 Demo 路由中调用）
import asyncpg
from typing import Any, List

class SQLService:
    def __init__(self, dsn: str):
        self._dsn = dsn
        self._pool = None

    async def init(self):
        if not self._pool:
            self._pool = await asyncpg.create_pool(dsn=self._dsn, min_size=1, max_size=5)

    async def fetch(self, sql: str, params: List[Any]):
        await self.init()
        async with self._pool.acquire() as conn:
            # 设置语句超时，避免长时间阻塞
            await conn.execute("SET LOCAL statement_timeout=8000;")
            rows = await conn.fetch(sql, *params)
            return [dict(r) for r in rows]
