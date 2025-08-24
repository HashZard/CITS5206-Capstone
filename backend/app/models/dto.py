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
    table: str
    columns: List[str]
    filters: Dict[str, Any] = field(default_factory=dict)
    limit: int = 100
    offset: int = 0

    def validate(self, limit_max: int = 10000):
        if not self.table:
            raise ValueError("table is required")
        if self.table not in ALLOWED_TABLES:
            raise ValueError(f"table '{self.table}' is not allowed")
        if not isinstance(self.columns, list) or not self.columns:
            raise ValueError("columns must be a non-empty list")
        if any((c or "").strip() == "*" for c in self.columns):
            raise ValueError("SELECT * is not allowed; list explicit columns")
        if not (1 <= int(self.limit) <= limit_max):
            raise ValueError(f"limit must be 1~{limit_max}")
        if int(self.offset) < 0:
            raise ValueError("offset must be >= 0")


@dataclass
class QueryOut:
    ok: bool
    data: List[Dict[str, Any]] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    error: Optional[Dict[str, Any]] = None


@dataclass
class PreviewOut:
    ok: bool
    sql: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    error: Optional[Dict[str, Any]] = None
