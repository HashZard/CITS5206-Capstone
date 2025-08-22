#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立的分类服务测试脚本（不依赖Flask）
"""
import sys
import os
import asyncio
import re
from typing import Any, Dict, List, Optional, Tuple
from collections import Counter

# 模拟 Pydantic 模型用于测试
class TestClassificationRequest:
    def __init__(self, data_source, source_identifier, classification_type="auto", 
                 target_levels=None, confidence_threshold=0.7, max_categories=10, include_keywords=True):
        self.data_source = data_source
        self.source_identifier = source_identifier
        self.classification_type = classification_type
        self.target_levels = target_levels or ["l1", "l2", "l3"]
        self.confidence_threshold = confidence_threshold
        self.max_categories = max_categories
        self.include_keywords = include_keywords

class TestClassificationResult:
    def __init__(self, level, category_name, confidence, keywords=None, reasoning=None, category_id=None):
        self.level = level
        self.category_id = category_id
        self.category_name = category_name
        self.confidence = confidence
        self.keywords = keywords or []
        self.reasoning = reasoning

class TestClassificationResponse:
    def __init__(self, success, message, total_items, classified_items, results=None, 
                 suggested_mappings=None, execution_time=None, statistics=None):
        self.success = success
        self.message = message
        self.total_items = total_items
        self.classified_items = classified_items
        self.results = results or []
        self.suggested_mappings = suggested_mappings or {}
        self.execution_time = execution_time
        self.statistics = statistics

# 简化的分类服务（用于测试）
class TestClassificationService:
    def __init__(self):
        self.geo_keywords = {
            'l1': {
                'administrative': ['administrative', 'boundary', 'border', 'region', 'territory', 'district'],
                'natural': ['natural', 'physical', 'terrain', 'landscape', 'topography', 'elevation'],
                'infrastructure': ['infrastructure', 'transport', 'utility', 'facility', 'network'],
                'environment': ['environment', 'climate', 'weather', 'ecosystem', 'habitat'],
                'social': ['population', 'demographic', 'social', 'economic', 'cultural'],
                'land_use': ['land', 'use', 'cover', 'agriculture', 'forest', 'urban', 'development']
            },
            'l2': {
                'countries': ['country', 'nation', 'state', 'republic'],
                'cities': ['city', 'town', 'urban', 'municipality', 'settlement'],
                'waters': ['water', 'lake', 'river', 'ocean', 'sea', 'stream'],
                'mountains': ['mountain', 'hill', 'peak', 'range', 'elevation'],
                'roads': ['road', 'highway', 'street', 'route', 'path'],
                'railways': ['railway', 'railroad', 'train', 'metro', 'subway'],
                'airports': ['airport', 'airfield', 'aviation', 'flight'],
                'ports': ['port', 'harbor', 'maritime', 'shipping'],
            },
            'l3': {
                'points': ['point', 'location', 'coordinate', 'position'],
                'lines': ['line', 'linear', 'network', 'connection'],
                'polygons': ['polygon', 'area', 'region', 'zone', 'boundary'],
                'raster': ['raster', 'grid', 'pixel', 'image', 'satellite']
            }
        }
        
        self.predefined_classifications = {
            'ne_countries_chn': {
                'l1': 'administrative',
                'l2': 'countries', 
                'l3': 'polygons'
            },
            'ne_lakes': {
                'l1': 'natural',
                'l2': 'waters',
                'l3': 'polygons'
            }
        }

    def _find_best_keyword_match(self, name: str, level: str) -> Optional[Tuple[str, float, List[str]]]:
        """找到最佳关键词匹配"""
        best_score = 0
        best_category = None
        matched_keywords = []
        
        for category, keywords in self.geo_keywords[level].items():
            score = 0
            current_matches = []
            
            for keyword in keywords:
                if keyword in name:
                    score += 1
                    current_matches.append(keyword)
            
            relative_score = score / len(keywords) if keywords else 0
            
            if relative_score > best_score:
                best_score = relative_score
                best_category = category
                matched_keywords = current_matches
        
        if best_category and best_score > 0:
            confidence = min(0.9, 0.3 + best_score * 0.6)
            return best_category, confidence, matched_keywords
        
        return None

    async def classify_data(self, request):
        """简化的分类方法"""
        results = []
        
        if request.data_source == "table":
            table_name = request.source_identifier.lower()
            
            if table_name in self.predefined_classifications:
                predefined = self.predefined_classifications[table_name]
                for level in request.target_levels:
                    if level in predefined:
                        category_name = predefined[level]
                        keywords = self.geo_keywords[level].get(category_name, [])[:3]
                        results.append(TestClassificationResult(
                            level=level,
                            category_name=category_name,
                            confidence=0.95,
                            keywords=keywords,
                            reasoning=f"Predefined classification for table {table_name}"
                        ))
        
        elif request.data_source == "content":
            content = request.source_identifier.lower()
            words = re.findall(r'\b\w+\b', content)
            word_freq = Counter(words)
            
            for level in request.target_levels:
                best_score = 0
                best_category = None
                matched_keywords = []
                
                for category, keywords in self.geo_keywords[level].items():
                    score = 0
                    current_matches = []
                    
                    for keyword in keywords:
                        if keyword in word_freq:
                            freq = word_freq[keyword]
                            score += freq
                            current_matches.append(keyword)
                    
                    if score > best_score:
                        best_score = score
                        best_category = category
                        matched_keywords = current_matches
                
                if best_category and best_score > 0:
                    total_words = sum(word_freq.values())
                    relative_score = best_score / total_words if total_words > 0 else 0
                    confidence = min(0.85, 0.2 + relative_score * 10)
                    results.append(TestClassificationResult(
                        level=level,
                        category_name=best_category,
                        confidence=confidence,
                        keywords=matched_keywords,
                        reasoning="Text analysis based classification"
                    ))
        
        # 过滤结果
        filtered_results = [r for r in results if r.confidence >= request.confidence_threshold]
        
        return TestClassificationResponse(
            success=True,
            message=f"Successfully classified with {len(filtered_results)} results",
            total_items=len(results),
            classified_items=len(filtered_results),
            results=filtered_results,
            execution_time=0.1
        )


async def test_table_classification():
    """测试表分类功能"""
    print("=== 测试表分类功能 ===")
    
    service = TestClassificationService()
    
    request = TestClassificationRequest(
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
    
    service = TestClassificationService()
    
    request = TestClassificationRequest(
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


def test_keyword_matching():
    """测试关键词匹配功能"""
    print("=== 测试关键词匹配功能 ===")
    
    service = TestClassificationService()
    
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
        test_keyword_matching()
        
        print("=" * 50)
        print("所有测试完成!")
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_all_tests())