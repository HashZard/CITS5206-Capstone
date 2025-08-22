from typing import Tuple, List, Dict, Any
from app.models.dto import QueryIn
from app.services import sql_service
from app.services.sql_service import SQLService

class Orchestrator:
    def __init__(self, use_new_service: bool = False):
        """
        Initialize orchestrator with option to use new SQL service
        
        Args:
            use_new_service: If True, use the new SQLService class directly
        """
        self.use_new_service = use_new_service
        if use_new_service:
            self.sql_service = SQLService()
    
    def handle_query(self, qin: QueryIn) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        if self.use_new_service:
            # Use new service interface
            sql, params = self.sql_service.build_select_sql(
                qin.table, qin.columns, qin.filters, qin.limit, qin.offset
            )
            result = self.sql_service.execute_sql(sql, params)
            if not result.success:
                raise Exception(result.error)
            meta = {**result.meta, "limit": qin.limit, "offset": qin.offset}
            return result.data, meta
        else:
            # Use existing service functions for backward compatibility
            sql, params = sql_service.build_select_sql(
                qin.table, qin.columns, qin.filters, qin.limit, qin.offset
            )
            rows, meta = sql_service.execute(sql, params)
            meta = {**meta, "limit": qin.limit, "offset": qin.offset}
            return rows, meta

    def preview_sql(self, qin: QueryIn) -> str:
        if self.use_new_service:
            sql, _ = self.sql_service.build_select_sql(
                qin.table, qin.columns, qin.filters, qin.limit, qin.offset
            )
        else:
            sql, _ = sql_service.build_select_sql(
                qin.table, qin.columns, qin.filters, qin.limit, qin.offset
            )
        return sql
    
    def validate_sql(self, sql: str) -> Dict[str, Any]:
        """Validate SQL syntax using the new service"""
        if not self.use_new_service:
            self.sql_service = SQLService()
            
        result = self.sql_service.validate_sql_syntax(sql)
        return {
            "valid": result.is_valid,
            "error": result.error_message,
            "warnings": result.warnings
        }
    
    def execute_raw_sql(self, sql: str, params: Dict[str, Any] = None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Execute raw SQL with validation (new functionality)"""
        if not self.use_new_service:
            self.sql_service = SQLService()
            
        result = self.sql_service.validate_and_execute(sql, params)
        if not result.success:
            raise Exception(result.error)
        return result.data, result.meta

