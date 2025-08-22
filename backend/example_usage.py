#!/usr/bin/env python3
"""
Example usage of the LLM Service API endpoints
This script demonstrates how to interact with the natural language query system
"""

import requests
import json
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000/api"  # Adjust based on your setup

def pretty_print(data: Dict[Any, Any], title: str = "Response"):
    """Pretty print JSON responses"""
    print(f"\n{'='*50}")
    print(f"{title}")
    print(f"{'='*50}")
    print(json.dumps(data, indent=2, ensure_ascii=False))

def test_natural_language_query():
    """Test the natural language query endpoint"""
    print("🔍 Testing Natural Language Query...")
    
    queries = [
        {
            "query": "Show me all geographical categories",
            "limit": 10,
            "include_metadata": True
        },
        {
            "query": "Find all lakes and water bodies",
            "limit": 5,
            "table_context": {
                "preferred_tables": ["l3_table"],
                "spatial_data": True
            }
        },
        {
            "query": "List cities with large populations",
            "limit": 15
        }
    ]
    
    for i, query_data in enumerate(queries, 1):
        print(f"\n--- Query {i}: {query_data['query']} ---")
        
        try:
            response = requests.post(
                f"{BASE_URL}/query/nl",
                json=query_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success!")
                print(f"   Generated SQL: {data.get('generated_sql', 'N/A')[:80]}...")
                print(f"   Parameters: {data.get('sql_params', {})}")
                print(f"   Results: {len(data.get('data', []))} rows")
                
                if data.get('table_suggestions'):
                    print(f"   Table suggestions: {len(data['table_suggestions'])} found")
            else:
                print(f"❌ Error {response.status_code}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Connection failed - is the server running at {BASE_URL}?")
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")

def test_sql_preview():
    """Test the SQL preview endpoint"""
    print("\n🔍 Testing SQL Preview...")
    
    queries = [
        "Show me all data categories",
        "Find spatial datasets about transportation", 
        "List all available geographical tables"
    ]
    
    for query in queries:
        print(f"\n--- Preview: {query} ---")
        
        try:
            response = requests.post(
                f"{BASE_URL}/query/nl/preview",
                json={"query": query, "limit": 20},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Generated SQL:")
                print(f"   {data.get('sql', 'N/A')}")
                print(f"   Parameters: {data.get('meta', {}).get('sql_params', {})}")
            else:
                print(f"❌ Error {response.status_code}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Connection failed - is the server running at {BASE_URL}?")
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")

def test_table_suggestions():
    """Test the table suggestions endpoint"""
    print("\n🔍 Testing Table Suggestions...")
    
    search_terms = [
        "geographical boundaries",
        "population data", 
        "transportation networks",
        "environmental data"
    ]
    
    for term in search_terms:
        print(f"\n--- Suggestions for: {term} ---")
        
        try:
            response = requests.post(
                f"{BASE_URL}/tables/suggest",
                json={"query": term, "max_results": 5},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                suggestions = data.get('suggestions', [])
                print(f"✅ Found {len(suggestions)} relevant tables:")
                
                for suggestion in suggestions:
                    table_name = suggestion.get('table_name', 'Unknown')
                    columns = len(suggestion.get('columns', []))
                    score = suggestion.get('relevance_score', 0)
                    print(f"   - {table_name}: {columns} columns (score: {score})")
            else:
                print(f"❌ Error {response.status_code}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Connection failed - is the server running at {BASE_URL}?")
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")

def test_error_handling():
    """Test error handling scenarios"""
    print("\n🔍 Testing Error Handling...")
    
    error_cases = [
        {"query": "", "limit": 10},  # Empty query
        {"query": "test", "limit": -1},  # Invalid limit
        {"query": "test", "limit": 50000},  # Limit too high
    ]
    
    for i, case in enumerate(error_cases, 1):
        print(f"\n--- Error Case {i}: {case} ---")
        
        try:
            response = requests.post(
                f"{BASE_URL}/query/nl",
                json=case,
                headers={"Content-Type": "application/json"}
            )
            
            data = response.json()
            if response.status_code >= 400:
                print(f"✅ Correctly handled error:")
                print(f"   Status: {response.status_code}")
                print(f"   Error: {data.get('error', {}).get('message', 'N/A')}")
            else:
                print(f"⚠️  Expected error but got success: {data}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Connection failed - is the server running at {BASE_URL}?")
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")

def main():
    """Run all test examples"""
    print("🚀 LLM Service API Example Usage")
    print(f"Testing endpoints at: {BASE_URL}")
    print("Note: Make sure the backend server is running!")
    
    # Test all endpoints
    test_natural_language_query()
    test_sql_preview()
    test_table_suggestions()
    test_error_handling()
    
    print(f"\n{'='*50}")
    print("🎉 Example tests completed!")
    print("Check the output above to see how the LLM service responds.")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()