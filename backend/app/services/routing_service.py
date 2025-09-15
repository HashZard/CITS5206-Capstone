from __future__ import annotations
import json
from typing import Any, Dict, List, Tuple

from app.extensions import db
from app.extensions import llm_service

from app.services.three_level_service import ThreeLevelService
from app.services.llm_service import LLMResponse


class RoutingService:
    """封装 L1→L2→L3→SQL 四步在线路由流程。"""

    def __init__(self, lang: str = "en"):
        self.lang = lang

    # -------- Utils --------
    def _parse_json_safely(self, text: str):
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
        candidate = (
            s[start : end + 1] if start != -1 and end != -1 and end > start else s
        )
        return _json.loads(candidate)

    # -------- Step builders --------
    def _build_step1_prompt(
        self, user_question: str, l1_list: List[Dict[str, Any]]
    ) -> Tuple[str, str]:
        system = (
            "You are an assistant that routes a user question into a 3-level taxonomy.\n"
            "Task: Select the most relevant L1 categories for the question. Output JSON only."
        )
        user = (
            "User question:\n" + user_question + "\n\n"
            "Available L1 categories (list of L1Category objects):\n"
            + json.dumps(l1_list, ensure_ascii=False)
            + "\n\nInstructions:\n"
            "- Pick 1–2 L1 categories that best match the intent.\n"
            "- Explain briefly why they match.\n"
            "- Output JSON only with keys: l1_selected (array of {id,name}), reasons (array)"
        )
        return system, user

    def _build_step2_prompt(
        self, user_question: str, l2_list: List[Dict[str, Any]]
    ) -> Tuple[str, str]:
        system = (
            "You are an assistant that continues classification into the 3-level taxonomy.\n"
            "Task: From the given L2 categories, select the most relevant ones. Output JSON only."
        )
        user = (
            "User question:\n" + user_question + "\n\n"
            "Available L2 categories (list of L2Card objects):\n"
            + json.dumps(l2_list, ensure_ascii=False)
            + "\n\nInstructions:\n"
            "- Pick 1–2 L2 categories that best match the intent.\n"
            "- Explain briefly why they match.\n"
            "- Output JSON only with keys: l2_selected (array of {id,name}), reasons (array)"
        )
        return system, user

    def _build_step3_prompt(
        self, user_question: str, l3_list: List[Dict[str, Any]]
    ) -> Tuple[str, str]:
        system = (
            "You are an assistant that continues classification into the 3-level taxonomy.\n"
            "Task: From the given L3 tables, select exactly one L3 table that best fits the question."
        )
        user = (
            "User question:\n" + user_question + "\n\n"
            "Available L3 tables (list of L3Table objects):\n"
            + json.dumps(l3_list, ensure_ascii=False)
            + "\n\nInstructions:\n"
            "- Choose exactly one L3 table.\n"
            "- Explain briefly why it matches.\n"
            "- Output JSON only with keys: l3_selected ({id,table_name,display_name}), reasons (array)"
        )
        return system, user

    def _fetch_table_schema_dict(self, table_name: str) -> Dict[str, Any]:
        sql = (
            "SELECT column_name, data_type, is_nullable "
            "FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name=:t ORDER BY ordinal_position"
        )
        with db.engine.connect() as conn:
            rows = conn.execute(db.text(sql), {"t": table_name}).mappings().all()
        fields = [
            {
                "name": r["column_name"],
                "type": r["data_type"],
                "nullable": (r["is_nullable"].lower() == "yes"),
            }
            for r in rows
        ]
        try:
            gsql = (
                "SELECT f_geometry_column AS column_name, type, srid "
                "FROM geometry_columns WHERE f_table_schema='public' AND f_table_name=:t"
            )
            with db.engine.connect() as conn:
                grows = conn.execute(db.text(gsql), {"t": table_name}).mappings().all()
            for gr in grows:
                for f in fields:
                    if f["name"] == gr["column_name"]:
                        f["type"] = f"Geometry({gr['type']},{gr['srid']})"
        except Exception:
            pass
        return {"table": f"public.{table_name}", "fields": fields}

    def _build_step4_prompt(
        self,
        user_question: str,
        l3_selected: Dict[str, Any],
        l3_schema: Dict[str, Any],
        constraints: Dict[str, Any],
    ) -> Tuple[str, str]:
        system = (
            "You are an assistant that generates SQL for PostgreSQL/PostGIS. "
            "Return JSON with final_sql {sql, params}, assumptions (array), notes (array)."
        )
        user = (
            "User question:\n" + user_question + "\n\n"
            "Chosen L3:\n" + json.dumps(l3_selected, ensure_ascii=False) + "\n\n"
            "Full schema of the chosen L3 table:\n"
            + json.dumps(l3_schema, ensure_ascii=False)
            + "\n\n"
            "Optional constraints (JSON):\n"
            + json.dumps(constraints, ensure_ascii=False)
            + "\n\n"
            "Instructions:\n"
            "- Understand the intent (lookup / filter / aggregate / spatial).\n"
            "- Generate parameterized SQL for PostgreSQL/PostGIS with named params (:q,:iso,:lng,:lat,:meters,:limit).\n"
            "- Do not SELECT *; only include necessary fields.\n"
            "- If spatial, assume SRID=4326.\n"
            "- Respect constraints.limit if provided; otherwise use a default limit."
        )
        return system, user

    # -------- Public API --------
    def route(self, user_question: str, limit: int = 100) -> Dict[str, Any]:
        """执行四步路由，返回完整的每步输入与输出。"""
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
        s1_sys, s1_user = self._build_step1_prompt(user_question, l1_list)
        r1: LLMResponse = llm_service.generate(message=s1_user, system_prompt=s1_sys)
        d1 = self._parse_json_safely(r1.content)
        l1_ids = [int(i["id"]) for i in d1.get("l1_selected", [])]

        # Step2: L2
        l2_all: List[Dict[str, Any]] = []
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
        s2_sys, s2_user = self._build_step2_prompt(user_question, l2_all)
        r2: LLMResponse = llm_service.generate(message=s2_user, system_prompt=s2_sys)
        d2 = self._parse_json_safely(r2.content)
        l2_ids = [int(i["id"]) for i in d2.get("l2_selected", [])]

        # Step3: L3
        l3_all: List[Dict[str, Any]] = []
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
        s3_sys, s3_user = self._build_step3_prompt(user_question, l3_all)
        r3: LLMResponse = llm_service.generate(message=s3_user, system_prompt=s3_sys)
        d3 = self._parse_json_safely(r3.content)
        l3_selected = d3.get("l3_selected") or {}
        table_name = l3_selected.get("table_name")
        if not table_name:
            raise ValueError("No L3 table selected by LLM")

        # Step4: SQL
        l3_schema = self._fetch_table_schema_dict(table_name)
        constraints = {"limit": limit}
        s4_sys, s4_user = self._build_step4_prompt(
            user_question, l3_selected, l3_schema, constraints
        )
        r4: LLMResponse = llm_service.generate(message=s4_user, system_prompt=s4_sys)
        d4 = self._parse_json_safely(r4.content)

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
        }
