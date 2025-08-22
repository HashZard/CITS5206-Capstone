from typing import Tuple, List, Dict, Any
from app.models.dto import QueryIn
from app.services import sql_service

class Orchestrator:
    def handle_query(self, qin: QueryIn) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        sql, params = sql_service.build_select_sql(
            qin.table, qin.columns, qin.filters, qin.limit, qin.offset
        )
        rows, meta = sql_service.execute(sql, params)
        meta = {**meta, "limit": qin.limit, "offset": qin.offset}
        return rows, meta

    def preview_sql(self, qin: QueryIn) -> str:
        sql, _ = sql_service.build_select_sql(
            qin.table, qin.columns, qin.filters, qin.limit, qin.offset
        )
        return sql

