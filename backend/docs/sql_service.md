# SQL Service Documentation

## Overview

The SQL Service provides a secure, isolated layer for database operations with comprehensive SQL validation and safety features. It has been enhanced to provide better isolation from other components and includes interfaces for running single SQL commands with validation.

## Architecture

The service is implemented as an isolated class `SQLService` that provides:

1. **SQL Validation**: Syntax checking and injection prevention
2. **Query Building**: Safe construction of parameterized queries  
3. **Execution**: Controlled SQL execution with error handling
4. **Schema Introspection**: Table and column metadata access
5. **Connection Management**: Database connection testing and monitoring

## Key Features

### SQL Validation
- Syntax validation without execution
- SQL injection pattern detection
- Query length and complexity limits
- Balanced quotes and parentheses checking
- Dangerous keyword filtering

### Security Features
- Only SELECT statements allowed by default
- SQL identifier sanitization
- Parameterized query support
- Configurable limits (query length, result limits)
- Comprehensive logging

### Isolation
- Self-contained service class
- No dependencies on other business logic
- Clear interfaces for all operations
- Cacheable metadata operations
- Error isolation and handling

## API Endpoints

### Core Query Operations
- `POST /api/query` - Execute structured queries
- `POST /api/query/preview` - Preview SQL without execution

### Enhanced SQL Operations  
- `POST /api/sql/validate` - Validate SQL syntax
- `POST /api/sql/execute` - Execute raw SQL with validation
- `GET /api/sql/service/info` - Get service information

### Schema Operations
- `GET /api/schema/tables` - List available tables and columns

## Usage Examples

### Validate SQL
```json
POST /api/sql/validate
{
  "sql": "SELECT id, name FROM users WHERE status = 'active'"
}
```

### Execute Raw SQL
```json
POST /api/sql/execute  
{
  "sql": "SELECT COUNT(*) FROM orders WHERE created_at > :date",
  "params": {"date": "2023-01-01"}
}
```

### Service Information
```json
GET /api/sql/service/info
```

## Implementation Details

### SQLService Class
```python
from app.services.sql_service import SQLService

# Create service instance
service = SQLService()

# Validate SQL
result = service.validate_sql_syntax("SELECT * FROM users")

# Execute with validation
result = service.validate_and_execute(sql, params)

# Get table metadata
info = service.get_table_info("users")
```

### Backward Compatibility
The enhanced service maintains backward compatibility with existing code through:
- Wrapper functions for existing API
- Same method signatures for `build_select_sql()` and `execute()`
- Orchestrator can use either old or new interface

### Configuration
```python
# Configure service limits
service.set_limits(max_query_length=5000, max_limit=1000)

# Clear metadata cache
service.clear_cache()

# Test connection
is_connected = service.test_connection()
```

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **Query Restrictions**: Only SELECT operations allowed
3. **Injection Prevention**: Multiple layers of SQL injection protection
4. **Resource Limits**: Configurable limits on query complexity and results
5. **Error Handling**: Secure error messages without information disclosure

## Error Handling

The service returns structured error information:
- `SqlValidationResult` for validation operations
- `QueryResult` for execution operations  
- Proper HTTP status codes in API responses
- Detailed logging for debugging

## Testing

Basic validation logic can be tested independently:
```bash
python /tmp/test_sql_basic.py
```

## Future Enhancements

- Integration with SQL parsing libraries for advanced validation
- Query performance monitoring and optimization hints
- Support for additional SQL operations (INSERT, UPDATE) with proper authorization
- Query caching and result optimization
- Advanced schema introspection and metadata