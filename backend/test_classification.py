#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的分类服务测试脚本
用于验证分类服务的基本功能
"""
import sys
import os
import asyncio

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.classification_service import ClassificationService
from app.models.tri_level_dto import (
    ClassificationRequest,
    AutoClassificationRequest,
    CategoryRecommendationRequest
)


async def test_table_classification():
    """测试表分类功能"""
    print("=== 测试表分类功能 ===")
    
    service = ClassificationService()
    
    # 测试预定义表分类
    request = ClassificationRequest(
        data_source="table",
        source_identifier="ne_countries_chn",
        classification_type="auto",
        target_levels=["l1", "l2", "l3"],
        confidence_threshold=0.5
    )
    
    response = await service.classify_data(request)
    
    print(f"成功: {response.success}")
    print(f"消息: {response.message}")
    print(f"分类结果数: {response.classified_items}")
    
    for result in response.results:
        print(f"  - {result.level}: {result.category_name} (置信度: {result.confidence:.2f})")
        print(f"    关键词: {result.keywords}")
        print(f"    推理: {result.reasoning}")
        print()


async def test_content_classification():
    """测试内容分类功能"""
    print("=== 测试内容分类功能 ===")
    
    service = ClassificationService()
    
    # 测试基于内容的分类
    request = ClassificationRequest(
        data_source="content",
        source_identifier="geographic data about lakes and water bodies in australia including natural features",
        classification_type="auto",
        target_levels=["l1", "l2", "l3"],
        confidence_threshold=0.3
    )
    
    response = await service.classify_data(request)
    
    print(f"成功: {response.success}")
    print(f"消息: {response.message}")
    print(f"分类结果数: {response.classified_items}")
    
    for result in response.results:
        print(f"  - {result.level}: {result.category_name} (置信度: {result.confidence:.2f})")
        print(f"    关键词: {result.keywords}")
        print()


async def test_auto_classification():
    """测试自动分类功能"""
    print("=== 测试自动分类功能 ===")
    
    service = ClassificationService()
    
    # 测试自动分类
    request = AutoClassificationRequest(
        table_name="ne_lakes",
        sample_size=50,
        use_spatial_info=True,
        use_attribute_info=True
    )
    
    response = await service.auto_classify(request)
    
    print(f"成功: {response.success}")
    print(f"消息: {response.message}")
    print(f"分类结果数: {response.classified_items}")
    
    if response.statistics:
        print("统计信息:")
        for key, value in response.statistics.items():
            print(f"  {key}: {value}")
        print()


async def test_category_recommendation():
    """测试类别推荐功能"""
    print("=== 测试类别推荐功能 ===")
    
    service = ClassificationService()
    
    # 测试类别推荐
    request = CategoryRecommendationRequest(
        description="Dataset containing administrative boundaries and population data for major cities worldwide",
        keywords=["city", "population", "administrative"],
        data_type="spatial",
        domain="urban_planning"
    )
    
    response = await service.recommend_categories(request)
    
    print(f"推荐数量: {len(response.recommendations)}")
    
    for rec in response.recommendations:
        print(f"  - {rec.level}: {rec.category_name} (置信度: {rec.confidence:.2f})")
    
    print(f"\n现有匹配项: {len(response.existing_matches)}")
    for match in response.existing_matches:
        print(f"  - {match}")
    
    print(f"\n新类别建议: {len(response.new_category_suggestions)}")
    for suggestion in response.new_category_suggestions:
        print(f"  - {suggestion['suggested_name']}: {suggestion['description'][:100]}...")


def test_keyword_matching():
    """测试关键词匹配功能"""
    print("=== 测试关键词匹配功能 ===")
    
    service = ClassificationService()
    
    # 测试L1级别匹配
    test_names = [
        "administrative_boundaries",
        "natural_features", 
        "transport_network",
        "population_data",
        "lake_polygons"
    ]
    
    for name in test_names:
        result = service._find_best_keyword_match(name, "l1")
        if result:
            category, confidence, keywords = result
            print(f"{name} -> {category} (置信度: {confidence:.2f}, 关键词: {keywords})")
        else:
            print(f"{name} -> 无匹配")


async def run_all_tests():
    """运行所有测试"""
    print("开始分类服务测试...")
    print("=" * 50)
    
    try:
        await test_table_classification()
        await test_content_classification()
        await test_auto_classification()
        await test_category_recommendation()
        test_keyword_matching()
        
        print("=" * 50)
        print("所有测试完成!")
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_all_tests())