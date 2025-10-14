from __future__ import annotations

"""
init_tasks three/four-step LLM pipeline script.

Purpose:
- Chain the four steps (Step1–Step4) defined in `app/prompt_templates/instruction.md`
  and write intermediate and final results back to `public.init_tasks`.

Prerequisites:
- The environment variable `POSTGRES_DSN` is configured for the database connection.
- The table `public.init_tasks` already exists and contains at least these columns:
  - table_name (TEXT, UNIQUE)
  - status (TEXT)
  - is_done (BOOLEAN)
  - schema_definition (JSONB or TEXT)
  - sample_data (JSONB or TEXT)
  - step1_result / step2_result / step3_result / step4_tablecard (JSONB or TEXT)
- LLM API keys and model details are configured in `config.py` → `LLM_CONFIG` and provided via environment variables.

Command-line arguments:
- --table <name>      Process a single table (tables with status='skip' are ignored).
- --pending           Batch mode: process all tables where is_done=false.
- --dry-run           Log planned operations without writing to the database.
- --model             Specify the LLM model (overrides the default configuration).
- --temperature       LLM sampling temperature.
- --max-tokens        Maximum number of tokens to request from the LLM.
- --max-chars         Maximum characters passed to each prompt section (default 8000).
- --sample-items      Maximum number of entries used when sample_data is an array (default 10).
- --config            Flask configuration name (default development).

Behavior:
- Idempotent: each row only invokes the LLM for missing steps; existing results are reused.
- Fault-tolerant: if the LLM wraps output in Markdown code fences, the script strips the fences and attempts to parse JSON; failures fall back to storing {"raw": "..."} to avoid writes failing.
- Completion: once Step4 succeeds the row is marked with is_done=true and status='done'.

Examples:
- Single table (development configuration)
  .venv/bin/python -m app.script.run_init_tasks_llm --table ne_10m_lakes_historic --config development

- Batch mode (process all pending tables)
  .venv/bin/python -m app.script.run_init_tasks_llm --pending

- Preview only (no database writes)
  .venv/bin/python -m app.script.run_init_tasks_llm --table ne_10m_lakes --dry-run

Notes:
- This script calls the shared backend LLM service via `app.extensions.llm_service.generate(...)`; the provider/model are driven by `LLM_CONFIG` and can be overridden temporarily with --model.
- The script still works if related columns are TEXT instead of JSONB; switch to JSONB at the database layer if JSONB features are required.
"""
import argparse
import json
import logging
import time
from typing import Any, Dict

from sqlalchemy import text

from app import create_app
from app.extensions import db, llm_service
from app.prompt_templates.init_tasks_promopts import (
    render_step1_prompt,
    render_step2_prompt,
    render_step3_prompt,
    render_step4_prompt,
)


def fetch_task(table_name: str | None, only_pending: bool) -> list[Dict[str, Any]]:
    sql = [
        "SELECT table_name, sample_data, schema_definition, step1_result, step2_result, step3_result, step4_tablecard, is_done, status",
        "FROM public.init_tasks",
        "WHERE status <> 'skip'",
    ]
    params: Dict[str, Any] = {}
    if table_name:
        sql.append("AND table_name = :t")
        params["t"] = table_name
    if only_pending:
        sql.append("AND COALESCE(is_done, false) = false")
    sql.append("ORDER BY table_name")
    query = "\n".join(sql)
    with db.engine.connect() as conn:
        rows = conn.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]


def update_task(table_name: str, fields: Dict[str, Any]) -> None:
    # Ensure JSONB columns are passed as JSON parameters.
    json_keys = {"step1_result", "step2_result", "step3_result", "step4_tablecard"}
    params: Dict[str, Any] = {}
    for k, v in fields.items():
        if k in json_keys and isinstance(v, (dict, list)):
            from psycopg2.extras import Json as _Json

            params[k] = _Json(v)
        else:
            params[k] = v

    sets = ", ".join([f"{k} = :{k}" for k in params.keys()])
    sql = text(
        f"UPDATE public.init_tasks SET {sets}, updated_at = now() WHERE table_name = :table"
    )
    params["table"] = table_name
    with db.engine.begin() as conn:
        conn.execute(sql, params)


import logging


def call_llm(
    system: str,
    user: str,
    model: str | None,
    temperature: float | None,
    max_tokens: int | None,
) -> str:
    logging.info(
        "[LLM request] system_prompt=%s, user=%s, model=%s, temperature=%s, max_tokens=%s",
        system,
        user,
        model,
        temperature,
        max_tokens,
    )
    resp = llm_service.generate(
        message=user,
        system_prompt=system,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    logging.info("[LLM response] content=%s", resp.content)
    return resp.content


def _strip_code_fences(s: str) -> str:
    txt = s.strip()
    if txt.startswith("```"):
        # remove leading fence line
        first_nl = txt.find("\n")
        if first_nl != -1:
            txt = txt[first_nl + 1 :]
        # remove trailing fence if present
        if txt.endswith("```"):
            txt = txt[:-3]
    return txt.strip()


def _parse_json_output(s: str) -> Any:
    # Remove Markdown code fences and attempt to parse JSON; if parsing fails, extract the first JSON object or array fragment.
    cleaned = _strip_code_fences(s)
    try:
        return json.loads(cleaned)
    except Exception:
        # Lenient extraction: locate the first '{' or '[' and the corresponding closing brace/bracket.
        start_obj = cleaned.find("{")
        start_arr = cleaned.find("[")
        start = (
            min(x for x in [start_obj, start_arr] if x != -1)
            if (start_obj != -1 or start_arr != -1)
            else -1
        )
        if start != -1:
            # Search backwards for a matching closing delimiter.
            for end in range(len(cleaned), start, -1):
                fragment = cleaned[start:end]
                try:
                    return json.loads(fragment)
                except Exception:
                    continue
        # If parsing still fails, return the raw string.
        return {"raw": s}


def _ensure_str(obj: Any) -> str:
    if isinstance(obj, str):
        return obj
    try:
        import json

        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return str(obj)


def _truncate_text(s: str, max_chars: int) -> str:
    if len(s) <= max_chars:
        return s
    return s[: max_chars - 20] + "\n...\n[TRUNCATED]"


def _prepare_inputs_for_step1(
    table: Dict[str, Any], max_chars: int, sample_items: int
) -> tuple[str, str]:
    # Schema definition.
    schema = table.get("schema_definition") or {}
    schema_s = _ensure_str(schema)
    schema_s = _truncate_text(schema_s, max_chars)

    # Sample data.
    sample = table.get("sample_data") or []
    if isinstance(sample, list):
        sample = sample[:sample_items]
    sample_s = _ensure_str(sample)
    sample_s = _truncate_text(sample_s, max_chars)
    return schema_s, sample_s


def step1(
    table: Dict[str, Any],
    model: str | None,
    temperature: float | None,
    max_tokens: int | None,
    max_chars: int,
    sample_items: int,
) -> Dict[str, Any]:
    schema_s, sample_s = _prepare_inputs_for_step1(
        table, max_chars=max_chars, sample_items=sample_items
    )
    prompts = render_step1_prompt(
        table_name=table["table_name"],
        schema_definition=schema_s,
        sample_data=sample_s,
    )
    content = call_llm(
        prompts["system"], prompts["user"], model, temperature, max_tokens
    )
    parsed = _parse_json_output(content)
    return {"step1_result": parsed}


def step2(
    table: Dict[str, Any],
    model: str | None,
    temperature: float | None,
    max_tokens: int | None,
    max_chars: int,
) -> Dict[str, Any]:
    step1_r = table.get("step1_result") or {}
    step1_r_text = _truncate_text(_ensure_str(step1_r), max_chars)
    prompts = render_step2_prompt(step1_result=step1_r_text)
    content = call_llm(
        prompts["system"], prompts["user"], model, temperature, max_tokens
    )
    parsed = _parse_json_output(content)
    return {"step2_result": parsed}


def step3(
    table: Dict[str, Any],
    model: str | None,
    temperature: float | None,
    max_tokens: int | None,
    max_chars: int,
) -> Dict[str, Any]:
    step2_r = table.get("step2_result") or {}
    if isinstance(step2_r, dict):
        merged_result = step2_r.get("merged_result")
        if merged_result is None:
            raise ValueError("step2_result is missing the merged_result field")
        merged_result_text = _truncate_text(_ensure_str(merged_result), max_chars)
        prompts = render_step3_prompt(step2_result=merged_result_text)
    else:
        raise ValueError("step2_result must be a dict")
    content = call_llm(
        prompts["system"], prompts["user"], model, temperature, max_tokens
    )
    parsed = _parse_json_output(content)
    return {"step3_result": parsed}


def save_l3_table(table_name: str, llm_output: Dict[str, Any]) -> None:
    """
    Persist LLM output into the l3_table table.

    Args:
        table_name: Name of the table being processed.
        llm_output: Table card data returned by the LLM.
    """
    l3_data = {
        "table_name": table_name,
        "display_name": llm_output.get("display_name"),
        "summary": llm_output.get("summary"),
        "core_fields": json.dumps(llm_output.get("core_fields")),
        "keywords": llm_output.get("keywords"),
        "use_cases": llm_output.get("use_cases"),
        "active": True,
        "version": 1,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S%z"),
    }

    sql = text(
        """
        INSERT INTO l3_table (
            table_name, display_name, summary, core_fields, 
            keywords, use_cases, active, version, updated_at
        ) VALUES (
            :table_name, :display_name, :summary, :core_fields,
            :keywords, :use_cases, :active, :version, :updated_at
        ) ON CONFLICT (table_name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            summary = EXCLUDED.summary,
            core_fields = EXCLUDED.core_fields,
            keywords = EXCLUDED.keywords,
            use_cases = EXCLUDED.use_cases,
            active = EXCLUDED.active,
            version = EXCLUDED.version,
            updated_at = EXCLUDED.updated_at
    """
    )

    with db.engine.begin() as conn:
        conn.execute(sql, l3_data)


def step4(
    table: Dict[str, Any],
    model: str | None,
    temperature: float | None,
    max_tokens: int | None,
    max_chars: int,
) -> Dict[str, Any]:
    step3_r = table.get("step3_result") or {}
    cleaned_fields = None
    if isinstance(step3_r, dict):
        cleaned_fields = step3_r["cleaned_result"]
        if cleaned_fields is None:
            raise ValueError(
                "step3_result is missing the cleaned_result or cleaned_fields field"
            )
    else:
        raise ValueError("step3_result must be a dict")
    step3_r_text = _truncate_text(_ensure_str(cleaned_fields), max_chars)
    prompts = render_step4_prompt(
        table_name=table["table_name"], step3_result=step3_r_text
    )
    content = call_llm(
        prompts["system"], prompts["user"], model, temperature, max_tokens
    )
    parsed = _parse_json_output(content)
    return {"step4_tablecard": parsed, "is_done": True, "status": "done"}


def process_table(
    table: Dict[str, Any],
    *,
    model: str | None,
    temperature: float | None,
    max_tokens: int | None,
    max_chars: int,
    sample_items: int,
    dry_run: bool = False,
) -> None:
    """
    Run the LLM pipeline for a single table and persist results.

    Args:
        table: Table metadata dictionary.
        model: LLM model name.
        temperature: LLM sampling temperature.
        max_tokens: Maximum number of tokens requested from the LLM.
        max_chars: Maximum characters allowed in prompt sections.
        sample_items: Maximum sample records to include.
        dry_run: Whether to log only without committing database writes.
    """
    logging.info("Processing table: %s", table["table_name"])
    fields: Dict[str, Any] = {}

    try:
        # Step 1: basic analysis.
        if not table.get("step1_result"):
            r = step1(table, model, temperature, max_tokens, max_chars, sample_items)
            fields.update(r)
            if dry_run:
                logging.info(
                    "[dry-run] step1_result length=%d",
                    len(
                        json.dumps(r["step1_result"])
                        if isinstance(r["step1_result"], (dict, list))
                        else len(str(r["step1_result"]))
                    ),
                )
            else:
                time.sleep(1.0)

        # Step 2: merge results.
        if not table.get("step2_result"):
            table.update(fields)
            r = step2(table, model, temperature, max_tokens, max_chars)
            fields.update(r)
            if dry_run:
                logging.info(
                    "[dry-run] step2_result length=%d",
                    len(
                        json.dumps(r["step2_result"])
                        if isinstance(r["step2_result"], (dict, list))
                        else len(str(r["step2_result"]))
                    ),
                )
            else:
                time.sleep(1.0)

        # Step 3: clean the data.
        if not table.get("step3_result"):
            table.update(fields)
            r = step3(table, model, temperature, max_tokens, max_chars)
            fields.update(r)
            if dry_run:
                logging.info(
                    "[dry-run] step3_result length=%d",
                    len(
                        json.dumps(r["step3_result"])
                        if isinstance(r["step3_result"], (dict, list))
                        else len(str(r["step3_result"]))
                    ),
                )
            else:
                time.sleep(1.0)

        # Step 4: generate the table card.
        if not table.get("step4_tablecard"):
            table.update(fields)
            r = step4(table, model, temperature, max_tokens, max_chars)
            fields.update(r)
            if dry_run:
                logging.info(
                    "[dry-run] step4_tablecard length=%d",
                    len(
                        json.dumps(r["step4_tablecard"])
                        if isinstance(r["step4_tablecard"], (dict, list))
                        else len(str(r["step4_tablecard"]))
                    ),
                )
            else:
                time.sleep(1.0)

        # Update task status and the l3_table entry.
        if not dry_run:
            if fields:
                update_task(table["table_name"], fields)
                logging.info("Updated table: %s", table["table_name"])

            if "step4_tablecard" in fields:
                save_l3_table(table["table_name"], fields["step4_tablecard"])
                logging.info("l3_table updated: %s", table["table_name"])

    except Exception as e:
        logging.exception("Failed processing table: %s", table["table_name"])
        if not dry_run:
            update_task(table["table_name"], {"status": "failed"})
        raise e


def main() -> None:
    parser = argparse.ArgumentParser(description="Run init_tasks LLM pipeline")
    parser.add_argument("--table", help="Process a single table", default=None)
    parser.add_argument(
        "--pending",
        action="store_true",
        help="Process every table where is_done=false",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Log actions without database writes"
    )
    parser.add_argument("--model", default=None, help="Specify the LLM model (override the default)")
    parser.add_argument("--temperature", type=float, default=None, help="LLM temperature")
    parser.add_argument(
        "--max-tokens", type=int, default=None, help="Maximum LLM output tokens"
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=8000,
        help="Maximum characters per prompt section",
    )
    parser.add_argument(
        "--sample-items",
        type=int,
        default=10,
        help="Maximum entries to include when sample_data is an array",
    )
    parser.add_argument(
        "--config", default="development", help="Flask configuration name"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )

    app = create_app(args.config)
    with app.app_context():
        tasks = fetch_task(args.table, only_pending=args.pending)
        if not tasks:
            logging.info("No tasks found.")
            return
        for t in tasks:
            process_table(
                t,
                model=args.model,
                temperature=args.temperature,
                max_tokens=args.max_tokens,
                max_chars=args.max_chars,
                sample_items=args.sample_items,
                dry_run=args.dry_run,
            )


if __name__ == "__main__":
    main()
