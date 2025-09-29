import unittest
from unittest.mock import patch, MagicMock

from app.services import sql_service
from app.models.dto import ALLOWED_TABLES


class TestSqlService(unittest.TestCase):
    """Test suite for sql_service module."""

    def setUp(self):
        """Set up test fixtures before each test method."""
        # Clear the LRU cache before each test
        sql_service.get_columns.cache_clear()

    def tearDown(self):
        """Clean up after each test method."""
        # Clear the LRU cache after each test
        sql_service.get_columns.cache_clear()

    @patch('app.services.sql_service.db')
    def test_get_columns_valid_table(self, mock_db):
        """Test get_columns with a valid table name."""
        # Setup mock
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_rows = [{
            'column_name': 'id'
        }, {
            'column_name': 'name'
        }, {
            'column_name': 'active'
        }]
        mock_result.mappings.return_value.all.return_value = mock_rows
        mock_conn.execute.return_value = mock_result
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        # Test with a valid table
        valid_table = list(ALLOWED_TABLES)[0]  # Get first allowed table
        columns = sql_service.get_columns(valid_table)

        # Assertions
        self.assertEqual(columns, ('id', 'name', 'active'))
        mock_conn.execute.assert_called_once()

    def test_get_columns_invalid_table(self):
        """Test get_columns with an invalid table name."""
        with self.assertRaises(ValueError) as context:
            sql_service.get_columns("invalid_table")

        self.assertIn("table 'invalid_table' is not allowed",
                      str(context.exception))

    @patch('app.services.sql_service.db')
    def test_get_columns_caching(self, mock_db):
        """Test that get_columns properly caches results."""
        # Setup mock
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_rows = [{'column_name': 'id'}, {'column_name': 'name'}]
        mock_result.mappings.return_value.all.return_value = mock_rows
        mock_conn.execute.return_value = mock_result
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        valid_table = list(ALLOWED_TABLES)[0]

        # Call the function twice
        columns1 = sql_service.get_columns(valid_table)
        columns2 = sql_service.get_columns(valid_table)

        # Should return the same result
        self.assertEqual(columns1, columns2)
        # But should only call the database once due to caching
        self.assertEqual(mock_db.engine.connect.call_count, 1)

    @patch('app.services.sql_service.db')
    def test_execute_successful_query(self, mock_db):
        """Test execute function with a successful SQL query."""
        # Setup mock
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_rows = [{'id': 1, 'name': 'Test1'}, {'id': 2, 'name': 'Test2'}]
        mock_result.mappings.return_value.all.return_value = mock_rows
        mock_conn.execute.return_value = mock_result
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        # Test
        sql = "SELECT id, name FROM l1_category"
        rows, meta = sql_service.execute(sql)

        # Assertions
        expected_rows = [{
            'id': 1,
            'name': 'Test1'
        }, {
            'id': 2,
            'name': 'Test2'
        }]
        self.assertEqual(rows, expected_rows)
        self.assertEqual(meta, {'rows': 2})
        mock_conn.execute.assert_called_once()

    @patch('app.services.sql_service.db')
    def test_execute_empty_result(self, mock_db):
        """Test execute function with empty result set."""
        # Setup mock for empty result
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.all.return_value = []
        mock_conn.execute.return_value = mock_result
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        # Test
        sql = "SELECT id FROM l1_category WHERE id = 999"
        rows, meta = sql_service.execute(sql)

        # Assertions
        self.assertEqual(rows, [])
        self.assertEqual(meta, {'rows': 0})

    @patch('app.services.sql_service.execute')
    def test_run_sql_successful(self, mock_execute):
        """Test run_sql with successful execution."""
        # Setup mock
        mock_rows = [{'id': 1, 'name': 'Test'}]
        mock_meta = {'rows': 1}
        mock_execute.return_value = (mock_rows, mock_meta)

        # Test
        result = sql_service.run_sql("SELECT * FROM l1_category")

        # Assertions
        expected_result = {
            'ok': True,
            'results': mock_rows,
            'meta': mock_meta,
            'error': None
        }
        self.assertEqual(result, expected_result)
        mock_execute.assert_called_once_with("SELECT * FROM l1_category")

    @patch('app.services.sql_service.execute')
    def test_run_sql_with_exception(self, mock_execute):
        """Test run_sql when execute raises an exception."""
        # Setup mock to raise exception
        mock_execute.side_effect = Exception("Database connection error")

        # Test
        result = sql_service.run_sql("SELECT * FROM l1_category")

        # Assertions
        expected_result = {
            'ok': False,
            'results': [],
            'meta': {},
            'error': 'Database connection error'
        }
        self.assertEqual(result, expected_result)

    def test_run_sql_return_format(self):
        """Test that run_sql returns the correct format."""
        with patch('app.services.sql_service.execute') as mock_execute:
            mock_execute.return_value = ([], {'rows': 0})

            result = sql_service.run_sql("SELECT 1")

            # Check all required keys are present
            required_keys = {'ok', 'results', 'meta', 'error'}
            self.assertEqual(set(result.keys()), required_keys)

            # Check types
            self.assertIsInstance(result['ok'], bool)
            self.assertIsInstance(result['results'], list)
            self.assertIsInstance(result['meta'], dict)
            self.assertIn(result['error'], [None, str])

    @patch('app.services.sql_service.db')
    def test_execute_database_error(self, mock_db):
        """Test execute function when database raises an error."""
        # Setup mock to raise database error
        mock_conn = MagicMock()
        mock_conn.execute.side_effect = Exception("SQL syntax error")
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        # Test that exception propagates
        with self.assertRaises(Exception) as context:
            sql_service.execute("INVALID SQL")

        self.assertIn("SQL syntax error", str(context.exception))

    def test_allowed_tables_constant(self):
        """Test that ALLOWED_TABLES constant is properly imported and used."""
        # Test that the constant exists and is not empty
        self.assertIsInstance(ALLOWED_TABLES, set)
        self.assertTrue(len(ALLOWED_TABLES) > 0)

        # Test that all expected tables are present
        expected_tables = {
            "l1_category", "l2_card", "l3_table", "map_l1_l2", "map_l2_l3",
            "prompt_templates"
        }
        self.assertEqual(ALLOWED_TABLES, expected_tables)

    @patch('app.services.sql_service.execute')
    def test_run_sql_various_sql_types(self, mock_execute):
        """Test run_sql with various types of SQL queries."""
        test_cases = [
            # Simple SELECT
            "SELECT * FROM l1_category",
            # SELECT with WHERE
            "SELECT id, name FROM l1_category WHERE active = true",
            # SELECT with JOIN
            "SELECT l1.name, l2.title FROM l1_category l1 JOIN l2_card l2 ON l1.id = l2.l1_id",
            # SELECT with parameters
            "SELECT * FROM l1_category WHERE id = :id",
        ]

        mock_execute.return_value = ([{"id": 1}], {"rows": 1})

        for sql in test_cases:
            with self.subTest(sql=sql):
                result = sql_service.run_sql(sql)
                self.assertTrue(result['ok'])
                self.assertEqual(result['results'], [{"id": 1}])
                self.assertEqual(result['meta']['rows'], 1)
                self.assertIsNone(result['error'])

    @patch('app.services.sql_service.db')
    def test_get_columns_all_allowed_tables(self, mock_db):
        """Test get_columns function with all allowed tables."""
        # Setup mock
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_rows = [{'column_name': 'id'}, {'column_name': 'name'}]
        mock_result.mappings.return_value.all.return_value = mock_rows
        mock_conn.execute.return_value = mock_result
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        # Test all allowed tables
        for table in ALLOWED_TABLES:
            with self.subTest(table=table):
                columns = sql_service.get_columns(table)
                self.assertIsInstance(columns, tuple)
                self.assertTrue(len(columns) >= 0)

    @patch('app.services.sql_service.execute')
    def test_run_sql_error_handling_edge_cases(self, mock_execute):
        """Test run_sql error handling with various exception types."""
        error_cases = [
            ValueError("Invalid parameter"),
            RuntimeError("Runtime error"),
            Exception("Generic exception"),
            ConnectionError("Database connection failed"),
        ]

        for error in error_cases:
            with self.subTest(error=type(error).__name__):
                mock_execute.side_effect = error
                result = sql_service.run_sql("SELECT 1")

                self.assertFalse(result['ok'])
                self.assertEqual(result['results'], [])
                self.assertEqual(result['meta'], {})
                self.assertEqual(result['error'], str(error))

                # Reset for next iteration
                mock_execute.side_effect = None

    @patch('app.services.sql_service.db')
    def test_execute_return_types(self, mock_db):
        """Test execute function return types and structure."""
        # Setup mock with various data types
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_rows = [{
            'id': 1,
            'name': 'test',
            'active': True,
            'score': 95.5,
            'data': None
        }]
        mock_result.mappings.return_value.all.return_value = mock_rows
        mock_conn.execute.return_value = mock_result
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        # Test
        rows, meta = sql_service.execute("SELECT * FROM test_table")

        # Verify return structure
        self.assertIsInstance(rows, list)
        self.assertIsInstance(meta, dict)
        self.assertIn('rows', meta)

        # Verify row structure
        if rows:
            row = rows[0]
            self.assertIsInstance(row, dict)
            self.assertEqual(row['id'], 1)
            self.assertEqual(row['name'], 'test')
            self.assertEqual(row['active'], True)
            self.assertEqual(row['score'], 95.5)
            self.assertIsNone(row['data'])

    @patch('app.services.sql_service.db')
    def test_get_columns_database_connection_error(self, mock_db):
        """Test get_columns when database connection fails."""
        # Setup mock to raise connection error
        mock_db.engine.connect.side_effect = ConnectionError(
            "Database unavailable")

        valid_table = list(ALLOWED_TABLES)[0]

        with self.assertRaises(ConnectionError):
            sql_service.get_columns(valid_table)

    def test_get_columns_case_sensitivity(self):
        """Test get_columns with case-sensitive table names."""
        # Test that function is case-sensitive
        valid_table = list(ALLOWED_TABLES)[0]
        upper_case_table = valid_table.upper()

        if upper_case_table != valid_table:
            with self.assertRaises(ValueError):
                sql_service.get_columns(upper_case_table)

    @patch('app.services.sql_service.execute')
    def test_run_sql_with_large_result_set(self, mock_execute):
        """Test run_sql with a large result set."""
        # Create a large mock result set
        large_result = [{"id": i, "name": f"item_{i}"} for i in range(1000)]
        meta = {"rows": 1000}
        mock_execute.return_value = (large_result, meta)

        result = sql_service.run_sql("SELECT * FROM large_table")

        self.assertTrue(result['ok'])
        self.assertEqual(len(result['results']), 1000)
        self.assertEqual(result['meta']['rows'], 1000)

    @patch('app.services.sql_service.execute')
    def test_run_sql_with_empty_string(self, mock_execute):
        """Test run_sql with empty string SQL."""
        mock_execute.side_effect = Exception("Empty SQL statement")

        result = sql_service.run_sql("")

        self.assertFalse(result['ok'])
        self.assertEqual(result['error'], "Empty SQL statement")

    @patch('app.services.sql_service.execute')
    def test_run_sql_with_none_sql(self, mock_execute):
        """Test run_sql with None as SQL parameter."""
        mock_execute.side_effect = TypeError("SQL cannot be None")

        result = sql_service.run_sql(None)

        self.assertFalse(result['ok'])
        self.assertEqual(result['error'], "SQL cannot be None")


class TestSqlServiceIntegration(unittest.TestCase):
    """Integration tests for sql_service module."""

    def setUp(self):
        """Set up integration test fixtures."""
        sql_service.get_columns.cache_clear()

    def tearDown(self):
        """Clean up after integration tests."""
        sql_service.get_columns.cache_clear()

    @patch('app.services.sql_service.db')
    def test_full_workflow_success(self, mock_db):
        """Test a complete successful workflow from get_columns to run_sql."""
        # Setup mocks for get_columns
        mock_conn = MagicMock()
        mock_result = MagicMock()

        # Mock get_columns response
        column_rows = [{
            'column_name': 'id'
        }, {
            'column_name': 'name'
        }, {
            'column_name': 'active'
        }]
        mock_result.mappings.return_value.all.return_value = column_rows
        mock_conn.execute.return_value = mock_result
        mock_db.engine.connect.return_value.__enter__.return_value = mock_conn

        valid_table = list(ALLOWED_TABLES)[0]

        # Step 1: Get columns
        columns = sql_service.get_columns(valid_table)
        self.assertEqual(columns, ('id', 'name', 'active'))

        # Reset mock for execute/run_sql
        mock_result.mappings.return_value.all.return_value = [{
            'id': 1,
            'name': 'Test',
            'active': True
        }]

        # Step 2: Run SQL query
        sql = f"SELECT * FROM {valid_table}"
        result = sql_service.run_sql(sql)

        # Verify complete workflow
        self.assertTrue(result['ok'])
        self.assertEqual(len(result['results']), 1)
        self.assertEqual(result['results'][0]['name'], 'Test')


if __name__ == "__main__":
    unittest.main()
