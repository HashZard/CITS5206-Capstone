# -*- coding: utf-8 -*-
# 健康检查路由
from flask import Blueprint, jsonify

bp = Blueprint('health', __name__)

@bp.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})
