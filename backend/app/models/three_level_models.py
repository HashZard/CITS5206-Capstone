"""
Three-level hierarchy data models (L1-L2-L3).
Based on the table structures defined in initial_table.sql.
Used to capture the objects returned from SQL queries for the hierarchy.
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class L1Category:
    """Data model for L1 top-level categories."""

    id: int
    name: str
    description: str | None = None
    dimension: str | None = None
    keywords: list[str] = None
    weight: int = 100
    active: bool = True
    version: int = 1
    updated_at: datetime | None = None

    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []


@dataclass
class L2Card:
    """Data model for L2 overview cards."""

    id: int
    name: str
    description_short: str
    keywords: list[str] = None
    allowed_dimensions: list[str] = None
    weight: int = 100
    active: bool = True
    version: int = 1
    updated_at: datetime | None = None

    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.allowed_dimensions is None:
            self.allowed_dimensions = []


@dataclass
class L3Table:
    """Data model for L3 table cores."""

    id: int
    table_name: str
    display_name: str
    summary: str
    core_fields: list[str]
    keywords: list[str] = None
    use_cases: list[str] = None
    tablecard_detail_md: str = ""
    schema_ref: str | None = None
    active: bool = True
    version: int = 1
    updated_at: datetime | None = None

    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.use_cases is None:
            self.use_cases = []


@dataclass
class MapL1L2:
    """Mapping between L1 categories and L2 cards."""

    l1_id: int
    l2_id: int
    weight: int = 100


@dataclass
class MapL2L3:
    """Mapping between L2 cards and L3 tables."""

    l2_id: int
    l3_id: int
    weight: int = 100


@dataclass
class PromptTemplate:
    """Data model for prompt templates."""

    id: int
    stage: str  # L1 | L2 | L3 | CLARIFY | SQL_GEN
    lang: str = "en"
    system_text: str = ""
    context_tmpl: str = ""
    user_tmpl: str = ""
    json_schema: str | None = None
    updated_at: datetime | None = None


# Conversion helpers for the three-level hierarchy.
def dict_to_l1_category(data: dict) -> L1Category:
    """Convert a dictionary to an L1Category instance."""
    return L1Category(
        id=data["id"],
        name=data["name"],
        description=data.get("description"),
        dimension=data.get("dimension"),
        keywords=data.get("keywords", []),
        weight=data.get("weight", 100),
        active=data.get("active", True),
        version=data.get("version", 1),
        updated_at=data.get("updated_at"),
    )


def dict_to_l2_card(data: dict) -> L2Card:
    """Convert a dictionary to an L2Card instance."""
    return L2Card(
        id=data["id"],
        name=data["name"],
        description_short=data["description_short"],
        keywords=data.get("keywords", []),
        allowed_dimensions=data.get("allowed_dimensions", []),
        weight=data.get("weight", 100),
        active=data.get("active", True),
        version=data.get("version", 1),
        updated_at=data.get("updated_at"),
    )


def dict_to_l3_table(data: dict) -> L3Table:
    """Convert a dictionary to an L3Table instance."""
    # Handle JSONB fields.
    core_fields = data.get("core_fields", [])
    if isinstance(core_fields, str):
        import json

        core_fields = json.loads(core_fields)

    return L3Table(
        id=data["id"],
        table_name=data["table_name"],
        display_name=data["display_name"],
        summary=data["summary"],
        core_fields=core_fields,
        keywords=data.get("keywords", []),
        use_cases=data.get("use_cases", []),
        tablecard_detail_md=data.get("tablecard_detail_md", ""),
        schema_ref=data.get("schema_ref"),
        active=data.get("active", True),
        version=data.get("version", 1),
        updated_at=data.get("updated_at"),
    )


def dict_to_map_l1_l2(data: dict) -> MapL1L2:
    """Convert a dictionary to a MapL1L2 instance."""
    return MapL1L2(
        l1_id=data["l1_id"], l2_id=data["l2_id"], weight=data.get("weight", 100)
    )


def dict_to_map_l2_l3(data: dict) -> MapL2L3:
    """Convert a dictionary to a MapL2L3 instance."""
    return MapL2L3(
        l2_id=data["l2_id"], l3_id=data["l3_id"], weight=data.get("weight", 100)
    )


# Example:
# demo = PromptTemplate(
#     id=1,
#     stage="L1",
#     lang="zh",
#     system_text="Please reference the following card information...",
#     context_tmpl="{{cards_json}}",
#     user_tmpl="User input: {{query}}",
#     json_schema=None,
#     updated_at="2024-06-01T12:00:00+08:00"
# )
def dict_to_prompt_template(data: dict) -> PromptTemplate:
    """Convert a dictionary to a PromptTemplate instance."""
    return PromptTemplate(
        id=data["id"],  # Primary key ID.
        stage=data["stage"],  # Stage such as L1/L2/L3/CLARIFY/SQL_GEN.
        lang=data.get("lang", "en"),  # Language (defaults to 'en').
        system_text=data.get("system_text", ""),  # System prompt text.
        context_tmpl=data.get("context_tmpl", ""),  # Context template.
        user_tmpl=data.get("user_tmpl", ""),  # User prompt template.
        json_schema=data.get("json_schema"),  # JSON schema (optional).
        updated_at=data.get("updated_at"),  # Last updated timestamp.
    )


# Batch conversion helpers for the three-level hierarchy.
def rows_to_l1_categories(rows: list[dict]) -> list[L1Category]:
    """Convert a list of dictionaries to L1Category instances."""
    return [dict_to_l1_category(row) for row in rows]


def rows_to_l2_cards(rows: list[dict]) -> list[L2Card]:
    """Convert a list of dictionaries to L2Card instances."""
    return [dict_to_l2_card(row) for row in rows]


def rows_to_l3_tables(rows: list[dict]) -> list[L3Table]:
    """Convert a list of dictionaries to L3Table instances."""
    return [dict_to_l3_table(row) for row in rows]


def rows_to_map_l1_l2(rows: list[dict]) -> list[MapL1L2]:
    """Convert a list of dictionaries to MapL1L2 instances."""
    return [dict_to_map_l1_l2(row) for row in rows]


def rows_to_map_l2_l3(rows: list[dict]) -> list[MapL2L3]:
    """Convert a list of dictionaries to MapL2L3 instances."""
    return [dict_to_map_l2_l3(row) for row in rows]


def rows_to_prompt_templates(rows: list[dict]) -> list[PromptTemplate]:
    """Convert a list of dictionaries to PromptTemplate instances."""
    return [dict_to_prompt_template(row) for row in rows]
