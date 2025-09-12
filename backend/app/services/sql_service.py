from __future__ import annotations
import json
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Mapping, Tuple
from app.utils.geojson import rows_to_feature_collection
from sqlalchemy import text
from ..extensions import db
from app.models.dto import ALLOWED_TABLES
"""
This module provides a single-table SQL query service.

Interface function:
    run_sql(sql: str, params: dict | None = None) -> Dict[str, Any]

Return format:
    {
        "ok": bool,             
        "data": List[Dict],     
        "meta": Dict,           
        "error": str | None    
    }

Usage example:
    from backend.app.services import sql_service

    sql = "SELECT id, name FROM l1_category WHERE active = true LIMIT 5 OFFSET 0"
    resp = sql_service.run_sql(sql)

    if resp["ok"]:
        for row in resp["data"]:
            print(row)
    else:
        print("Query failed:", resp["error"])
"""


# Get the real column names
@lru_cache(maxsize=128)
def get_columns(table: str) -> Iterable[str]:
    """
    Read all the column names of a table, and the results will be cached by LRU
    For column verification of /tables interface and build_select_sql
    """
    if table not in ALLOWED_TABLES:
        # Be consistent with DTO's confession list
        raise ValueError(f"table '{table}' is not allowed")

    sql = """
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = :table
    ORDER BY ordinal_position
    """
    with db.engine.connect() as conn:
        rows = conn.execute(text(sql), {"table": table}).mappings().all()
    return tuple(r["column_name"] for r in rows)


# SQL execution and lightweight verification
def validate_sql(sql: str) -> None:
    """
    Lightweight SQL whitelist validation: 
    must start with SELECT and must not contain semicolons or dangerous keywords.
    Used only as a final safeguard (core security still relies on build_select_sql).
    """
    check = sql.strip().lower()
    if not check.startswith("select"):
        raise ValueError("only SELECT statements are allowed")
    # Prohibit multiple statements and dangerous keywords
    if ";" in check:
        raise ValueError("multiple statements are not allowed")
    banned = [
        "insert", "update", "delete", "drop", "alter", "grant", "revoke",
        "truncate"
    ]
    if any(k in check for k in banned):
        raise ValueError("dangerous keyword detected in SQL")


def execute(
        sql: str,
        params: Mapping[str,
                        Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Execute parameterized SQL and return (rows, meta):
      - rows: List[Dict] (already mapped as dictionaries)
      - meta: {"rows": len(rows)}; orchestrator will handle limit/offset
    No additional COUNT(*) is performed to avoid a second query; frontend pagination is based on limit/offset.
    """
    validate_sql(sql)
    with db.engine.connect() as conn:
        result = conn.execute(text(sql), dict(params))
        rows = result.mappings().all()
    meta = {"rows": len(rows)}
    return [dict(r) for r in rows], meta


# Interface
def run_sql(sql: str, params: dict | None = None) -> Dict[str, Any]:
    """
    统一入口：验证 + 执行 SQL, 返回标准响应
    返回格式：
    {
        "ok": bool,
        "data": List[Dict],
        "meta": Dict,
        "error": str | None
    }
    """
    try:
        rows, meta = execute(sql, params or {})
        geom_field = None
        if rows:
            geom_candidates = [
                k for k in rows[0].keys() if k.startswith("geom")
            ]
            geom_field = geom_candidates[0] if geom_candidates else "geom"
        geojson = rows_to_feature_collection(rows, geom_field=geom_field)
        return {"ok": True, "data": geojson, "meta": meta, "error": None}
    except Exception as e:
        return {
            "ok": False,
            "data": json.dumps({}),
            "meta": {},
            "error": str(e)
        }
