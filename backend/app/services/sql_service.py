# -*- coding: utf-8 -*-
from __future__ import annotations
import re
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Sequence, Tuple
from sqlalchemy import text
from app.extensions import db
from app.models.dto import ALLOWED_TABLES


# Check table/column name
_VALID_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

def _assert_valid_identifier(name: str) -> None:
    """校验 SQL 标识符（表/列名），只允许字母、数字、下划线，且不能以数字开头"""
    if not isinstance(name, str) or not _VALID_IDENT_RE.match(name):
        raise ValueError(f"invalid identifier: {name!r}")

def _quote_ident(name: str) -> str:
    """为安全起见，对已校验的标识符加上双引号"""
    _assert_valid_identifier(name)
    return f'"{name}"'


# Get the real column names
@lru_cache(maxsize=128)
def get_columns(table: str) -> Iterable[str]:
    """
    读取某表的所有列名, 结果会被 LRU 缓存
    供 /tables 接口和 build_select_sql 的列校验使用
    """
    if table not in ALLOWED_TABLES:
        # 与 DTO 的表白名单保持一致
        raise ValueError(f"table '{table}' is not allowed")

    _assert_valid_identifier(table)

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

def _normalize_filter_value(op: str, val: Any):
    """为不同操作符做参数预处理（如 IN 必须是序列; IS (NOT) NULL 不带值等）。"""
    op = op.lower()
    if op in {"is", "is not"}:
        # 仅允许 NULL/NOT NULL 语义
        if val is None:
            return None
        # 允许字符串 'null' 容错
        if isinstance(val, str) and val.strip().lower() == "null":
            return None
        raise ValueError("Only NULL is supported for IS / IS NOT")
    if op == "in":
        if not isinstance(val, (list, tuple, set)) or len(val) == 0:
            raise ValueError("IN operator requires a non-empty list/tuple/set")
        return list(val)
    # 其它操作符原样返回
    return val


# Build WHERE and parameters
def _build_where_and_params(
    table: str,
    filters: Mapping[str, Any],
    valid_cols: Sequence[str],
) -> Tuple[str, Dict[str, Any]]:
    """
    将 filters(dict)转换为 WHERE 子句，支持以下两种写法：
      1) 简写：{"active": True, "name": "Alice"}
         -> col = :p0 AND col = :p1
      2) 显式：{"age": {"op": ">=", "value": 18}, "name": {"op":"ilike","value":"%al%"}}
    仅支持 AND 连接；不支持 OR/嵌套。
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
        col_sql = _quote_ident(col)

        # 统一成 {op, value}
        if isinstance(raw, Mapping) and "op" in raw:
            op = str(raw.get("op", "")).lower()
            if op not in _ALLOWED_OPS:
                raise ValueError(f"unsupported operator: {op!r}")
            value = _normalize_filter_value(op, raw.get("value", None))

            if op in {"is", "is not"}:
                # IS [NOT] NULL
                where_parts.append(f"{col_sql} {op.upper()} NULL")
                continue

            if op == "in":
                # :p0, :p1, ...
                placeholders = []
                seq = list(value)  # 已在 _normalize_filter_value 校验
                for v in seq:
                    pname = f"p{p_index}"; p_index += 1
                    params[pname] = v
                    placeholders.append(f":{pname}")
                where_parts.append(f"{col_sql} IN ({', '.join(placeholders)})")
                continue

            # 其它二元操作
            pname = f"p{p_index}"; p_index += 1
            params[pname] = value
            where_parts.append(f"{col_sql} {op.upper()} :{pname}")

        else:
            # 简写：默认等号
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
    构建单表 SELECT 语句（参数化），并进行安全校验：
      - 表名必须在 ALLOWED_TABLES
      - 列名必须存在于该表
      - 仅支持 AND 的过滤
    返回 (sql, params)
    """
    if table not in ALLOWED_TABLES:
        raise ValueError(f"table '{table}' is not allowed")

    _assert_valid_identifier(table)
    quoted_table = _quote_ident(table)

    # 校验列名并引用
    table_cols = set(get_columns(table))
    if not columns or not isinstance(columns, (list, tuple)):
        raise ValueError("columns must be a non-empty list/tuple")
    quoted_cols: List[str] = []
    for c in columns:
        if c not in table_cols:
            raise ValueError(f"unknown column in columns: {c!r}")
        quoted_cols.append(_quote_ident(c))

    # WHERE
    where_sql, params = _build_where_and_params(table, filters or {}, list(table_cols))

    # LIMIT/OFFSET（数值化并兜底）
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
    轻量 SQL 白名单校验：必须以 SELECT 开头，且不包含分号与高危关键字。
    仅作为最后一道保险（核心安全仍依赖 build_select_sql 的构造）。
    """
    check = sql.strip().lower()
    if not check.startswith("select"):
        raise ValueError("only SELECT statements are allowed")
    # 禁止多语句与危险关键字
    if ";" in check:
        raise ValueError("multiple statements are not allowed")
    banned = ["insert", "update", "delete", "drop", "alter", "grant", "revoke", "truncate"]
    if any(k in check for k in banned):
        raise ValueError("dangerous keyword detected in SQL")

def execute(sql: str, params: Mapping[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    执行参数化 SQL, 返回 (rows, meta):
      - rows: List[Dict]（已是字典映射）
      - meta: {"rows": len(rows)}，并留给 orchestrator 填充 limit/offset
    这里不额外做 COUNT(*)，避免二次查询；前端分页依据 limit/offset
    """
    validate_sql(sql)
    with db.engine.connect() as conn:
        result = conn.execute(text(sql), dict(params))
        rows = result.mappings().all()
    meta = {"rows": len(rows)}
    return [dict(r) for r in rows], meta

