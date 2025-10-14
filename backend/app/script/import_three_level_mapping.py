from __future__ import annotations

"""
Import three-level hierarchy (L1/L2/L3) mappings from a JSON file.

Features:
----------
1. Import hierarchy relationships, including:
   - L1 categories (top-level classification)
   - L2 cards (mid-level overview)
   - L1–L2 mappings
   - L2–L3 mappings
2. Support incremental imports or full resets.
3. Provide a preview mode.
4. Leave existing L3 table data untouched.

Prerequisites:
----------
1. All referenced L3 tables already exist in the database.
2. The database connection is configured via the `POSTGRES_DSN` environment variable.
3. The JSON file follows the expected structure.

Sample JSON structure:
-------------
{
  "l1": [
    {
      "name": "L1 category name",        # Required L1 category name.
      "description": "L1 description",   # Optional L1 description.
      "keywords": ["kw1", "kw2"],        # Optional L1 keywords.
      "l2": [                            # Required list of L2 cards.
        {
          "name": "L2 card name",        # Required L2 card name.
          "description": "L2 description",# Optional L2 description.
          "keywords": ["kwA", "kwB"],    # Optional L2 keywords.
          "l3": [                        # Required list of L3 table names.
            "table_name_1",
            "table_name_2"
          ]
        }
      ]
    }
  ]
}

Usage:
----------
1. Preview mode (no database changes):
   python -m app.script.import_three_level_mapping mapping.json --dry-run

2. Standard import (clear existing data before import):
   python -m app.script.import_three_level_mapping mapping.json

3. Incremental import (keep existing data):
   python -m app.script.import_three_level_mapping mapping.json --keep-existing

4. Specify configuration profile:
   python -m app.script.import_three_level_mapping mapping.json --config production

Argument reference:
----------
json_file        Path to the JSON mapping file (required).
--dry-run        Preview mode that only logs planned actions.
--keep-existing  Preserve existing data (default is to clear everything).
--config         Flask configuration name (default development).

Data processing workflow:
------------
1. Clearing (default) removes data in order:
   - map_l2_l3 (L2–L3 mapping table)
   - map_l1_l2 (L1–L2 mapping table)
   - l2_card (L2 card table)
   - l1_category (L1 category table)
   Note: The l3_table data is preserved.

2. Import steps:
   - Validate that referenced L3 tables exist.
   - Create L1 categories when missing.
   - Create L2 cards when missing.
   - Create L1–L2 mappings.
   - Create L2–L3 mappings.

Error handling:
---------
1. Missing L3 tables produce warnings but processing continues.
2. JSON parsing errors abort the program.
3. Database errors are logged and processing continues when possible.
4. All warnings and errors are recorded in the logs.

Example JSON:
---------
{
  "l1": [
    {
      "name": "Geographic Features",
      "description": "Natural geographic features on the Earth's surface",
      "keywords": ["geography", "terrain", "landform"],
      "l2": [
        {
          "name": "Water Bodies",
          "description": "Geospatial information for different water bodies",
          "keywords": ["lakes", "rivers", "oceans"],
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
    """Load and parse the JSON mapping file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_or_create_l1(l1_data: dict, dry_run: bool = False) -> int:
    """Fetch or create an L1 category and return its id."""
    # Build the base L1 payload.
    l1 = {
        "name": l1_data["name"],
        "description": l1_data.get("description", ""),
        "keywords": l1_data.get("keywords", []),
        "active": True,
        "version": 1,
    }

    if dry_run:
        logging.info(f"[dry-run] Will create L1: {l1}")
        return -1

    try:
        with db.engine.begin() as conn:
            # Check if the category already exists.
            sql = text("SELECT id FROM l1_category WHERE name = :name")
            result = conn.execute(sql, {"name": l1["name"]}).first()
            if result:
                return result[0]

            # Create a new category when missing.
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
                raise ValueError(f"Failed to create L1 category: {l1['name']}")
            return result[0]
    except Exception as e:
        logging.error(f"Error processing L1 category {l1['name']}: {e}")
        raise


def get_or_create_l2(l2_data: dict, dry_run: bool = False) -> int:
    """Fetch or create an L2 card and return its id."""
    # Build the base L2 payload.
    l2 = {
        "name": l2_data["name"],
        "description_short": l2_data.get("description", ""),
        "keywords": l2_data.get("keywords", []),
        "active": True,
        "version": 1,
    }

    if dry_run:
        logging.info(f"[dry-run] Will create L2: {l2}")
        return -1

    try:
        with db.engine.begin() as conn:
            # Check if the card already exists.
            sql = text("SELECT id FROM l2_card WHERE name = :name")
            result = conn.execute(sql, {"name": l2["name"]}).first()
            if result:
                return result[0]

            # Create a new card when missing.
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
                raise ValueError(f"Failed to create L2 card: {l2['name']}")
            return result[0]
    except Exception as e:
        logging.error(f"Error processing L2 card {l2['name']}: {e}")
        raise


def get_l3_ids(table_names: List[str]) -> List[int]:
    """Return the list of L3 table ids for the given table names."""
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
    """Create an L1–L2 mapping record."""
    if dry_run:
        logging.info(f"[dry-run] Will create L1-L2 mapping: {l1_id} -> {l2_id}")
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
    """Create an L2–L3 mapping record."""
    if dry_run:
        logging.info(f"[dry-run] Will create L2-L3 mapping: {l2_id} -> {l3_id}")
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
    """Clear existing L1, L2, and mapping data."""
    if dry_run:
        logging.info("[dry-run] Will clear the following tables:")
        logging.info("- map_l2_l3 (L2-L3 mapping)")
        logging.info("- map_l1_l2 (L1-L2 mapping)")
        logging.info("- l2_card (L2 cards)")
        logging.info("- l1_category (L1 categories)")
        return

    with db.engine.begin() as conn:
        # Clear tables in dependency order.
        # 1. Remove mapping data first.
        conn.execute(text("DELETE FROM map_l2_l3"))
        conn.execute(text("DELETE FROM map_l1_l2"))
        # 2. Remove L1 and L2 data next.
        conn.execute(text("DELETE FROM l2_card"))
        conn.execute(text("DELETE FROM l1_category"))

        # Reset sequences when applicable.
        conn.execute(text("ALTER SEQUENCE l1_category_id_seq RESTART WITH 1"))
        conn.execute(text("ALTER SEQUENCE l2_card_id_seq RESTART WITH 1"))

        logging.info("All related tables cleared")


def process_mapping(mapping: dict, dry_run: bool = False) -> None:
    """Process all hierarchy mappings in the JSON document."""
    # Clear existing data first.
    clear_existing_data(dry_run)
    for l1_item in mapping.get("l1", []):
        try:
            # Create or fetch L1 entries.
            l1_id = get_or_create_l1(l1_item, dry_run)

            # Iterate over associated L2 cards.
            for l2_item in l1_item.get("l2", []):
                # Create or fetch L2 entries.
                l2_id = get_or_create_l2(l2_item, dry_run)

                # Create the L1–L2 mapping.
                create_l1_l2_mapping(l1_id, l2_id, dry_run)

                # Resolve L3 ids and create L2–L3 mappings.
                l3_table_names = l2_item.get("l3", [])
                l3_ids = [] if dry_run else get_l3_ids(l3_table_names)

                if len(l3_ids) != len(l3_table_names):
                    missing = set(l3_table_names) - set(l3_ids)
                    logging.warning(f"Some L3 tables were not found: {missing}")

                for l3_id in l3_ids:
                    create_l2_l3_mapping(l2_id, l3_id, dry_run)

        except SQLAlchemyError as e:
            logging.error(f"Error processing L1 {l1_item['name']}: {e}")
            continue


def main() -> None:
    parser = argparse.ArgumentParser(description="Import three-level hierarchy mappings")
    parser.add_argument("json_file", help="Path to the JSON mapping file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log planned actions without updating the database",
    )
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="Keep existing data (default clears existing records)",
    )
    parser.add_argument(
        "--config", default="development", help="Flask configuration name"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )

    # Verify that the file exists.
    if not Path(args.json_file).is_file():
        logging.error(f"File not found: {args.json_file}")
        return

    try:
        # Load the JSON file.
        mapping = load_json_file(args.json_file)

        # Create a Flask application context.
        app = create_app(args.config)
        with app.app_context():
            if not args.keep_existing:
                # Clear existing data.
                clear_existing_data(args.dry_run)
            # Process the mappings.
            process_mapping(mapping, args.dry_run)

    except json.JSONDecodeError:
        logging.error(f"Failed to parse JSON file: {args.json_file}")
    except Exception as e:
        logging.error(f"Error encountered during processing: {e}")


if __name__ == "__main__":
    main()
