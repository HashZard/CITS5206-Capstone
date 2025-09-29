from dataclasses import dataclass, field
from typing import Any

ALLOWED_TABLES = {
    "l1_category",
    "l2_card",
    "l3_table",
    "map_l1_l2",
    "map_l2_l3",
    "prompt_templates",
}


@dataclass
class QueryIn:
    question: str

    def validate(self):
        if not self.question:
            raise ValueError("Query must have a non-empty question!")


@dataclass
class QueryOut:
    sql: str
    results: list[dict[str, Any]]
    reasoning: list[str]
    model_used: str
    is_fallback: bool = False
