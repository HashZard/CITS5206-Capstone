import json
import os
import sys

import pytest

# Add the project root to sys.path so `config.py` and `app` can be imported.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from app.services.three_level_service import ThreeLevelService


def _print(title: str, payload):
    print(f"\n=== {title} ===")
    try:
        print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
    except Exception:
        print(payload)


pytestmark = pytest.mark.skipif(
    not os.getenv("POSTGRES_DSN"),
    reason="POSTGRES_DSN environment variable is required",
)


def test_get_all_l1_categories():
    app = create_app("development")
    with app.app_context():
        l1s = ThreeLevelService.get_all_l1_categories()
        _print("L1 Categories (top 5)", [x.__dict__ for x in l1s[:5]])
        assert isinstance(l1s, list)


def test_get_l2_cards_by_l1():
    app = create_app("development")
    with app.app_context():
        l1s = ThreeLevelService.get_all_l1_categories()
        if not l1s:
            pytest.skip("No L1 category data available in the database")
        l1_id = l1s[0].id
        l2s = ThreeLevelService.get_l2_cards_by_l1(l1_id)
        _print(f"L2 Cards by L1 #{l1_id} (top 5)", [x.__dict__ for x in l2s[:5]])
        assert isinstance(l2s, list)


def test_get_l3_tables_by_l2_and_get_by_name():
    app = create_app("development")
    with app.app_context():
        l1s = ThreeLevelService.get_all_l1_categories()
        if not l1s:
            pytest.skip("No L1 category data available in the database")
        l2s = ThreeLevelService.get_l2_cards_by_l1(l1s[0].id)
        if not l2s:
            pytest.skip("No L2 card data available in the database")
        l3s = ThreeLevelService.get_l3_tables_by_l2(l2s[0].id)
        _print(f"L3 Tables by L2 #{l2s[0].id} (top 5)", [x.__dict__ for x in l3s[:5]])
        assert isinstance(l3s, list)

        if l3s:
            name = l3s[0].table_name
            l3 = ThreeLevelService.get_l3_table_by_name(name)
            _print(f"L3 Table by name: {name}", l3.__dict__ if l3 else None)
            assert l3 is not None


def test_get_prompt_template_and_search():
    app = create_app("development")
    with app.app_context():
        # Prompt template availability depends on database contents; None is acceptable.
        tmpl = ThreeLevelService.get_prompt_template(stage="step1", lang="en")
        _print("Prompt Template(step1, en)", tmpl.__dict__ if tmpl else None)

        # Keyword search using a common term; if empty we only log.
        results = ThreeLevelService.search_tables_by_keyword("lake")
        _print(
            "Search tables by keyword 'lake' (top 5)", [x.__dict__ for x in results[:5]]
        )
        assert isinstance(results, list)


def test_get_full_hierarchy():
    app = create_app("development")
    with app.app_context():
        data = ThreeLevelService.get_full_hierarchy()
        # Validate the response shape without asserting on data volume.
        assert isinstance(data, dict)
        assert "hierarchy" in data
        _print(
            "Full hierarchy (truncated)",
            {
                "l1_count": len(data.get("hierarchy", [])),
            },
        )
