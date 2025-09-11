import json
from typing import Any, Dict, Optional

from app.services.three_level_service import ThreeLevelService
from app.services.llm_service import LLMService
from app.prompt_templates import prompts as prompt_config
from string import Template
"""
Usage:
    service = GeoReasoningService(llm_service, three_level_service)
    user_input = "What are the characteristics of Lake Superior?"
    response = service.process_user_question(user_input)
"""


class GeoReasoningService:
    """Service that builds prompts and reasoning from L1 -> L2 -> L3 -> SQL.

	This file provides function signatures and docstrings only. It does not implement
	the actual LLM invocation or parsing logic — those should be implemented using
	the project's `LLMService` and `ThreeLevelService`.
	"""

    def __init__(self, llm_service: LLMService,
                 three_level_service: ThreeLevelService):
        """Initialize with concrete services.

		Args:
			llm_service: service used to call the LLM (must expose a generate/call method).
			three_level_service: service used to access L1/L2/L3 metadata and helpers.
		"""
        self.llm = llm_service
        self.three_level = three_level_service

    # ----------------------------- Prompt builders -----------------------------
    def build_l1_prompt(self, user_question: str, l1_list: Any) -> str:
        """Return a single-string prompt for L1 selection.

		The prompt must instruct the assistant to return JSON with keys:
		  - l1_selected: [{id, name}, ...]
		  - reasons: [str,...]

		Args:
			user_question: the user's natural language question.
			l1_list: list of L1Category objects or serializable representation.

		Returns:
			A prompt string ready to be passed to the LLM.
		"""
        tmpl = Template(prompt_config.L1_PROMPT_TEMPLATE)
        return tmpl.substitute(user_question=user_question, l1_list=l1_list)

    def build_l2_prompt(self, user_question: str, l2_list: Any) -> str:
        """Return a prompt for L2 selection.

		Expected JSON keys from the assistant:
		  - l2_selected: [{id, name}, ...]
		  - reasons: [str,...]
		"""
        tmpl = Template(prompt_config.L2_PROMPT_TEMPLATE)
        return tmpl.substitute(user_question=user_question, l2_list=l2_list)

    def build_l3_prompt(self, user_question: str, l3_list: Any) -> str:
        """Return a prompt for L3 (table) selection.

		The assistant must choose exactly one table and output JSON with:
		  - l3_selected: {id, table_name, display_name}
		  - reasons: [str,...]
		"""
        tmpl = Template(prompt_config.L3_PROMPT_TEMPLATE)
        return tmpl.substitute(user_question=user_question, l3_list=l3_list)

    def build_sql_prompt(self,
                         user_question: str,
                         l3_selected: Dict[str, Any],
                         l3_schema: Any,
                         constraints: Optional[Dict[str, Any]] = None) -> str:
        """Return a prompt for SQL generation for PostgreSQL/PostGIS.

		The assistant must return JSON with keys:
		  - final_sql: {sql: str, params: object}
		  - assumptions: [str,...]
		  - notes: [str,...]

		Params should use named placeholders like :q, :iso, :lng, :lat, :meters, :limit.
		"""
        constraints_str = constraints if constraints is not None else {}
        tmpl = Template(prompt_config.SQL_PROMPT_TEMPLATE)
        return tmpl.substitute(
            user_question=user_question,
            l3_selected=l3_selected,
            l3_schema=l3_schema,
            constraints=constraints_str,
        )

    # ----------------------------- Parsers / Validators -----------------------------
    def parse_json_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for JSON content."""
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON response")

    def parse_l1_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for L1 selection and validate structure.

		Returns a dict with keys 'l1_selected' and 'reasons'.
		Raise ValueError on malformed output.
		"""
        response = self.parse_json_response(raw_text)
        if "l1_selected" not in response or "reasons" not in response:
            raise ValueError("Malformed L1 response")
        return response

    def parse_l2_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for L2 selection."""
        response = self.parse_json_response(raw_text)
        if "l2_selected" not in response or "reasons" not in response:
            raise ValueError("Malformed L2 response")
        return response

    def parse_l3_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for L3 selection."""
        response = self.parse_json_response(raw_text)
        if "l3_selected" not in response or "reasons" not in response:
            raise ValueError("Malformed L3 response")
        return response

    def parse_sql_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for SQL generation.

		Expected to return dict with final_sql (sql+params), assumptions and notes.
		"""
        response = self.parse_json_response(raw_text)
        if "final_sql" not in response or "assumptions" not in response or "notes" not in response:
            raise ValueError("Malformed SQL response")
        return response

    # ----------------------------- Reasoning -----------------------------
    def start_geo_reasoning(
            self,
            user_question: str,
            constraints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Steps (conceptual):
		  1. Build L1 prompt and call LLM to obtain L1 ids.
		  2. Build L2 prompt and call LLM to obtain L2 ids.
		  3. Build L3 prompt and call LLM to pick a table.
		  4. Build SQL prompt (with chosen L3 schema) and call LLM to generate SQL.

		Returns:
			final_sql
		"""

        l1_list = self.three_level.get_all_l1_categories()
        l1_prompt = self.build_l1_prompt(user_question, l1_list)
        l1_response = self.llm.generate(l1_prompt)
        l1_selected = self.parse_l1_response(
            l1_response.content).get("l1_selected")

        l2_list = []
        for l1 in l1_selected:
            l2_list.extend(self.three_level.get_l2_cards_by_l1([l1['id']]))
        l2_prompt = self.build_l2_prompt(user_question, l2_list)
        l2_response = self.llm.generate(l2_prompt)
        l2_selected = self.parse_l2_response(
            l2_response.content).get("l2_selected")

        l3_list = []
        for l2 in l2_selected:
            l3_list.extend(self.three_level.get_l3_tables_by_l2([l2['id']]))
        l3_prompt = self.build_l3_prompt(user_question, l3_list)
        l3_response = self.llm.generate(l3_prompt)
        l3_selected = self.parse_l3_response(
            l3_response.content).get("l3_selected")

        l3_schema = []
        for l3 in l3_selected:
            l3_schema.extend(self.three_level.get_l3_table_schema(l3['id']))
        sql_prompt = self.build_sql_prompt(user_question, l3_selected,
                                           l3_schema, constraints)
        sql_response = self.llm.generate(sql_prompt)
        sql_result = self.parse_sql_response(
            sql_response.content).get("final_sql")

        return sql_result
