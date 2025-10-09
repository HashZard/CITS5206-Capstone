import json
import re

from flask import Blueprint, current_app, jsonify, request

from app.models.dto import QueryIn, QueryOut
from app.services import sql_service, routing_service

query_bp = Blueprint("query", __name__)


def _err(code: str, msg: str, http=400, details=None):
    body = {"code": code, "detail": msg}
    if details is not None:
        body["details"] = details
    return jsonify(body), http


@query_bp.route("/query", methods=["POST"])
def geo_reason():
    """
    Input (JSON body):
    {
        "question": str
    }
    Return format（JSON）：
    {
        "sql": str,
        "results": list[dict[str, Any]], # Table results of SQL execution
        "reasoning": list[str], # The model's reasons for generating this SQL
        "model_used": str,
        "is_fallback": bool # If SQL sentence falls back to SELECT * FROM ...
    }
    """
    try:
        payload = request.get_json(silent=True) or {}
        qin = QueryIn(**payload)
        qin.validate()

        question = qin.question.strip()
        geo_reason_result = routing_service.route(user_question=question)
        step3_out = geo_reason_result["outputs"]["step3"]
        reasons = step3_out.get("reasons", [])
        step4_out = geo_reason_result["outputs"]["step4"]
        sql = step4_out["final_sql"]

        run_sql_results = sql_service.run_sql(sql)
        is_fallback = False
        if not run_sql_results["ok"]:
            is_fallback = True
            # Fallback to SELECT * FROM ...
            # Replace block between SELECT and FROM with *

            sql = re.sub(
                r"select\s+.*?\s+from",
                "SELECT * FROM",
                sql,
                flags=re.IGNORECASE | re.DOTALL,
            )
            run_sql_results = sql_service.run_sql(sql)

            # If still fails, return error
            if not run_sql_results["ok"]:
                return _err(
                    "SQL_ERROR",
                    run_sql_results.get("error") or "SQL execution failed",
                    500,
                )
        results = run_sql_results.get("results", [])

        # Load from config
        llm_config = current_app.config.get("LLM_CONFIG", {})
        model_provider = llm_config.get("default", "unknown")
        model_used = llm_config.get(model_provider, {}).get("default_model", "unknown")

        out = QueryOut(
            sql=sql,
            results=results,
            reasoning=reasons,
            model_used=model_used,
            is_fallback=is_fallback,
        )
        return jsonify(out.__dict__), 200

    except RuntimeError as e:
        return _err("SERVICE_UNAVAILABLE", str(e), 503)
    except ValueError as e:
        return _err("VALIDATION_ERROR", str(e), 400)
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
        qin = QueryIn(**payload)
        qin.validate()

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
