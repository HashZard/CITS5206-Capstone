import json
from typing import Any

from flask import Blueprint, jsonify, request

from app.models.dto import PreviewOut, QueryIn, QueryOut
from app.services.geo_reasoning_service import GeoReasoningService
from app.services.three_level_service import ThreeLevelService

query_bp = Blueprint("query", __name__)


def _err(code: str, msg: str, http=400, details=None):
    return jsonify({"detail": msg}), http


# Extract the reasoning from the final step only
def _extract_final_reason(outputs: dict) -> list[str]:
    """
    Only extract step3.reasons (list) and return them as an array.
    If step3 or reasons is missing/empty, return an empty list.
    """
    rs = (outputs or {}).get("step3", {}).get("reasons")
    if isinstance(rs, list):
        return rs
    return []


def _build_reason_sql(qin: "QueryIn") -> tuple[str, dict[str, Any], dict]:
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
            ok=True, sql=sql_with_params, reasons=reason_list, warnings=[], meta={}
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
        cols = resu["results"]["columns"]
        rows = resu["results"]["rows"]
        dict_results = [dict(zip(cols, r)) for r in rows]

        out = QueryOut(
            sql=sql_with_params,
            results=dict_results,
            reasoning=reason_list,
            model_used="gpt-5-nano",
            is_fallback=False,
        )
        return jsonify(out.__dict__), 200
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


# Mock implementation for testing
# User question -> fixed SQL + fixed reasons
@query_bp.route("/query/mock", methods=["POST"])
def geo_reason_mock():
    """
    This mock endpoint is for testing purposes only.

    Input (JSON body):
    {
        "question": str,
        "test_case": int (opt.)   # Optional. ID of the mock test case (default=1). There is no such field in the real data.
    }

    Return format（JSON）：
    {
        "sql": str,
        "results": list[dict[str, Any]], # Table results of SQL execution
        "reasoning": list[str], # The model's reasons for generating this SQL
        "model_used": str,
        "is_fallback": bool # If SQL sentence falls back to SELECT * FROM ...
    }

    Example (JSON):
    {
        "sql": "SELECT * FROM ne_data.ne_cities WHERE name LIKE 'S%' ORDER BY population DESC LIMIT 10",
        "results": [
            {"name": "San Francisco", "population": 883305, ...},
            {"name": "Seattle", "population": 744955, ...},
        ],
        "reasoning": [
            "The question is about cities in the United States.",
            "The SQL sentence falls back to SELECT * FROM ne_data.ne_cities.",
        ],
        "model_used": "gpt-5",
        "is_fallback": true
    }
    """
    try:
        payload = request.get_json(silent=True) or {}

        question = (payload.get("question") or "").strip()
        if not question:
            return _err("VALIDATION_ERROR", "'question' is required", 400)

        # Optional test case ID, default = 1
        try:
            test_case_id = int(payload.get("test_case", 1))
        except (TypeError, ValueError):
            test_case_id = 1

        # Read from mock.json
        import os

        mock_path = os.path.join(os.path.dirname(__file__), "mock.json")
        with open(mock_path, "r") as f:
            mock_data = json.load(f)
        cases = mock_data.get("cases", [])
        case = next((c for c in cases if c.get("test_case") == test_case_id), None)
        if not case:
            return _err("BAD_MOCK", f"mock.json missing test_case {test_case_id}", 500)

        case_sql = case.get("sql", "")
        case_results = case.get("results", [])
        case_reasoning = case.get("reasoning", [])
        case_model_used = case.get("model_used", f"mock_case_{test_case_id}")
        case_is_fallback = bool(case.get("is_fallback", False))

        out = QueryOut(
            sql=case_sql,
            results=case_results,
            reasoning=case_reasoning,
            model_used=case_model_used,
            is_fallback=case_is_fallback,
        )
        return jsonify(out.__dict__), 200

    except RuntimeError as e:
        return _err("SERVICE_UNAVAILABLE", str(e), 503)
    except ValueError as e:
        return _err("VALIDATION_ERROR", str(e), 400)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)
