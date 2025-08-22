# -*- coding: utf-8 -*-
"""
分类服务 API 路由
"""
from flask import Blueprint, request, jsonify
from app.models import (
    ClassificationRequest,
    ClassificationResponse,
    AutoClassificationRequest,
    CategoryRecommendationRequest,
    CategoryRecommendationResponse,
)
from app.services.classification_service import ClassificationService
import asyncio

classification_bp = Blueprint("classification", __name__, url_prefix="/api")


def _err(code: str, msg: str, http=400, details=None):
    """错误响应辅助函数"""
    return jsonify({
        "ok": False, 
        "error": {
            "code": code, 
            "message": msg, 
            "details": details or {}
        }
    }), http


def _run_async(coro):
    """运行异步函数的辅助函数"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)


@classification_bp.route("/classification/classify", methods=["POST"])
def classify_data():
    """
    数据分类端点
    接受分类请求并返回分类结果
    """
    try:
        payload = request.get_json(silent=True) or {}
        classification_request = ClassificationRequest(**payload)
    except (TypeError, ValueError) as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        service = ClassificationService()
        response = _run_async(service.classify_data(classification_request))
        
        # 转换为JSON响应格式
        result = {
            "ok": True,
            "data": response.dict(),
            "meta": {
                "execution_time": response.execution_time,
                "classified_items": response.classified_items,
                "total_items": response.total_items
            }
        }
        
        return jsonify(result), 200
        
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@classification_bp.route("/classification/auto", methods=["POST"])
def auto_classify():
    """
    自动分类端点
    对指定表进行自动分类
    """
    try:
        payload = request.get_json(silent=True) or {}
        auto_request = AutoClassificationRequest(**payload)
    except (TypeError, ValueError) as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        service = ClassificationService()
        response = _run_async(service.auto_classify(auto_request))
        
        result = {
            "ok": True,
            "data": response.dict(),
            "meta": {
                "table_name": auto_request.table_name,
                "sample_size": auto_request.sample_size,
                "execution_time": response.execution_time
            }
        }
        
        return jsonify(result), 200
        
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@classification_bp.route("/classification/recommend", methods=["POST"])
def recommend_categories():
    """
    类别推荐端点
    基于描述推荐合适的分类类别
    """
    try:
        payload = request.get_json(silent=True) or {}
        recommendation_request = CategoryRecommendationRequest(**payload)
    except (TypeError, ValueError) as e:
        return _err("VALIDATION_ERROR", str(e), 400)

    try:
        service = ClassificationService()
        response = _run_async(service.recommend_categories(recommendation_request))
        
        result = {
            "ok": True,
            "data": response.dict(),
            "meta": {
                "description_length": len(recommendation_request.description),
                "recommendation_count": len(response.recommendations)
            }
        }
        
        return jsonify(result), 200
        
    except ValueError as e:
        return _err("SEMANTIC_ERROR", str(e), 422)
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@classification_bp.route("/classification/stats", methods=["GET"])
def get_classification_stats():
    """
    获取分类统计信息端点
    返回系统中的分类统计数据
    """
    try:
        # 模拟统计数据（实际实现中应从数据库获取）
        stats = {
            "total_classifications": 1250,
            "categories_by_level": {
                "l1": 12,
                "l2": 45,
                "l3": 128
            },
            "classification_accuracy": {
                "high_confidence": 0.75,
                "medium_confidence": 0.20,
                "low_confidence": 0.05
            },
            "most_used_categories": {
                "l1": ["administrative", "natural", "infrastructure"],
                "l2": ["countries", "waters", "cities"],
                "l3": ["polygons", "points", "lines"]
            },
            "recent_classifications": 45,
            "auto_classification_success_rate": 0.87
        }
        
        result = {
            "ok": True,
            "data": stats,
            "meta": {
                "generated_at": "2024-01-01T00:00:00Z",
                "data_source": "classification_service"
            }
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@classification_bp.route("/classification/keywords", methods=["GET"])
def get_classification_keywords():
    """
    获取分类关键词端点
    返回用于分类的关键词列表
    """
    try:
        level = request.args.get('level', 'all')
        category = request.args.get('category', None)
        
        service = ClassificationService()
        
        if level == 'all':
            keywords = service.geo_keywords
        elif level in service.geo_keywords:
            if category and category in service.geo_keywords[level]:
                keywords = {level: {category: service.geo_keywords[level][category]}}
            else:
                keywords = {level: service.geo_keywords[level]}
        else:
            return _err("VALIDATION_ERROR", f"Invalid level: {level}", 400)
        
        result = {
            "ok": True,
            "data": {
                "keywords": keywords,
                "filters": {
                    "level": level,
                    "category": category
                }
            },
            "meta": {
                "total_categories": len([cat for level_data in keywords.values() for cat in level_data.keys()]),
                "total_keywords": sum([len(kw_list) for level_data in keywords.values() for kw_list in level_data.values()])
            }
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return _err("INTERNAL_ERROR", str(e), 500)


@classification_bp.route("/classification/health", methods=["GET"])
def health_check():
    """
    分类服务健康检查端点
    """
    try:
        # 简单的健康检查
        service = ClassificationService()
        
        # 测试基本功能
        test_result = service._find_best_keyword_match("test_lake", "l2")
        
        status = "healthy" if test_result else "degraded"
        
        result = {
            "ok": True,
            "data": {
                "status": status,
                "service": "classification_service",
                "version": "1.0.0",
                "capabilities": [
                    "data_classification",
                    "auto_classification", 
                    "category_recommendation",
                    "keyword_matching"
                ]
            },
            "meta": {
                "timestamp": "2024-01-01T00:00:00Z",
                "uptime": "running"
            }
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return _err("INTERNAL_ERROR", f"Health check failed: {str(e)}", 500)