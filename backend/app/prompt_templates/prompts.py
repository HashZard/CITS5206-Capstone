L1_PROMPT_TEMPLATE = (
    "You are an assistant that routes a user question into a 3-level taxonomy.\n"
    "Task: Select the most relevant L1 categories for the question.\n\n"
    "User question:\n"
    "$user_question\n\n"
    "Available L1 categories (list of L1Category objects):\n"
    "$l1_list\n\n"
    "Instructions:\n"
    "- Read the question and pick 1–2 L1 categories that best match the intent.\n"
    "- Explain briefly why they match.\n"
    "- Output JSON only with keys:\n"
    "  - l1_selected: array of objects {id, name}\n"
    "  - reasons: array of strings\n\n"
    "Output Example:\n"
    "{\n"
    '    "l1_selected": [\n'
    '        {"id": 1, "name": "Natural Geography / Lakes"}\n'
    "    ],\n"
    '    "reasons": ["The question is about lakes and names, matching this L1 keyword"]\n'
    "}"
)


L2_PROMPT_TEMPLATE = (
    "You are an assistant that continues classification into the 3-level taxonomy.\n"
    "Task: From the given L2 categories, select the most relevant ones for the question.\n\n"
    "User question:\n"
    "$user_question\n\n"
    "Available L2 categories (list of L2Card objects):\n"
    "$l2_list\n\n"
    "Instructions:\n"
    "- Pick 1–2 L2 categories that best match the intent.\n"
    "- Explain briefly why they match.\n"
    "- Output JSON only with keys:\n"
    "  - l2_selected: array of objects {id, name}\n"
    "  - reasons: array of strings\n"
    "Output Example:\n"
    "{\n"
    '  "l2_selected": [\n'
    '    {"id": 2, "name": "Lake Boundaries and Attributes"}\n'
    "  ],\n"
    '  "reasons": ["The question is about lake names, matching this L2 keywords"]\n'
    "}\n"
)


L3_PROMPT_TEMPLATE = (
    "You are an assistant that continues classification into the 3-level taxonomy.\n"
    "Task: From the given L3 tables, select exactly one L3 table that best fits the question.\n\n"
    "User question:\n"
    "$user_question\n\n"
    "Available L3 tables (list of L3Table objects):\n"
    "$l3_list\n\n"
    "Instructions:\n"
    "- Choose exactly one L3 table.\n"
    "- Explain briefly why it matches.\n"
    "- Output JSON only with keys:\n"
    "  - l3_selected: object {id, table_name, display_name}\n"
    "  - reasons: array of strings\n"
    "Output Example:\n"
    "{\n"
    '  "l3_selected": [{\n'
    '    "id": 5,\n'
    '    "table_name": "ne_10m_lakes",\n'
    '    "display_name": "Global Lakes Data"\n'
    "  }],\n"
    '  "reasons": ["Contains fields name/name_alt, suitable for lake name queries"]\n'
    "}\n"
)


SQL_PROMPT_TEMPLATE = (
    "You are an assistant that generates SQL for PostgreSQL/PostGIS.\n\n"
    "User question:\n"
    "$user_question\n\n"
    "Chosen L3:\n"
    "$l3_selected\n\n"
    "Full schema of the chosen L3 table:\n"
    "$l3_schema\n\n"
    "Optional constraints (JSON):\n"
    "$constraints\n\n"
    "Instructions:\n"
    "- Understand the intent (lookup / filter / aggregate / spatial).\n"
    "- Generate parameterized SQL for PostgreSQL/PostGIS.\n"
    "- Use named params like :q, :iso, :lng, :lat, :meters, :limit.\n"
    "- Do not SELECT *; only include necessary fields.\n"
    "- If spatial, assume SRID=4326.\n"
    "- Respect constraints.limit if provided; otherwise use default limit.\n"
    "- If the table contains a geometry column (such as geometry, geom, the_geom, etc.), you MUST include this column in the SELECT fields, regardless of the user's question. This is mandatory.\n"
    "- Output JSON with keys:\n"
    "  - final_sql: {sql:string, params:object}\n"
    "  - assumptions: array of strings\n"
    "  - notes: array of strings\n"
    "Output Example:\n"
    "{\n"
    '  "final_sql": {\n'
    '    "sql": "SELECT gid, name, name_alt, geometry FROM public.ne_10m_lakes WHERE (name ILIKE :q OR COALESCE(name_alt,\'\') ILIKE :q) LIMIT :limit;",\n'
    '    "params": { "q": "%Victoria%", "limit": 100 }\n'
    "  },\n"
    '  "assumptions": ["Multilingual names handled by name and name_alt fields"],\n'
    '  "notes": ["Recommend index on name column to improve fuzzy matching performance"]\n'
    "}"
)
