"""
三层架构数据服务层 (L1-L2-L3)
用于查询和操作三层架构相关的表数据
"""

from typing import List, Optional

from app.extensions import db
from app.models.three_level_models import (
    L1Category,
    L2Card,
    L3Table,
    MapL1L2,
    MapL2L3,
    PromptTemplate,
    rows_to_l1_categories,
    rows_to_l2_cards,
    rows_to_l3_tables,
    rows_to_map_l1_l2,
    rows_to_map_l2_l3,
    rows_to_prompt_templates,
)


class ThreeLevelService:
    """三层架构数据服务类"""

    @staticmethod
    def get_all_l1_categories() -> List[L1Category]:
        """获取所有 L1 类别"""
        sql = """
        SELECT id, name, description, dimension, keywords, weight, active, version, updated_at
        FROM l1_category
        WHERE active = true
        ORDER BY weight DESC, name
        """
        with db.engine.connect() as conn:
            rows = conn.execute(db.text(sql)).mappings().all()
        return rows_to_l1_categories([dict(row) for row in rows])

    @staticmethod
    def get_l1_category_by_id(category_id: int) -> Optional[L1Category]:
        """根据ID获取 L1 类别"""
        sql = """
        SELECT id, name, description, dimension, keywords, weight, active, version, updated_at
        FROM l1_category
        WHERE id = :id AND active = true
        """
        with db.engine.connect() as conn:
            row = conn.execute(db.text(sql), {"id": category_id}).mappings().first()

        if row:
            from app.models.three_level_models import dict_to_l1_category

            return dict_to_l1_category(dict(row))
        return None

    @staticmethod
    def get_all_l2_cards() -> List[L2Card]:
        """获取所有 L2 概述卡"""
        sql = """
        SELECT id, name, description_short, keywords, allowed_dimensions, 
               weight, active, version, updated_at
        FROM l2_card
        WHERE active = true
        ORDER BY weight DESC, name
        """
        with db.engine.connect() as conn:
            rows = conn.execute(db.text(sql)).mappings().all()
        return rows_to_l2_cards([dict(row) for row in rows])

    @staticmethod
    def get_l2_cards_by_l1(l1_id: int) -> List[L2Card]:
        """根据 L1 ID 获取关联的 L2 概述卡"""
        sql = """
        SELECT l2.id, l2.name, l2.description_short, l2.keywords, 
               l2.allowed_dimensions, l2.weight, l2.active, l2.version, l2.updated_at
        FROM l2_card l2
        JOIN map_l1_l2 m ON l2.id = m.l2_id
        WHERE m.l1_id = :l1_id AND l2.active = true
        ORDER BY m.weight DESC, l2.weight DESC, l2.name
        """
        with db.engine.connect() as conn:
            rows = conn.execute(db.text(sql), {"l1_id": l1_id}).mappings().all()
        return rows_to_l2_cards([dict(row) for row in rows])

    @staticmethod
    def get_all_l3_tables() -> List[L3Table]:
        """获取所有 L3 表内核"""
        sql = """
        SELECT id, table_name, display_name, summary, core_fields, keywords, 
               use_cases, tablecard_detail_md, schema_ref, active, version, updated_at
        FROM l3_table
        WHERE active = true
        ORDER BY display_name
        """
        with db.engine.connect() as conn:
            rows = conn.execute(db.text(sql)).mappings().all()
        return rows_to_l3_tables([dict(row) for row in rows])

    @staticmethod
    def get_l3_tables_by_l2(l2_id: int) -> List[L3Table]:
        """根据 L2 ID 获取关联的 L3 表内核"""
        sql = """
        SELECT l3.id, l3.table_name, l3.display_name, l3.summary, l3.core_fields,
               l3.keywords, l3.use_cases, l3.tablecard_detail_md, l3.schema_ref,
               l3.active, l3.version, l3.updated_at
        FROM l3_table l3
        JOIN map_l2_l3 m ON l3.id = m.l3_id
        WHERE m.l2_id = :l2_id AND l3.active = true
        ORDER BY m.weight DESC, l3.display_name
        """
        with db.engine.connect() as conn:
            rows = conn.execute(db.text(sql), {"l2_id": l2_id}).mappings().all()
        return rows_to_l3_tables([dict(row) for row in rows])

    @staticmethod
    def get_l3_table_by_name(table_name: str) -> Optional[L3Table]:
        """根据表名获取 L3 表内核"""
        sql = """
        SELECT id, table_name, display_name, summary, core_fields, keywords,
               use_cases, tablecard_detail_md, schema_ref, active, version, updated_at
        FROM l3_table
        WHERE table_name = :table_name AND active = true
        """
        with db.engine.connect() as conn:
            row = (
                conn.execute(db.text(sql), {"table_name": table_name})
                .mappings()
                .first()
            )

        if row:
            from app.models.three_level_models import dict_to_l3_table

            return dict_to_l3_table(dict(row))
        return None

    @staticmethod
    def get_prompt_template(stage: str, lang: str = "en") -> Optional[PromptTemplate]:
        """获取指定阶段的提示模板"""
        sql = """
        SELECT id, stage, lang, system_text, context_tmpl, user_tmpl, 
               json_schema, updated_at
        FROM prompt_templates
        WHERE stage = :stage AND lang = :lang
        ORDER BY updated_at DESC
        LIMIT 1
        """
        with db.engine.connect() as conn:
            row = (
                conn.execute(db.text(sql), {"stage": stage, "lang": lang})
                .mappings()
                .first()
            )

        if row:
            from app.models.three_level_models import dict_to_prompt_template

            return dict_to_prompt_template(dict(row))
        return None

    @staticmethod
    def search_tables_by_keyword(keyword: str) -> List[L3Table]:
        """根据关键词搜索表"""
        sql = """
        SELECT id, table_name, display_name, summary, core_fields, keywords,
               use_cases, tablecard_detail_md, schema_ref, active, version, updated_at
        FROM l3_table
        WHERE active = true 
        AND (
            display_name ILIKE :pattern 
            OR summary ILIKE :pattern
            OR :keyword = ANY(keywords)
            OR :keyword = ANY(use_cases)
        )
        ORDER BY 
            CASE WHEN display_name ILIKE :pattern THEN 1 ELSE 2 END,
            display_name
        """
        pattern = f"%{keyword}%"
        with db.engine.connect() as conn:
            rows = (
                conn.execute(db.text(sql), {"keyword": keyword, "pattern": pattern})
                .mappings()
                .all()
            )
        return rows_to_l3_tables([dict(row) for row in rows])

    @staticmethod
    def get_full_hierarchy() -> dict:
        """获取完整的三层架构层次结构"""
        l1_categories = ThreeLevelService.get_all_l1_categories()
        result = []

        for l1 in l1_categories:
            l2_cards = ThreeLevelService.get_l2_cards_by_l1(l1.id)
            l1_data = {"l1": l1, "l2_cards": []}

            for l2 in l2_cards:
                l3_tables = ThreeLevelService.get_l3_tables_by_l2(l2.id)
                l2_data = {"l2": l2, "l3_tables": l3_tables}
                l1_data["l2_cards"].append(l2_data)

            result.append(l1_data)

        return {"hierarchy": result}
