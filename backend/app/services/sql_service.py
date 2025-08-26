# -*- coding: utf-8 -*-
from __future__ import annotations
import re
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Sequence, Tuple
from sqlalchemy import text
from ..extensions import db
from ..models.dto import ALLOWED_TABLES



# Prevent invalid identifiers
def quote_ident(name: str) -> str:
    """For security reasons, double quotation marks are added to the verified identifiers."""
    if not isinstance(name, str) or not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", name):
        raise ValueError(f"invalid identifier: {name!r}")
    return f'"{name}"'


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


# Filter criteria construction
_ALLOWED_OPS = {"=", "!=", ">", ">=", "<", "<=", "like", "ilike", "in", "is", "is not"}

def normalize_filter_value(op: str, val: Any):
    """
    Parameter preprocessing for different operators 
    For example, IN must be a sequence; IS (NOT) NULL does not have a value, etc.).
    """
    op = op.lower()
    if op in {"is", "is not"}:
        # Only NULL/NOT NULL semantics are allowed
        if val is None:
            return None
        if isinstance(val, str) and val.strip().lower() == "null":
            return None
        raise ValueError("Only NULL is supported for IS / IS NOT")
    if op == "in":
        if not isinstance(val, (list, tuple, set)) or len(val) == 0:
            raise ValueError("IN operator requires a non-empty list/tuple/set")
        return list(val)
    # Other operators return as they are
    return val


# Build WHERE and parameters
def build_where_and_params(
    table: str,
    filters: Mapping[str, Any],
    valid_cols: Sequence[str],
) -> Tuple[str, Dict[str, Any]]:
    """
    Convert filters (dict) to a SQL WHERE clause. Supports two formats:
      1) Shorthand: {"active": True, "name": "Alice"} → col = :p0 AND col = :p1
      2) Explicit: {"age": {"op": ">=", "value": 18}, "name": {"op": "ilike", "value": "%al%"}}
    Only AND conditions are supported; OR and nested expressions are not.
    """
    where_parts: List[str] = []
    params: Dict[str, Any] = {}
    p_index = 0

    if not filters:
        return "", {}

    valid = set(valid_cols)

    for col, raw in filters.items():
        if col not in valid:
            raise ValueError(f"unknown column in filters: {col!r}")
        col_sql = quote_ident(col)

        # Unify into {op, value}
        if isinstance(raw, Mapping) and "op" in raw:
            op = str(raw.get("op", "")).lower()
            if op not in _ALLOWED_OPS:
                raise ValueError(f"unsupported operator: {op!r}")
            value = normalize_filter_value(op, raw.get("value", None))

            if op in {"is", "is not"}:
                # IS [NOT] NULL
                where_parts.append(f"{col_sql} {op.upper()} NULL")
                continue

            if op == "in":
                # :p0, :p1, ...
                placeholders = []
                seq = list(value)  # It has been checked in normalise_filter_value
                for v in seq:
                    pname = f"p{p_index}"; p_index += 1
                    params[pname] = v
                    placeholders.append(f":{pname}")
                where_parts.append(f"{col_sql} IN ({', '.join(placeholders)})")
                continue

            # Other binary operations
            pname = f"p{p_index}"; p_index += 1
            params[pname] = value
            where_parts.append(f"{col_sql} {op.upper()} :{pname}")

        else:
            # Shorthand: equality
            pname = f"p{p_index}"; p_index += 1
            params[pname] = raw
            where_parts.append(f"{col_sql} = :{pname}")

    clause = " AND ".join(where_parts)
    return ("WHERE " + clause) if clause else "", params


# Build SELECT SQL and verification 
def build_select_sql(
    table: str,
    columns: Sequence[str],
    filters: Mapping[str, Any] | None,
    limit: int,
    offset: int,
) -> Tuple[str, Dict[str, Any]]:
    """
    Build a parameterized single-table SELECT statement with safety checks:
      - Table name must be in ALLOWED_TABLES
      - Column names must exist in the specified table
      - Only AND filters are supported
    Return (sql, params)
    """
    if table not in ALLOWED_TABLES:
        raise ValueError(f"table '{table}' is not allowed")

    quoted_table = quote_ident(table)

    # Check the list and quote
    table_cols = set(get_columns(table))
    if not columns or not isinstance(columns, (list, tuple)):
        raise ValueError("columns must be a non-empty list/tuple")
    quoted_cols: List[str] = []
    for c in columns:
        if c not in table_cols:
            raise ValueError(f"unknown column in columns: {c!r}")
        quoted_cols.append(quote_ident(c))

    # WHERE
    where_sql, params = build_where_and_params(table, filters or {}, list(table_cols))

    # LIMIT/OFFSET
    try:
        limit_val = int(limit)
        offset_val = int(offset)
    except Exception:
        raise ValueError("limit/offset must be integers")
    if limit_val <= 0:
        raise ValueError("limit must be >= 1")
    if offset_val < 0:
        raise ValueError("offset must be >= 0")

    sql = f"SELECT {', '.join(quoted_cols)} FROM {quoted_table} {where_sql} LIMIT :_limit OFFSET :_offset"
    params["_limit"] = limit_val
    params["_offset"] = offset_val
    return sql, params


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
    banned = ["insert", "update", "delete", "drop", "alter", "grant", "revoke", "truncate"]
    if any(k in check for k in banned):
        raise ValueError("dangerous keyword detected in SQL")

def execute(sql: str, params: Mapping[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
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

