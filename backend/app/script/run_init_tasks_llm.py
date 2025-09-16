from __future__ import annotations
"""
init_tasks 三/四步 LLM 流水线执行脚本（中文说明）

用途：
- 串联 `app/prompt_templates/instruction.md` 中定义的 4 个步骤（Step1~Step4），
  将中间结果与最终结果写回 `public.init_tasks`。

前置条件：
- 已配置数据库连接环境变量 `POSTGRES_DSN`；
- 数据表 `public.init_tasks` 已存在，且至少包含以下列：
  - table_name (TEXT, UNIQUE)
  - status (TEXT)
  - is_done (BOOLEAN)
  - schema_definition (JSONB 或 TEXT)
  - sample_data (JSONB 或 TEXT)
  - step1_result / step2_result / step3_result / step4_tablecard (JSONB 或 TEXT)
- LLM 的 API Key 与模型信息已在 `config.py` → `LLM_CONFIG` 配置，并通过环境变量提供。

命令行参数：
- --table <name>      仅处理单张表（会跳过 status='skip' 的表）
- --pending           批量模式：处理所有 is_done=false 的表
- --dry-run           只打印/记录日志，不写数据库
- --model             指定 LLM 模型（覆盖默认配置）
- --temperature       LLM 温度
- --max-tokens        LLM 输出最大 tokens
- --max-chars         传入提示中各块文本的最大字符数（默认 8000）
- --sample-items      当 sample_data 为数组时，最多传入的条目数（默认 10）
- --config            Flask 配置名（默认 development）

行为说明：
- 幂等：每行只会为“尚未生成”的步骤调用 LLM，已有结果则跳过。
- 容错：若 LLM 输出被 Markdown 代码块包裹，脚本会剥离围栏并尝试解析 JSON；
  解析失败则以 {"raw": "..."} 形式存储，避免写入失败。
- 完成：Step4 成功后会将 is_done=true，status='done'。

示例：
- 单表（development 配置）
  .venv/bin/python -m app.script.run_init_tasks_llm --table ne_10m_time_zones --config development

- 批量（处理所有待完成表）
  .venv/bin/python -m app.script.run_init_tasks_llm --pending

- 仅预览（不写库）
  .venv/bin/python -m app.script.run_init_tasks_llm --table ne_10m_lakes --dry-run

注意：
- 本脚本通过 `app.extensions.llm_service.generate(...)` 调用后端统一 LLM 服务，
  模型与提供商由 `LLM_CONFIG` 决定，可用 --model 临时覆盖。
- 若数据库中相关列为 TEXT 而非 JSONB，脚本同样可运行；如需 JSONB 能力，建议在数据库层调整列类型。
"""
import argparse
import logging
import time
from typing import Any, Dict
import json

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
    # 确保 JSONB 列以 JSON 参数传递
    json_keys = {"step1_result", "step2_result", "step3_result", "step4_tablecard"}
    params: Dict[str, Any] = {}
    for k, v in fields.items():
        if k in json_keys and isinstance(v, (dict, list)):
            from psycopg2.extras import Json as _Json

            params[k] = _Json(v)
        else:
            params[k] = v

    sets = ", ".join([f"{k} = :{k}" for k in params.keys()])
    sql = text(f"UPDATE public.init_tasks SET {sets}, updated_at = now() WHERE table_name = :table")
    params["table"] = table_name
    with db.engine.begin() as conn:
        conn.execute(sql, params)


import logging

def call_llm(system: str, user: str, model: str | None, temperature: float | None, max_tokens: int | None) -> str:
    logging.info("[LLM请求] system_prompt=%s, user=%s, model=%s, temperature=%s, max_tokens=%s", system, user, model, temperature, max_tokens)
    resp = llm_service.generate(
        message=user,
        system_prompt=system,
        model=model,    
        temperature=temperature,
        max_tokens=max_tokens,
    )
    logging.info("[LLM响应] content=%s", resp.content)
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
            txt = txt[: -3]
    return txt.strip()


def _parse_json_output(s: str) -> Any:
    # 去掉 Markdown 代码块围栏，并尝试解析 JSON；失败则尽量提取第一个 JSON 对象或数组
    cleaned = _strip_code_fences(s)
    try:
        return json.loads(cleaned)
    except Exception:
        # 宽松提取：寻找首个 '{' 或 '[' 与对应的末尾 '}' 或 ']' 片段
        start_obj = cleaned.find('{')
        start_arr = cleaned.find('[')
        start = min(x for x in [start_obj, start_arr] if x != -1) if (start_obj != -1 or start_arr != -1) else -1
        if start != -1:
            # 试着从末尾向前找到配对结束符
            for end in range(len(cleaned), start, -1):
                fragment = cleaned[start:end]
                try:
                    return json.loads(fragment)
                except Exception:
                    continue
        # 仍失败则返回原始字符串
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


def _prepare_inputs_for_step1(table: Dict[str, Any], max_chars: int, sample_items: int) -> tuple[str, str]:
    # schema_definition
    schema = table.get("schema_definition") or {}
    schema_s = _ensure_str(schema)
    schema_s = _truncate_text(schema_s, max_chars)

    # sample_data
    sample = table.get("sample_data") or []
    if isinstance(sample, list):
        sample = sample[:sample_items]
    sample_s = _ensure_str(sample)
    sample_s = _truncate_text(sample_s, max_chars)
    return schema_s, sample_s


def step1(table: Dict[str, Any], model: str | None, temperature: float | None, max_tokens: int | None, max_chars: int, sample_items: int) -> Dict[str, Any]:
    schema_s, sample_s = _prepare_inputs_for_step1(table, max_chars=max_chars, sample_items=sample_items)
    prompts = render_step1_prompt(
        table_name=table["table_name"],
        schema_definition=schema_s,
        sample_data=sample_s,
    )
    content = call_llm(prompts["system"], prompts["user"], model, temperature, max_tokens)
    parsed = _parse_json_output(content)
    return {"step1_result": parsed}


def step2(table: Dict[str, Any], model: str | None, temperature: float | None, max_tokens: int | None, max_chars: int) -> Dict[str, Any]:
    step1_r = table.get("step1_result") or {}
    step1_r_text = _truncate_text(_ensure_str(step1_r), max_chars)
    prompts = render_step2_prompt(step1_result=step1_r_text)
    content = call_llm(prompts["system"], prompts["user"], model, temperature, max_tokens)
    parsed = _parse_json_output(content)
    return {"step2_result": parsed}

def step3(table: Dict[str, Any], model: str | None, temperature: float | None, max_tokens: int | None, max_chars: int) -> Dict[str, Any]:
    step2_r = table.get("step2_result") or {}
    if isinstance(step2_r, dict):
        merged_result = step2_r.get("merged_result")
        if merged_result is None:
            raise ValueError("step2_result 中没有 merged_result 字段")
        merged_result_text = _truncate_text(_ensure_str(merged_result), max_chars)
        prompts = render_step3_prompt(step2_result=merged_result_text)
    else:
        raise ValueError("step2_result 类型不支持，必须为 dict")
    content = call_llm(prompts["system"], prompts["user"], model, temperature, max_tokens)
    parsed = _parse_json_output(content)
    return {"step3_result": parsed}


def step4(table: Dict[str, Any], model: str | None, temperature: float | None, max_tokens: int | None, max_chars: int) -> Dict[str, Any]:
    step3_r = table.get("step3_result") or {}
    cleaned_fields = None
    if isinstance(step3_r, dict):
        cleaned_fields = step3_r["cleaned_result"]
        if cleaned_fields is None:
            raise ValueError("step3_result 中没有 cleaned_result 或 cleaned_fields 字段")
    else:
        raise ValueError("step3_result 类型不支持，必须为 dict")
    step3_r_text = _truncate_text(_ensure_str(cleaned_fields), max_chars)
    prompts = render_step4_prompt(table_name=table["table_name"], step3_result=step3_r_text)
    content = call_llm(prompts["system"], prompts["user"], model, temperature, max_tokens)
    parsed = _parse_json_output(content)
    return {"step4_tablecard": parsed, "is_done": True, "status": "done"}

def process_table(table: Dict[str, Any], *, model: str | None, temperature: float | None, max_tokens: int | None, max_chars: int, sample_items: int, dry_run: bool = False) -> None:
    logging.info("Processing table: %s", table["table_name"])
    fields: Dict[str, Any] = {}
    try:
        if not table.get("step1_result"):
            r = step1(table, model, temperature, max_tokens, max_chars, sample_items)
            fields.update(r)
            if dry_run:
                logging.info("[dry-run] step1_result length=%d", len(json.dumps(r["step1_result"]) if isinstance(r["step1_result"], (dict, list)) else len(str(r["step1_result"]))))
            else:
                time.sleep(1.0)
        if not table.get("step2_result"):
            table.update(fields)
            r = step2(table, model, temperature, max_tokens, max_chars)
            fields.update(r)
            if dry_run:
                logging.info("[dry-run] step2_result length=%d", len(json.dumps(r["step2_result"]) if isinstance(r["step2_result"], (dict, list)) else len(str(r["step2_result"]))))
            else:
                time.sleep(1.0)
        if not table.get("step3_result"):
            table.update(fields)
            r = step3(table, model, temperature, max_tokens, max_chars)
            fields.update(r)
            if dry_run:
                logging.info("[dry-run] step3_result length=%d", len(json.dumps(r["step3_result"]) if isinstance(r["step3_result"], (dict, list)) else len(str(r["step3_result"]))))
            else:
                time.sleep(1.0)
        if not table.get("step4_tablecard"):
            table.update(fields)
            r = step4(table, model, temperature, max_tokens, max_chars)
            fields.update(r)
            if dry_run:
                logging.info("[dry-run] step4_tablecard length=%d", len(json.dumps(r["step4_tablecard"]) if isinstance(r["step4_tablecard"], (dict, list)) else len(str(r["step4_tablecard"]))))
            else:
                time.sleep(1.0)
        if not dry_run and fields:
            update_task(table["table_name"], fields)
            logging.info("Updated table: %s", table["table_name"])
    except Exception:
        logging.exception("Failed processing table: %s", table["table_name"])
        if not dry_run:
            update_task(table["table_name"], {"status": "failed"})


def main() -> None:
    parser = argparse.ArgumentParser(description="Run init_tasks LLM pipeline")
    parser.add_argument("--table", help="指定单表处理", default=None)
    parser.add_argument(
        "--pending", action="store_true", help="扫描 is_done=false 的所有表并处理"
    )
    parser.add_argument("--dry-run", action="store_true", help="仅打印，不落库")
    parser.add_argument("--model", default=None, help="指定 LLM 模型（覆盖默认）")
    parser.add_argument("--temperature", type=float, default=None, help="LLM 温度")
    parser.add_argument("--max-tokens", type=int, default=None, help="LLM 输出最大 tokens")
    parser.add_argument("--max-chars", type=int, default=8000, help="拼装到提示的最长字符数（每块）")
    parser.add_argument("--sample-items", type=int, default=10, help="sample_data 为数组时最多传入的条目数")
    parser.add_argument("--config", default="development", help="Flask 配置名")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

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


