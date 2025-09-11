from flask import Blueprint, request, jsonify
from app.models.dto import QueryIn, QueryOut, PreviewOut, ALLOWED_SPATIAL_TABLES
from app.services.orchestrator import Orchestrator
from app.services import sql_service
from app.utils.geojson import rows_to_feature_collection

query_bp = Blueprint("query", __name__)


def _err(code: str, msg: str, http=400, details=None):
    return (
        jsonify({
            "ok": False,
            "error": {
                "code": code,
                "message": msg,
                "details": details or {}
            },
        }),
        http,
    )


@query_bp.route("/query", methods=["POST"])
def query():
    try:
        payload = request.get_json(silent=True) or {}
        qin = QueryIn(**payload)
        qin.validate()
    except (TypeError, ValueError) as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        svc = Orchestrator()
        rows, meta = svc.handle_query(qin)
        out = QueryOut(ok=True, data=rows, meta=meta)
        return jsonify(out.__dict__), 200
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@query_bp.route("/query/preview", methods=["POST"])
def query_preview():
    try:
        payload = request.get_json(silent=True) or {}
        qin = QueryIn(**payload)
        qin.validate()
    except (TypeError, ValueError) as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        svc = Orchestrator()
        sql = svc.preview_sql(qin)
        out = PreviewOut(ok=True, sql=sql, warnings=[], meta={})
        return jsonify(out.__dict__), 200
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@query_bp.route("/map/query", methods=["POST"])
def map_query():
    try:
        payload = request.get_json(silent=True) or {}

        table = (payload.get("table") or "").strip()
        if not table:
            return _err("VALIDATION_ERROR", "'table' is required", 400)
        if table not in ALLOWED_SPATIAL_TABLES:
            return _err("VALIDATION_ERROR", f"table '{table}' is not allowed",
                        400)

        geometry_column = (payload.get("geometry_column") or "geom").strip()
        columns = payload.get("columns") or []
        if not isinstance(columns, list):
            return _err("VALIDATION_ERROR", "'columns' must be a list", 400)

        bbox = payload.get("bbox")
        if bbox is not None:
            if (not isinstance(bbox, list) or len(bbox) != 4
                    or not all(isinstance(x, (int, float)) for x in bbox)):
                return _err(
                    "VALIDATION_ERROR",
                    "'bbox' must be [minLon, minLat, maxLon, maxLat]",
                    400,
                )

        limit = int(payload.get("limit", 1000))
        offset = int(payload.get("offset", 0))
        if limit <= 0 or limit > 5000:
            return _err("VALIDATION_ERROR", "'limit' must be 1..5000", 400)
        if offset < 0:
            return _err("VALIDATION_ERROR", "'offset' must be >= 0", 400)

        srid_out = int(payload.get("srid", 4326))

        allowed_cols = sql_service.get_columns(table)
        if geometry_column not in allowed_cols:
            return _err(
                "VALIDATION_ERROR",
                f"geometry column '{geometry_column}' not found in table '{table}'",
                400,
            )

        bad = [
            c for c in columns if c not in allowed_cols or c == geometry_column
        ]
        if bad:
            return _err(
                "VALIDATION_ERROR",
                f"invalid non-geometry columns: {bad}",
                400,
            )

        # Build SELECT column list
        props_sql = ", ".join(f'"{c}"' for c in columns) if columns else None
        geom_sql = (
            f'ST_AsGeoJSON(ST_Transform("{geometry_column}", :_srid_out))::json AS geometry'
        )
        select_cols = geom_sql if not props_sql else f"{props_sql}, {geom_sql}"

        # Build WHERE clause
        where_parts = []
        params: dict[str, object] = {"_srid_out": srid_out}

        # BBOX filtering
        bbox_applied = False
        if bbox is not None:
            bbox_applied = True
            params.update({
                "_minx": float(bbox[0]),
                "_miny": float(bbox[1]),
                "_maxx": float(bbox[2]),
                "_maxy": float(bbox[3]),
            })
            where_parts.append(
                "ST_Intersects("
                f"ST_Transform(\"{geometry_column}\", :_srid_out), "
                "ST_MakeEnvelope(:_minx, :_miny, :_maxx, :_maxy, :_srid_out)"
                ")")

        where_sql = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""

        sql = (f'SELECT {select_cols} FROM "{table}"'
               f"{where_sql} LIMIT :_limit OFFSET :_offset;")
        params.update({"_limit": limit, "_offset": offset})

    except ValueError as e:
        return _err("VALIDATION_ERROR", str(e), 400)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

    # Execute SQL via shared sql_service
    try:
        rows, _exec_meta = sql_service.execute(sql, params)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

    # Convert to GeoJSON FeatureCollection
    fc = rows_to_feature_collection(rows, geom_field="geometry")
    feature_count = len(fc.get("features", []))

    meta = {
        "rows": feature_count,
        "limit": limit,
        "offset": offset,
        "table": table,
        "geometry_column": geometry_column,
        "bboxApplied": bbox_applied,
        "srid_out": srid_out,
    }

    return (
        jsonify({
            "ok": True,
            "featureCount": feature_count,
            "geojson": fc,
            "meta": meta
        }),
        200,
    )
