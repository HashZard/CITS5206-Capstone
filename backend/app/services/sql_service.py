from __future__ import annotations

from functools import lru_cache
from typing import Any, Iterable, Mapping

from sqlalchemy import text

from app.models.dto import ALLOWED_TABLES

from ..extensions import db

"""This module provides a single-table SQL query service.

Interface function:
    run_sql(sql: str, params: dict | None = None) -> dict[str, Any]

Return format:
    {
        "ok": bool,
        "results": {
            "columns": list[str],
            "rows": list[list[Any]]
        },
        "meta": dict,
        "error": str | None
    }

Usage example:
    from backend.app.services import sql_service

    sql = "SELECT id, name FROM l1_category WHERE active = true LIMIT 5 OFFSET 0"
    resp = sql_service.run_sql(sql)

    if resp["ok"]:
        print("Columns:", resp["results"]["columns"])
        for row in resp["results"]["rows"]:
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
    """Lightweight SQL whitelist validation:
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
        "insert",
        "update",
        "delete",
        "drop",
        "alter",
        "grant",
        "revoke",
        "truncate",
    ]
    if any(k in check for k in banned):
        raise ValueError("dangerous keyword detected in SQL")


def execute(
    sql: str, params: Mapping[str, Any]
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """
    Execute parameterized SQL and return (rows, meta):
        - rows: list[dict] (already mapped as dictionaries)
        - meta: {"rows": len(rows)}; limit/offset handled by caller
    No additional COUNT(*) is performed to avoid a second query; frontend pagination is based on limit/offset.
    """
    validate_sql(sql)
    with db.engine.connect() as conn:
        result = conn.execute(text(sql), dict(params))
        rows = result.mappings().all()
    meta = {"rows": len(rows)}
    return [dict(r) for r in rows], meta


# Interface
def run_sql(sql: str, params: dict | None = None) -> dict[str, Any]:
    """
    统一入口：验证 + 执行 SQL, 返回标准响应
    返回格式：
    {
        "ok": bool,
        "results": {
            "columns": list[str],
            "rows": list[list[Any]]
        },
        "meta": dict,
        "error": str | None
    }
    """
    try:
        rows_dicts, meta = execute(sql, params or {})

        if rows_dicts:
            columns = list(rows_dicts[0].keys())
            rows = [[row.get(c) for c in columns] for row in rows_dicts]
        else:
            columns, rows = [], []

        return {
            "ok": True,
            "results": {"columns": columns, "rows": rows},
            "meta": meta,
            "error": None,
        }
    except Exception as e:
        return {
            "ok": False,
            "results": {"columns": [], "rows": []},
            "meta": {},
            "error": str(e),
        }
