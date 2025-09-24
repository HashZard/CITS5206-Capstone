from __future__ import annotations

from typing import Any


def render_step1_prompt(
    table_name: str, schema_definition: str | dict, sample_data: str | dict | list
) -> dict[str, str]:
    """Render prompts for Step 1 — Field Explanation."""
    system = "You are an assistant that analyzes database tables."
    user = (
        f"Table name: {table_name}\n\n"
        "Schema definition:\n"
        f"{_ensure_str(schema_definition)}\n\n"
        "Sample data (CSV or JSON):\n"
        f"{_ensure_str(sample_data)}\n\n"
        "Task:\n"
        "- List all fields in the table.\n"
        "- Provide clear explanations of each field’s meaning, based on both the field name and the sample data.\n"
        "- If possible, explain what each field is used for in geographic or statistical context.\n\n"
        "Output JSON:\n"
        '{\n  "fields": [\n    {"name": "field_name", "explanation": "meaning of this field"}\n  ]\n}\n'
    )
    return {"system": system, "user": user}


def render_step2_prompt(step1_result: dict[str, Any]) -> dict[str, str]:
    """Render prompts for Step 2 — Merge Similar Fields."""
    system = "You are an assistant that merges semantically similar fields in a database table."
    user = (
        "Input field list with explanations:\n"
        f"{_ensure_str(step1_result)}\n\n"
        "Task:\n"
        "- Identify fields that have the same or very similar meaning.\n"
        "- Merge them into a unified description.\n"
        "- For each merged group, return an object with:\n"
        "  * unified: the new unified field name\n"
        "  * explanation: describe which fields were merged and why\n\n"
        "- Also produce a flat list called `merged_result` that contains ALL fields to keep (both merged and non-merged).\n"
        '- Each entry in merged_result should have {"name": unified_field_name, "explanation": unified_explanation}.\n\n'
        "Output JSON:\n"
        "{\n"
        '  "merged_fields": [\n'
        '    {"unified": "3-letter country code",\n'
        '     "explanation": "adm0_a3 and adm0_a3_cn merged because both are ISO-3 codes"}\n'
        "  ],\n"
        '  "merged_result": [\n'
        '    {"name": "3-letter country code", "explanation": "ISO-3 code used for identifying countries"},\n'
        '    {"name": "country name", "explanation": "official country name"},\n'
        '    {"name": "population", "explanation": "estimated population"}\n'
        "  ]\n"
        "}\n"
    )
    return {"system": system, "user": user}


def render_step3_prompt(step2_result: str) -> dict[str, str]:
    """Render prompts for Step 3 — Remove Irrelevant Fields."""
    system = "You are an assistant that cleans database fields for query usage."
    user = (
        "Merged result field list:\n"
        f"{_ensure_str(step2_result)}\n\n"
        "Task:\n"
        "- Remove fields that are not useful for queries or analysis.\n"
        "- Typically exclude fields such as scalerank, labelrank, internal IDs, or purely rendering fields.\n"
        "- For each removed field, return it with an explanation of why it was removed (under `removed_fields`).\n"
        "- For the fields kept, return them under `cleaned_result` with name + explanation.\n\n"
        "Output JSON:\n"
        "{\n"
        '  "removed_fields": [\n'
        '    {"name": "scalerank", "reason": "only used for map rendering, not useful for queries"}\n'
        "  ],\n"
        '  "cleaned_result": [\n'
        '    {"name": "country name", "explanation": "official country name"},\n'
        '    {"name": "3-letter country code", "explanation": "ISO-3 code used for identifying countries"}\n'
        "  ]\n"
        "}\n"
    )
    return {"system": system, "user": user}


def render_step4_prompt(table_name: str, step3_result: str) -> dict[str, str]:
    """Render prompts for Step 4 — TableCard-Detail."""
    system = (
        "You are an assistant that creates a structured description card for a database table. "
        "Your goal is to capture the essential purpose, usage context, and key fields of the table. "
        "The output should allow someone unfamiliar with the table to quickly understand what it contains "
        "and how it might be used in analysis or applications."
    )
    user = (
        f"Table name: {table_name}\n\n"
        "Field list (after cleaning irrelevant fields):\n"
        f"{_ensure_str(step3_result)}\n\n"
        "Task:\n"
        "- Generate a concise but informative TableCard-Detail.\n"
        "- Highlight the table’s theme (high-level category).\n"
        "- Provide a human-friendly display_name (short descriptive title).\n"
        "- Write a brief summary explaining the table’s overall purpose and what kind of analysis it supports.\n"
        "- List core fields.\n"
        "- Suggest relevant keywords for retrieval and classification.\n"
        "- Suggest practical use cases that demonstrate how this table could be applied.\n\n"
        "Output JSON:\n"
        "{\n"
        '  "table_name": "string",\n'
        '  "display_name": "string, human-friendly name",\n'
        '  "theme": "string, high-level category",\n'
        '  "summary": "string, brief description of the table\'s purpose and usage",\n'
        '  "core_fields": ["field1", "field2"],\n'
        '  "keywords": ["kw1", "kw2"],\n'
        '  "use_cases": ["case1", "case2"]\n'
        "}\n"
    )
    return {"system": system, "user": user}


def _ensure_str(obj: Any) -> str:
    if isinstance(obj, str):
        return obj
    try:
        import json

        return json.dumps(obj, ensure_ascii=False, indent=2)
    except Exception:
        return str(obj)
