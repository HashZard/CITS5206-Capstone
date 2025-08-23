-- ========== L1：顶层类别 ==========
CREATE TABLE l1_category (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,           -- 如：行政边界 / 国家
  description   TEXT,
  dimension     TEXT,                           -- 可选：theme / usage / geometry / time
  keywords      TEXT[] DEFAULT '{}',            -- ["国家","边界","主权",...]
  weight        INT DEFAULT 100,                -- 排序优先级(暂不使用)
  active        BOOLEAN DEFAULT TRUE,
  version       INT DEFAULT 1,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ========== L2：概述卡 ==========
CREATE TABLE l2_card (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,              -- 如：国家边界与属性 / 距离相交包含
  description_short TEXT NOT NULL,              -- 1-2行概述（路由便宜）
  keywords          TEXT[] DEFAULT '{}',        -- ["人口","GDP","空间查询"]
  allowed_dimensions TEXT[] DEFAULT '{}',       -- ["theme","usage"] 可选
  weight            INT DEFAULT 100,            -- 排序优先级(暂不使用)
  active            BOOLEAN DEFAULT TRUE,
  version           INT DEFAULT 1,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ========== L3：表内核（TableCard-Detail） ==========
CREATE TABLE l3_table (
  id                 SERIAL PRIMARY KEY,
  table_name         TEXT NOT NULL UNIQUE,      -- 物理表名
  display_name    TEXT NOT NULL,                -- 名称介绍
  summary            TEXT NOT NULL,             -- 2-3句：表描述
  core_fields        JSONB NOT NULL,            -- ["name","geom",...]
  keywords           TEXT[] DEFAULT '{}',       -- ["国家","边界","GDP",...]
  use_cases          TEXT[] DEFAULT '{}',       -- ["按ISO编码检索国家",...]
  tablecard_detail_md TEXT NOT NULL,            -- 第三级描述卡（Markdown）
  schema_ref         TEXT,                      -- 延后加载用引用标识
  active             BOOLEAN DEFAULT TRUE,
  version            INT DEFAULT 1,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ========== 关联表：L1 <-> L2（多对多） ==========
CREATE TABLE map_l1_l2 (
  l1_id INT REFERENCES l1_category(id) ON DELETE CASCADE,
  l2_id INT REFERENCES l2_card(id)     ON DELETE CASCADE,
  weight INT DEFAULT 100,
  PRIMARY KEY (l1_id, l2_id)
);

-- ========== 关联表：L2 <-> L3（多对多中的多对一；同一L3可挂多个L2） ==========
CREATE TABLE map_l2_l3 (
  l2_id INT REFERENCES l2_card(id)  ON DELETE CASCADE,
  l3_id INT REFERENCES l3_table(id) ON DELETE CASCADE,
  weight INT DEFAULT 100,
  PRIMARY KEY (l2_id, l3_id)
);

-- ========== Prompt 模板：L1/L2/L3/Clarify/SQL Gen ==========
CREATE TABLE prompt_templates (
  id           SERIAL PRIMARY KEY,
  stage        TEXT NOT NULL,                 -- L1 | L2 | L3 | CLARIFY | SQL_GEN
  lang         TEXT DEFAULT 'zh',             -- zh/en...
  system_text  TEXT NOT NULL,
  context_tmpl TEXT NOT NULL,                 -- 可含占位符，如 {{cards_json}}
  user_tmpl    TEXT NOT NULL,
  json_schema  TEXT,                          -- 期望 JSON 结构
  updated_at   TIMESTAMPTZ DEFAULT now()
);

