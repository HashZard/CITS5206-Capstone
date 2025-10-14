from __future__ import annotations

"""
Init Tasks Helper.

This script can:
1) Scan every table under the schema `ne_data`.
2) Optionally insert missing entries into `public.init_tasks` (status defaults to --status, pending by default).
3) Sample `sample_data` for target tables (geometry coordinates are stripped, keeping only type and properties).
4) Generate a minimal `schema_definition` for target tables (containing only column `name` and `data_type`).

Prerequisites:
- The `POSTGRES_DSN` environment variable is configured.
- Project dependencies are installed and commands are executed from the backend directory.

Command-line arguments:
- --dry-run           Print planned operations without writing to the database.
- --status            Initial status for new records (default pending).
- --sample-limit      Number of sampled rows per table (default 10).
- --only-sample       Only perform sampling/schema generation without inserting init_tasks records.
- --no-schema         Skip populating `schema_definition`.
- --config            Flask configuration name (default development).

Usage examples (run from the backend directory):
- Preview all operations (no writes):
  .venv/bin/python -m app.script.import_table_name --dry-run

- Sample only (no new records), five rows per table:
  .venv/bin/python -m app.script.import_table_name --only-sample --sample-limit 5

- Insert missing records as init, then sample and generate schema:
  .venv/bin/python -m app.script.import_table_name --status init --sample-limit 10

- Generate schema only (not recommended to alter sampling status):
  Option A: Ensure `sample_data` is already populated; run without additional flags (schema generation runs by default).
  Option B: To generate schema immediately, mark tables to skip sampling with status='skip', remove --no-schema, or set --sample-limit 0 (sets sample_data to an empty array and status to sampled).
"""
import argparse
import logging
from typing import List, Tuple

from psycopg2.extras import Json
from sqlalchemy import text

from app import create_app
from app.extensions import db


def fetch_tables() -> List[str]:
    """Return every table name under the schema ne_data."""
    sql = """
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'ne_data'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
    """
    with db.engine.connect() as conn:
        rows = conn.execute(text(sql)).all()
    return [r[0] for r in rows]


def ensure_sample_data_jsonb() -> None:
    """Ensure public.init_tasks.sample_data exists and is typed as JSONB."""
    with db.engine.begin() as conn:
        # 1) Create the sample_data column as JSONB with a default empty array when missing.
        conn.execute(
            text(
                """
                ALTER TABLE IF EXISTS public.init_tasks
                ADD COLUMN IF NOT EXISTS sample_data JSONB DEFAULT '[]'::jsonb
                """
            )
        )

        # 2) Convert the column to JSONB if it already exists with another type.
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='init_tasks'
                      AND column_name='sample_data' AND data_type <> 'jsonb'
                  ) THEN
                    ALTER TABLE public.init_tasks
                    ALTER COLUMN sample_data TYPE jsonb
                    USING COALESCE(sample_data::jsonb, '[]'::jsonb);
                  END IF;
                END $$;
                """
            )
        )


def ensure_schema_definition_jsonb() -> None:
    """Ensure public.init_tasks.schema_definition exists and is typed as JSONB."""
    with db.engine.begin() as conn:
        # Create the column if it is missing.
        conn.execute(
            text(
                """
                ALTER TABLE IF EXISTS public.init_tasks
                ADD COLUMN IF NOT EXISTS schema_definition JSONB
                """
            )
        )
        # Convert the column to JSONB when necessary.
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='init_tasks'
                      AND column_name='schema_definition' AND data_type <> 'jsonb'
                  ) THEN
                    ALTER TABLE public.init_tasks
                    ALTER COLUMN schema_definition TYPE jsonb
                    USING schema_definition::jsonb;
                  END IF;
                END $$;
                """
            )
        )


def insert_init_tasks(
    tables: List[str], status: str = "pending", dry_run: bool = False
) -> int:
    """Insert table names into public.init_tasks, ignoring duplicates, and return the count added."""
    if not tables:
        return 0

    if dry_run:
        logging.info("[dry-run] Will insert missing init_tasks records: %d", len(tables))
        return 0

    # Bulk insert and ignore conflicts.
    insert_sql = text(
        """
        INSERT INTO public.init_tasks (table_name, status)
        VALUES (:table_name, :status)
        ON CONFLICT (table_name) DO NOTHING
        """
    )

    params = [{"table_name": t, "status": status} for t in tables]
    with db.engine.begin() as conn:
        result = conn.execute(insert_sql, params)
        # Rowcount semantics vary under executemany; be defensive.
        inserted = result.rowcount if result.rowcount is not None else 0
    logging.info("Inserted missing init_tasks records: %d", inserted)
    return inserted


def sample_table_as_jsonb(schema: str, table: str, limit: int) -> List[dict]:
    """Randomly sample `limit` rows and return simplified JSON without geometry coordinates."""
    sql = text(
        f"""
        WITH base AS (
            SELECT to_jsonb(t) AS row
            FROM (
                SELECT * FROM {schema}."{table}"
                ORDER BY random() LIMIT :limit
            ) AS t
        )
        SELECT jsonb_build_object(
            'properties', row - 'geom' - 'geometry' - 'the_geom',
            'geometry', CASE
                WHEN (row ? 'geometry') THEN jsonb_build_object(
                    'type', row->'geometry'->>'type',
                    'coordinates', '[omitted]'
                )
                WHEN (row ? 'geom') THEN jsonb_build_object(
                    'type', row->'geom'->>'type',
                    'coordinates', '[omitted]'
                )
                WHEN (row ? 'the_geom') THEN jsonb_build_object(
                    'type', row->'the_geom'->>'type',
                    'coordinates', '[omitted]'
                )
                ELSE NULL
            END
        ) AS row
        FROM base
        """
    )
    with db.engine.connect() as conn:
        rows = conn.execute(sql, {"limit": limit}).mappings().all()
    return [dict(r["row"]) for r in rows]


def table_has_rows(schema: str, table: str) -> bool:
    sql = text(
        f"""
        SELECT EXISTS (SELECT 1 FROM {schema}."{table}" LIMIT 1) AS has
        """
    )
    with db.engine.connect() as conn:
        row = conn.execute(sql).mappings().first()
    return bool(row and row["has"])  # type: ignore[index]


def get_existing_task_tables() -> set[str]:
    sql = text(
        """
        SELECT table_name FROM public.init_tasks
    """
    )
    with db.engine.connect() as conn:
        rows = conn.execute(sql).mappings().all()
    existing = {r["table_name"] for r in rows}
    logging.info("Current init_tasks record count: %d", len(existing))
    return existing


def needs_sampling(table: str) -> bool:
    sql = text(
        """
        SELECT (sample_data IS NULL OR sample_data = '[]'::jsonb) AS need
        FROM public.init_tasks
        WHERE table_name = :table
        """
    )
    with db.engine.connect() as conn:
        row = conn.execute(sql, {"table": table}).mappings().first()
    return bool(row and row["need"])  # type: ignore[index]


def upsert_and_get_sampling_targets(
    all_tables: List[str], init_status: str, insert_missing: bool
) -> List[str]:
    """Optionally insert missing tables (using init_status) and return those requiring sampling while skipping status=skip or non-empty sample_data."""

    if not all_tables:
        return []

    if insert_missing:
        sql = text(
            """
            WITH input(table_name) AS (
                SELECT UNNEST(:tables)::text
            ),
            ins AS (
                INSERT INTO public.init_tasks(table_name, status)
                SELECT i.table_name, :init_status
                FROM input i
                LEFT JOIN public.init_tasks t ON t.table_name = i.table_name
                WHERE t.table_name IS NULL
                RETURNING table_name
            ),
            targets AS (
                SELECT i.table_name
                FROM input i
                JOIN public.init_tasks t ON t.table_name = i.table_name
                WHERE t.status <> 'skip'
                  AND (t.sample_data IS NULL OR t.sample_data::jsonb = '[]'::jsonb)
            )
            SELECT table_name FROM targets
            """
        )
        params = {"tables": all_tables, "init_status": init_status}
    else:
        sql = text(
            """
            WITH input(table_name) AS (
                SELECT UNNEST(:tables)::text
            ),
            targets AS (
                SELECT i.table_name
                FROM input i
                JOIN public.init_tasks t ON t.table_name = i.table_name
                WHERE t.status <> 'skip'
                  AND (t.sample_data IS NULL OR t.sample_data::jsonb = '[]'::jsonb)
            )
            SELECT table_name FROM targets
            """
        )
        params = {"tables": all_tables}

    with db.engine.connect() as conn:
        rows = conn.execute(sql, params).all()
    targets = [r[0] for r in rows]
    logging.info("Number of tables requiring sample_data sampling: %d", len(targets))
    return targets


def fill_sample_data_for_tables(
    tables: List[str], limit: int, dry_run: bool
) -> Tuple[int, List[str]]:
    """Run sampling updates for the target tables; callers must pre-filter skip or populated records."""
    updated = 0
    skipped: List[str] = []
    for table in tables:
        try:
            if not table_has_rows("ne_data", table):
                skipped.append(table)
                logging.info("Skipping table (no data): %s", table)
                continue

            if dry_run:
                updated += 1
                logging.info(
                    "[dry-run] Will update sample_data: %s (limit=%d)", table, limit
                )
                continue

            sample_rows = sample_table_as_jsonb("ne_data", table, limit)
            with db.engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        UPDATE public.init_tasks
                        SET sample_data = :sample,
                            status = 'sampled'
                        WHERE table_name = :table
                        """
                    ),
                    {"sample": Json(sample_rows), "table": table},
                )
                # Verify the number of records stored after writing.
                row = (
                    conn.execute(
                        text(
                            """
                        SELECT jsonb_array_length(sample_data) AS n
                        FROM public.init_tasks WHERE table_name = :table
                        """
                        ),
                        {"table": table},
                    )
                    .mappings()
                    .first()
                )
                stored_n = row["n"] if row else None
            updated += 1
            logging.info(
                "Sample data update complete: %s, sampled rows=%d, stored rows=%s",
                table,
                len(sample_rows),
                stored_n,
            )
        except Exception:
            skipped.append(table)
            logging.exception("Exception while updating table: %s", table)
            continue
    return updated, skipped


def json_dumps(obj) -> str:
    import json as _json

    return _json.dumps(obj, ensure_ascii=False)


def get_schema_targets(all_tables: List[str]) -> List[str]:
    """Return tables that require schema_definition to be filled (excluding skip and non-empty definitions)."""
    sql = text(
        """
        WITH input(table_name) AS (
            SELECT UNNEST(:tables)::text
        )
        SELECT i.table_name
        FROM input i
        JOIN public.init_tasks t ON t.table_name = i.table_name
        WHERE t.status <> 'skip'
          AND (t.schema_definition IS NULL OR t.schema_definition = '{}'::jsonb)
        """
    )
    with db.engine.connect() as conn:
        rows = conn.execute(sql, {"tables": all_tables}).all()
    return [r[0] for r in rows]


def build_table_schema_json(schema: str, table: str) -> dict:
    """Read information_schema.columns and return the minimal structure with name and data_type."""
    sql = text(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = :schema AND table_name = :table
        ORDER BY ordinal_position
        """
    )
    with db.engine.connect() as conn:
        rows = conn.execute(sql, {"schema": schema, "table": table}).mappings().all()
    columns = [{"name": r["column_name"], "data_type": r["data_type"]} for r in rows]
    return {"schema": schema, "table": table, "columns": columns}


def fill_schema_definition_for_tables(
    tables: List[str], dry_run: bool
) -> Tuple[int, List[str]]:
    """Populate schema_definition for the provided tables."""
    ensure_schema_definition_jsonb()
    updated = 0
    skipped: List[str] = []
    for table in tables:
        try:
            if dry_run:
                updated += 1
                logging.info("[dry-run] Will update schema_definition: %s", table)
                continue
            schema_json = build_table_schema_json("ne_data", table)
            with db.engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        UPDATE public.init_tasks
                        SET schema_definition = :schema
                        WHERE table_name = :table
                        """
                    ),
                    {"schema": Json(schema_json), "table": table},
                )
            updated += 1
            logging.info(
                "Schema definition update complete: %s, column count=%d",
                table,
                len(schema_json.get("columns", [])),
            )
        except Exception:
            skipped.append(table)
            logging.exception("Exception while updating schema_definition: %s", table)
            continue
    return updated, skipped


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan ne_data tables and import into public.init_tasks, then sample sample_data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log planned operations without writing to the database",
    )
    parser.add_argument(
        "--status",
        default="pending",
        help="Default status value for inserted records (default pending)",
    )
    parser.add_argument(
        "--sample-limit",
        type=int,
        default=10,
        help="Number of sampled rows per table (default 10)",
    )
    parser.add_argument(
        "--only-sample",
        action="store_true",
        help="Only populate sample_data and skip inserting init_tasks records",
    )
    parser.add_argument(
        "--no-schema",
        action="store_true",
        help="Skip populating schema_definition",
    )
    parser.add_argument(
        "--config",
        default="development",
        help="Flask configuration name (default development)",
    )
    args = parser.parse_args()

    # Configure basic logging.
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    app = create_app(args.config)
    with app.app_context():
        ensure_sample_data_jsonb()
        ensure_schema_definition_jsonb()
        tables = fetch_tables()
        logging.info("Total tables in ne_data: %d", len(tables))

        # Run a single SQL statement to insert missing rows (optional) and select sampling targets (skip status=skip and non-empty sample_data).
        targets = upsert_and_get_sampling_targets(
            tables,
            init_status=args.status,
            insert_missing=(not args.only_sample and not args.dry_run),
        )
        if args.dry_run:
            # In dry-run mode, still report the potential insert count (estimated as all minus existing).
            if not args.only_sample:
                existing = get_existing_task_tables()
                logging.info(
                    "[dry-run] Will insert init_tasks records: %d",
                    len([t for t in tables if t not in existing]),
                )
            logging.info(
                "[dry-run] Number of tables requiring sample_data sampling: %d",
                len(targets),
            )

        # Sample and update each target table.
        updated_count, skipped = fill_sample_data_for_tables(
            targets, limit=args.sample_limit, dry_run=args.dry_run
        )
        if args.dry_run:
            logging.info(
                "[dry-run] Will update sample_data for %d tables; skipped: %d",
                updated_count,
                len(skipped),
            )
        else:
            logging.info(
                "Updated sample_data for %d tables; skipped: %d",
                updated_count,
                len(skipped),
            )

        # Step three: populate column definitions for non-skip rows with empty schema_definition.
        if not args.no_schema:
            schema_targets = get_schema_targets(tables)
            if args.dry_run:
                logging.info(
                "[dry-run] Number of tables requiring schema_definition update: %d",
                len(schema_targets),
            )
            schema_updated, schema_skipped = fill_schema_definition_for_tables(
                schema_targets, dry_run=args.dry_run
            )
            if args.dry_run:
                logging.info(
                    "[dry-run] Will update schema_definition for %d tables; skipped: %d",
                    schema_updated,
                    len(schema_skipped),
                )
            else:
                logging.info(
                    "Updated schema_definition for %d tables; skipped: %d",
                    schema_updated,
                    len(schema_skipped),
                )


if __name__ == "__main__":
    main()
