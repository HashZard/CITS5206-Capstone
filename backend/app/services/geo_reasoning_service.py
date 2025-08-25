from typing import Any, Dict, Optional

from app.services.three_level_service import ThreeLevelService
from app.services.llm_service import LLMService


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
        # TODO: format l1_list into the prompt according to the spec in the repo docs.
        raise NotImplementedError("build_l1_prompt not implemented")

    def build_l2_prompt(self, user_question: str, l2_list: Any) -> str:
        """Return a prompt for L2 selection.

		Expected JSON keys from the assistant:
		  - l2_selected: [{id, name}, ...]
		  - reasons: [str,...]
		"""
        # TODO: format l2_list into the prompt.
        raise NotImplementedError("build_l2_prompt not implemented")

    def build_l3_prompt(self, user_question: str, l3_list: Any) -> str:
        """Return a prompt for L3 (table) selection.

		The assistant must choose exactly one table and output JSON with:
		  - l3_selected: {id, table_name, display_name}
		  - reasons: [str,...]
		"""
        # TODO: format l3_list into the prompt.
        raise NotImplementedError("build_l3_prompt not implemented")

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
        # TODO: format schema and constraints into the prompt.
        raise NotImplementedError("build_sql_prompt not implemented")

    # ----------------------------- Parsers / Validators -----------------------------
    def parse_l1_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for L1 selection and validate structure.

		Returns a dict with keys 'l1_selected' and 'reasons'.
		Raise ValueError on malformed output.
		"""
        # Placeholder: real implementation should robustly parse JSON from the LLM.
        raise NotImplementedError("parse_l1_response not implemented")

    def parse_l2_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for L2 selection."""
        raise NotImplementedError("parse_l2_response not implemented")

    def parse_l3_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for L3 selection."""
        raise NotImplementedError("parse_l3_response not implemented")

    def parse_sql_response(self, raw_text: str) -> Dict[str, Any]:
        """Parse the LLM raw response for SQL generation.

		Expected to return dict with final_sql (sql+params), assumptions and notes.
		"""
        raise NotImplementedError("parse_sql_response not implemented")

    # ----------------------------- Reasoning -----------------------------
    def start_geo_reasoning(self, user_question: str) -> str:
        """Steps (conceptual):
		  1. Build L1 prompt and call LLM to obtain L1 ids.
		  2. Build L2 prompt and call LLM to obtain L2 ids.
		  3. Build L3 prompt and call LLM to pick a table.
		  4. Build SQL prompt (with chosen L3 schema) and call LLM to generate SQL.

		Returns:
			final_sql
		"""
        raise NotImplementedError("start_geo_reasoning not implemented")
