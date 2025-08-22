# LLM Service Documentation

## Overview

The LLM Service provides natural language to SQL conversion capabilities for the GIS data querying system. It allows users to input natural language queries and receive SQL queries that can be executed against the PostGIS database.

## Features

### 🤖 Natural Language Processing
- Convert natural language queries to PostgreSQL/PostGIS SQL
- Support for spatial queries and GIS functions
- Intelligent prompt engineering for better accuracy

### 🛡️ Robust Fallback System
- Keyword-based SQL generation when OpenAI API is unavailable
- Graceful degradation ensures service availability
- Supports common query patterns for L1/L2/L3 table hierarchy

### 🗄️ Database Integration
- Works with the existing L1/L2/L3 table structure
- Understands spatial data relationships
- Provides table suggestions based on query content

### 🔒 Security & Validation
- Parameter sanitization and SQL injection prevention
- Input validation and error handling
- Configurable result limits and safety checks

## API Endpoints

### 1. Natural Language Query Execution
```
POST /api/query/nl
```

**Request Body:**
```json
{
  "query": "Find all lakes near Vancouver",
  "limit": 50,
  "table_context": {
    "available_tables": ["lakes", "cities"],
    "spatial_columns": ["geom", "location"]
  },
  "include_metadata": true
}
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {"id": 1, "name": "English Bay", "geom": "POINT(...)"},
    {"id": 2, "name": "Lost Lagoon", "geom": "POINT(...)"}
  ],
  "meta": {
    "rows": 2,
    "limit": 50,
    "query_type": "natural_language"
  },
  "generated_sql": "SELECT id, name, ST_AsText(geom) FROM lakes WHERE ST_DWithin(geom, (SELECT geom FROM cities WHERE name = 'Vancouver'), 10000) LIMIT :limit",
  "sql_params": {"limit": 50},
  "table_suggestions": [
    {"table_name": "lakes", "columns": ["id", "name", "geom"], "relevance_score": 0.9}
  ]
}
```

### 2. SQL Preview (No Execution)
```
POST /api/query/nl/preview
```

**Request Body:**
```json
{
  "query": "Show me all geographical categories",
  "limit": 10
}
```

**Response:**
```json
{
  "ok": true,
  "sql": "SELECT id, name, description FROM l1_category ORDER BY weight DESC, name LIMIT :limit",
  "meta": {
    "sql_params": {"limit": 10},
    "query_type": "natural_language"
  },
  "warnings": []
}
```

### 3. Table Suggestions
```
POST /api/tables/suggest
```

**Request Body:**
```json
{
  "query": "geographical data",
  "max_results": 5
}
```

**Response:**
```json
{
  "ok": true,
  "suggestions": [
    {
      "table_name": "l1_category",
      "columns": ["id", "name", "description", "keywords"],
      "relevance_score": 1.0
    }
  ],
  "meta": {
    "query": "geographical data",
    "max_results": 5
  }
}
```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration (Optional)
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1

# Database Configuration
POSTGRES_DSN=postgresql://user:password@localhost:5432/gis_db
```

### Fallback Behavior

When OpenAI API is not available or configured, the service uses intelligent keyword matching:

- **"category", "categories", "l1"** → Query L1 categories table
- **"card", "overview", "l2"** → Query L2 cards table  
- **"table", "data", "l3"** → Query L3 tables table
- **Other queries** → Return generic informational query

## Usage Examples

### Basic Natural Language Query
```python
import requests

response = requests.post('/api/query/nl', json={
    "query": "Show me all water bodies in British Columbia",
    "limit": 20
})

data = response.json()
print(f"Found {len(data['data'])} results")
print(f"Generated SQL: {data['generated_sql']}")
```

### Preview Generated SQL
```python
response = requests.post('/api/query/nl/preview', json={
    "query": "Find cities with population over 100000"
})

preview = response.json()
print(f"SQL: {preview['sql']}")
```

### Get Table Suggestions
```python
response = requests.post('/api/tables/suggest', json={
    "query": "population demographics"
})

suggestions = response.json()
for table in suggestions['suggestions']:
    print(f"Table: {table['table_name']} (score: {table['relevance_score']})")
```

## Spatial Query Examples

The LLM service understands common spatial query patterns:

### Distance Queries
- "Find all points within 1km of downtown"
- "Show lakes near the coast"
- "List cities within 50 miles of Vancouver"

### Containment Queries  
- "What's inside this polygon?"
- "Find all features contained in British Columbia"
- "Show points within the study area"

### Intersection Queries
- "Where do these boundaries overlap?"
- "Find intersecting road networks"
- "Show overlapping administrative areas"

## Error Handling

The service provides comprehensive error handling:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query is required and cannot be empty",
    "details": {}
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid input parameters
- `SEMANTIC_ERROR`: SQL generation or execution issues  
- `INTERNAL_ERROR`: System or API errors

## Performance Considerations

### Caching
- Table metadata is cached to improve response times
- Consider implementing query result caching for frequently used patterns

### Rate Limiting
- OpenAI API calls are subject to rate limits
- Fallback system ensures continued service during API limitations

### Optimization Tips
- Provide table context when possible to improve SQL generation accuracy
- Use appropriate result limits to control query performance
- Consider batch processing for multiple related queries

## Development

### Testing
Run the test suite to validate functionality:
```bash
python /tmp/test_core_llm.py
```

### Extending Functionality
The LLM service is designed to be extensible:

1. **Custom Prompts**: Modify `_build_system_prompt()` for domain-specific improvements
2. **Additional Fallbacks**: Extend `_fallback_sql_generation()` for new query patterns  
3. **Table Selection**: Enhance `select_tables()` with semantic matching
4. **Response Parsing**: Improve `_parse_llm_response()` for better SQL extraction

## Security Notes

- All SQL queries use parameterized queries to prevent injection
- Input validation prevents malicious queries
- API keys are handled securely through environment variables
- Result limits prevent resource exhaustion

## Troubleshooting

### Common Issues

**1. "No module named 'httpx'"**
```bash
pip install httpx>=0.27.0
```

**2. OpenAI API errors**
- Check `OPENAI_API_KEY` environment variable
- Verify API key permissions and quota
- Service will fall back to keyword matching

**3. Database connection issues**
- Verify `POSTGRES_DSN` configuration
- Check database connectivity and permissions
- Ensure PostGIS extension is available

**4. Empty or poor SQL generation**
- Provide more specific natural language queries
- Include table context for better results
- Check that table metadata is accessible

For additional support, review the test suite examples and logging output.