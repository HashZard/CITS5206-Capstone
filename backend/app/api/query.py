from flask import Blueprint, request, jsonify
from app.models.dto import QueryIn, QueryOut, PreviewOut
from app.services.orchestrator import Orchestrator

query_bp = Blueprint("query", __name__, url_prefix="/api")

def _err(code: str, msg: str, http=400, details=None):
    return jsonify({"ok": False, "error": {"code": code, "message": msg, "details": details or {}}}), http

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