# -*- coding: utf-8 -*-
"""
分类服务 - 地理数据自动分类和类别推荐
"""
import re
import time
from typing import Any, Dict, List, Optional, Tuple
from collections import Counter

from app.models.tri_level_dto import (
    ClassificationRequest,
    ClassificationResult,
    ClassificationResponse,
    AutoClassificationRequest,
    CategoryRecommendationRequest,
    CategoryRecommendationResponse,
)


class ClassificationService:
    """地理数据分类服务"""
    
    def __init__(self):
        # 预定义的地理数据关键词分类
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
        
        # 预定义分类映射
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
            },
            'ne_geography_regions': {
                'l1': 'natural',
                'l2': 'regions',
                'l3': 'polygons'
            },
            'ne_geography_marine': {
                'l1': 'natural',
                'l2': 'waters',
                'l3': 'polygons'
            }
        }

    async def classify_data(self, request: ClassificationRequest) -> ClassificationResponse:
        """
        对数据进行分类
        """
        start_time = time.time()
        
        try:
            # 根据数据源类型处理
            if request.data_source == "table":
                results = await self._classify_table(request)
            elif request.data_source == "file":
                results = await self._classify_file(request)
            elif request.data_source == "content":
                results = await self._classify_content(request)
            else:
                raise ValueError(f"Unsupported data source: {request.data_source}")
            
            # 过滤低置信度结果
            filtered_results = [
                r for r in results 
                if r.confidence >= request.confidence_threshold
            ]
            
            # 限制结果数量
            if len(filtered_results) > request.max_categories:
                filtered_results = sorted(
                    filtered_results, 
                    key=lambda x: x.confidence, 
                    reverse=True
                )[:request.max_categories]
            
            # 生成建议映射
            suggested_mappings = self._generate_mappings(filtered_results, request.target_levels)
            
            # 计算统计信息
            statistics = self._calculate_statistics(filtered_results)
            
            execution_time = time.time() - start_time
            
            return ClassificationResponse(
                success=True,
                message=f"Successfully classified data with {len(filtered_results)} results",
                total_items=len(results),
                classified_items=len(filtered_results),
                results=filtered_results,
                suggested_mappings=suggested_mappings,
                execution_time=execution_time,
                statistics=statistics
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            return ClassificationResponse(
                success=False,
                message=f"Classification failed: {str(e)}",
                total_items=0,
                classified_items=0,
                results=[],
                suggested_mappings={},
                execution_time=execution_time
            )

    async def _classify_table(self, request: ClassificationRequest) -> List[ClassificationResult]:
        """分类数据表"""
        table_name = request.source_identifier.lower()
        results = []
        
        # 检查预定义分类
        if table_name in self.predefined_classifications:
            predefined = self.predefined_classifications[table_name]
            for level in request.target_levels:
                if level in predefined:
                    category_name = predefined[level]
                    keywords = self._extract_keywords_for_category(category_name, level)
                    results.append(ClassificationResult(
                        level=level,
                        category_name=category_name,
                        confidence=0.95,
                        keywords=keywords,
                        reasoning=f"Predefined classification for table {table_name}"
                    ))
        else:
            # 基于表名进行分类
            results.extend(self._classify_by_name(table_name, request.target_levels))
        
        return results

    async def _classify_file(self, request: ClassificationRequest) -> List[ClassificationResult]:
        """分类文件"""
        file_path = request.source_identifier.lower()
        file_name = file_path.split('/')[-1] if '/' in file_path else file_path
        
        # 移除文件扩展名
        name_without_ext = file_name.split('.')[0] if '.' in file_name else file_name
        
        return self._classify_by_name(name_without_ext, request.target_levels)

    async def _classify_content(self, request: ClassificationRequest) -> List[ClassificationResult]:
        """分类文本内容"""
        content = request.source_identifier.lower()
        return self._classify_by_text(content, request.target_levels)

    def _classify_by_name(self, name: str, target_levels: List[str]) -> List[ClassificationResult]:
        """基于名称分类"""
        results = []
        
        for level in target_levels:
            if level in self.geo_keywords:
                best_match = self._find_best_keyword_match(name, level)
                if best_match:
                    category_name, confidence, keywords = best_match
                    results.append(ClassificationResult(
                        level=level,
                        category_name=category_name,
                        confidence=confidence,
                        keywords=keywords,
                        reasoning=f"Keyword matching based on name: {name}"
                    ))
        
        return results

    def _classify_by_text(self, text: str, target_levels: List[str]) -> List[ClassificationResult]:
        """基于文本内容分类"""
        results = []
        
        # 文本预处理
        words = re.findall(r'\b\w+\b', text.lower())
        word_freq = Counter(words)
        
        for level in target_levels:
            if level in self.geo_keywords:
                best_match = self._find_best_text_match(word_freq, level)
                if best_match:
                    category_name, confidence, keywords = best_match
                    results.append(ClassificationResult(
                        level=level,
                        category_name=category_name,
                        confidence=confidence,
                        keywords=keywords,
                        reasoning=f"Text analysis based classification"
                    ))
        
        return results

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
            
            # 计算相对得分
            relative_score = score / len(keywords) if keywords else 0
            
            if relative_score > best_score:
                best_score = relative_score
                best_category = category
                matched_keywords = current_matches
        
        if best_category and best_score > 0:
            # 基于匹配度计算置信度
            confidence = min(0.9, 0.3 + best_score * 0.6)
            return best_category, confidence, matched_keywords
        
        return None

    def _find_best_text_match(self, word_freq: Counter, level: str) -> Optional[Tuple[str, float, List[str]]]:
        """基于文本频率找到最佳匹配"""
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
            # 基于词频和匹配数计算置信度
            total_words = sum(word_freq.values())
            relative_score = best_score / total_words if total_words > 0 else 0
            confidence = min(0.85, 0.2 + relative_score * 10)
            return best_category, confidence, matched_keywords
        
        return None

    def _extract_keywords_for_category(self, category_name: str, level: str) -> List[str]:
        """为类别提取关键词"""
        if level in self.geo_keywords and category_name in self.geo_keywords[level]:
            return self.geo_keywords[level][category_name][:3]  # 返回前3个关键词
        return []

    def _generate_mappings(self, results: List[ClassificationResult], target_levels: List[str]) -> Dict[str, List[ClassificationResult]]:
        """生成层级映射建议"""
        mappings = {}
        
        for level in target_levels:
            level_results = [r for r in results if r.level == level]
            if level_results:
                mappings[level] = sorted(level_results, key=lambda x: x.confidence, reverse=True)
        
        return mappings

    def _calculate_statistics(self, results: List[ClassificationResult]) -> Dict[str, Any]:
        """计算分类统计信息"""
        if not results:
            return {}
        
        # 按层级统计
        level_counts = Counter(r.level for r in results)
        
        # 置信度统计
        confidences = [r.confidence for r in results]
        avg_confidence = sum(confidences) / len(confidences)
        
        # 类别统计
        category_counts = Counter(r.category_name for r in results)
        
        return {
            'level_distribution': dict(level_counts),
            'average_confidence': avg_confidence,
            'confidence_range': [min(confidences), max(confidences)],
            'category_distribution': dict(category_counts.most_common(5)),
            'total_unique_categories': len(category_counts)
        }

    async def auto_classify(self, request: AutoClassificationRequest) -> ClassificationResponse:
        """自动分类表数据"""
        classification_request = ClassificationRequest(
            data_source="table",
            source_identifier=request.table_name,
            classification_type="auto",
            target_levels=["l1", "l2", "l3"],
            confidence_threshold=0.5,
            max_categories=10,
            include_keywords=True
        )
        
        return await self.classify_data(classification_request)

    async def recommend_categories(self, request: CategoryRecommendationRequest) -> CategoryRecommendationResponse:
        """推荐数据类别"""
        start_time = time.time()
        
        try:
            # 基于描述进行分类
            classification_request = ClassificationRequest(
                data_source="content",
                source_identifier=request.description,
                classification_type="auto",
                target_levels=["l1", "l2", "l3"],
                confidence_threshold=0.3,
                max_categories=15,
                include_keywords=True
            )
            
            classification_response = await self.classify_data(classification_request)
            
            if not classification_response.success:
                return CategoryRecommendationResponse(
                    recommendations=[],
                    existing_matches=[],
                    new_category_suggestions=[],
                    confidence_summary={}
                )
            
            # 分析结果
            recommendations = classification_response.results
            
            # 模拟现有匹配项检查（实际实现中应查询数据库）
            existing_matches = self._find_existing_matches(recommendations)
            
            # 生成新类别建议
            new_suggestions = self._generate_new_category_suggestions(recommendations, request)
            
            # 置信度汇总
            confidence_summary = self._summarize_confidence(recommendations)
            
            return CategoryRecommendationResponse(
                recommendations=recommendations,
                existing_matches=existing_matches,
                new_category_suggestions=new_suggestions,
                confidence_summary=confidence_summary
            )
            
        except Exception as e:
            return CategoryRecommendationResponse(
                recommendations=[],
                existing_matches=[],
                new_category_suggestions=[],
                confidence_summary={"error": str(e)}
            )

    def _find_existing_matches(self, recommendations: List[ClassificationResult]) -> List[Dict[str, Any]]:
        """查找现有匹配项（模拟实现）"""
        # 在实际实现中，这里应该查询数据库以找到现有的类别
        existing = []
        
        for rec in recommendations:
            if rec.confidence > 0.8:
                existing.append({
                    "level": rec.level,
                    "category_name": rec.category_name,
                    "match_type": "exact" if rec.confidence > 0.9 else "similar",
                    "confidence": rec.confidence
                })
        
        return existing

    def _generate_new_category_suggestions(self, recommendations: List[ClassificationResult], request: CategoryRecommendationRequest) -> List[Dict[str, Any]]:
        """生成新类别建议"""
        suggestions = []
        
        # 基于低置信度结果生成新类别建议
        low_confidence_results = [r for r in recommendations if r.confidence < 0.6]
        
        for result in low_confidence_results:
            suggestion = {
                "level": result.level,
                "suggested_name": f"new_{result.category_name}",
                "description": f"New category based on: {request.description[:100]}...",
                "keywords": result.keywords,
                "confidence": result.confidence,
                "reasoning": f"Low confidence match suggests new category needed"
            }
            suggestions.append(suggestion)
        
        return suggestions[:3]  # 限制建议数量

    def _summarize_confidence(self, recommendations: List[ClassificationResult]) -> Dict[str, float]:
        """汇总置信度"""
        if not recommendations:
            return {}
        
        confidences = [r.confidence for r in recommendations]
        
        return {
            "average": sum(confidences) / len(confidences),
            "minimum": min(confidences),
            "maximum": max(confidences),
            "high_confidence_count": len([c for c in confidences if c > 0.8]),
            "medium_confidence_count": len([c for c in confidences if 0.5 <= c <= 0.8]),
            "low_confidence_count": len([c for c in confidences if c < 0.5])
        }