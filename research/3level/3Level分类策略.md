# 数据整理与分级策略

本策略旨在对地理数据库表进行结构化整理，逐步形成 **多层级 Prompt 路由体系**，最终支持 LLM 精确选择合适的数据表与字段。

---

## 初始：字段画像与取值分布

目标：对候选字段做Top-N 取值频次统计（或全量分布），用于：
 校准字段定义（比如确定 featurecla 的真实枚举值集合）
 发现脏值/别名（如 “SE Asia” vs “South-Eastern Asia”）
 给前端下拉/自动补全提供稳定字典
 指导 LLM：哪些值最常见/应该优先匹配
方法:
 A) 单字段 Top-N 频次
 B) 批量生成多个字段的 Top-N（动态 SQL）
 C) 针对合并属性的“归一化画像” (可选)
 D) 数值字段的分布（分桶）
 E) 结果落库（可选，便于缓存/前端下拉）

实践: 采用数据采样

```sql
-- 每隔 5% 抽 1 条
WITH numbered AS (
  SELECT
    *,
    row_number() OVER () AS rn,
    count(*) OVER () AS total_rows
  FROM ne_10m_lakes_historic
)
SELECT *
FROM numbered
WHERE rn % (total_rows / 20) = 1;  -- 20 份 → 每份取 1 行

-- 抽取固定 100 行随机样本
SELECT *
FROM ne_10m_lakes_historic
ORDER BY random()
LIMIT 100;
```

---

## 第一步：全字段及释义（逐一对应）

- 对每个表的所有字段进行完整罗列与中文释义，避免遗漏。
- 示例（`ne_10m_admin_0_countries_chn`）：

| 字段名 | 含义解释 |
|---|---|
| gid | 全局唯一标识符（ID）。 |
| adm0_a3_cn | 国家/地区三位代码（中国视角）。 |
| featurecla | 要素类别（如 "Admin-0 country"）。 |
| ... | ... |
| geom | 几何对象（边界多边形，EPSG:4326）。 |

---

## 第二步：字段合并（避免重复）

- 对语义相同或相近的字段进行归并，减少冗余。
- 示例：

| 字段名/属性 | 含义解释 |
|---|---|
| sovereignt / sov_a3 | 主权实体名称与三位代码。 |
| adm0_a3（含 cn, us, fr…） | 国家三位代码（多版本）。 |
| name / name_long | 国家名称（简称、全称）。 |
| name_xx | 多语言名称。 |
| geom | 几何对象。 |

---

## 第三步：筛选与查询无关字段

- **剔除**：制图/渲染/内部 ID/标签类字段。  
- **保留**：查询可能用到的实体标识、名称、分类、区域、统计值、几何。  

### 示例  

**无关字段**  
`scalerank, labelrank, mapcolor7/8/9/13, wikidataid, ne_id, ...`  

**保留字段**  

| 字段名/属性 | 含义解释 |
|---|---|
| name / name_long | 名称。 |
| adm0_a3 | 国家代码。 |
| pop_est / gdp_md | 人口、GDP。 |
| continent / region_un | 区域信息。 |
| geom | 边界几何。 |

---

## 第四步：TableCard-Detail（用于 Prompt 描述）

- 为每张表生成一个简明、统一的描述卡。  
- 内容应包含：表名、主题、字段说明、关键词、适用场景。  

**示例：`ne_10m_lakes`**  

**表名：** `ne_10m_lakes`  
**主题：** 世界范围内的湖泊边界与名称信息。  

**字段说明：**

- **gid**：唯一标识符。  
- **featurecla**：要素类别（如 Lake）。  
- **name / name_alt**：湖泊名称及别名。  
- **name_xx**：多语言版本名称。  
- **geom**：湖泊边界几何对象。  

**关键词：**
湖泊、名称、边界、多语言、地理位置  

**适用查询场景：**

- 按名称检索湖泊边界  
- 按类别筛选湖泊  
- 与其他要素进行空间关系分析  

---

## 第五步：分级结构设计（L1-L2-L3）

- 目标：形成**树形/图形结构**，支持“一表多类”映射，逐级缩小范围。

### L1（顶层类别 / 标签面）

- **字段**：name, description, dimension, keywords, weight, active, version, updated_at  
- **示例**：`行政边界 / 国家`、`自然地理 / 湖泊`、`区域 / 地貌`、`海洋 / 海域`

### L2（概述卡 / 中间层）

- **字段**：name, description_short, keywords, allowed_dimensions, weight, active, version, updated_at  
- **说明**：同一 L2 可挂在多个 L1 下（多对多）。  
- **示例**：`国家边界与属性`、`湖泊范围与属性`、`地理区域与地貌`、`海洋与水体`

### L3（TableCard-Detail / 表内核）

- **字段**：table_name, display_name_zh, summary, core_fields, keywords, use_cases, tablecard_detail_md, schema_ref, active, version, updated_at  
- **说明**：每个表一张卡；同一 L3 可关联多个 L2。  
- **示例**：`ne_10m_admin_0_countries_chn`、`ne_10m_lakes`、`ne_10m_geography_regions_polys`、`ne_10m_geography_marine_polys`

---
