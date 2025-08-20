# -*- coding: utf-8 -*-
"""
三层架构地理信息系统 DTO（数据传输对象）
用于 API 接口的请求和响应，与 tri_level_model.py 对应
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# =========================
# L1 顶层类别 DTO
# =========================

class L1CategoryBase(BaseModel):
    """L1 类别基础模型"""
    name: str = Field(..., description="类别名称", max_length=255)
    description: Optional[str] = Field(None, description="类别描述")
    dimension: Optional[str] = Field(None, description="维度类型，如 theme", max_length=50)
    keywords: Optional[List[str]] = Field(default_factory=list, description="关键词列表")
    weight: Optional[int] = Field(default=0, description="权重排序")


class L1CategoryCreate(L1CategoryBase):
    """创建 L1 类别的请求模型"""
    pass


class L1CategoryUpdate(BaseModel):
    """更新 L1 类别的请求模型"""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    dimension: Optional[str] = Field(None, max_length=50)
    keywords: Optional[List[str]] = None
    weight: Optional[int] = None


class L1CategoryResponse(L1CategoryBase):
    """L1 类别的响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =========================
# L2 概述卡 DTO
# =========================

class L2CardBase(BaseModel):
    """L2 概述卡基础模型"""
    name: str = Field(..., description="概述卡名称", max_length=255)
    description_short: Optional[str] = Field(None, description="简短描述")
    keywords: Optional[List[str]] = Field(default_factory=list, description="关键词列表")
    weight: Optional[int] = Field(default=0, description="权重排序")


class L2CardCreate(L2CardBase):
    """创建 L2 概述卡的请求模型"""
    pass


class L2CardUpdate(BaseModel):
    """更新 L2 概述卡的请求模型"""
    name: Optional[str] = Field(None, max_length=255)
    description_short: Optional[str] = None
    keywords: Optional[List[str]] = None
    weight: Optional[int] = None


class L2CardResponse(L2CardBase):
    """L2 概述卡的响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =========================
# L3 表内核 DTO
# =========================

class L3TableBase(BaseModel):
    """L3 表内核基础模型"""
    table_name: str = Field(..., description="实际表名", max_length=255)
    display_name: Optional[str] = Field(None, description="显示名称", max_length=255)
    summary: Optional[str] = Field(None, description="表格摘要")
    core_fields: Optional[Any] = Field(None, description="核心字段列表（JSON格式）")
    keywords: Optional[List[str]] = Field(default_factory=list, description="关键词列表")
    use_cases: Optional[List[str]] = Field(default_factory=list, description="使用场景列表")
    tablecard_detail_md: Optional[str] = Field(None, description="详细描述（Markdown格式）")
    schema_ref: Optional[str] = Field(None, description="模式引用", max_length=255)


class L3TableCreate(L3TableBase):
    """创建 L3 表内核的请求模型"""
    pass


class L3TableUpdate(BaseModel):
    """更新 L3 表内核的请求模型"""
    table_name: Optional[str] = Field(None, max_length=255)
    display_name: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = None
    core_fields: Optional[Any] = None
    keywords: Optional[List[str]] = None
    use_cases: Optional[List[str]] = None
    tablecard_detail_md: Optional[str] = None
    schema_ref: Optional[str] = Field(None, max_length=255)


class L3TableResponse(L3TableBase):
    """L3 表内核的响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =========================
# 映射关系 DTO
# =========================

class MapL1L2Base(BaseModel):
    """L1-L2 映射基础模型"""
    l1_id: int = Field(..., description="L1类别ID")
    l2_id: int = Field(..., description="L2概述卡ID")
    weight: Optional[int] = Field(default=100, description="映射权重")


class MapL1L2Create(MapL1L2Base):
    """创建 L1-L2 映射的请求模型"""
    pass


class MapL1L2Response(MapL1L2Base):
    """L1-L2 映射的响应模型"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MapL2L3Base(BaseModel):
    """L2-L3 映射基础模型"""
    l2_id: int = Field(..., description="L2概述卡ID")
    l3_id: int = Field(..., description="L3表内核ID")
    weight: Optional[int] = Field(default=100, description="映射权重")


class MapL2L3Create(MapL2L3Base):
    """创建 L2-L3 映射的请求模型"""
    pass


class MapL2L3Response(MapL2L3Base):
    """L2-L3 映射的响应模型"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# 层级查询 DTO
# =========================

class L1WithL2Response(L1CategoryResponse):
    """包含 L2 信息的 L1 响应"""
    l2_cards: List[L2CardResponse] = Field(default_factory=list, description="关联的L2概述卡")


class L2WithL3Response(L2CardResponse):
    """包含 L3 信息的 L2 响应"""
    l3_tables: List[L3TableResponse] = Field(default_factory=list, description="关联的L3表内核")


class L2WithL1L3Response(L2CardResponse):
    """包含 L1 和 L3 信息的完整 L2 响应"""
    l1_categories: List[L1CategoryResponse] = Field(default_factory=list, description="关联的L1类别")
    l3_tables: List[L3TableResponse] = Field(default_factory=list, description="关联的L3表内核")


class FullHierarchyResponse(BaseModel):
    """完整的三层架构响应"""
    l1_categories: List[L1WithL2Response] = Field(default_factory=list, description="完整的层级结构")


# =========================
# 地理数据查询 DTO
# =========================

class GeoQueryRequest(BaseModel):
    """地理数据查询请求"""
    query: str = Field(..., description="自然语言查询")
    table_name: Optional[str] = Field(None, description="指定表名")
    limit: int = Field(default=100, ge=1, le=1000, description="结果限制数量")
    offset: int = Field(default=0, ge=0, description="结果偏移量")
    spatial_filter: Optional[Dict[str, Any]] = Field(None, description="空间过滤条件")
    extras: Optional[Dict[str, Any]] = Field(None, description="额外参数")


class GeoQueryResponse(BaseModel):
    """地理数据查询响应"""
    total_count: int = Field(..., description="总记录数")
    data: List[Dict[str, Any]] = Field(default_factory=list, description="查询结果数据")
    sql_executed: Optional[str] = Field(None, description="执行的SQL语句")
    execution_time: Optional[float] = Field(None, description="执行时间（秒）")
    table_info: Optional[L3TableResponse] = Field(None, description="表信息")


class TableStatsResponse(BaseModel):
    """表统计信息响应"""
    table_name: str = Field(..., description="表名")
    display_name: Optional[str] = Field(None, description="显示名称")
    total_records: int = Field(..., description="总记录数")
    field_stats: Dict[str, Any] = Field(default_factory=dict, description="字段统计信息")
    sample_data: List[Dict[str, Any]] = Field(default_factory=list, description="示例数据")
    spatial_info: Optional[Dict[str, Any]] = Field(None, description="空间信息统计")


# =========================
# 搜索和过滤 DTO
# =========================

class SearchRequest(BaseModel):
    """搜索请求"""
    keyword: str = Field(..., description="搜索关键词", min_length=1)
    search_type: str = Field(default="all", description="搜索类型：l1/l2/l3/table/all")
    limit: int = Field(default=20, ge=1, le=100, description="结果限制")
    exact_match: bool = Field(default=False, description="是否精确匹配")


class SearchResponse(BaseModel):
    """搜索响应"""
    keyword: str = Field(..., description="搜索关键词")
    search_type: str = Field(..., description="搜索类型")
    total_count: int = Field(..., description="总结果数")
    l1_results: List[L1CategoryResponse] = Field(default_factory=list, description="L1类别搜索结果")
    l2_results: List[L2CardResponse] = Field(default_factory=list, description="L2概述卡搜索结果")
    l3_results: List[L3TableResponse] = Field(default_factory=list, description="L3表内核搜索结果")
    execution_time: Optional[float] = Field(None, description="搜索耗时（秒）")


# =========================
# 地理数据表 DTO
# =========================

class FeatureStatsResponse(BaseModel):
    """要素分类统计响应"""
    table_name: str = Field(..., description="表名")
    field_name: str = Field(..., description="字段名")
    stats: List[Dict[str, Any]] = Field(default_factory=list, description="统计结果")
    total_records: int = Field(..., description="总记录数")


class SpatialQueryRequest(BaseModel):
    """空间查询请求"""
    table_name: str = Field(..., description="目标表名")
    geometry: Optional[Dict[str, Any]] = Field(None, description="几何条件（GeoJSON格式）")
    bbox: Optional[List[float]] = Field(None, description="边界框 [minx, miny, maxx, maxy]")
    buffer_distance: Optional[float] = Field(None, description="缓冲区距离（米）")
    spatial_relation: str = Field(default="intersects", description="空间关系：intersects/within/contains/touches")
    limit: int = Field(default=100, ge=1, le=1000, description="结果限制")


class SpatialQueryResponse(BaseModel):
    """空间查询响应"""
    features: List[Dict[str, Any]] = Field(default_factory=list, description="要素列表（GeoJSON格式）")
    total_count: int = Field(..., description="总要素数")
    execution_time: Optional[float] = Field(None, description="查询耗时（秒）")
    spatial_info: Optional[Dict[str, Any]] = Field(None, description="空间信息")


# =========================
# 数据导入导出 DTO
# =========================

class ImportRequest(BaseModel):
    """数据导入请求"""
    source_type: str = Field(..., description="数据源类型：sql/csv/geojson/shp")
    target_table: str = Field(..., description="目标表名")
    file_path: Optional[str] = Field(None, description="文件路径")
    data_content: Optional[str] = Field(None, description="数据内容")
    options: Optional[Dict[str, Any]] = Field(None, description="导入选项")


class ImportResponse(BaseModel):
    """数据导入响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="结果消息")
    imported_records: Optional[int] = Field(None, description="导入记录数")
    errors: Optional[List[str]] = Field(None, description="错误信息")
    execution_time: Optional[float] = Field(None, description="导入耗时（秒）")


class ExportRequest(BaseModel):
    """数据导出请求"""
    table_name: str = Field(..., description="源表名")
    export_format: str = Field(..., description="导出格式：sql/csv/geojson/json")
    where_clause: Optional[str] = Field(None, description="WHERE条件")
    limit: Optional[int] = Field(None, ge=1, description="导出记录限制")
    include_geometry: bool = Field(default=True, description="是否包含几何数据")


class ExportResponse(BaseModel):
    """数据导出响应"""
    success: bool = Field(..., description="是否成功")
    file_path: Optional[str] = Field(None, description="导出文件路径")
    content: Optional[str] = Field(None, description="导出内容")
    exported_records: int = Field(..., description="导出记录数")
    file_size: Optional[int] = Field(None, description="文件大小（字节）")
    execution_time: Optional[float] = Field(None, description="导出耗时（秒）")
