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
            raise ValueError("question is required")


@dataclass
class QueryOut:
    sql: str
    results: list[dict[str, Any]]
    reasoning: list[str]
    model_used: str
    is_fallback: bool = False


@dataclass
class PreviewOut:
    ok: bool
    sql: str = None
    reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)
    error: dict[str, Any] | None = None
