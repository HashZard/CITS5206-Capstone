from __future__ import annotations

"""
Init Tasks Helper

本脚本用于：
1) 扫描 schema=ne_data 下所有表；
2) 在 public.init_tasks 中补齐缺失记录（可选，状态为 --status，默认 pending）；
3) 为需要的表采样 sample_data（已精简：移除 geometry.coordinates，仅保留 type 与 properties）；
4) 为需要的表生成最小化 schema_definition（仅包含列 name 与 data_type）。

先决条件：
- 环境变量 POSTGRES_DSN 已配置；
- 已安装项目依赖，并在 backend 目录下执行。

命令行参数：
- --dry-run           仅打印计划操作，不写库
- --status            新增记录的初始状态（默认 pending）
- --sample-limit      每表采样条数（默认 10）
- --only-sample      仅执行采样/生成 schema，不新增 init_tasks 记录
- --no-schema         跳过 schema_definition 填充
- --config            Flask 配置名（默认 development）

使用示例（在 backend 目录）：
- 预览所有操作（不写库）：
  .venv/bin/python -m app.script.import_table_name --dry-run

- 仅采样（不新增记录），每表 5 条：
  .venv/bin/python -m app.script.import_table_name --only-sample --sample-limit 5

- 插入缺失记录为 init，然后采样与生成 schema：
  .venv/bin/python -m app.script.import_table_name --status init --sample-limit 10

- 仅生成 schema（不建议修改采样状态）：
  方式一：先确保 sample_data 已填充，再执行（默认会做 schema）
  方式二：如需立刻只做 schema，可先将需跳过采样的表置为 status='skip'，再去掉 --no-schema；
           或者设置 --sample-limit 0（会将 sample_data 写为空数组，且状态置为 sampled）。
"""
import argparse
import logging
from typing import List, Tuple

from psycopg2.extras import Json
from sqlalchemy import text

from app import create_app
from app.extensions import db


def fetch_tables() -> List[str]:
    """获取 schema=ne_data 下的所有表名"""
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
    """确保 public.init_tasks.sample_data 列存在且为 JSONB。"""
    with db.engine.begin() as conn:
        # 1) 创建 sample_data 列（如不存在）为 JSONB，默认空数组
        conn.execute(
            text(
                """
                ALTER TABLE IF EXISTS public.init_tasks
                ADD COLUMN IF NOT EXISTS sample_data JSONB DEFAULT '[]'::jsonb
                """
            )
        )

        # 2) 若列存在但类型不是 JSONB，则转换为 JSONB
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
    """确保 public.init_tasks.schema_definition 列存在且为 JSONB。"""
    with db.engine.begin() as conn:
        # 创建列（如不存在）
        conn.execute(
            text(
                """
                ALTER TABLE IF EXISTS public.init_tasks
                ADD COLUMN IF NOT EXISTS schema_definition JSONB
                """
            )
        )
        # 若类型不是 jsonb，则转换
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
    """把表名批量插入到 public.init_tasks 中（去重）。返回成功插入数量。"""
    if not tables:
        return 0

    if dry_run:
        logging.info("[dry-run] 将插入 init_tasks 缺失记录数: %d", len(tables))
        return 0

    # 批量插入，冲突忽略
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
        # 在 executemany 情况下，rowcount 语义可能依赖驱动，这里做容错
        inserted = result.rowcount if result.rowcount is not None else 0
    logging.info("已插入 init_tasks 缺失记录: %d", inserted)
    return inserted


def sample_table_as_jsonb(schema: str, table: str, limit: int) -> List[dict]:
    """随机抽样 limit 行，返回精简后的 JSON（移除坐标，只保留几何摘要与属性）。"""
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
    logging.info("当前 init_tasks 已有记录数: %d", len(existing))
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
    """一次 SQL：可选插入缺失表（设为 init_status），并返回需要采样的表（排除 status=skip，sample_data 非空的不返回）。"""

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
    logging.info("需要采样 sample_data 的目标表数量: %d", len(targets))
    return targets


def fill_sample_data_for_tables(
    tables: List[str], limit: int, dry_run: bool
) -> Tuple[int, List[str]]:
    """对传入的目标表执行采样更新；调用方需已筛除 skip/已有 sample_data 的记录。"""
    updated = 0
    skipped: List[str] = []
    for table in tables:
        try:
            if not table_has_rows("ne_data", table):
                skipped.append(table)
                logging.info("跳过表(无数据): %s", table)
                continue

            if dry_run:
                updated += 1
                logging.info(
                    "[dry-run] 将更新 sample_data: %s (limit=%d)", table, limit
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
                # 写入后验证存储条数
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
                "完成 sample_data 更新: %s, 采样行数=%d, 存储条数=%s",
                table,
                len(sample_rows),
                stored_n,
            )
        except Exception:
            skipped.append(table)
            logging.exception("更新表发生异常: %s", table)
            continue
    return updated, skipped


def json_dumps(obj) -> str:
    import json as _json

    return _json.dumps(obj, ensure_ascii=False)


def get_schema_targets(all_tables: List[str]) -> List[str]:
    """返回需要填充 schema_definition 的表（排除 skip，且 schema_definition 为空或 NULL）。"""
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
    """读取 information_schema.columns，返回最小结构：仅 name 与 data_type。"""
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
    """为传入表填充 schema_definition。"""
    ensure_schema_definition_jsonb()
    updated = 0
    skipped: List[str] = []
    for table in tables:
        try:
            if dry_run:
                updated += 1
                logging.info("[dry-run] 将更新 schema_definition: %s", table)
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
                "完成 schema_definition 更新: %s, 列数=%d",
                table,
                len(schema_json.get("columns", [])),
            )
        except Exception:
            skipped.append(table)
            logging.exception("更新 schema_definition 发生异常: %s", table)
            continue
    return updated, skipped


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan ne_data tables and import into public.init_tasks, then sample sample_data"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="不执行写入，仅打印即将进行的操作"
    )
    parser.add_argument(
        "--status", default="pending", help="插入的默认 status 字段值，默认 pending"
    )
    parser.add_argument(
        "--sample-limit", type=int, default=10, help="每表抽样行数，默认 10"
    )
    parser.add_argument(
        "--only-sample",
        action="store_true",
        help="只执行 sample_data 填充，跳过 init_tasks 插入",
    )
    parser.add_argument(
        "--no-schema", action="store_true", help="跳过 schema_definition 填充"
    )
    parser.add_argument(
        "--config", default="development", help="Flask 配置名，默认 development"
    )
    args = parser.parse_args()

    # 基本日志配置
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    app = create_app(args.config)
    with app.app_context():
        ensure_sample_data_jsonb()
        ensure_schema_definition_jsonb()
        tables = fetch_tables()
        logging.info("ne_data 表总数: %d", len(tables))

        # 一次 SQL：插入缺失（可选）并挑选需要采样的表（排除 status=skip，sample_data 非空）
        targets = upsert_and_get_sampling_targets(
            tables,
            init_status=args.status,
            insert_missing=(not args.only_sample and not args.dry_run),
        )
        if args.dry_run:
            # dry-run 模式下仍报告如果执行将会插入多少（估算：缺失数=all - 已有）
            if not args.only_sample:
                existing = get_existing_task_tables()
                logging.info(
                    "[dry-run] 将新增 init_tasks 记录数: %d",
                    len([t for t in tables if t not in existing]),
                )
            logging.info("[dry-run] 需要采样 sample_data 的表数量: %d", len(targets))

        # 对目标表逐表采样与更新
        updated_count, skipped = fill_sample_data_for_tables(
            targets, limit=args.sample_limit, dry_run=args.dry_run
        )
        if args.dry_run:
            logging.info(
                "[dry-run] 将更新 sample_data 的表数量: %d; 跳过: %d",
                updated_count,
                len(skipped),
            )
        else:
            logging.info(
                "已更新 sample_data 的表数量: %d; 跳过: %d", updated_count, len(skipped)
            )

        # 第三步：为非 skip 且 schema_definition 为空的记录填充列定义
        if not args.no_schema:
            schema_targets = get_schema_targets(tables)
            if args.dry_run:
                logging.info(
                    "[dry-run] 需要更新 schema_definition 的表数量: %d",
                    len(schema_targets),
                )
            schema_updated, schema_skipped = fill_schema_definition_for_tables(
                schema_targets, dry_run=args.dry_run
            )
            if args.dry_run:
                logging.info(
                    "[dry-run] 将更新 schema_definition 的表数量: %d; 跳过: %d",
                    schema_updated,
                    len(schema_skipped),
                )
            else:
                logging.info(
                    "已更新 schema_definition 的表数量: %d; 跳过: %d",
                    schema_updated,
                    len(schema_skipped),
                )


if __name__ == "__main__":
    main()
