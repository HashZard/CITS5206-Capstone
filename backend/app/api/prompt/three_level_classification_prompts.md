# Three-Level Classification Workflow (API-ready Prompts)

This document defines a **fixed workflow** for classifying new database tables into our **three-level model (L1–L2–L3)**.  
Each step includes a **self-contained prompt** with background instructions, so it can be used directly in **ChatGPT API** calls without depending on conversation history.  

---

## Step 0: Data Sampling (External Input)

**Note:** This step is done outside GPT.  
- Purpose: Get representative rows that reflect the table’s characteristics.  
- Save a sample into `.csv` format.  
- This `.csv` file will be pasted into Step 1.  

---

## Step 1: List All Fields with Explanations

**Prompt (self-contained):**
```
You are an assistant helping to classify geographic database tables into a three-level structure (L1–L2–L3).
Your task is to analyze the fields of a new table.

Table name: {table_name}
Here is a random sample of the table data (CSV format):
{pasted_sample_csv}

Instructions:
1. List all fields (columns) in the table.
2. Provide clear explanations of each field’s meaning, based on both the field name and the sample data.
3. If possible, explain how each field is used in geographic or statistical context.

Output format (Markdown table):

| Field | Explanation |
|-------|-------------|
| name  | country name in English |
| iso_a3| ISO 3-letter country code |
...
```

---

## Step 2: Merge Similar Fields

**Prompt (self-contained):**
```
You are helping to refine a geographic database schema.
The table under analysis is: {table_name}.

Here is the current field explanation list:
{pasted_field_list}

Instructions:
1. Identify fields that have the same or very similar meaning.
2. Merge them into one unified description to reduce redundancy.
3. Keep only meaningful merged entries.

Output format (Markdown table):

| Field(s) | Unified Explanation |
|----------|---------------------|
| adm0_a3, adm0_a3_cn | 3-letter country code (multiple versions) |
...
```

---

## Step 3: Remove Irrelevant Fields

**Prompt (self-contained):**
```
You are helping to clean a geographic database schema.
The table under analysis is: {table_name}.

Here is the merged field list:
{pasted_merged_fields}

Instructions:
1. Remove fields that are not useful for queries (e.g., scalerank, labelrank, internal IDs, rendering-only fields).
2. Keep only fields that are meaningful for query, analysis, or spatial reasoning.

Output format (Markdown table):

| Field | Explanation |
|-------|-------------|
...
```

---

## Step 4: Create TableCard-Detail

**Prompt (self-contained):**
```
You are helping to document a geographic database table.
The table under analysis is: {table_name}.

Here is the cleaned field list:
{pasted_cleaned_fields}

Instructions:
1. Create a concise description card for this table (TableCard-Detail).
2. Include: table name, theme, field explanations, keywords, and example use cases.
3. Write in Markdown with clear structure.

Output format:

## TableCard-Detail: {table_name}

**Table Name:** {table_name}  
**Theme:** {short theme description}  

**Field Explanations:**  
- field1: explanation  
- field2: explanation  
...  

**Keywords:** keyword1, keyword2, keyword3  

**Use Cases:**  
- case1  
- case2  
- case3  
```

---

## Step 5: Generate 3-Level Structure

**Prompt (self-contained):**
```
You are helping to classify geographic database tables into a three-level structure.

Here is a TableCard-Detail:
{pasted_tablecard}

Instructions:
1. Place this table into the 3-level hierarchy: L1 (top-level), L2 (subcategory), L3 (the table itself).
2. Generate one hierarchy tree with L1 → L2 → L3.

Output format:

- L1: {top-level category name}
  └─ L2: {subcategory}
       └─ L3: {table_name}
```

---

# Usage Demonstration with ChatGPT API

Here is a minimal Python example using the **OpenAI Chat Completions API**.  
It shows how to call GPT with these prompts in sequence, maintaining conversation state manually in your code.

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

# Step 0: you already prepared a CSV sample
sample_csv = """
name,iso_a3,pop_est,gdp_md,geom
China,CHN,1400000000,14342903,"<geometry>"
France,FRA,67000000,2938271,"<geometry>"
...
"""

# Step 1 prompt
prompt_step1 = f""" 
You are an assistant helping to classify geographic database tables into a three-level structure (L1–L2–L3).
Your task is to analyze the fields of a new table.

Table name: ne_10m_admin_0_countries_chn
Here is a random sample of the table data (CSV format):
{sample_csv}

Instructions:
1. List all fields (columns) in the table.
2. Provide clear explanations of each field’s meaning, based on both the field name and the sample data.
3. If possible, explain how each field is used in geographic or statistical context.

Output format (Markdown table):

| Field | Explanation |
|-------|-------------|
""" 

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt_step1}],
)

print(response.choices[0].message["content"])
```

**Important:**  
- The API is **stateless**. It does **not** remember past interactions unless you include them in the `messages` array.  
- To maintain context across Step 1 → Step 5, you need to save each response and pass it as part of the next prompt (`pasted_field_list`, `pasted_merged_fields`, etc.).  

---

# Summary

- Step 0: Sample data externally → `.csv`  
- Step 1–5: Run prompts in order, each is **self-contained** and can be used directly in API.  
- Always paste the **previous step’s output** into the `{pasted_xxx}` placeholder of the next prompt.  
- Manage conversation context in your own code (the API itself does not persist it).
