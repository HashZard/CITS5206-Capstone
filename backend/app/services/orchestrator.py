from typing import Tuple, List, Dict, Any
from app.models.dto import QueryIn, DemoQueryIn
from app.services import sql_service

class Orchestrator:
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

    def handle_demo_query(self, demo_qin: DemoQueryIn) -> Dict[str, Any]:
        """
        Demo handler that simulates LLM-generated SQL without actual LLM calls.
        This is for demonstration purposes and doesn't require real database connections.
        """
        query = demo_qin.query.lower().strip()
        extras = demo_qin.extras or {}
        
        # Simple demo logic based on keywords in the query
        if "river" in query:
            table = "l3_table"
            sql = """
            SELECT name, geom_type, ST_AsGeoJSON(geom) as geometry
            FROM l3_table 
            WHERE category = :category 
            AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :radius_m)
            LIMIT :limit
            """.strip()
            
            params = {
                "category": "rivers",
                "lon": extras.get("longitude", 115.8605),  # Perth longitude
                "lat": extras.get("latitude", -31.9505),   # Perth latitude
                "radius_m": extras.get("radius_m", 5000),
                "limit": extras.get("limit", 10)
            }
            
            explanation = f"Generated spatial query to find rivers within {params['radius_m']}m of coordinates ({params['lat']}, {params['lon']})"
            
        elif "road" in query or "street" in query:
            table = "l3_table"
            sql = """
            SELECT name, road_type, ST_AsGeoJSON(geom) as geometry
            FROM l3_table 
            WHERE category = :category 
            AND name ILIKE :name_pattern
            LIMIT :limit
            """.strip()
            
            params = {
                "category": "roads",
                "name_pattern": f"%{extras.get('place_name', 'Perth')}%",
                "limit": extras.get("limit", 10)
            }
            
            explanation = f"Generated query to find roads containing '{extras.get('place_name', 'Perth')}' in the name"
            
        elif "building" in query or "structure" in query:
            table = "l3_table"
            sql = """
            SELECT name, building_type, height, ST_AsGeoJSON(geom) as geometry
            FROM l3_table 
            WHERE category = :category 
            AND height > :min_height
            ORDER BY height DESC
            LIMIT :limit
            """.strip()
            
            params = {
                "category": "buildings",
                "min_height": extras.get("min_height", 10),
                "limit": extras.get("limit", 10)
            }
            
            explanation = f"Generated query to find buildings taller than {params['min_height']}m"
            
        else:
            # Default fallback query
            table = "l1_category"
            sql = """
            SELECT category_name, description, count
            FROM l1_category 
            WHERE category_name ILIKE :search_term
            LIMIT :limit
            """.strip()
            
            params = {
                "search_term": f"%{query}%",
                "limit": extras.get("limit", 5)
            }
            
            explanation = f"Generated fallback query to search categories matching '{query}'"
        
        return {
            "sql": sql,
            "params": params,
            "explanation": explanation,
            "meta": {
                "demo": True,
                "table": table,
                "original_query": demo_qin.query,
                "processed_keywords": [word for word in ["river", "road", "street", "building", "structure"] if word in query]
            }
        }

