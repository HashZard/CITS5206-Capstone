8-Week Execution Plan

Week 1
- Initial meeting with the client to understand the project background and core requirements.
- Confirm GIS data types, field structures, and spatial coverage requirements.

Week 2
- Obtain the QGIS/PostGIS dataset from the client.
- Use QGIS to check data integrity, perform data analysis, and complete data understanding and evaluation.

Week 3
- Define multi-level table structure grouping rules (Level 1–3 TableCard) and field mapping relationships.
- Build the initial system architecture (PostGIS + FastAPI + Redis).
- Create the initial frontend UI design: complete main interface layouts (login/registration, dashboard, query page).
- Collect team feedback and discuss desired user-friendly features.

Week 4
- Complete backend architecture setup.
- Implement backend multi-level table selection mechanism (Level 1–3 TableCard matching algorithm + caching).
- Develop the initial LLM prompt based on table card metadata for single-table SQL generation and execution.
- Frontend completes single-table query input and result display pages.
- Perform initial API integration to ensure end-to-end functionality.

Week 5–6
- Backend adds clarification mechanism (missing parameter detection + automated prompts).
- Implement multi-table SQL generation and execution.
- Optimize LLM prompts to reduce token consumption and improve cross-table query accuracy.
- Frontend completes clarification pop-up interactions and multi-table result visualization.
- Integrate frontend with backend for seamless query handling.

Week 7
- Conduct unit, integration, and performance tests.
- Fix defects and optimize response latency.
- Deploy test environment.

Week 8
- Complete cloud production deployment.
- Deliver full project documentation (system architecture, API docs, user manual).
- Conduct online training and provide recorded project handover.
