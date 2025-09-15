from __future__ import annotations
from typing import Dict, Any


def render_step1_prompt(table_name: str, schema_definition: str | dict, sample_data: str | dict | list) -> Dict[str, str]:
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
        "{\n  \"fields\": [\n    {\"name\": \"field_name\", \"explanation\": \"meaning of this field\"}\n  ]\n}\n"
    )
    return {"system": system, "user": user}


def render_step2_prompt(step1_result: Dict[str, Any]) -> Dict[str, str]:
    """Render prompts for Step 2 — Merge Similar Fields."""
    system = "You are an assistant that merges semantically similar fields in a database table."
    user = (
        "Input field list with explanations:\n"
        f"{_ensure_str(step1_result)}\n\n"
        "Task:\n"
        "- Identify fields that have the same or very similar meaning.\n"
        "- Merge them into a unified description.\n"
        "- Keep only one representative field for each group.\n\n"
        "Output JSON:\n"
        "{\n  \"merged_fields\": [\n    {\"names\": [\"field1\",\"field2\"], \"unified\": \"unified explanation\"}\n  ]\n}\n"
    )
    return {"system": system, "user": user}


def render_step3_prompt(step2_result: Dict[str, Any]) -> Dict[str, str]:
    """Render prompts for Step 3 — Remove Irrelevant Fields."""
    system = "You are an assistant that cleans database fields for query usage."
    user = (
        "Merged field list:\n"
        f"{_ensure_str(step2_result)}\n\n"
        "Task:\n"
        "- Remove fields that are not useful for queries or analysis.\n"
        "- Typically exclude fields such as scalerank, labelrank, internal IDs, or purely rendering fields.\n"
        "- Keep only meaningful fields for queries.\n\n"
        "Output JSON:\n"
        "{\n  \"cleaned_fields\": [\n    {\"name\": \"field_name\", \"explanation\": \"meaningful explanation\"}\n  ]\n}\n"
    )
    return {"system": system, "user": user}


def render_step4_prompt(table_name: str, step3_result: Dict[str, Any]) -> Dict[str, str]:
    """Render prompts for Step 4 — TableCard-Detail."""
    system = "You are an assistant that creates a concise description card for a database table."
    user = (
        f"Table name: {table_name}\n\n"
        "Cleaned field list:\n"
        f"{_ensure_str(step3_result)}\n"
        "Task:\n"
        "- Generate a TableCard-Detail in Markdown style.\n"
        "- Include: table name, theme, field explanations, keywords, and example use cases.\n\n"
        "Output JSON:\n"
        "{\n"
        "  \"table_name\": \"string\",\n"
        "  \"theme\": \"string\",\n"
        "  \"field_explanations\": [\n"
        "    { \"name\": \"field_name\", \"explanation\": \"meaning\" }\n"
        "  ],\n"
        "  \"keywords\": [\"kw1\", \"kw2\"],\n"
        "  \"use_cases\": [\"case1\", \"case2\"],\n"
        "  \"tablecard_detail_md\": \"optional markdown summary to describe the table's content and usage\"\n"
        "}\n"    )
    return {"system": system, "user": user}


def _ensure_str(obj: Any) -> str:
    if isinstance(obj, str):
        return obj
    try:
        import json

        return json.dumps(obj, ensure_ascii=False, indent=2)
    except Exception:
        return str(obj)


