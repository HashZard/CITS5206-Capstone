from flask import Blueprint, request, jsonify, current_app
from app.models.dto import QueryIn, QueryOut, PreviewOut
from app.services.geo_reasoning_service import GeoReasoningService
from app.services.three_level_service import ThreeLevelService

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


def _build_reason_sql(qin: QueryIn) -> tuple[str, dict]:
    question = (qin.question or "").strip()
    if not question:
        raise ValueError("'question' is required")

    # Optional constraints can be passed in the future
    constraints = None

    llm_service = getattr(current_app, "llm_service", None)
    if llm_service is None:
        raise RuntimeError("LLM service is not initialized")

    geo_service = GeoReasoningService(llm_service=llm_service,
                                      three_level_service=ThreeLevelService())
    final_sql = geo_service.start_geo_reasoning(question, constraints)

    if not isinstance(final_sql, dict) or "sql" not in final_sql:
        raise ValueError(
            "GeoReasoningService returned invalid final_sql format")

    sql = (final_sql.get("sql") or "").strip()
    params = final_sql.get("params") or {}

    if not sql or not sql.lower().startswith("select"):
        raise ValueError("Generated SQL must be a SELECT statement")

    if not isinstance(params, dict):
        raise ValueError("SQL params must be an object")

    return sql, params


@query_bp.route("/query/preview", methods=["POST"])
def geo_reason_preview():
    try:
        payload = request.get_json(silent=True) or {}
        qin = QueryIn(**payload)
        qin.validate()
        sql, _params = _build_reason_sql(qin)
        out = PreviewOut(ok=True, sql=sql, warnings=[], meta={})
        return jsonify(out.__dict__), 200
    except RuntimeError as e:
        return _err("SERVICE_UNAVAILABLE", str(e), 503)
    except ValueError as e:
        return _err("VALIDATION_ERROR", str(e), 400)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@query_bp.route("/query", methods=["POST"])
def geo_reason():
    try:
        payload = request.get_json(silent=True) or {}
        qin = QueryIn(**payload)
        qin.validate()
        sql, params = _build_reason_sql(qin)
    except RuntimeError as e:
        return _err("SERVICE_UNAVAILABLE", str(e), 503)
    except ValueError as e:
        return _err("VALIDATION_ERROR", str(e), 400)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

    try:
        # Lazy import to avoid circular import of sql_service earlier
        from app.services import sql_service

        resu = sql_service.run_sql(sql, params)
        if not resu.get("ok"):
            return _err("INTERNAL_ERROR", str(resu.get("error")), 500)
        out = QueryOut(ok=True, data=resu.get("data"), meta=resu.get("meta"))
        return jsonify(out.__dict__), 200
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)
