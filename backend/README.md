# GeoQuery Backend — LLM + PostGIS

This backend powers the capstone Language-Based Geographic Reasoning platform. It focuses on translating natural-language questions into PostGIS queries and returning structured results that drive the frontend visualisations. Built with **Flask** and SQLAlchemy, it orchestrates:

- RESTful APIs under `/api` for query submission, clarification, and data retrieval.
- LLM-driven SQL generation that maps user intent onto the Natural Earth dataset and other uploaded tables.
- A multi-level (L1–L3) table-card selection pipeline that reduces hallucinations and improves query accuracy.
- Safe SQL execution, fallback handling, and consistent error reporting for cloud-hosted PostGIS.
- Extensible services for clarification prompts, session/state management, and future integrations (e.g., Redis).

## Directory Overview

- `app/`
  - `api/` – HTTP routes (`/api` namespace) including SQL generation and mock endpoints.
  - `services/` – Business logic (LLM orchestration, SQL execution, routing pipeline).
  - `models/` – DTOs used for request/response validation.
  - `extensions.py` – Flask extensions (SQLAlchemy, CORS, shared LLM service).
  - `utils/` – Helpers such as GeoJSON conversion.
  - `script/` – Maintenance scripts (LLM batch operations, data import utilities).
- `config.py` – Flask configuration profiles (development, production, etc.).
- `run.py` – Application entry point (loads `.env`, creates the Flask app, runs the development server).
- `pyproject.toml` / `uv.lock` – Python dependencies managed with `uv`.
- `pytest.ini` / `tests/` – Pytest configuration and suites.

## Quick Start

1. **Install uv (recommended)**

   <https://docs.astral.sh/uv/getting-started/installation/>

2. **Create a virtual environment and install dependencies**

   ```bash
   cd backend
   uv venv                          # Skip if you already have a venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   uv sync
   cp .env.example .env             # Provide database/LLM credentials as needed
   ```

3. **Provision database connectivity**

   - Open an SSH tunnel to the managed database server whenever you must access the shared cloud dataset:
     ```bash
     ssh -L 5433:localhost:5432 ubuntu@3.107.231.45 -N
     ```
     The tunnel forwards the remote Postgres port to `localhost:5433`, allowing the backend or tooling to connect securely to production-like data without exposing the database publicly.

4. **Run the development server**

   ```bash
   uv run run.py
   ```

   The server defaults to `http://0.0.0.0:8000` (configurable via `APP_HOST` and `APP_PORT` in `.env`).

5. **Run the test suite**

   ```bash
   pytest
   ```

## Demo Endpoint

- `POST /api/query/mock` – Demonstrates the SQL generation response format without requiring a live LLM or database.

**Sample request body**

```json
{ "question": "rivers near Perth", "test_case": 1 }
```

## Production Endpoint

- `POST /api/query` – Converts natural language into executable SQL, runs the query, and returns the result set.

**Description**

- Input: JSON payload containing `"question": str`.
- Output: SQL text, query results, model reasoning, LLM model identifier, and a fallback flag.

**Response format**

```json
{
  "sql": "SELECT ...",
  "results": [
    { "col1": "val1", "col2": "val2" },
    { "col1": "val3", "col2": "val4" }
  ],
  "reasoning": ["step1...", "step2..."],
  "model_used": "gpt-xxx",
  "is_fallback": false
}
```

**Response format ❌ Error**

```json
{
  "code": "VALIDATION_ERROR",
  "detail": "Query must have a non-empty question!"
}
```

**Key features**

- ✅ Calls `RoutingService` to transform natural language questions into SQL.
- ✅ Executes SQL safely via `sql_service` using SQLAlchemy.
- ✅ Falls back to `SELECT * ...` when the initial SQL fails.
- ✅ Returns standardized error responses through `_err`.
