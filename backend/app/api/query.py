from flask import Blueprint, request, jsonify
from app.models.dto import QueryIn, QueryOut, PreviewOut
from app.services.orchestrator import Orchestrator
from app.services.sql_service import SQLService

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

@query_bp.route("/sql/validate", methods=["POST"])
def validate_sql():
    """Validate SQL syntax without executing it"""
    try:
        payload = request.get_json(silent=True) or {}
        sql = payload.get('sql', '').strip()
        if not sql:
            return _err("VALIDATION_ERROR", "SQL query is required", 400)
    except Exception as e:
        return _err("VALIDATION_ERROR", "Invalid JSON payload", 400)

    try:
        svc = Orchestrator()
        result = svc.validate_sql(sql)
        return jsonify({
            "ok": True,
            "valid": result["valid"],
            "error": result["error"],
            "warnings": result["warnings"]
        }), 200
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

@query_bp.route("/sql/execute", methods=["POST"])
def execute_sql():
    """Execute raw SQL with validation"""
    try:
        payload = request.get_json(silent=True) or {}
        sql = payload.get('sql', '').strip()
        params = payload.get('params', {})
        
        if not sql:
            return _err("VALIDATION_ERROR", "SQL query is required", 400)
            
        if not isinstance(params, dict):
            return _err("VALIDATION_ERROR", "Params must be a dictionary", 400)
            
    except Exception as e:
        return _err("VALIDATION_ERROR", "Invalid JSON payload", 400)

    try:
        svc = Orchestrator()
        rows, meta = svc.execute_raw_sql(sql, params)
        out = QueryOut(ok=True, data=rows, meta=meta)
        return jsonify(out.__dict__), 200
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

@query_bp.route("/sql/service/info", methods=["GET"])
def service_info():
    """Get SQL service information and capabilities"""
    try:
        sql_service = SQLService()
        connection_ok = sql_service.test_connection()
        
        return jsonify({
            "ok": True,
            "service": "SQL Service v2.0",
            "features": [
                "SQL syntax validation",
                "SQL injection protection", 
                "Query execution with safety checks",
                "Table schema introspection",
                "Query building utilities",
                "Connection health monitoring"
            ],
            "connection_status": "connected" if connection_ok else "disconnected",
            "limits": {
                "max_query_length": sql_service._max_query_length,
                "max_limit": sql_service._max_limit
            }
        }), 200
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)