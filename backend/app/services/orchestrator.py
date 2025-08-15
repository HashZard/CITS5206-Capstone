# -*- coding: utf-8 -*-
# 编排服务（Demo 版）：模拟参数解析与参数化 SQL 生成
from app.models.dto import QueryIn, QueryOut

class Orchestrator:
    async def handle_query_demo(self, qin: QueryIn) -> QueryOut:
        # 1) 参数解析：从 extras 读取（若不存在给出默认值，仅用于演示）
        params = qin.extras or {}
        radius = params.get("radius_m", 2000)
        place = params.get("place_name", "Perth")

        # 2) 构造参数化 SQL（PostGIS DWithin，用 geography 以米为单位）
        sql = (
            "SELECT r.name, ST_AsGeoJSON(r.geom) AS geometry "
            "FROM rivers r "
            "WHERE ST_DWithin(r.geom::geography, (SELECT geom::geography FROM places WHERE name = $1), $2) "
            "LIMIT 500"
        )
        # 3) 返回结构化结果（此处以空 GeoJSON 演示）
        return QueryOut(
            sql=sql,
            params=[place, radius],
            param_types=["text", "int"],
            result={"type": "FeatureCollection", "features": []}
        )

# 依赖工厂：此处简单返回实例，生产可接入依赖注入容器
def get_orchestrator() -> Orchestrator:
    return Orchestrator()
