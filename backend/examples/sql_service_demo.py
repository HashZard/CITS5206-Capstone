#!/usr/bin/env python3
"""
Example usage of the enhanced SQL Service
This demonstrates the key features of the isolated SQL service layer
"""

import sys
import os

# Add the backend app to the path for imports
sys.path.insert(0, '/home/runner/work/CITS5206-Capstone/CITS5206-Capstone/backend')

def demo_sql_validation():
    """Demonstrate SQL validation capabilities"""
    print("=" * 60)
    print("SQL Service - Validation Demo")
    print("=" * 60)
    
    try:
        from app.services.sql_service import SQLService
        
        service = SQLService()
        
        # Test various SQL statements
        test_queries = [
            ("SELECT id, name FROM users", "Valid SELECT query"),
            ("SELECT * FROM products WHERE price > 100", "SELECT with WHERE clause"),
            ("DROP TABLE users", "Dangerous DROP statement"),
            ("SELECT id FROM users; DROP TABLE logs", "SQL injection attempt"),
            ("SELECT name FROM users WHERE id = 1 --", "Comment injection"),
            ("", "Empty query"),
            ("SELECT name FROM users WHERE (incomplete", "Unbalanced parentheses"),
        ]
        
        for sql, description in test_queries:
            print(f"\nTesting: {description}")
            print(f"SQL: {sql}")
            
            result = service.validate_sql_syntax(sql)
            
            if result.is_valid:
                print("✓ VALID")
                if result.warnings:
                    print(f"  Warnings: {', '.join(result.warnings)}")
            else:
                print(f"✗ INVALID: {result.error_message}")
                
    except ImportError as e:
        print(f"Cannot import SQL service (expected without Flask): {e}")

def demo_sql_building():
    """Demonstrate SQL query building"""
    print("\n" + "=" * 60)
    print("SQL Service - Query Building Demo")
    print("=" * 60)
    
    try:
        from app.services.sql_service import SQLService
        
        service = SQLService()
        
        # Mock the database column check for demo
        service._columns_cache = {
            'users': {'id', 'name', 'email', 'status'},
            'products': {'id', 'name', 'price', 'category'}
        }
        
        # Demo query building
        examples = [
            {
                'table': 'users',
                'columns': ['id', 'name'],
                'filters': {'status': 'active'},
                'limit': 10,
                'offset': 0
            },
            {
                'table': 'products', 
                'columns': ['name', 'price'],
                'filters': {'category': 'electronics'},
                'limit': 5,
                'offset': 20
            }
        ]
        
        for i, example in enumerate(examples, 1):
            print(f"\nExample {i}:")
            print(f"Table: {example['table']}")
            print(f"Columns: {example['columns']}")
            print(f"Filters: {example['filters']}")
            print(f"Limit: {example['limit']}, Offset: {example['offset']}")
            
            try:
                sql, params = service.build_select_sql(
                    example['table'],
                    example['columns'], 
                    example['filters'],
                    example['limit'],
                    example['offset']
                )
                print(f"Generated SQL: {sql}")
                print(f"Parameters: {params}")
            except Exception as e:
                print(f"Error: {e}")
                
    except ImportError as e:
        print(f"Cannot import SQL service (expected without Flask): {e}")

def demo_table_validation():
    """Demonstrate table and column validation"""
    print("\n" + "=" * 60) 
    print("SQL Service - Table Validation Demo")
    print("=" * 60)
    
    try:
        from app.services.sql_service import SQLService
        
        service = SQLService()
        
        # Mock table columns for demo
        service._columns_cache = {
            'users': {'id', 'name', 'email', 'status'},
            'products': {'id', 'name', 'price', 'category'}
        }
        
        # Test table and column validation
        test_cases = [
            ('users', ['id', 'name'], "Valid table and columns"),
            ('users', ['id', 'invalid_column'], "Valid table, invalid column"),
            ('invalid_table', ['id'], "Invalid table"),
            ('products', ['name', 'price'], "Valid products table"),
        ]
        
        for table, columns, description in test_cases:
            print(f"\nTesting: {description}")
            print(f"Table: {table}, Columns: {columns}")
            
            result = service.validate_table_and_columns(table, columns)
            
            if result.is_valid:
                print("✓ VALID")
            else:
                print(f"✗ INVALID: {result.error_message}")
                
    except ImportError as e:
        print(f"Cannot import SQL service (expected without Flask): {e}")

def demo_service_features():
    """Demonstrate service configuration and features"""
    print("\n" + "=" * 60)
    print("SQL Service - Configuration Demo") 
    print("=" * 60)
    
    try:
        from app.services.sql_service import SQLService
        
        service = SQLService()
        
        print("Default Configuration:")
        print(f"  Max Query Length: {service._max_query_length}")
        print(f"  Max Limit: {service._max_limit}")
        
        # Configure limits
        service.set_limits(max_query_length=5000, max_limit=500)
        
        print(f"\nUpdated Configuration:")
        print(f"  Max Query Length: {service._max_query_length}")
        print(f"  Max Limit: {service._max_limit}")
        
        # Test query length validation
        long_query = "SELECT " + ", ".join([f"col{i}" for i in range(1000)]) + " FROM table"
        print(f"\nTesting very long query ({len(long_query)} chars):")
        
        result = service.validate_sql_syntax(long_query)
        if result.is_valid:
            print("✓ Query accepted")
        else:
            print(f"✗ Query rejected: {result.error_message}")
            
        # Cache demo
        print(f"\nCache operations:")
        print(f"  Current cache: {service._columns_cache}")
        service.clear_cache()
        print(f"  After clear: {service._columns_cache}")
        
    except ImportError as e:
        print(f"Cannot import SQL service (expected without Flask): {e}")

def main():
    """Run all demonstrations"""
    print("SQL Service Enhancement Demonstration")
    print("This shows the capabilities of the completed SQL service layer")
    
    # Run demonstrations
    demo_sql_validation()
    demo_sql_building()
    demo_table_validation()
    demo_service_features()
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("The SQL service is now isolated, secure, and feature-complete.")
    print("=" * 60)

if __name__ == "__main__":
    main()