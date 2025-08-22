from typing import Dict, Any, List, Tuple, Set, Optional, Union
import re
import logging
from dataclasses import dataclass
from app.extensions import db


@dataclass
class SqlValidationResult:
    """Result of SQL validation"""
    is_valid: bool
    error_message: Optional[str] = None
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


@dataclass 
class QueryResult:
    """Result of SQL query execution"""
    success: bool
    data: List[Dict[str, Any]] = None
    meta: Dict[str, Any] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    
    def __post_init__(self):
        if self.data is None:
            self.data = []
        if self.meta is None:
            self.meta = {}


class SQLService:
    """Isolated SQL service for database operations and validation"""
    
    def __init__(self):
        self._columns_cache: Dict[str, Set[str]] = {}
        self._logger = logging.getLogger(__name__)
        self._max_query_length = 10000  # Maximum allowed query length
        self._max_limit = 10000  # Maximum allowed LIMIT value
        
    def clear_cache(self):
        """Clear the columns cache"""
        self._columns_cache.clear()
        
    def set_limits(self, max_query_length: int = 10000, max_limit: int = 10000):
        """Configure service limits for security"""
        self._max_query_length = max_query_length
        self._max_limit = max_limit
        
    def _sanitize_ident(self, name: str) -> str:
        """Sanitize SQL identifiers to prevent injection"""
        safe = re.sub(r"[^a-zA-Z0-9_]", "", name or "")
        if not safe:
            raise ValueError("invalid identifier")
        return safe
    
    def validate_sql_syntax(self, sql: str) -> SqlValidationResult:
        """
        Validate SQL syntax without executing it.
        This is a basic validation - for production use, consider using a proper SQL parser.
        """
        if not sql or not sql.strip():
            return SqlValidationResult(False, "SQL query cannot be empty")
            
        # Check query length
        if len(sql) > self._max_query_length:
            return SqlValidationResult(False, f"SQL query too long (max {self._max_query_length} characters)")
            
        sql_clean = sql.strip().upper()
        warnings = []
        
        # Basic syntax checks
        dangerous_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE']
        if any(keyword in sql_clean for keyword in dangerous_keywords):
            return SqlValidationResult(False, "Dangerous SQL operations are not allowed")
            
        # Check for basic SQL injection patterns
        injection_patterns = [
            r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|GRANT|REVOKE)",
            r"UNION\s+SELECT",
            r"--\s*[^\r\n]*",
            r"/\*.*?\*/",
            r"xp_cmdshell",
            r"sp_executesql",
        ]
        
        for pattern in injection_patterns:
            if re.search(pattern, sql_clean, re.IGNORECASE | re.DOTALL):
                return SqlValidationResult(False, "Potential SQL injection detected")
        
        # Check for SELECT statements (only allowed operation)
        if not sql_clean.startswith('SELECT'):
            return SqlValidationResult(False, "Only SELECT statements are allowed")
            
        # Check for balanced parentheses
        if sql.count('(') != sql.count(')'):
            return SqlValidationResult(False, "Unbalanced parentheses in SQL")
        
        # Check for balanced quotes
        single_quotes = sql.count("'")
        if single_quotes % 2 != 0:
            return SqlValidationResult(False, "Unbalanced single quotes in SQL")
            
        # Basic check for SELECT * (warn but allow)
        if re.search(r'SELECT\s+\*', sql_clean):
            warnings.append("SELECT * usage detected - consider specifying explicit columns")
            
        # Check for potentially dangerous functions
        dangerous_funcs = ['LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE']
        for func in dangerous_funcs:
            if func in sql_clean:
                return SqlValidationResult(False, f"Dangerous function {func} not allowed")
        
        # Check LIMIT clause if present
        limit_match = re.search(r'LIMIT\s+(\d+)', sql_clean)
        if limit_match:
            limit_value = int(limit_match.group(1))
            if limit_value > self._max_limit:
                return SqlValidationResult(False, f"LIMIT value {limit_value} exceeds maximum {self._max_limit}")
        
        return SqlValidationResult(True, warnings=warnings)
    
    def get_table_columns(self, table: str) -> Set[str]:
        """Get columns for a table from information_schema with caching"""
        tbl = self._sanitize_ident(table)
        if tbl in self._columns_cache:
            return self._columns_cache[tbl]

        sql = """
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name=:tbl
        """
        try:
            with db.engine.connect() as conn:
                rows = conn.execute(db.text(sql), {"tbl": tbl}).fetchall()
            cols = {r[0] for r in rows}
            self._columns_cache[tbl] = cols
            return cols
        except Exception as e:
            self._logger.error(f"Error getting columns for table {tbl}: {e}")
            return set()
    
    def validate_table_and_columns(self, table: str, columns: List[str]) -> SqlValidationResult:
        """Validate that table exists and columns are valid"""
        try:
            tbl = self._sanitize_ident(table)
            allowed = self.get_table_columns(tbl)
            
            if not allowed:
                return SqlValidationResult(False, f"Table '{tbl}' not found or has no columns")

            bad = [c for c in columns if c not in allowed]
            if bad:
                return SqlValidationResult(False, f"Unknown columns: {bad}")
                
            return SqlValidationResult(True)
            
        except ValueError as e:
            return SqlValidationResult(False, str(e))
    
    def build_select_sql(self, table: str, columns: List[str],
                        filters: Dict[str, Any] = None, limit: int = 100, 
                        offset: int = 0) -> Tuple[str, Dict[str, Any]]:
        """Build a safe SELECT SQL statement with parameters"""
        # Validate inputs
        validation = self.validate_table_and_columns(table, columns)
        if not validation.is_valid:
            raise ValueError(validation.error_message)
            
        tbl = self._sanitize_ident(table)
        allowed = self.get_table_columns(tbl)
        
        cols_sql = ", ".join(f'"{c}"' for c in columns)

        where_parts: List[str] = []
        params: Dict[str, Any] = {}
        
        if filters:
            for i, (k, v) in enumerate(filters.items()):
                key = self._sanitize_ident(k)
                if key not in allowed:
                    raise ValueError(f"Unknown filter column: {key}")
                ph = f"p{i}"
                where_parts.append(f'"{key}" = :{ph}')
                params[ph] = v

        where_sql = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""
        sql = f'SELECT {cols_sql} FROM "{tbl}"{where_sql} LIMIT :_limit OFFSET :_offset;'
        params.update({"_limit": int(limit), "_offset": int(offset)})
        
        return sql, params
    
    def execute_sql(self, sql: str, params: Dict[str, Any] = None) -> QueryResult:
        """
        Execute SQL safely with validation and error handling
        """
        import time
        
        if params is None:
            params = {}
            
        # Validate SQL before execution
        validation = self.validate_sql_syntax(sql)
        if not validation.is_valid:
            return QueryResult(False, error=validation.error_message)
        
        start_time = time.time()
        
        try:
            with db.engine.connect() as conn:
                result = conn.execute(db.text(sql), params)
                rows = result.mappings().all()
                data = [dict(r) for r in rows]
                
            execution_time = time.time() - start_time
            meta = {
                "rows": len(data), 
                "execution_time": execution_time,
                "warnings": validation.warnings
            }
            
            return QueryResult(True, data=data, meta=meta, execution_time=execution_time)
            
        except Exception as e:
            self._logger.error(f"SQL execution error: {e}")
            execution_time = time.time() - start_time
            return QueryResult(False, error=str(e), execution_time=execution_time)
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("SELECT 1"))
            return True
        except Exception as e:
            self._logger.error(f"Database connection test failed: {e}")
            return False
    
    def get_table_info(self, table: str) -> Dict[str, Any]:
        """Get comprehensive table information"""
        try:
            tbl = self._sanitize_ident(table)
            
            # Get columns with types
            sql = """
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema='public' AND table_name=:tbl
                ORDER BY ordinal_position
            """
            
            with db.engine.connect() as conn:
                rows = conn.execute(db.text(sql), {"tbl": tbl}).fetchall()
                
            columns = []
            for row in rows:
                columns.append({
                    "name": row[0],
                    "type": row[1], 
                    "nullable": row[2] == "YES",
                    "default": row[3]
                })
            
            # Get row count estimate
            count_sql = f'SELECT COUNT(*) FROM "{tbl}"'
            try:
                with db.engine.connect() as conn:
                    count_result = conn.execute(db.text(count_sql)).fetchone()
                    row_count = count_result[0] if count_result else 0
            except:
                row_count = None
                
            return {
                "table": tbl,
                "columns": columns,
                "column_count": len(columns),
                "estimated_rows": row_count
            }
            
        except Exception as e:
            self._logger.error(f"Error getting table info for {table}: {e}")
            return {"error": str(e)}
    
    def validate_and_execute(self, sql: str, params: Dict[str, Any] = None) -> QueryResult:
        """Validate SQL and execute if valid - main entry point for safe SQL execution"""
        # First validate the SQL
        validation = self.validate_sql_syntax(sql)
        if not validation.is_valid:
            return QueryResult(False, error=validation.error_message)
            
        # Execute if validation passes
        result = self.execute_sql(sql, params)
        
        # Add validation warnings to result
        if validation.warnings and result.success:
            if 'warnings' not in result.meta:
                result.meta['warnings'] = []
            result.meta['warnings'].extend(validation.warnings)
            
        return result
    
    def build_count_sql(self, table: str, filters: Dict[str, Any] = None) -> Tuple[str, Dict[str, Any]]:
        """Build a COUNT query for the specified table"""
        tbl = self._sanitize_ident(table)
        allowed = self.get_table_columns(tbl)
        
        if not allowed:
            raise ValueError(f"Table '{tbl}' not found or has no columns")

        where_parts: List[str] = []
        params: Dict[str, Any] = {}
        
        if filters:
            for i, (k, v) in enumerate(filters.items()):
                key = self._sanitize_ident(k)
                if key not in allowed:
                    raise ValueError(f"Unknown filter column: {key}")
                ph = f"p{i}"
                where_parts.append(f'"{key}" = :{ph}')
                params[ph] = v

        where_sql = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""
        sql = f'SELECT COUNT(*) FROM "{tbl}"{where_sql};'
        
        return sql, params


# Create global instance for backward compatibility
_sql_service = SQLService()

# Backward compatibility functions
def _sanitize_ident(name: str) -> str:
    return _sql_service._sanitize_ident(name)

def get_columns(table: str) -> Set[str]:
    return _sql_service.get_table_columns(table)

def build_select_sql(table: str, columns: List[str],
                     filters: Dict[str, Any], limit: int, offset: int) -> Tuple[str, Dict[str, Any]]:
    return _sql_service.build_select_sql(table, columns, filters, limit, offset)

def execute(sql: str, params: Dict[str, Any]):
    result = _sql_service.execute_sql(sql, params)
    if not result.success:
        raise Exception(result.error)
    return result.data, result.meta

