import json
from typing import Any, Dict
from flask import Blueprint, request, jsonify
from app.models.dto import QueryIn, QueryOut, PreviewOut
from app.services.geo_reasoning_service import GeoReasoningService
from app.services.three_level_service import ThreeLevelService

query_bp = Blueprint("query", __name__)


def _err(code: str, msg: str, http=400, details=None):
   return jsonify({"detail": msg}), http

# 提取最后一步reason
def _extract_final_reason(outputs: dict) -> list[str]:
    """
    只取 step3.reasons(list), 按数组形式返回。
    若没有 step3 或 reasons 为空，则返回空串。
    """
    rs = (outputs or {}).get("step3", {}).get("reasons")
    if isinstance(rs, list):
        return rs
    return []

def _build_reason_sql(qin: "QueryIn") -> tuple[str, Dict[str, Any], dict]:
    question = (qin.question or "").strip()
    if not question:
        raise ValueError("'question' is required")

    geo_service = GeoReasoningService(three_level_service=ThreeLevelService())
    outputs = geo_service.start_geo_reasoning(question, None)
    if not isinstance(outputs, dict):
        raise ValueError("GeoReasoningService must return an outputs dict")

    step4 = outputs.get("step4", {})
    sql = (step4.get("final_sql") or "").strip()
    if not sql:
        raise ValueError("outputs.step4.final_sql is required")
    if not sql.lower().startswith("select"):
        raise ValueError("Generated SQL must be a SELECT statement")

    params = step4.get("params") or {}
    if not isinstance(params, dict):
        raise ValueError("SQL params must be an object")

    return sql, params, outputs


@query_bp.route("/query/preview", methods=["POST"])
def geo_reason_preview():
    try:
        payload = request.get_json(silent=True) or {}
        qin = QueryIn(**payload)
        qin.validate()
        sql, params, outputs = _build_reason_sql(qin)
        sql_with_params = sql
        for k, v in params.items():
            sql_with_params = sql_with_params.replace(f":{k}", repr(v))
        reason_list = _extract_final_reason(outputs)
        out = PreviewOut(
            ok=True,
            sql=sql_with_params,
            reasons=reason_list,
            warnings=[],
            meta={}
        )
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
        sql, params, outputs = _build_reason_sql(qin)
        sql_with_params = sql
        for k, v in params.items():
            sql_with_params = sql_with_params.replace(f":{k}", repr(v))
        reason_list = _extract_final_reason(outputs)
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
        out = QueryOut(
            results=resu["results"],
            sql=sql_with_params,
            is_fallback=False,
            model_used="gpt-5-nano",
            reasoning=reason_list,
        )
        return jsonify(out.__dict__), 200
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


# Mock implementation for testing
# User question -> fixed SQL + fixed reasons
@query_bp.route("/query/mock", methods=["POST"])
def geo_reason_mock():
    try:
        payload = request.get_json(silent=True) or {}
        qin = QueryIn(**payload)
        qin.validate()

        # 可选测试用例，默认1
        test_case_id = payload.get("test_case", 1)
        
        # Read from mock.json
        import os

        mock_path = os.path.join(os.path.dirname(__file__), "mock.json")
        with open(mock_path, "r") as f:
            mock_data = json.load(f)
        cases = mock_data.get("cases", [])
        case = next((c for c in cases if c.get("test_case") == test_case_id), None)
        if not case:
            return _err("BAD_MOCK", f"mock.json missing test_case {test_case_id}", 500)

        outputs = (case.get("result") or {}).get("outputs", {})
        step4 = outputs.get("step4", {})
        sql = (step4.get("final_sql") or "").strip()
        if not sql:
            return _err("BAD_MOCK", "mock.json missing outputs.step4.final_sql", 500)

        reason_list = _extract_final_reason(outputs)
    except RuntimeError as e:
        return _err("SERVICE_UNAVAILABLE", str(e), 503)
    except ValueError as e:
        return _err("VALIDATION_ERROR", str(e), 400)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)

    try:
        # Lazy import to avoid circular import of sql_service earlier
        from app.services import sql_service

        resu = sql_service.run_sql(sql, params={})
        if not resu.get("ok"):
            return _err("INTERNAL_ERROR", str(resu.get("error")), 500)
        out = QueryOut(
            results=resu["results"],
            sql=sql,
            is_fallback=False,
            model_used=f"mock_case_{test_case_id}",
            reasoning=reason_list,
        )
        return jsonify(out.__dict__), 200
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)
