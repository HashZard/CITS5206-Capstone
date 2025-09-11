from __future__ import annotations
from flask import Blueprint, request, jsonify
from typing import Dict, Any, List, Tuple

from ..services.sql_service import build_select_sql, execute, get_columns
from app.utils.geojson import rows_to_feature_collection

media_bp = Blueprint("media", __name__, url_prefix="/api/media")

DEFAULT_LIMIT = 50 

# 统一的查询封装
def run_query(
    table: str,
    columns: List[str],
    filters_raw: Dict[str, Any] | None,
    limit: int,
    offset: int,
    order_col: str | None,
    order_dir: str | None,
    geometry_column: str | None = None,
    srid: int = 4326    
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str, Dict[str, Any]]:
    sql, params = build_select_sql(
        table=table,
        columns=columns,
        filters=filters_raw or {},
        limit=limit,
        offset=offset,
        order_col=order_col,
        order_dir=order_dir,
        geometry_column=geometry_column, 
        srid=srid                      
    )
    rows, meta = execute(sql, params)
    meta = {**meta, "limit": limit, "offset": offset, "order_col": order_col, "order_dir": order_dir}
    return rows, meta, sql, params


@media_bp.route("/overview", methods=["POST"])
def overview():
    """
    请求体示例：
    {
      "filters": {
        "entityType": "l2_mountain",         // 必填：表名（单表）
        "columns": ["id","name","elevation_m"], // 必填：要查询的列（禁止 *）
        "metrics": "elevation_m",            // 可选：用于排序的列（若需要 order）
        "order": "asc" | "desc",             // 可选：排序方向
        "limit": 5,                          // 可选：默认 50
        "offset": 0,                         // 可选：默认 0
        "raw": { "active": true }            // 可选：列过滤（与你们通用查询一致）
      }
    }
    """
    payload = request.get_json(silent=True) or {}
    f = payload.get("filters") or {}

    table = (f.get("entityType") or "").strip()
    columns = f.get("columns")

    if not table:
        return jsonify({"ok": False, "error": "filters.entityType is required"}), 400
    if not isinstance(columns, list) or not columns:
        return jsonify({"ok": False, "error": "filters.columns must be a non-empty list"}), 400

    # 校验列名合法（存在于该表）
    table_cols = set(get_columns(table))
    unknown = [c for c in columns if c not in table_cols]
    if unknown:
        return jsonify({"ok": False, "error": "unknown columns", "details": unknown}), 400

    # 排序
    metrics = f.get("metrics")
    order_dir = (f.get("order") or "").lower() or None
    if order_dir and order_dir not in ("asc", "desc"):
        return jsonify({"ok": False, "error": "filters.order must be 'asc' or 'desc'"}), 400
    if metrics and metrics not in table_cols:
        return jsonify({"ok": False, "error": "filters.metrics not in table columns"}), 400
    order_col = metrics if metrics else None

    limit = int(f.get("limit") or DEFAULT_LIMIT)
    offset = int(f.get("offset") or 0)

    geometry_column = f.get("geometry_column") 
    srid = int(f.get("srid") or 4326)         

    rows, meta, sql, params = run_query(
        table=table,
        columns=columns,
        filters_raw=f.get("raw") or {},
        limit=limit,
        offset=offset,
        order_col=order_col,
        order_dir=order_dir,
        geometry_column=geometry_column, 
        srid=srid                         
    )

    # limit==1 → 仅overview；>1 → overview + cards（按返回列组织）
    data: Dict[str, Any] = {
        "overview": {"items": len(rows)},
        "meta": meta,
        "sql_preview": sql,
        "sql_params": params,
        "rows": rows
    }

    if rows and "geometry" in rows[0]:
        data["geojson"] = rows_to_feature_collection(rows, geom_field="geometry")

    if limit > 1:
        # metrics_fields：如果前端想指定哪些作为卡片指标，可提交 "metric_fields": [...]
        metric_fields = payload.get("metric_fields")
        cards = []
        for r in rows:
            if isinstance(metric_fields, list) and metric_fields:
                metrics_obj = {k: r.get(k) for k in metric_fields if k in r}
            else:
                # 没指定就把除 id/name 的其他返回列作为指标
                metrics_obj = {k: r[k] for k in r.keys() if k not in ("id", "name")}
            title = r.get("name") or r.get("id")
            cards.append({"id": r.get("id"), "title": title, "metrics": metrics_obj})
        data["cards"] = cards

    return jsonify({"ok": True, "data": data}), 200


@media_bp.route("/card", methods=["POST"])
def card():
    """
    请求：
    {
      "items": [
        {"id":"everest","name":"Mount Everest","elevation_m":8848},
        {"id":"k2","name":"K2","elevation_m":8611}
      ],
      "title_field": "name",              // 可选，默认用 name，否则退回 id
      "metric_fields": ["elevation_m"]    // 可选，不传则把除 id/name 外的字段当指标
    }
    """
    payload = request.get_json(silent=True) or {}
    items: List[Dict[str, Any]] = payload.get("items") or []
    title_field = payload.get("title_field") or "name"
    metric_fields: List[str] | None = payload.get("metric_fields")

    out = []
    for it in items:
        title = it.get(title_field) or it.get("id")
        if metric_fields:
            metrics_obj = {k: it.get(k) for k in metric_fields if k in it}
        else:
            metrics_obj = {k: v for k, v in it.items() if k not in ("id", "name")}
        out.append({"id": it.get("id"), "title": title, "metrics": metrics_obj})

    return jsonify({"ok": True, "data": out}), 200


@media_bp.route("/export/json", methods=["POST"])
def export_json():
    """
    两种用法：
    1) 直接传 rows：{"rows":[...]} → 原样返回（便于前端保存当前结果）
    2) 传 filters（与 /overview 相同）→ 后端再查一次并返回 rows
    """
    payload = request.get_json(silent=True) or {}
    rows = payload.get("rows")
    if rows is not None:
        data = {"rows": rows, "count": len(rows)}
        if rows and isinstance(rows, list) and isinstance(rows[0], dict) and "geometry" in rows[0]:
            data["geojson"] = rows_to_feature_collection(rows, geom_field="geometry")
        return jsonify({"ok": True, "data": data}), 200

    f = payload.get("filters") or {}
    table = (f.get("entityType") or "").strip()
    columns = f.get("columns")

    if not table:
        return jsonify({"ok": False, "error": "filters.entityType is required"}), 400
    if not isinstance(columns, list) or not columns:
        return jsonify({"ok": False, "error": "filters.columns must be a non-empty list"}), 400

    table_cols = set(get_columns(table))
    unknown = [c for c in columns if c not in table_cols]
    if unknown:
        return jsonify({"ok": False, "error": "unknown columns", "details": unknown}), 400

    metrics = f.get("metrics")
    order_dir = (f.get("order") or "").lower() or None
    if order_dir and order_dir not in ("asc", "desc"):
        return jsonify({"ok": False, "error": "filters.order must be 'asc' or 'desc'"}), 400
    if metrics and metrics not in table_cols:
        return jsonify({"ok": False, "error": "filters.metrics not in table columns"}), 400
    order_col = metrics if metrics else None

    limit = int(f.get("limit") or DEFAULT_LIMIT)
    offset = int(f.get("offset") or 0)

    geometry_column = f.get("geometry_column")
    srid = int(f.get("srid") or 4326)

    rows, meta, sql, params = run_query(
        table=table,
        columns=columns,
        filters_raw=f.get("raw") or {},
        limit=limit,
        offset=offset,
        order_col=order_col,
        order_dir=order_dir,
        geometry_column=geometry_column, 
        srid=srid
    )

    data = {
        "rows": rows,
        "count": len(rows),
        "meta": meta,
        "sql_preview": sql,
    }

    if rows and "geometry" in rows[0]:
        data["geojson"] = rows_to_feature_collection(rows, geom_field="geometry")

    return jsonify({"ok": True, "data": data}), 200


