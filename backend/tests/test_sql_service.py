import unittest
from backend.app.services import sql_service


class TestSqlService(unittest.TestCase):

    def test_quote_ident_valid(self):
        self.assertEqual(sql_service.quote_ident("valid_column"), '"valid_column"')

    def test_quote_ident_invalid(self):
        with self.assertRaises(ValueError):
            sql_service.quote_ident("1invalid")

    def test_normalize_filter_value_is_null(self):
        self.assertIsNone(sql_service.normalize_filter_value("is", None))
        self.assertIsNone(sql_service.normalize_filter_value("is", "null"))
        with self.assertRaises(ValueError):
            sql_service.normalize_filter_value("is", "not null")

    def test_normalize_filter_value_in(self):
        self.assertEqual(sql_service.normalize_filter_value("in", [1, 2, 3]), [1, 2, 3])
        with self.assertRaises(ValueError):
            sql_service.normalize_filter_value("in", [])
        with self.assertRaises(ValueError):
            sql_service.normalize_filter_value("in", "not_a_list")

    def test_build_where_and_params_shorthand(self):
        clause, params = sql_service.build_where_and_params(
            table="dummy",
            filters={"active": True, "name": "Alice"},
            valid_cols=["active", "name"]
        )
        self.assertEqual(clause, 'WHERE "active" = :p0 AND "name" = :p1')
        self.assertEqual(params, {"p0": True, "p1": "Alice"})

    def test_build_where_and_params_explicit(self):
        clause, params = sql_service.build_where_and_params(
            table="dummy",
            filters={
                "age": {"op": ">=", "value": 18},
                "name": {"op": "ilike", "value": "%al%"}
            },
            valid_cols=["age", "name"]
        )
        self.assertIn("age", clause.lower())
        self.assertIn("ilike", clause.lower())
        self.assertEqual(len(params), 2)

    def test_validate_sql_valid(self):
        sql_service.validate_sql("SELECT * FROM users WHERE id = :id")

    def test_validate_sql_invalid(self):
        with self.assertRaises(ValueError):
            sql_service.validate_sql("DROP TABLE users;")
        with self.assertRaises(ValueError):
            sql_service.validate_sql("INSERT INTO users (name) VALUES ('a')")

    def test_build_select_sql(self):
        # Mock allowed tables and columns for testing
        sql_service.ALLOWED_TABLES = {"l1_category"}
        sql_service.get_columns = lambda table: ("id", "name", "active")

        sql, params = sql_service.build_select_sql(
            table="l1_category",
            columns=["id", "name"],
            filters={"active": True},
            limit=5,
            offset=0
        )

        self.assertTrue(sql.startswith("SELECT"))
        self.assertIn("FROM", sql)
        self.assertIn("WHERE", sql)
        self.assertIn("LIMIT", sql)
        self.assertEqual(params["_limit"], 5)
        self.assertEqual(params["_offset"], 0)

# Add setUp and tearDown if there are more tests relied on ALLOWED_TABLES or get_columns

if __name__ == "__main__":
    unittest.main()


