from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

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
    results: Dict[str, Any] = field(default_factory=dict)
    sql: Optional[str] = None 
    is_fallback: bool = False
    model_used: Optional[str] = None
    reasoning: List[str] = field(default_factory=list)


@dataclass
class PreviewOut:
    ok: bool
    sql: Optional[str] = None
    reasons: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    error: Optional[Dict[str, Any]] = None
