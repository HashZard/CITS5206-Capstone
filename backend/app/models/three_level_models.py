"""
三层架构数据模型 (L1-L2-L3)
基于 initial_table.sql 的表结构设计
用于承接从 SQL 查询返回的三层架构数据对象
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class L1Category:
    """L1 顶层类别数据模型"""

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
    """L2 概述卡数据模型"""

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
    """L3 表内核数据模型"""

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
    """L1 与 L2 的映射关系"""

    l1_id: int
    l2_id: int
    weight: int = 100


@dataclass
class MapL2L3:
    """L2 与 L3 的映射关系"""

    l2_id: int
    l3_id: int
    weight: int = 100


@dataclass
class PromptTemplate:
    """Prompt 模板数据模型"""

    id: int
    stage: str  # L1 | L2 | L3 | CLARIFY | SQL_GEN
    lang: str = "en"
    system_text: str = ""
    context_tmpl: str = ""
    user_tmpl: str = ""
    json_schema: str | None = None
    updated_at: datetime | None = None


# 三层架构数据转换工具函数
def dict_to_l1_category(data: dict) -> L1Category:
    """将字典转换为 L1Category 对象"""
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
    """将字典转换为 L2Card 对象"""
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
    """将字典转换为 L3Table 对象"""
    # 处理 JSONB 字段
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
    """将字典转换为 MapL1L2 对象"""
    return MapL1L2(
        l1_id=data["l1_id"], l2_id=data["l2_id"], weight=data.get("weight", 100)
    )


def dict_to_map_l2_l3(data: dict) -> MapL2L3:
    """将字典转换为 MapL2L3 对象"""
    return MapL2L3(
        l2_id=data["l2_id"], l3_id=data["l3_id"], weight=data.get("weight", 100)
    )


# 示例：
# demo = PromptTemplate(
#     id=1,
#     stage="L1",
#     lang="zh",
#     system_text="请根据以下卡片信息...",
#     context_tmpl="{{cards_json}}",
#     user_tmpl="用户输入：{{query}}",
#     json_schema=None,
#     updated_at="2024-06-01T12:00:00+08:00"
# )
def dict_to_prompt_template(data: dict) -> PromptTemplate:
    """将字典转换为 PromptTemplate 对象"""
    return PromptTemplate(
        id=data["id"],  # 主键ID
        stage=data["stage"],  # 阶段（如 L1/L2/L3/CLARIFY/SQL_GEN）
        lang=data.get("lang", "en"),  # 语言（默认'en'）
        system_text=data.get("system_text", ""),  # 系统提示文本
        context_tmpl=data.get("context_tmpl", ""),  # 上下文模板
        user_tmpl=data.get("user_tmpl", ""),  # 用户输入模板
        json_schema=data.get("json_schema"),  # JSON Schema（可选）
        updated_at=data.get("updated_at"),  # 更新时间
    )


# 三层架构批量转换函数
def rows_to_l1_categories(rows: list[dict]) -> list[L1Category]:
    """批量转换 L1Category 列表"""
    return [dict_to_l1_category(row) for row in rows]


def rows_to_l2_cards(rows: list[dict]) -> list[L2Card]:
    """批量转换 L2Card 列表"""
    return [dict_to_l2_card(row) for row in rows]


def rows_to_l3_tables(rows: list[dict]) -> list[L3Table]:
    """批量转换 L3Table 列表"""
    return [dict_to_l3_table(row) for row in rows]


def rows_to_map_l1_l2(rows: list[dict]) -> list[MapL1L2]:
    """批量转换 MapL1L2 列表"""
    return [dict_to_map_l1_l2(row) for row in rows]


def rows_to_map_l2_l3(rows: list[dict]) -> list[MapL2L3]:
    """批量转换 MapL2L3 列表"""
    return [dict_to_map_l2_l3(row) for row in rows]


def rows_to_prompt_templates(rows: list[dict]) -> list[PromptTemplate]:
    """批量转换 PromptTemplate 列表"""
    return [dict_to_prompt_template(row) for row in rows]
