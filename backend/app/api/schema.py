from flask import Blueprint, jsonify

from app.models.dto import ALLOWED_TABLES
from app.services.sql_service import get_columns

schema_bp = Blueprint("schema", __name__)


@schema_bp.route("/tables", methods=["GET"])
def list_tables():
    data = []
    for t in sorted(ALLOWED_TABLES):
        try:
            cols = sorted(list(get_columns(t)))
        except Exception:
            cols = []
        data.append({"table": t, "columns": cols})
    return jsonify({"ok": True, "data": data, "meta": {"count": len(data)}}), 200
