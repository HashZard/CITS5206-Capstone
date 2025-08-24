-- ===== L1 Top Categories =====
INSERT INTO l1_category (name, description, dimension, keywords, weight) VALUES
('Administrative Boundaries / Countries', 'Administrative boundaries and attributes of countries and regions', 'theme', ARRAY['country','sovereignty','boundary','population','GDP','ISO'], 10),
('Natural Geography / Lakes', 'Boundaries and names of modern lakes', 'theme', ARRAY['lake','water body','name','boundary'], 20),
('Regions / Landforms', 'Geographic regions and landform boundaries', 'theme', ARRAY['region','mountain range','desert','archipelago'], 30),
('Oceans / Marine Areas', 'Ocean and water body polygons', 'theme', ARRAY['ocean','marine area','bay','strait'], 40);

-- ===== L2 Overview Cards =====
INSERT INTO l2_card (name, description_short, keywords, weight) VALUES
('Country Boundaries & Attributes', 'Country boundaries + population/GDP + international codes', ARRAY['country','population','GDP','ISO'], 10),
('Lake Extents & Attributes', 'Lake boundaries + names/aliases', ARRAY['lake','water body','boundary'], 20),
('Geographic Regions & Landforms', 'Region/landform boundaries + classification', ARRAY['region','landform','featurecla'], 30),
('Oceans & Water Bodies', 'Ocean/marine area boundaries + categories', ARRAY['ocean','marine area','featurecla'], 40);

-- ===== L1 <-> L2 Mapping =====
INSERT INTO map_l1_l2 (l1_id, l2_id, weight)
SELECT l1.id, l2.id, 100
FROM l1_category l1
JOIN l2_card l2 ON (
  (l1.name='Administrative Boundaries / Countries' AND l2.name='Country Boundaries & Attributes') OR
  (l1.name='Natural Geography / Lakes' AND l2.name='Lake Extents & Attributes') OR
  (l1.name='Regions / Landforms' AND l2.name='Geographic Regions & Landforms') OR
  (l1.name='Oceans / Marine Areas' AND l2.name='Oceans & Water Bodies')
);

-- ===== L3 Table Cores (Four Tables) =====
INSERT INTO l3_table
(table_name, display_name, summary, core_fields, keywords, use_cases, tablecard_detail_md, schema_ref)
VALUES
('ne_10m_admin_0_countries_chn',
 'Country/Region Boundary Data',
 'Contains boundaries, population, GDP, ISO/UN/WB codes of countries and regions, suitable for statistical and spatial queries.',
 '["name","name_long","adm0_a3","iso_a3","pop_est","gdp_md","continent","geom"]',
 ARRAY['country','sovereignty','boundary','population','GDP','ISO','UN','WB','multilingual'],
 ARRAY['Locate countries by ISO/UN/WB codes','Query country boundaries with spatial intersection','Statistical population or GDP rankings'],
 E'## TableCard-Detail: ne_10m_admin_0_countries_chn\n\n**Theme**: Country and region boundaries, sovereignty, population and economic information.\n**Core Fields**: name, adm0_a3, iso_a3, pop_est, gdp_md, continent, geom\n**Keywords**: country, boundary, population, GDP, ISO, UN, WB\n**Applicable Queries**: Search by code/name; spatial intersection; statistical rankings\n',
 'schema:pg_catalog:ne_10m_admin_0_countries_chn'),

('ne_10m_lakes',
 'Global Lakes Data',
 'Boundaries and names of major global lakes with multilingual support, suitable for spatial queries and map display.',
 '["name","name_alt","geom"]',
 ARRAY['lake','water body','boundary','multilingual'],
 ARRAY['Query lake boundaries','Search lakes by name/alias','Spatial intersection with other features'],
 E'## TableCard-Detail: ne_10m_lakes\n\n**Theme**: Lake boundaries and name information worldwide.\n**Core Fields**: name, name_alt, geom\n**Keywords**: lake, water body, boundary, multilingual\n**Applicable Queries**: Search by name; distance/intersection; boundary visualization\n',
 'schema:pg_catalog:ne_10m_lakes'),

('ne_10m_geography_regions_polys',
 'Geographic Regions & Landform Polygons',
 'Contains boundaries of various geographic regions and landforms (such as archipelagos, mountain ranges, deserts, etc.), with region and subregion annotations.',
 '["name","namealt","featurecla","region","subregion","geom"]',
 ARRAY['region','landform','archipelago','mountain range','desert','region','subregion'],
 ARRAY['Search regions by category (featurecla)','Filter by region/subregion','Spatial relationship analysis'],
 E'## TableCard-Detail: ne_10m_geography_regions_polys\n\n**Theme**: Geographic regions and landform polygons.\n**Core Fields**: name, featurecla, region, subregion, geom\n**Keywords**: region, landform, archipelago, mountain range, desert\n**Applicable Queries**: Filter by category/region; spatial analysis\n',
 'schema:pg_catalog:ne_10m_geography_regions_polys'),

('ne_10m_geography_marine_polys',
 'Ocean & Water Body Polygons',
 'Contains boundaries and classification information of major global oceans and water bodies (seas/oceans/bays/straits, etc.).',
 '["name","namealt","featurecla","geom"]',
 ARRAY['ocean','marine area','bay','strait','marine polygon'],
 ARRAY['Search specific marine area boundaries','Filter water bodies by category (featurecla)','Spatial intersection/adjacency analysis'],
 E'## TableCard-Detail: ne_10m_geography_marine_polys\n\n**Theme**: Ocean and water body polygons.\n**Core Fields**: name, featurecla, geom\n**Keywords**: ocean, marine area, bay, strait\n**Applicable Queries**: Search by name/category; spatial analysis\n',
 'schema:pg_catalog:ne_10m_geography_marine_polys');

-- ===== L2 <-> L3 Mapping =====
INSERT INTO map_l2_l3 (l2_id, l3_id, weight)
SELECT l2.id, l3.id, 100
FROM l2_card l2
JOIN l3_table l3 ON
  (l2.name='Country Boundaries & Attributes' AND l3.table_name='ne_10m_admin_0_countries_chn') OR
  (l2.name='Lake Extents & Attributes' AND l3.table_name='ne_10m_lakes') OR
  (l2.name='Geographic Regions & Landforms' AND l3.table_name='ne_10m_geography_regions_polys') OR
  (l2.name='Oceans & Water Bodies' AND l3.table_name='ne_10m_geography_marine_polys');
