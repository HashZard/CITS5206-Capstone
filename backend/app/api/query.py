from flask import Blueprint, request, jsonify
from app.models.dto import QueryIn, QueryOut, PreviewOut, NLQueryIn, NLQueryOut
from app.services.orchestrator import Orchestrator
import asyncio

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

@query_bp.route("/query/nl", methods=["POST"])
def nl_query():
    """Natural Language Query endpoint"""
    try:
        payload = request.get_json(silent=True) or {}
        nlq = NLQueryIn(**payload)
        nlq.validate()
    except (TypeError, ValueError) as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        svc = Orchestrator()
        # 使用asyncio运行异步方法
        rows, meta, sql, params = asyncio.run(svc.handle_nl_query(nlq))
        
        # 获取表建议（如果请求包含）
        table_suggestions = []
        if nlq.include_metadata:
            table_suggestions = asyncio.run(svc.get_table_suggestions(nlq.query))
        
        out = NLQueryOut(
            ok=True, 
            data=rows, 
            meta=meta,
            generated_sql=sql,
            sql_params=params,
            table_suggestions=table_suggestions
        )
        return jsonify(out.__dict__), 200
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

@query_bp.route("/query/nl/preview", methods=["POST"])
def nl_query_preview():
    """Natural Language Query SQL Preview endpoint"""
    try:
        payload = request.get_json(silent=True) or {}
        nlq = NLQueryIn(**payload)
        nlq.validate()
    except (TypeError, ValueError) as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        svc = Orchestrator()
        sql, params = asyncio.run(svc.preview_nl_sql(nlq))
        
        out = PreviewOut(
            ok=True, 
            sql=sql, 
            warnings=[], 
            meta={"sql_params": params, "query_type": "natural_language"}
        )
        return jsonify(out.__dict__), 200
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

@query_bp.route("/tables/suggest", methods=["POST"])
def suggest_tables():
    """Get table suggestions based on query"""
    try:
        payload = request.get_json(silent=True) or {}
        query = payload.get("query", "")
        max_results = payload.get("max_results", 10)
        
        if not query:
            return _err("VALIDATION_ERROR", "query is required", 400)
            
    except Exception as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        svc = Orchestrator()
        suggestions = asyncio.run(svc.get_table_suggestions(query, max_results))
        
        return jsonify({
            "ok": True,
            "suggestions": suggestions,
            "meta": {"query": query, "max_results": max_results}
        }), 200
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)