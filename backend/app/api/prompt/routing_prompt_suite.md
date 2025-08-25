# Online Routing Prompt Suite (Based on L1/L2/L3 Data Models, Returning IDs)

This suite is designed for API usage, to route user questions step by step into **L1 → L2 → L3**, and finally to the SQL generation stage.  
Key features:  
- Each step must return **IDs** (since levels are linked by IDs).  
- Each prompt explicitly defines the input object structure to avoid ambiguity.  

---

## Step 1: L1 Selection

**Input structure**  
`{l1_list}` is a JSON array, each element is an **L1Category** object with:  
- `id` (int)  
- `name` (string)  
- `description` (string, optional)  
- `dimension` (string, optional)  
- `keywords` (list of strings)  

**Prompt**
```
You are an assistant that routes a user question into a 3-level taxonomy.
Task: Select the most relevant L1 categories for the question.

User question:
{user_question}

Available L1 categories (list of L1Category objects):
{l1_list}

Instructions:
- Read the question and pick 1–2 L1 categories that best match the intent.
- Explain briefly why they match.
- Output JSON only with keys:
  - l1_selected: array of objects {id, name}
  - reasons: array of strings
```

**Output example**
```json
{
  "l1_selected": [
    {"id": 1, "name": "Natural Geography / Lakes"}
  ],
  "reasons": ["The question is about lakes and names, matching this L1 keyword"]
}
```

---

## Step 2: L2 Selection

**Input structure**  
`{l2_list}` is a JSON array, each element is an **L2Card** object with:  
- `id` (int)  
- `name` (string)  
- `description_short` (string)  
- `keywords` (list of strings)  
- `allowed_dimensions` (list of strings, optional)  

**Prompt**
```
You are an assistant that continues classification into the 3-level taxonomy.
Task: From the given L2 categories, select the most relevant ones for the question.

User question:
{user_question}

Available L2 categories (list of L2Card objects):
{l2_list}

Instructions:
- Pick 1–2 L2 categories that best match the intent.
- Explain briefly why they match.
- Output JSON only with keys:
  - l2_selected: array of objects {id, name}
  - reasons: array of strings
```

**Output example**
```json
{
  "l2_selected": [
    {"id": 2, "name": "Lake Boundaries and Attributes"}
  ],
  "reasons": ["The question is about lake names, matching this L2 keywords"]
}
```

---

## Step 3: L3 Selection

**Input structure**  
`{l3_list}` is a JSON array, each element is an **L3Table** object with:  
- `id` (int)  
- `table_name` (string)  
- `display_name` (string)  
- `summary` (string)  
- `core_fields` (list of strings)  
- `keywords` (list of strings, optional)  
- `use_cases` (list of strings, optional)  
- `tablecard_detail_md` (string, optional)  

**Prompt**
```
You are an assistant that continues classification into the 3-level taxonomy.
Task: From the given L3 tables, select exactly one L3 table that best fits the question.

User question:
{user_question}

Available L3 tables (list of L3Table objects):
{l3_list}

Instructions:
- Choose exactly one L3 table.
- Explain briefly why it matches.
- Output JSON only with keys:
  - l3_selected: object {id, table_name, display_name}
  - reasons: array of strings
```

**Output example**
```json
{
  "l3_selected": {
    "id": 5,
    "table_name": "ne_10m_lakes",
    "display_name": "Global Lakes Data"
  },
  "reasons": ["Contains fields name/name_alt, suitable for lake name queries"]
}
```

---

## Step 4: SQL Generation

**Input structure**  
- `{l3_schema}`: Full schema of the chosen table, including field names, data types, primary key, nullability, geometry type, etc.  
- `{constraints_json}`: Optional constraints JSON (e.g., `{"limit":100,"bbox":null,"language":"en"}`).  

**Prompt**
```
You are an assistant that generates SQL for PostgreSQL/PostGIS.

User question:
{user_question}

Chosen L3:
{l3_selected}

Full schema of the chosen L3 table:
{l3_schema}

Optional constraints (JSON):
{constraints_json}

Instructions:
- Understand the intent (lookup / filter / aggregate / spatial).
- Generate parameterized SQL for PostgreSQL/PostGIS.
- Use named params like :q, :iso, :lng, :lat, :meters, :limit.
- Do not SELECT *; only include necessary fields.
- If spatial, assume SRID=4326.
- Respect constraints.limit if provided; otherwise use default limit.
- Output JSON with keys:
  - final_sql: {sql:string, params:object}
  - assumptions: array of strings
  - notes: array of strings
```

**Output example**
```json
{
  "final_sql": {
    "sql": "SELECT gid, name, name_alt FROM public.ne_10m_lakes WHERE (name ILIKE :q OR COALESCE(name_alt,'') ILIKE :q) LIMIT :limit;",
    "params": { "q": "%Victoria%", "limit": 100 }
  },
  "assumptions": ["Multilingual names handled by name and name_alt fields"],
  "notes": ["Recommend index on name column to improve fuzzy matching performance"]
}
```
