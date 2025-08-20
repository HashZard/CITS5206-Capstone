-- ===== L1 顶层类别 =====
INSERT INTO l1_category (name, description, dimension, keywords, weight) VALUES
('行政边界 / 国家', '国家与地区的行政边界及属性', 'theme', ARRAY['国家','主权','边界','人口','GDP','ISO'], 10),
('自然地理 / 湖泊', '现代湖泊的边界与名称', 'theme', ARRAY['湖泊','水体','名称','边界'], 20),
('区域 / 地貌', '地理区域与地貌边界', 'theme', ARRAY['区域','山脉','沙漠','群岛'], 30),
('海洋 / 海域', '海洋与水体多边形', 'theme', ARRAY['海洋','海域','海湾','海峡'], 40);

-- ===== L2 概述卡 =====
INSERT INTO l2_card (name, description_short, keywords, weight) VALUES
('国家边界与属性', '国家边界 + 人口/GDP + 国际代码', ARRAY['国家','人口','GDP','ISO'], 10),
('湖泊范围与属性', '湖泊边界 + 名称/别名', ARRAY['湖泊','水体','边界'], 20),
('地理区域与地貌', '区域/地貌的边界 + 分类', ARRAY['区域','地貌','featurecla'], 30),
('海洋与水体', '海洋/海域边界 + 类别', ARRAY['海洋','海域','featurecla'], 40);

-- ===== L1 <-> L2 挂载 =====
INSERT INTO map_l1_l2 (l1_id, l2_id, weight)
SELECT l1.id, l2.id, 100
FROM l1_category l1
JOIN l2_card l2 ON (
  (l1.name='行政边界 / 国家' AND l2.name='国家边界与属性') OR
  (l1.name='自然地理 / 湖泊' AND l2.name='湖泊范围与属性') OR
  (l1.name='区域 / 地貌'     AND l2.name='地理区域与地貌') OR
  (l1.name='海洋 / 海域'     AND l2.name='海洋与水体')
);

-- ===== L3 表内核（四张表） =====
INSERT INTO l3_table
(table_name, display_name, summary, core_fields, keywords, use_cases, tablecard_detail_md, schema_ref)
VALUES
('ne_10m_admin_0_countries_chn',
 '国家/地区边界数据',
 '包含国家与地区的边界、人口、GDP、ISO/UN/WB代码等，适合统计与空间查询。',
 '["name","name_long","adm0_a3","iso_a3","pop_est","gdp_md","continent","geom"]',
 ARRAY['国家','主权','边界','人口','GDP','ISO','UN','WB','多语言'],
 ARRAY['按ISO/UN/WB代码定位国家','查询国家边界并做空间相交','统计人口或GDP排行'],
 E'## TableCard-Detail: ne_10m_admin_0_countries_chn\n\n**主题**：国家与地区的边界、主权、人口与经济信息。\n**核心字段**：name, adm0_a3, iso_a3, pop_est, gdp_md, continent, geom\n**关键词**：国家, 边界, 人口, GDP, ISO, UN, WB\n**适用查询**：按代码/名称检索；空间相交；统计排行\n',
 'schema:pg_catalog:ne_10m_admin_0_countries_chn'),

('ne_10m_lakes',
 '全球湖泊数据',
 '全球主要湖泊的边界与名称，多语言支持，适合空间查询与地图展示。',
 '["name","name_alt","geom"]',
 ARRAY['湖泊','水体','边界','多语言'],
 ARRAY['查询湖泊边界','以名称/别名检索湖泊','与其他要素空间相交'],
 E'## TableCard-Detail: ne_10m_lakes\n\n**主题**：世界范围内的湖泊边界与名称信息。\n**核心字段**：name, name_alt, geom\n**关键词**：湖泊, 水体, 边界, 多语言\n**适用查询**：按名称检索；距离/相交；边界可视化\n',
 'schema:pg_catalog:ne_10m_lakes'),

('ne_10m_geography_regions_polys',
 '地理区域与地貌多边形',
 '包含各类地理区域与地貌的边界（如群岛、山脉、沙漠等），并标注所属大区与子区域。',
 '["name","namealt","featurecla","region","subregion","geom"]',
 ARRAY['区域','地貌','群岛','山脉','沙漠','region','subregion'],
 ARRAY['按类别（featurecla）检索区域','按大区/子区筛选','空间关系分析'],
 E'## TableCard-Detail: ne_10m_geography_regions_polys\n\n**主题**：地理区域与地貌多边形。\n**核心字段**：name, featurecla, region, subregion, geom\n**关键词**：区域, 地貌, 群岛, 山脉, 沙漠\n**适用查询**：按类别/区域筛选；空间分析\n',
 'schema:pg_catalog:ne_10m_geography_regions_polys'),

('ne_10m_geography_marine_polys',
 '海洋与水体多边形',
 '包含全球主要海洋与水体（海/洋/湾/海峡等）的边界与分类信息。',
 '["name","namealt","featurecla","geom"]',
 ARRAY['海洋','海域','海湾','海峡','marine polygon'],
 ARRAY['检索指定海域边界','按类别（featurecla）筛选水体','空间相交/邻接分析'],
 E'## TableCard-Detail: ne_10m_geography_marine_polys\n\n**主题**：海洋与水体多边形。\n**核心字段**：name, featurecla, geom\n**关键词**：海洋, 海域, 海湾, 海峡\n**适用查询**：按名称/类别检索；空间分析\n',
 'schema:pg_catalog:ne_10m_geography_marine_polys');

-- ===== L2 <-> L3 挂载 =====
INSERT INTO map_l2_l3 (l2_id, l3_id, weight)
SELECT l2.id, l3.id, 100
FROM l2_card l2
JOIN l3_table l3 ON
  (l2.name='国家边界与属性' AND l3.table_name='ne_10m_admin_0_countries_chn') OR
  (l2.name='湖泊范围与属性' AND l3.table_name='ne_10m_lakes') OR
  (l2.name='地理区域与地貌' AND l3.table_name='ne_10m_geography_regions_polys') OR
  (l2.name='海洋与水体'     AND l3.table_name='ne_10m_geography_marine_polys');
