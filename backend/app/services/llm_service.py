# -*- coding: utf-8 -*-
"""
LLM Service for generating SQL queries from natural language prompts
Supports spatial/GIS queries with PostGIS and multi-level table hierarchy
"""
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple
import logging

from app.adapters.openai_client import OpenAIClient
from app.services import sql_service

logger = logging.getLogger(__name__)


class LLMService:
    """LLM服务：将自然语言查询转换为SQL"""
    
    def __init__(self):
        self.openai_client = OpenAIClient(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        )
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    async def generate_sql(self, prompt: dict) -> dict[str, Any]:
        """
        从自然语言提示生成SQL查询
        
        Args:
            prompt: 包含用户查询和上下文的字典
                - query: 用户的自然语言查询
                - table_context: 可选的表格上下文信息
                - limit: 可选的结果限制
        
        Returns:
            包含sql、params和param_types的字典
        """
        try:
            user_query = prompt.get("query", "")
            table_context = prompt.get("table_context", {})
            limit = prompt.get("limit", 100)
            
            if not user_query:
                raise ValueError("Query is required")
            
            # 构建系统提示词
            system_prompt = self._build_system_prompt(table_context)
            
            # 构建用户消息
            user_message = self._build_user_message(user_query, limit)
            
            # 调用OpenAI API
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            response = await self.openai_client.chat(messages, self.model)
            
            if "error" in response:
                logger.error(f"OpenAI API error: {response['error']}")
                return self._fallback_sql_generation(prompt)
            
            # 解析响应
            return self._parse_llm_response(response, limit)
            
        except Exception as e:
            logger.error(f"Error in generate_sql: {str(e)}")
            return self._fallback_sql_generation(prompt)
    
    def _build_system_prompt(self, table_context: dict) -> str:
        """构建系统提示词"""
        return f"""You are a SQL expert specializing in PostGIS spatial databases.
        
Your task is to convert natural language queries into valid PostgreSQL/PostGIS SQL queries.

Database Schema Context:
- This is a GIS database with spatial data tables
- Main table types include:
  * l1_category: Top-level geographical categories
  * l2_card: Overview cards with geographical groupings  
  * l3_table: Detailed spatial data tables
  * Mapping tables: map_l1_l2, map_l2_l3 for hierarchical relationships

Available spatial functions:
- ST_Contains, ST_Within, ST_Intersects for spatial relationships
- ST_Distance, ST_DWithin for distance calculations
- ST_Area, ST_Length for measurements
- ST_AsText, ST_AsGeoJSON for format conversion

Table Context: {json.dumps(table_context, indent=2) if table_context else "No specific table context provided"}

Rules:
1. Generate valid PostgreSQL SQL with proper syntax
2. Use parameterized queries with :param_name format for user inputs
3. Include spatial predicates when dealing with geographical data
4. Limit results appropriately
5. Return response as JSON with 'sql', 'params', and 'param_types' fields
6. For spatial queries, consider using appropriate spatial indexes
7. Handle common spatial query patterns like "near", "within", "contains"

Example response format:
{{
  "sql": "SELECT name, ST_AsText(geom) FROM some_table WHERE ST_DWithin(geom, ST_Point(:lon, :lat), :distance) LIMIT :limit",
  "params": {{"lon": -115.1, "lat": 36.1, "distance": 1000, "limit": 50}},
  "param_types": {{"lon": "float", "lat": "float", "distance": "int", "limit": "int"}}
}}"""

    def _build_user_message(self, user_query: str, limit: int) -> str:
        """构建用户消息"""
        return f"""Convert this natural language query to SQL:

Query: "{user_query}"
Result limit: {limit}

Please provide a PostgreSQL/PostGIS compatible SQL query that addresses this request."""

    def _parse_llm_response(self, response: dict, limit: int) -> dict[str, Any]:
        """解析LLM响应"""
        try:
            # 获取响应内容
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # 尝试从JSON中提取SQL
            if "{" in content and "}" in content:
                # 提取JSON部分
                json_start = content.find("{")
                json_end = content.rfind("}") + 1
                json_str = content[json_start:json_end]
                
                try:
                    parsed = json.loads(json_str)
                    if "sql" in parsed:
                        return {
                            "sql": parsed.get("sql", "SELECT 1"),
                            "params": parsed.get("params", {}),
                            "param_types": parsed.get("param_types", {})
                        }
                except json.JSONDecodeError:
                    pass
            
            # 尝试从文本中提取SQL
            sql_pattern = r"```sql\s*(.*?)\s*```"
            sql_match = re.search(sql_pattern, content, re.DOTALL | re.IGNORECASE)
            
            if sql_match:
                sql = sql_match.group(1).strip()
                return {
                    "sql": sql,
                    "params": {"limit": limit},
                    "param_types": {"limit": "int"}
                }
            
            # 如果没有找到合适的SQL，返回默认值
            logger.warning(f"Could not parse SQL from LLM response: {content}")
            return self._get_default_response(limit)
            
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            return self._get_default_response(limit)
    
    def _fallback_sql_generation(self, prompt: dict) -> dict[str, Any]:
        """LLM调用失败时的后备SQL生成"""
        user_query = prompt.get("query", "").lower()
        limit = prompt.get("limit", 100)
        
        # 简单的关键词匹配
        if any(keyword in user_query for keyword in ["category", "categories", "l1"]):
            return {
                "sql": "SELECT id, name, description FROM l1_category ORDER BY weight DESC, name LIMIT :limit",
                "params": {"limit": limit},
                "param_types": {"limit": "int"}
            }
        
        elif any(keyword in user_query for keyword in ["card", "overview", "l2"]):
            return {
                "sql": "SELECT id, name, description_short FROM l2_card ORDER BY weight DESC, name LIMIT :limit", 
                "params": {"limit": limit},
                "param_types": {"limit": "int"}
            }
        
        elif any(keyword in user_query for keyword in ["table", "data", "l3"]):
            return {
                "sql": "SELECT id, table_name, display_name, summary FROM l3_table ORDER BY table_name LIMIT :limit",
                "params": {"limit": limit},
                "param_types": {"limit": "int"}
            }
        
        # 默认查询
        return self._get_default_response(limit)
    
    def _get_default_response(self, limit: int = 100) -> dict[str, Any]:
        """获取默认响应"""
        return {
            "sql": "SELECT 'No specific query generated' as message, :limit as requested_limit",
            "params": {"limit": limit},
            "param_types": {"limit": "int"}
        }
    
    async def select_tables(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        根据查询选择相关的表
        
        Args:
            query: 用户查询
            max_results: 最大返回结果数
            
        Returns:
            相关表的列表
        """
        try:
            # 这里可以实现更智能的表选择逻辑
            # 暂时返回基本的表信息
            tables = []
            
            # 获取可用的表信息
            available_tables = ["l1_category", "l2_card", "l3_table", "map_l1_l2", "map_l2_l3"]
            
            for table in available_tables[:max_results]:
                try:
                    columns = sql_service.get_columns(table)
                    tables.append({
                        "table_name": table,
                        "columns": list(columns),
                        "relevance_score": 1.0  # 简化的相关性评分
                    })
                except Exception as e:
                    logger.warning(f"Could not get columns for table {table}: {str(e)}")
            
            return tables
            
        except Exception as e:
            logger.error(f"Error in select_tables: {str(e)}")
            return []
    
    def get_table_metadata(self, table_name: str) -> Dict[str, Any]:
        """
        获取表的元数据信息
        
        Args:
            table_name: 表名
            
        Returns:
            表的元数据
        """
        try:
            columns = sql_service.get_columns(table_name)
            return {
                "table_name": table_name,
                "columns": list(columns),
                "column_count": len(columns),
                "description": f"Metadata for table {table_name}"
            }
        except Exception as e:
            logger.error(f"Error getting metadata for table {table_name}: {str(e)}")
            return {
                "table_name": table_name,
                "columns": [],
                "column_count": 0,
                "error": str(e)
            }
