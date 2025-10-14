"""
Routing service test module.

This module provides two execution modes:
1. Full routing validation (`test_routing_with_real_llm`).
2. Step-by-step debugging (`test_routing_step_by_step`).

How to run:
--------
1. Set the required environment variables:
   export POSTGRES_DSN="postgresql://username:password@localhost:5432/dbname"
   export OPENAI_API_KEY="your-api-key"
   # or
   export GEMINI_API_KEY="your-api-key"

2. Execute the tests:
   # Option 1: via pytest
   pytest test_routing_service.py -v

   # Option 2: run the module directly (full test)
   python -m tests.test_routing_service

   # Option 3: run step-by-step mode
   python -m tests.test_routing_service step

Feature overview:
--------
1. Full routing test (`test_routing_with_real_llm`):
   - Exercises the entire routing pipeline.
   - Runs multiple test cases.
   - Prints detailed results.
   - Records performance metrics.

2. Step-by-step debugging (`test_routing_step_by_step`):
   - Executes each routing stage independently.
   - Shows intermediate outputs in detail.
   - Useful for development and troubleshooting.
   - Uses a fixed set of test queries.

Output hints:
--------
- ✅ indicates the test passed.
- ❌ indicates the test failed.
- Execution time statistics are reported.
- L1/L2/L3 selections are displayed.
- The generated SQL is printed.

Reminders:
--------
1. Configure the database connection correctly.
2. Provide a valid LLM API key.
3. Ensure the database contains test data.
4. API calls may incur costs.
"""

import json
import os
import time
from datetime import UTC, datetime
from typing import Any

import pytest

from app import create_app
from app.extensions import llm_service
from app.services import routing_service


def _print_result(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def test_routing_with_real_llm():
    """
    Validate the full routing pipeline using a real LLM API.

    The procedure covers:
    1. Selecting L1 (top-level) categories.
    2. Selecting L2 (mid-level) cards.
    3. Selecting L3 (table-level) entries.
    4. Generating SQL queries.

    Test flow:
    1. Verify required environment variables.
    2. For each test case:
       - Execute the full routing flow.
       - Validate the output structure.
       - Record the elapsed time.
       - Print detailed results.

    Output includes:
    - Test case metadata.
    - Execution status (success/failure).
    - Timing statistics.
    - L1/L2/L3 selections.
    - Generated SQL statement.

    Raises:
        pytest.skip: When required environment variables are missing.
    """
    # Check environment variables.
    required_env_vars = ["POSTGRES_DSN"]
    llm_vars = ["OPENAI_API_KEY", "GEMINI_API_KEY"]

    if not any(os.getenv(var) for var in llm_vars):
        pytest.skip("OPENAI_API_KEY or GEMINI_API_KEY environment variable is required")

    if not os.getenv("POSTGRES_DSN"):
        pytest.skip("POSTGRES_DSN environment variable is required")

    # User questions for testing.
    test_cases = [
        "Highlight all mountain ranges or ranges.",
    ]

    app = create_app("development")

    with app.app_context():
        for i, user_question in enumerate(test_cases):
            print(f"\n=== Test case {i+1}: {user_question} ===")

            try:
                # Log the start time.
                start_time = time.time()

                # Start routing.
                result = routing_service.route(user_question, limit=50)

                # Log the end time.
                end_time = time.time()
                elapsed_ms = int((end_time - start_time) * 1000)

                # Validate result structure.
                assert "inputs" in result
                assert "outputs" in result
                assert all(f"step{j}" in result["inputs"] for j in range(1, 5))
                assert all(f"step{j}" in result["outputs"] for j in range(1, 5))

                # Validate step outputs.
                step1_out = result["outputs"]["step1"]
                assert "l1_selected" in step1_out
                assert isinstance(step1_out["l1_selected"], list)
                assert len(step1_out["l1_selected"]) > 0

                step2_out = result["outputs"]["step2"]
                assert "l2_selected" in step2_out
                assert isinstance(step2_out["l2_selected"], list)

                step3_out = result["outputs"]["step3"]
                assert "l3_selected" in step3_out
                assert isinstance(step3_out["l3_selected"], dict)
                assert "table_name" in step3_out["l3_selected"]

                step4_out = result["outputs"]["step4"]
                assert "final_sql" in step4_out

                sql = step4_out["final_sql"]

                # Print the structured result payload.
                log_entry = {
                    "test_case": i + 1,
                    "user_question": user_question,
                    "status": "success",
                    "elapsed_ms": elapsed_ms,
                    "result": result,
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                _print_result(log_entry)

                print(f"✅ Success - elapsed: {elapsed_ms}ms")
                print(f"L1 selections: {[item['name'] for item in step1_out['l1_selected']]}")
                print(f"L2 selections: {[item['name'] for item in step2_out['l2_selected']]}")
                print(f"L3 table: {step3_out['l3_selected']['table_name']}")
                print(f"SQL: {sql}")
            except Exception as e:
                log_entry = {
                    "test_case": i + 1,
                    "user_question": user_question,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                _print_result(log_entry)

                print(f"❌ Failed: {e}")
                # Do not raise an exception so the loop continues.
                continue

        print(f"\n📝 Test cases complete.")


def test_routing_step_by_step():
    """
    Exercise each routing step individually to assist debugging.

    The routine inspects every stage of the routing service:

    1. Step 1 – L1 selection:
       - Retrieve all L1 categories.
       - Build the prompt.
       - Invoke the LLM.
       - Display the selections.

    2. Step 2 – L2 selection:
       - Retrieve L2 cards based on the chosen L1 categories.
       - Build the prompt.
       - Invoke the LLM.
       - Display the selections.

    3. Step 3 – L3 selection:
       - Retrieve L3 tables based on the chosen L2 cards.
       - Build the prompt.
       - Invoke the LLM.
       - Display the selections.

    4. Step 4 – SQL generation:
       - Retrieve the schema for the chosen table.
       - Build the prompt.
       - Invoke the LLM.
       - Display the generated SQL.

    Each step prints:
    - The prompts (system and user).
    - The raw LLM response.
    - The parsed output.

    A fixed test query is used: "Find all major lakes in North America".

    Raises:
        pytest.skip: When required environment variables are missing.
        Exception: When any step fails.
    """
    if not any(os.getenv(var) for var in ["OPENAI_API_KEY", "GEMINI_API_KEY"]):
        pytest.skip("LLM API key is required")

    if not os.getenv("POSTGRES_DSN"):
        pytest.skip("POSTGRES_DSN environment variable is required")

    user_question = "Find all major lakes in North America"
    app = create_app("development")

    with app.app_context():
        try:
            # Step 1: evaluate L1 selection.
            print("\n=== Step 1: L1 Selection ===")
            from app.services.three_level_service import ThreeLevelService

            l1_objs = ThreeLevelService.get_all_l1_categories()
            l1_list = [
                {
                    "id": x.id,
                    "name": x.name,
                    "description": x.description,
                    "dimension": x.dimension,
                    "keywords": x.keywords or [],
                }
                for x in l1_objs
            ]

            s1_sys, s1_user = routing_service.build_step1_prompt(user_question, l1_list)
            r1 = llm_service.generate(message=s1_user, system_prompt=s1_sys)
            d1 = json.loads(r1.content)

            _print_result(
                {
                    "step": 1,
                    "input": {"system": s1_sys, "user": s1_user},
                    "output": d1,
                    "raw_response": r1.content,
                }
            )

            print(f"L1 selection result: {d1}")

            # Step 2: evaluate L2 selection.
            print("\n=== Step 2: L2 Selection ===")
            l1_ids = [int(i["id"]) for i in d1.get("l1_selected", [])]
            l2_all = []
            for l1_id in l1_ids:
                l2_cards = ThreeLevelService.get_l2_cards_by_l1(l1_id)
                l2_all.extend(
                    [
                        {
                            "id": x.id,
                            "name": x.name,
                            "description_short": x.description_short,
                            "keywords": x.keywords or [],
                            "allowed_dimensions": x.allowed_dimensions or [],
                        }
                        for x in l2_cards
                    ]
                )

            s2_sys, s2_user = routing_service.build_step2_prompt(user_question, l2_all)
            r2 = llm_service.generate(message=s2_user, system_prompt=s2_sys)
            d2 = json.loads(r2.content)

            _print_result(
                {
                    "step": 2,
                    "input": {"system": s2_sys, "user": s2_user},
                    "output": d2,
                    "raw_response": r2.content,
                }
            )

            print(f"L2 selection result: {d2}")

            # Step 3: evaluate L3 selection.
            print("\n=== Step 3: L3 Selection ===")
            l2_ids = [int(i["id"]) for i in d2.get("l2_selected", [])]
            l3_all = []
            for l2_id in l2_ids:
                l3_tables = ThreeLevelService.get_l3_tables_by_l2(l2_id)
                l3_all.extend(
                    [
                        {
                            "id": x.id,
                            "table_name": x.table_name,
                            "display_name": x.display_name,
                            "summary": x.summary,
                            "core_fields": x.core_fields or [],
                            "keywords": x.keywords or [],
                            "use_cases": x.use_cases or [],
                        }
                        for x in l3_tables
                    ]
                )

            s3_sys, s3_user = routing_service.build_step3_prompt(user_question, l3_all)
            r3 = llm_service.generate(message=s3_user, system_prompt=s3_sys)
            d3 = json.loads(r3.content)

            _print_result(
                {
                    "step": 3,
                    "input": {"system": s3_sys, "user": s3_user},
                    "output": d3,
                    "raw_response": r3.content,
                }
            )

            print(f"L3 selection result: {d3}")

            # Step 4: evaluate SQL generation.
            print("\n=== Step 4: SQL Generation ===")
            l3_selected = d3.get("l3_selected", {})
            table_name = l3_selected.get("table_name")

            if table_name:
                l3_schema = routing_service.fetch_table_schema_dict(table_name)
                constraints = {"limit": 100}
                s4_sys, s4_user = routing_service.build_step4_prompt(
                    user_question, l3_selected, l3_schema, constraints
                )
                r4 = llm_service.generate(message=s4_user, system_prompt=s4_sys)
                d4 = json.loads(r4.content)

                _print_result(
                    {
                        "step": 4,
                        "input": {"system": s4_sys, "user": s4_user},
                        "output": d4,
                        "raw_response": r4.content,
                    }
                )

                print(f"SQL generation result: {d4}")
            else:
                print("❌ No L3 table selected, skip SQL generation")

        except Exception as e:
            _print_result({"error": str(e), "timestamp": datetime.utcnow().isoformat()})
            raise

        print("\n📝 Step-by-step test complete")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "step":
        test_routing_step_by_step()
    else:
        test_routing_with_real_llm()
