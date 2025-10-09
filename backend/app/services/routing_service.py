from __future__ import annotations

import json
from functools import lru_cache
from textwrap import dedent
from typing import Any

from app.extensions import db, llm_service
from app.services.llm_service import LLMResponse
from app.services.three_level_service import ThreeLevelService


# -------- Utils --------
def parse_json_safely(text: str):
    """容错解析：去除 ```json 代码块、截取花括号范围，避免模型输出包裹导致的解析失败。"""
    import json as _json

    s = (text or "").strip()
    # 去除围栏 ``` 或 ```json
    if s.startswith("```"):
        s = s.split("```", 2)
        if len(s) == 3:
            s = s[1]
        else:
            s = s[-1]
    s = s.strip()
    # 截取第一个 { 到最后一个 }
    start = s.find("{")
    end = s.rfind("}")
    candidate = s[start : end + 1] if start != -1 and end != -1 and end > start else s
    return _json.loads(candidate)


# -------- Step builders --------
def build_step1_prompt(
    user_question: str, l1_list: list[dict[str, Any]]
) -> tuple[str, str]:
    system = """
        You are an assistant that routes a user question into a 3-level taxonomy.
        Task: 
        - Select the most relevant L1 categories for the question.
        - Pick 1–2 L1 categories that best match the intent.
        Instructions:
        1. Only output JSON, nothing else.
        2. JSON must have exactly two keys: 
            - "l1_selected": an array of objects with keys "id" (string) and "name" (string)
            - "reasons": an array of strings explaining briefly why each category was chosen
        3. Do not include any text outside the JSON.
        4. Example of correct JSON format:
        {
            "l1_selected": [{"id": "123", "name": "Software"}],
            "reasons": ["The question is about software development."]
        }
    """
    user = f"""
        User question:
        {user_question}
        
        Available L1 categories (list of L1Category objects):
        {json.dumps(l1_list, ensure_ascii=False)}
    """
    return dedent(system).strip(), dedent(user).strip()


def build_step2_prompt(
    user_question: str, l2_list: list[dict[str, Any]]
) -> tuple[str, str]:
    system = """
        You are an assistant that continues classification into the 3-level taxonomy.
        Task:
        - From the given L2 categories, select the most relevant ones.
        - Pick 1–2 L2 categories that best match the intent. 
        Instructions:
        1. Only output JSON, nothing else.
        2. JSON must have exactly two keys:
            - "l2_selected": an array of objects with keys "id" (string) and "name" (string)
            - "reasons": an array of strings explaining briefly why each category was chosen
        3. The order of "reasons" should correspond to the order of "l2_selected"
        4. Do not include any extra text outside the JSON.
        5. Example of correct JSON:
        {
            "l2_selected": [{"id": "456", "name": "Backend Development"}],
            "reasons": ["The question is about backend programming."]
        }
    """
    user = f"""
        User question:
        {user_question}
        
        Available L2 categories (list of L2Card objects):
        {json.dumps(l2_list, ensure_ascii=False)}
    """
    return dedent(system).strip(), dedent(user).strip()


def build_step3_prompt(
    user_question: str, l3_list: list[dict[str, Any]]
) -> tuple[str, str]:
    system = """
        You are an assistant that continues classification into the 3-level taxonomy.
        Task:
        - From the given L3 tables, select exactly one L3 table that best fits the question.
        Instructions:
        1. Only output JSON, nothing else.
        2. JSON must have exactly two keys:
            - "l3_selected": an object with keys "id" (string), "table_name" (string), "display_name" (string)
            - "reasons": an array of strings explaining briefly why this table was chosen
        3. Choose exactly one L3 table.
        4. Do not include any extra text or formatting outside the JSON.
        5. Example of correct JSON:
        {
            "l3_selected": {"id": "789", "table_name": "orders", "display_name": "Order Table"},
            "reasons": ["The question asks about order data."]
        }
    """
    user = f"""
        User question:
        {user_question}
        
        Available L3 tables (list of L3Table objects):
        {json.dumps(l3_list, ensure_ascii=False)}
    """
    return dedent(system).strip(), dedent(user).strip()


def fetch_table_schema_dict(table_name: str) -> dict[str, Any]:
    structure_query = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'ne_data'
        AND table_name = :t
        ORDER BY ordinal_position;
    """

    with db.engine.connect() as conn:
        rows = (
            conn.execute(db.text(structure_query), {"t": table_name}).mappings().all()
        )
        fields = [
            {
                "name": r["column_name"],
                "type": r["data_type"],
                "nullable": (r["is_nullable"].lower() == "yes"),
            }
            for r in rows
        ]
    try:
        geo_structure_query = """
            SELECT f_geometry_column AS column_name, type, srid
            FROM geometry_columns
            WHERE f_table_schema = 'public'
            AND f_table_name = :t;
        """
        with db.engine.connect() as conn:
            geo_structure_rows = (
                conn.execute(db.text(geo_structure_query), {"t": table_name})
                .mappings()
                .all()
            )
        for geo_row in geo_structure_rows:
            for f in fields:
                if f["name"] == geo_row["column_name"]:
                    f["type"] = f"Geometry({geo_row['type']},{geo_row['srid']})"
    except Exception:
        pass

    return {"table": f"ne_data.{table_name}", "fields": fields}


def build_step4_prompt(
    user_question: str,
    l3_selected: dict[str, Any],
    l3_schema: dict[str, Any],
    constraints: dict[str, Any],
) -> tuple[str, str]:
    system = """
        You are an assistant that generates executable SQL for PostgreSQL/PostGIS.
        
        Output requirements:
        1. Only return valid JSON, nothing else.
        2. JSON must have exactly one key:
            - "final_sql": string containing a single executable SQL query
        
        SQL generation rules:
        - Understand the intent: lookup / filter / aggregate / spatial.
        - Generate fully executable SQL (no parameters like $1 or ?).
        - Avoid SELECT *; only include the necessary fields based on schema and question.
        - Decide the LIMIT value based on the user's question; otherwise use the provided optional constraints.
        - Do not generate DDL, EXPLAIN, or comments in SQL.
        - Only one query should be returned inside "final_sql".
        
        PostGIS Best Practices:
        - All geometry columns are in SRID 4326 (latitude/longitude).
        - **For accurate area or distance calculations** (e.g., using ST_Area, ST_Distance, ST_DWithin), cast the geometry column to the `geography` type. This correctly handles calculations on the earth's curved surface and returns results in meters.
            - Correct: `ST_Area(geom::geography)`
            - Correct: `ST_DWithin(geom_a::geography, geom_b::geography, 1000)` (for a 1km distance)
        - **Do not use `ST_Transform`** to a projected CRS (like 3857) for the purpose of calculation. Use the `geography` type instead.
        - **Ensure precision in calculations.** When performing division or rounding on the output of a spatial function like `ST_Area`, cast the result to `numeric` to avoid floating-point inaccuracies.
            - Example: `ROUND(ST_Area(geom::geography)::numeric / 1000000.0, 2) AS area_in_km2`
        
        Example of correct JSON:
        {
            "final_sql": "SELECT name, ROUND(ST_Area(geom::geography)::numeric / 1000000.0, 2) AS area_km2 FROM admin_boundaries WHERE lower(name) = 'california' LIMIT 1;"
        }
    """
    user = f"""
        User question:
        {user_question}
        
        Chosen L3: 
        {json.dumps(l3_selected, ensure_ascii=False)}
        
        Full schema of the chosen L3 table:
        {json.dumps(l3_schema, ensure_ascii=False)}
        
        Optional constraints (JSON):
        {json.dumps(constraints, ensure_ascii=False)}
    """
    return dedent(system).strip(), dedent(user).strip()


# -------- Public API --------
@lru_cache(maxsize=50)
def route(user_question: str, limit: int = 100) -> dict[str, Any]:
    """Execute the four-step routing process and return all inputs and outputs."""
    # Step1: L1
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
    s1_sys, s1_user = build_step1_prompt(user_question, l1_list)
    r1: LLMResponse = llm_service.generate(message=s1_user, system_prompt=s1_sys)
    d1 = parse_json_safely(r1.content)
    l1_ids = [int(i["id"]) for i in d1.get("l1_selected", [])]

    # Step2: L2
    l2_all: list[dict[str, Any]] = []
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
    s2_sys, s2_user = build_step2_prompt(user_question, l2_all)
    r2: LLMResponse = llm_service.generate(message=s2_user, system_prompt=s2_sys)
    d2 = parse_json_safely(r2.content)
    l2_ids = [int(i["id"]) for i in d2.get("l2_selected", [])]

    # Step3: L3
    l3_all: list[dict[str, Any]] = []
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
    s3_sys, s3_user = build_step3_prompt(user_question, l3_all)
    r3: LLMResponse = llm_service.generate(message=s3_user, system_prompt=s3_sys)
    d3 = parse_json_safely(r3.content)
    l3_selected = d3.get("l3_selected") or {}
    table_name = l3_selected.get("table_name")
    if not table_name:
        raise ValueError("No L3 table selected by LLM")

    # Step4: SQL
    l3_schema = fetch_table_schema_dict(table_name)
    constraints = {"limit": limit}
    s4_sys, s4_user = build_step4_prompt(
        user_question, l3_selected, l3_schema, constraints
    )
    r4: LLMResponse = llm_service.generate(message=s4_user, system_prompt=s4_sys)
    d4 = parse_json_safely(r4.content)

    return {
        "inputs": {
            "step1": s1_user,
            "step2": s2_user,
            "step3": s3_user,
            "step4": s4_user,
        },
        "outputs": {
            "step1": d1,
            "step2": d2,
            "step3": d3,
            "step4": d4,
        },
        "token_consumed": r1.tokens_used
        + r2.tokens_used
        + r3.tokens_used
        + r4.tokens_used,
    }
