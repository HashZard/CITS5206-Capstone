# FastAPI 脚手架 —— LLM + PostGIS 后端（正式版，无 Docker）

本项目提供一个最小可运行的后端脚手架，支持：

- 使用 FastAPI 提供 REST API
- 通过（可选的）LLM 生成**参数化 SQL**
- 在 Postgres/PostGIS 上执行只读查询
- 会话状态（可选 Redis）与基础演示接口

## 目录结构（文档说明）

- `app/`：应用源代码
  - `api/`：HTTP 路由（不区分 v1，直接正式路径 `/api`）
  - `core/`：配置、日志、依赖注入/工厂
  - `services/`：业务逻辑层（编排、参数解析、SQL 执行、LLM 接口等）
  - `adapters/`：外部服务封装（OpenAI、Postgres、Redis 等）
  - `models/`：Pydantic 数据模型（请求/响应/会话/表卡）
  - `utils/`：通用工具（GeoJSON 转换、文本归一化等）
- `requirements.txt`：Python 依赖
- `.env.example`：环境变量示例（复制为 `.env` 后修改）

## 快速开始（无 Docker）

1. 创建虚拟环境并安装依赖：

   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate  # Windows 使用 .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env  # 根据需要修改数据库/Redis/LLM配置
   ```

2. 启动开发服务器：

   ```bash
   uvicorn app.main:app --reload
   ```

   访问接口文档：`http://localhost:8000/docs`

## 演示接口

- `GET /health`：健康检查
- `POST /api/query/demo`：演示“参数化 SQL”输出（模拟，不依赖真实 LLM 与数据库）

**示例请求体：**

```json
{ "query": "rivers near Perth", "extras": { "radius_m": 2000, "place_name": "Perth" } }
```

## 文档结构（建议）

- 《系统总体设计》：目标、范围、架构图、技术选型
- 《后端系统架构设计》：目录设计、组件说明、关键流程、数据契约、运维保障
- 《前端交互与可视化设计》：页面结构、澄清交互、地图展示与性能优化
- 《API 规范》：路径、入参/出参、错误码、示例
- 《部署与运行手册》：环境准备、启动命令、常见问题
- 《测试与验收标准》：测试类型、样例数据、KPI/验收标准
- 《变更与版本管理》：分支策略、发布流程、回滚机制
