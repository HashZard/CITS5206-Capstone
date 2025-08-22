from typing import Tuple, List, Dict, Any
from app.models.dto import QueryIn, NLQueryIn
from app.services import sql_service
from app.services.llm_service import LLMService

class Orchestrator:
    def __init__(self):
        self.llm_service = LLMService()
    
    def handle_query(self, qin: QueryIn) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        sql, params = sql_service.build_select_sql(
            qin.table, qin.columns, qin.filters, qin.limit, qin.offset
        )
        rows, meta = sql_service.execute(sql, params)
        meta = {**meta, "limit": qin.limit, "offset": qin.offset}
        return rows, meta

    def preview_sql(self, qin: QueryIn) -> str:
        sql, _ = sql_service.build_select_sql(
            qin.table, qin.columns, qin.filters, qin.limit, qin.offset
        )
        return sql

    async def handle_nl_query(self, nlq: NLQueryIn) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str, Dict[str, Any]]:
        """
        处理自然语言查询
        
        Returns:
            Tuple of (data_rows, metadata, generated_sql, sql_params)
        """
        # 准备LLM提示
        prompt = {
            "query": nlq.query,
            "table_context": nlq.table_context,
            "limit": nlq.limit
        }
        
        # 生成SQL
        llm_result = await self.llm_service.generate_sql(prompt)
        sql = llm_result.get("sql", "SELECT 1")
        params = llm_result.get("params", {})
        
        # 执行SQL
        try:
            rows, meta = sql_service.execute(sql, params)
            meta = {**meta, "limit": nlq.limit, "query_type": "natural_language"}
            return rows, meta, sql, params
        except Exception as e:
            # 如果生成的SQL执行失败，返回错误信息
            error_data = [{"error": f"Generated SQL execution failed: {str(e)}", "sql": sql}]
            error_meta = {"error": True, "message": str(e)}
            return error_data, error_meta, sql, params
    
    async def preview_nl_sql(self, nlq: NLQueryIn) -> Tuple[str, Dict[str, Any]]:
        """
        预览自然语言查询生成的SQL
        
        Returns:
            Tuple of (generated_sql, sql_params)
        """
        prompt = {
            "query": nlq.query,
            "table_context": nlq.table_context,
            "limit": nlq.limit
        }
        
        llm_result = await self.llm_service.generate_sql(prompt)
        return llm_result.get("sql", "SELECT 1"), llm_result.get("params", {})
    
    async def get_table_suggestions(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        根据查询获取相关表建议
        """
        return await self.llm_service.select_tables(query, max_results)

