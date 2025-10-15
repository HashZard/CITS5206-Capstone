# GeoQuery

Developed as part of the 2025 UWA CITS5206 Capstone Project.

## Project Overview
Language-Based Geographic Reasoning is a web platform that turns natural language questions (e.g., “Show all rivers in Europe”) into optimised PostGIS SQL queries, executes the spatial analysis, and delivers interactive map visualisations within seconds. The system lowers the learning curve of traditional GIS tools by combining LLM-powered query translation, multi-step clarification, and a multi-level table selection mechanism that improves accuracy while reducing processing overhead. Our MVP targets university GIS professionals, students, and broader non-GIS users who need fast, reliable access to spatial insights.

## Features

- **Natural language → PostGIS SQL** via LLM-powered translation.
- **Multi-step clarification** to resolve vague or incomplete queries.
- **Multi-level table selection** to improve accuracy and reduce processing overhead.
- **Interactive map visualisations** and basic attribute table inspection.
- **Modular architecture** with clear service boundaries (LLM, SQL execution, map rendering).

## Tech Stack

- **Frontend:** React + TypeScript (map-centric UI).
- **Backend:** Python + Flask + SQLAlchemy + PostgreSQL **PostGIS** for spatial queries.
- **Data:** Natural Earth vector layers (WGS84/EPSG:4326) and project-provided datasets as applicable.

## Repository Structure

```
frontend/
backend/
docs/       				# Specs, design notes, and planning materials
docker-compose.yml	# Provides the PostGIS spatial database used by the backend
```

## Installation & Setup

Use the detailed steps in `frontend/README.md` and `backend/README.md` as the source of truth.

- [Frontend Guide](frontend/README.md)
- [Backend Guide](backend/README.md)

## Usage (Examples)

- “Show all rivers in Europe.”
- “Show countries in the Southern Hemisphere (approx lat < 0).”

The system will interpret the question, perform table/field matching, ask clarifying questions when needed, generate and execute SQL, and render results on the map.

## Meeting Minutes
All the meeting minutes are available in [docs/meeting_minutes](docs/meeting_minutes).

## Acknowledgements

- **Natural Earth** — free map data for educational use.
- UWA CITS5206 teaching team and stakeholders for guidance and feedback.
