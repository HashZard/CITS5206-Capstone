from typing import Dict, Any, List, Tuple, Set
from app.extensions import db

_columns_cache: dict[str, Set[str]] = {}

def _sanitize_ident(name: str) -> str:
    import re
    safe = re.sub(r"[^a-zA-Z0-9_]", "", name or "")
    if not safe:
        raise ValueError("invalid identifier")
    return safe

def get_columns(table: str) -> Set[str]:
    """从 information_schema 动态读取列名并缓存。"""
    tbl = _sanitize_ident(table)
    if tbl in _columns_cache:
        return _columns_cache[tbl]

    sql = """
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=:tbl
    """
    with db.engine.connect() as conn:
        rows = conn.execute(db.text(sql), {"tbl": tbl}).fetchall()
    cols = {r[0] for r in rows}
    _columns_cache[tbl] = cols
    return cols

def build_select_sql(table: str, columns: List[str],
                     filters: Dict[str, Any], limit: int, offset: int) -> Tuple[str, Dict[str, Any]]:
    tbl = _sanitize_ident(table)
    allowed = get_columns(tbl)
    if not allowed:
        raise ValueError(f"table '{tbl}' not found or has no columns")

    bad = [c for c in columns if c not in allowed]
    if bad:
        raise ValueError(f"unknown columns: {bad}")

    cols_sql = ", ".join(f'"{c}"' for c in columns)

    where_parts: List[str] = []
    params: Dict[str, Any] = {}
    for i, (k, v) in enumerate((filters or {}).items()):
        key = _sanitize_ident(k)
        if key not in allowed:
            raise ValueError(f"unknown filter column: {key}")
        ph = f"p{i}"
        where_parts.append(f'"{key}" = :{ph}')
        params[ph] = v

    where_sql = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""
    sql = f'SELECT {cols_sql} FROM "{tbl}"{where_sql} LIMIT :_limit OFFSET :_offset;'
    params.update({"_limit": int(limit), "_offset": int(offset)})
    return sql, params

def execute(sql: str, params: Dict[str, Any]):
    with db.engine.connect() as conn:
        rows = conn.execute(db.text(sql), params).mappings().all()
    data = [dict(r) for r in rows]
    return data, {"rows": len(data)}

