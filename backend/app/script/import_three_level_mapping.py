from __future__ import annotations

"""
从 JSON 文件导入三层架构（L1/L2/L3）映射关系

功能说明:
----------
1. 导入三层架构的映射关系，包括：
   - L1 类别（顶层分类）
   - L2 卡片（中层概述）
   - L1-L2 映射关系
   - L2-L3 映射关系
2. 支持增量导入或完全重置
3. 提供预览模式
4. 保留 L3 表数据不变

必要条件:
----------
1. 数据库中已存在所有被引用的 L3 表
2. 数据库连接配置正确（POSTGRES_DSN 环境变量）
3. JSON 文件符合指定格式

JSON 格式示例:
-------------
{
  "l1": [
    {
      "name": "L1 category name",        # L1 类别名称（必填）
      "description": "L1 description",    # L1 描述（选填）
      "keywords": ["kw1", "kw2"],        # L1 关键词（选填）
      "l2": [                            # L2 卡片列表（必填）
        {
          "name": "L2 card name",        # L2 卡片名称（必填）
          "description": "L2 description",# L2 描述（选填）
          "keywords": ["kwA", "kwB"],    # L2 关键词（选填）
          "l3": [                        # L3 表名列表（必填）
            "table_name_1",
            "table_name_2"
          ]
        }
      ]
    }
  ]
}

使用方法:
----------
1. 预览模式（不实际修改数据库）:
   python -m app.script.import_three_level_mapping mapping.json --dry-run

2. 标准导入（清空现有数据后导入）:
   python -m app.script.import_three_level_mapping mapping.json

3. 增量导入（保留现有数据）:
   python -m app.script.import_three_level_mapping mapping.json --keep-existing

4. 指定配置:
   python -m app.script.import_three_level_mapping mapping.json --config production

参数说明:
----------
json_file        JSON 映射文件的路径（必填）
--dry-run        预览模式，只显示将要执行的操作
--keep-existing  保留现有数据（默认会清空）
--config         Flask 配置名（默认 development）

数据处理说明:
------------
1. 清空操作（默认）会按顺序清空:
   - map_l2_l3（L2-L3 映射表）
   - map_l1_l2（L1-L2 映射表）
   - l2_card（L2 卡片表）
   - l1_category（L1 类别表）
   注意：l3_table 表的数据会保留

2. 导入操作:
   - 检查 L3 表是否存在
   - 创建 L1 类别（如果不存在）
   - 创建 L2 卡片（如果不存在）
   - 建立 L1-L2 映射
   - 建立 L2-L3 映射

错误处理:
---------
1. 找不到 L3 表时会记录警告但继续处理
2. JSON 解析错误会终止程序
3. 数据库错误会记录但尽可能继续处理
4. 所有错误和警告都会记录到日志

示例 JSON:
---------
{
  "l1": [
    {
      "name": "地理特征",
      "description": "地球表面的自然地理特征",
      "keywords": ["地理", "地形", "地貌"],
      "l2": [
        {
          "name": "水体",
          "description": "各类水体的地理信息",
          "keywords": ["湖泊", "河流", "海洋"],
          "l3": [
            "ne_10m_lakes",
            "ne_10m_rivers_lake_centerlines"
          ]
        }
      ]
    }
  ]
}
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.extensions import db
from app.models.three_level_models import (
    L1Category,
    L2Card,
    L3Table,
    dict_to_l1_category,
    dict_to_l2_card,
)


def load_json_file(file_path: str) -> dict:
    """加载并解析 JSON 文件"""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_or_create_l1(l1_data: dict, dry_run: bool = False) -> int:
    """获取或创建 L1 类别，返回 id"""
    # 构建基础 L1 数据
    l1 = {
        "name": l1_data["name"],
        "description": l1_data.get("description", ""),
        "keywords": l1_data.get("keywords", []),
        "active": True,
        "version": 1,
    }

    if dry_run:
        logging.info(f"[dry-run] 将创建 L1: {l1}")
        return -1

    try:
        with db.engine.begin() as conn:
            # 先查找是否存在
            sql = text("SELECT id FROM l1_category WHERE name = :name")
            result = conn.execute(sql, {"name": l1["name"]}).first()
            if result:
                return result[0]

            # 不存在则创建
            sql = text(
                """
                INSERT INTO l1_category (
                    name, description, keywords, 
                    active, version, updated_at
                ) VALUES (
                    :name, :description, :keywords, 
                    :active, :version, NOW()
                ) RETURNING id
            """
            )
            result = conn.execute(sql, l1).first()
            if not result:
                raise ValueError(f"创建 L1 类别失败: {l1['name']}")
            return result[0]
    except Exception as e:
        logging.error(f"处理 L1 类别 {l1['name']} 时发生错误: {e}")
        raise


def get_or_create_l2(l2_data: dict, dry_run: bool = False) -> int:
    """获取或创建 L2 卡片，返回 id"""
    # 构建基础 L2 数据
    l2 = {
        "name": l2_data["name"],
        "description_short": l2_data.get("description", ""),
        "keywords": l2_data.get("keywords", []),
        "active": True,
        "version": 1,
    }

    if dry_run:
        logging.info(f"[dry-run] 将创建 L2: {l2}")
        return -1

    try:
        with db.engine.begin() as conn:
            # 先查找是否存在
            sql = text("SELECT id FROM l2_card WHERE name = :name")
            result = conn.execute(sql, {"name": l2["name"]}).first()
            if result:
                return result[0]

            # 不存在则创建
            sql = text(
                """
                INSERT INTO l2_card (
                    name, description_short, keywords, 
                    active, version, updated_at
                ) VALUES (
                    :name, :description_short, :keywords, 
                    :active, :version, NOW()
                ) RETURNING id
            """
            )
            result = conn.execute(sql, l2).first()
            if not result:
                raise ValueError(f"创建 L2 卡片失败: {l2['name']}")
            return result[0]
    except Exception as e:
        logging.error(f"处理 L2 卡片 {l2['name']} 时发生错误: {e}")
        raise


def get_l3_ids(table_names: List[str]) -> List[int]:
    """获取 L3 表的 id 列表"""
    if not table_names:
        return []

    sql = text(
        """
        SELECT id, table_name 
        FROM l3_table 
        WHERE table_name = ANY(:table_names)
    """
    )

    with db.engine.connect() as conn:
        result = conn.execute(sql, {"table_names": table_names}).mappings().all()
        return [row["id"] for row in result]


def create_l1_l2_mapping(l1_id: int, l2_id: int, dry_run: bool = False) -> None:
    """创建 L1-L2 映射关系"""
    if dry_run:
        logging.info(f"[dry-run] 将创建 L1-L2 映射: {l1_id} -> {l2_id}")
        return

    sql = text(
        """
        INSERT INTO map_l1_l2 (l1_id, l2_id, weight)
        VALUES (:l1_id, :l2_id, 100)
        ON CONFLICT (l1_id, l2_id) DO NOTHING
    """
    )

    with db.engine.begin() as conn:
        conn.execute(sql, {"l1_id": l1_id, "l2_id": l2_id})


def create_l2_l3_mapping(l2_id: int, l3_id: int, dry_run: bool = False) -> None:
    """创建 L2-L3 映射关系"""
    if dry_run:
        logging.info(f"[dry-run] 将创建 L2-L3 映射: {l2_id} -> {l3_id}")
        return

    sql = text(
        """
        INSERT INTO map_l2_l3 (l2_id, l3_id, weight)
        VALUES (:l2_id, :l3_id, 100)
        ON CONFLICT (l2_id, l3_id) DO NOTHING
    """
    )

    with db.engine.begin() as conn:
        conn.execute(sql, {"l2_id": l2_id, "l3_id": l3_id})


def clear_existing_data(dry_run: bool = False) -> None:
    """清空现有的 L1、L2 及映射数据"""
    if dry_run:
        logging.info("[dry-run] 将清空以下表:")
        logging.info("- map_l2_l3 (L2-L3 映射)")
        logging.info("- map_l1_l2 (L1-L2 映射)")
        logging.info("- l2_card (L2 卡片)")
        logging.info("- l1_category (L1 类别)")
        return

    with db.engine.begin() as conn:
        # 按依赖关系顺序清空表
        # 1. 先清空映射表
        conn.execute(text("DELETE FROM map_l2_l3"))
        conn.execute(text("DELETE FROM map_l1_l2"))
        # 2. 再清空 L1 和 L2 表
        conn.execute(text("DELETE FROM l2_card"))
        conn.execute(text("DELETE FROM l1_category"))

        # 重置序列（如果使用）
        conn.execute(text("ALTER SEQUENCE l1_category_id_seq RESTART WITH 1"))
        conn.execute(text("ALTER SEQUENCE l2_card_id_seq RESTART WITH 1"))

        logging.info("已清空所有相关表")


def process_mapping(mapping: dict, dry_run: bool = False) -> None:
    """处理三层映射关系"""
    # 首先清空现有数据
    clear_existing_data(dry_run)
    for l1_item in mapping.get("l1", []):
        try:
            # 创建或获取 L1
            l1_id = get_or_create_l1(l1_item, dry_run)

            # 处理 L2 列表
            for l2_item in l1_item.get("l2", []):
                # 创建或获取 L2
                l2_id = get_or_create_l2(l2_item, dry_run)

                # 创建 L1-L2 映射
                create_l1_l2_mapping(l1_id, l2_id, dry_run)

                # 获取 L3 ID 并创建 L2-L3 映射
                l3_table_names = l2_item.get("l3", [])
                l3_ids = [] if dry_run else get_l3_ids(l3_table_names)

                if len(l3_ids) != len(l3_table_names):
                    missing = set(l3_table_names) - set(l3_ids)
                    logging.warning(f"部分 L3 表未找到: {missing}")

                for l3_id in l3_ids:
                    create_l2_l3_mapping(l2_id, l3_id, dry_run)

        except SQLAlchemyError as e:
            logging.error(f"处理 L1 {l1_item['name']} 时发生错误: {e}")
            continue


def main() -> None:
    parser = argparse.ArgumentParser(description="导入三层架构映射关系")
    parser.add_argument("json_file", help="JSON 映射文件路径")
    parser.add_argument("--dry-run", action="store_true", help="仅打印，不更新数据库")
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="保留现有数据（默认会清空已有数据）",
    )
    parser.add_argument("--config", default="development", help="Flask 配置名")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )

    # 检查文件是否存在
    if not Path(args.json_file).is_file():
        logging.error(f"文件不存在: {args.json_file}")
        return

    try:
        # 加载 JSON 文件
        mapping = load_json_file(args.json_file)

        # 创建 Flask 应用上下文
        app = create_app(args.config)
        with app.app_context():
            if not args.keep_existing:
                # 清空现有数据
                clear_existing_data(args.dry_run)
            # 处理映射关系
            process_mapping(mapping, args.dry_run)

    except json.JSONDecodeError:
        logging.error(f"无法解析 JSON 文件: {args.json_file}")
    except Exception as e:
        logging.error(f"处理过程中发生错误: {e}")


if __name__ == "__main__":
    main()
