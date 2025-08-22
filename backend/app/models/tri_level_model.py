
# -*- coding: utf-8 -*-
"""
三层架构地理信息系统数据模型
L1 (顶层类别) → L2 (概述卡) → L3 (表内核)
基于 initial_data.sql 的数据结构设计
"""
from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import (
    ARRAY, 
    Boolean,
    DateTime, 
    ForeignKey, 
    Integer, 
    JSON, 
    String, 
    Text,
    UniqueConstraint,
    Index,
    func
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from geoalchemy2 import Geometry


# =========================
# SQLAlchemy ORM Models
# =========================

class Base(DeclarativeBase):
    """数据库模型基类"""
    pass


class L1Category(Base):
    """L1 顶层类别模型"""
    __tablename__ = "l1_category"
    
    # 主键和基础字段
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, comment="类别名称")
    description: Mapped[Optional[str]] = mapped_column(Text, comment="类别描述")
    dimension: Mapped[Optional[str]] = mapped_column(String(50), comment="维度类型，如 theme")
    keywords: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), comment="关键词数组")
    weight: Mapped[Optional[int]] = mapped_column(Integer, default=100, comment="权重排序")
    active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    version: Mapped[int] = mapped_column(Integer, default=1, comment="版本号")
    
    # 时间戳字段
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关系映射 - many-to-many to L2 via MapL1L2
    l2_cards: Mapped[List["L2Card"]] = relationship(
        secondary=lambda: MapL1L2.__table__,
        back_populates="l1_categories",
        lazy="select"
    )
    
    # 索引
    __table_args__ = (
        Index('idx_l1_category_weight', 'weight'),
        Index('idx_l1_category_keywords', 'keywords', postgresql_using='gin'),
        Index('idx_l1_category_active', 'active'),
    )
    
    def __repr__(self) -> str:
        return f"<L1Category(id={self.id}, name='{self.name}', weight={self.weight})>"


class L2Card(Base):
    """L2 概述卡模型"""
    __tablename__ = "l2_card"
    
    # 主键和基础字段
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="概述卡名称")
    description_short: Mapped[str] = mapped_column(Text, nullable=False, comment="简短描述")
    keywords: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), comment="关键词数组")
    allowed_dimensions: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), comment="允许的维度")
    weight: Mapped[Optional[int]] = mapped_column(Integer, default=100, comment="权重排序")
    active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    version: Mapped[int] = mapped_column(Integer, default=1, comment="版本号")
    
    # 时间戳字段
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关系映射
    l1_categories: Mapped[List[L1Category]] = relationship(
        secondary=lambda: MapL1L2.__table__,
        back_populates="l2_cards",
        lazy="select"
    )
    l3_tables: Mapped[List["L3Table"]] = relationship(
        secondary=lambda: MapL2L3.__table__,
        back_populates="l2_cards",
        lazy="select"
    )
    
    # 索引
    __table_args__ = (
        Index('idx_l2_card_weight', 'weight'),
        Index('idx_l2_card_keywords', 'keywords', postgresql_using='gin'),
        Index('idx_l2_card_active', 'active'),
    )
    
    def __repr__(self) -> str:
        return f"<L2Card(id={self.id}, name='{self.name}', weight={self.weight})>"


class L3Table(Base):
    """L3 表内核模型"""
    __tablename__ = "l3_table"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 物理表标识
    table_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, comment="实际表名")
    display_name: Mapped[str] = mapped_column(String(255), nullable=False, comment="显示名称")
    summary: Mapped[str] = mapped_column(Text, nullable=False, comment="表格摘要")

    # 核心字段：可为 JSON 数组或字符串化数组，读取时兼容两种格式
    core_fields: Mapped[Any] = mapped_column(JSON, nullable=False, comment="核心字段列表")
    keywords: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), comment="关键词数组")
    use_cases: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), comment="使用场景数组")
    tablecard_detail_md: Mapped[str] = mapped_column(Text, nullable=False, comment="详细描述（Markdown格式）")
    schema_ref: Mapped[Optional[str]] = mapped_column(String(255), comment="模式引用，如 schema:pg_catalog:ne_10m_lakes")
    active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    version: Mapped[int] = mapped_column(Integer, default=1, comment="版本号")
    
    # 时间戳字段
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关系映射
    l2_cards: Mapped[List[L2Card]] = relationship(
        secondary=lambda: MapL2L3.__table__,
        back_populates="l3_tables",
        lazy="select"
    )
    
    # 索引
    __table_args__ = (
        Index('idx_l3_table_name', 'table_name'),
        Index('idx_l3_table_keywords', 'keywords', postgresql_using='gin'),
        Index('idx_l3_table_active', 'active'),
    )
    
    def __repr__(self) -> str:
        return f"<L3Table(id={self.id}, table_name='{self.table_name}', display_name='{self.display_name}')>"


class MapL1L2(Base):
    """L1 与 L2 的映射关系表"""
    __tablename__ = "map_l1_l2"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    l1_id: Mapped[int] = mapped_column(ForeignKey("l1_category.id", ondelete="CASCADE"), nullable=False, comment="L1类别ID")
    l2_id: Mapped[int] = mapped_column(ForeignKey("l2_card.id", ondelete="CASCADE"), nullable=False, comment="L2概述卡ID")
    weight: Mapped[Optional[int]] = mapped_column(Integer, default=100, comment="映射权重")
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 唯一性约束和索引
    __table_args__ = (
        UniqueConstraint('l1_id', 'l2_id', name='uq_map_l1_l2'),
        Index('idx_map_l1_l2_l1', 'l1_id'),
        Index('idx_map_l1_l2_l2', 'l2_id'),
    )
    
    def __repr__(self) -> str:
        return f"<MapL1L2(l1_id={self.l1_id}, l2_id={self.l2_id}, weight={self.weight})>"


class MapL2L3(Base):
    """L2 与 L3 的映射关系表"""
    __tablename__ = "map_l2_l3"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    l2_id: Mapped[int] = mapped_column(ForeignKey("l2_card.id", ondelete="CASCADE"), nullable=False, comment="L2概述卡ID")
    l3_id: Mapped[int] = mapped_column(ForeignKey("l3_table.id", ondelete="CASCADE"), nullable=False, comment="L3表内核ID")
    weight: Mapped[Optional[int]] = mapped_column(Integer, default=100, comment="映射权重")
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 唯一性约束和索引
    __table_args__ = (
        UniqueConstraint('l2_id', 'l3_id', name='uq_map_l2_l3'),
        Index('idx_map_l2_l3_l2', 'l2_id'),
        Index('idx_map_l2_l3_l3', 'l3_id'),
    )
    
    def __repr__(self) -> str:
        return f"<MapL2L3(l2_id={self.l2_id}, l3_id={self.l3_id}, weight={self.weight})>"


# =========================
# 地理数据表模型
# =========================

class NeCountriesChn(Base):
    """国家/地区边界数据表 - ne_10m_admin_0_countries_chn"""
    __tablename__ = 'ne_10m_admin_0_countries_chn'
    
    # 主键（通常是 gid）
    gid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 核心字段（基于 initial_data.sql 中的 core_fields）
    name: Mapped[Optional[str]] = mapped_column(String(255), comment='国家名称')
    name_long: Mapped[Optional[str]] = mapped_column(String(255), comment='国家全称')
    adm0_a3: Mapped[Optional[str]] = mapped_column(String(3), comment='ADM0 三字符代码')
    iso_a3: Mapped[Optional[str]] = mapped_column(String(3), comment='ISO 三字符代码')
    pop_est: Mapped[Optional[int]] = mapped_column(Integer, comment='估计人口')
    gdp_md: Mapped[Optional[float]] = mapped_column(Integer, comment='GDP（百万美元）')
    continent: Mapped[Optional[str]] = mapped_column(String(100), comment='所属大洲')
    featurecla: Mapped[Optional[str]] = mapped_column(String(100), comment='要素分类')
    
    # 几何字段
    geom: Mapped[Optional[Any]] = mapped_column(Geometry('MULTIPOLYGON'), comment='几何形状')
    
    # 索引
    __table_args__ = (
        Index('idx_countries_name', 'name'),
        Index('idx_countries_iso_a3', 'iso_a3'),
        Index('idx_countries_featurecla', 'featurecla'),
        Index('idx_countries_geom', 'geom', postgresql_using='gist'),
    )
    
    def __repr__(self) -> str:
        return f"<NeCountriesChn(name='{self.name}', iso_a3='{self.iso_a3}')>"


class NeLakes(Base):
    """全球湖泊数据表 - ne_10m_lakes"""
    __tablename__ = 'ne_10m_lakes'
    
    gid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 核心字段
    name: Mapped[Optional[str]] = mapped_column(String(255), comment='湖泊名称')
    name_alt: Mapped[Optional[str]] = mapped_column(String(255), comment='备用名称')
    featurecla: Mapped[Optional[str]] = mapped_column(String(100), comment='要素分类')
    
    # 几何字段
    geom: Mapped[Optional[Any]] = mapped_column(Geometry('MULTIPOLYGON'), comment='几何形状')
    
    # 索引
    __table_args__ = (
        Index('idx_lakes_name', 'name'),
        Index('idx_lakes_geom', 'geom', postgresql_using='gist'),
    )
    
    def __repr__(self) -> str:
        return f"<NeLakes(name='{self.name}')>"


class NeGeographyRegions(Base):
    """地理区域与地貌多边形表 - ne_10m_geography_regions_polys"""
    __tablename__ = 'ne_10m_geography_regions_polys'
    
    gid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 核心字段
    name: Mapped[Optional[str]] = mapped_column(String(255), comment='区域名称')
    namealt: Mapped[Optional[str]] = mapped_column(String(255), comment='备用名称')
    featurecla: Mapped[Optional[str]] = mapped_column(String(100), comment='要素分类')
    region: Mapped[Optional[str]] = mapped_column(String(100), comment='大区')
    subregion: Mapped[Optional[str]] = mapped_column(String(100), comment='子区域')
    
    # 几何字段
    geom: Mapped[Optional[Any]] = mapped_column(Geometry('MULTIPOLYGON'), comment='几何形状')
    
    # 索引
    __table_args__ = (
        Index('idx_regions_name', 'name'),
        Index('idx_regions_featurecla', 'featurecla'),
        Index('idx_regions_region', 'region'),
        Index('idx_regions_geom', 'geom', postgresql_using='gist'),
    )
    
    def __repr__(self) -> str:
        return f"<NeGeographyRegions(name='{self.name}', featurecla='{self.featurecla}')>"


class NeGeographyMarine(Base):
    """海洋与水体多边形表 - ne_10m_geography_marine_polys"""
    __tablename__ = 'ne_10m_geography_marine_polys'
    
    gid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 核心字段
    name: Mapped[Optional[str]] = mapped_column(String(255), comment='海域名称')
    namealt: Mapped[Optional[str]] = mapped_column(String(255), comment='备用名称')
    featurecla: Mapped[Optional[str]] = mapped_column(String(100), comment='要素分类')
    
    # 几何字段
    geom: Mapped[Optional[Any]] = mapped_column(Geometry('MULTIPOLYGON'), comment='几何形状')
    
    # 索引
    __table_args__ = (
        Index('idx_marine_name', 'name'),
        Index('idx_marine_featurecla', 'featurecla'),
        Index('idx_marine_geom', 'geom', postgresql_using='gist'),
    )
    
    def __repr__(self) -> str:
        return f"<NeGeographyMarine(name='{self.name}', featurecla='{self.featurecla}')>"


class PromptTemplate(Base):
    """Prompt 模板表 - prompt_templates"""
    __tablename__ = 'prompt_templates'
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 核心字段
    stage: Mapped[str] = mapped_column(String(20), nullable=False, comment='模板阶段：L1/L2/L3/CLARIFY/SQL_GEN')
    lang: Mapped[str] = mapped_column(String(10), default='zh', comment='语言：zh/en等')
    system_text: Mapped[str] = mapped_column(Text, nullable=False, comment='系统提示文本')
    context_tmpl: Mapped[str] = mapped_column(Text, nullable=False, comment='上下文模板，可含占位符如{{cards_json}}')
    user_tmpl: Mapped[str] = mapped_column(Text, nullable=False, comment='用户模板')
    json_schema: Mapped[Optional[str]] = mapped_column(Text, comment='期望的JSON结构')
    
    # 时间戳字段
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 索引
    __table_args__ = (
        Index('idx_prompt_stage_lang', 'stage', 'lang'),
        Index('idx_prompt_stage', 'stage'),
    )
    
    def __repr__(self) -> str:
        return f"<PromptTemplate(id={self.id}, stage='{self.stage}', lang='{self.lang}')>"


# =========================
# 工具函数
# =========================

def get_all_model_classes():
    """获取所有模型类"""
    return [
        L1Category,
        L2Card,
        L3Table,
        MapL1L2,
        MapL2L3,
        NeCountriesChn,
        NeLakes,
        NeGeographyRegions,
        NeGeographyMarine,
        PromptTemplate,
    ]


def create_all_tables(engine):
    """创建所有表"""
    Base.metadata.create_all(bind=engine)

