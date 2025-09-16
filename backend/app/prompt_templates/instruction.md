# Three-Level Modeling Workflow (API Prompt Guide)

This document describes the **step-by-step workflow** for generating a three-level classification (L1 → L2 → L3) for database tables using the GPT API.  
It also defines what input data is required for each step, the prompt template, and the expected output format.  
All intermediate results should be stored into the tracking table `public.init_tasks`.

---

## Table: init_tasks

This table records the modeling process for each database table.

### Recommended schema

```sql
CREATE TABLE public.init_tasks (
    id SERIAL PRIMARY KEY,
    table_name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending / running / failed / done
    is_done Boolean,
    sample_data TEXT,               -- sample CSV or JSON
    schema_definition TEXT,
    step1_result JSONB,
    step2_result JSONB,
    step3_result JSONB,
    step4_tablecard JSONB,
    l1_info JSONB,
    l2_info JSONB,
    l3_info JSONB,
    raw_output JSONB,
    error_log TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

Step 1 — Field Explanation

Required data:
    table_name
    schema_definition
    sample_data

Prompt:
You are an assistant that analyzes database tables.

Table name: {table_name}

Schema definition:
{schema_definition}

Sample data (CSV or JSON):
{sample_data}

Task:
- List all fields in the table.
- Provide clear explanations of each field’s meaning, based on both the field name and the sample data.
- If possible, explain what each field is used for in geographic or statistical context.

Output JSON:
{
  "fields": [
    {"name": "field_name", "explanation": "meaning of this field"},
    ...
  ]
}

Store result in: step1_result



Step 2 — Merge Similar Fields

Required data:
step1_result

Prompt:
You are an assistant that merges semantically similar fields in a database table.

Input field list with explanations:
{step1_result}

Task:
- Identify fields that have the same or very similar meaning.
- Merge them into a unified description.
- Keep only one representative field for each group.

Output JSON:
{
  "merged_fields": [
    {"names": ["field1","field2"], "unified": "unified explanation"},
    {"names": ["field3"], "unified": "unique explanation"},
    ...
  ]
}
Store result in: step2_result

Step 3 — Remove Irrelevant Fields

Required data:
step2_result

Prompt:
You are an assistant that cleans database fields for query usage.

Merged field list:
{step2_result}

Task:
- Remove fields that are not useful for queries or analysis.
- Typically exclude fields such as scalerank, labelrank, internal IDs, or purely rendering fields.
- Keep only meaningful fields for queries.

Output JSON:
{
  "cleaned_fields": [
    {"name": "field_name", "explanation": "meaningful explanation"},
    ...
  ]
}

Store result in: step3_result

Step 4 — TableCard-Detail

Required data:
table_name
step3_result

Prompt:
You are an assistant that creates a concise description card for a database table.

Table name: {table_name}

Cleaned field list:
{step3_result}

Task:
- Generate a TableCard-Detail in Markdown style.
- Include: table name, theme, field explanations, keywords, and example use cases.

Output JSON:
{
  "tablecard_detail_md": "## TableCard-Detail: {table_name}\n\n**Table Name:** ...\n**Theme:** ...\n\n**Field Explanations:**\n- field1: explanation\n...\n\n**Keywords:** [...]\n\n**Use Cases:**\n- case1\n- case2\n"
}

Store result in: step4_tablecard

