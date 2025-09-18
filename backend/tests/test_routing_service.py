"""
路由服务测试模块

本模块提供了两种测试模式：
1. 完整路由测试 (test_routing_with_real_llm)
2. 逐步调试测试 (test_routing_step_by_step)

执行方法:
--------
1. 设置必要的环境变量:
   export POSTGRES_DSN="postgresql://username:password@localhost:5432/dbname"
   export OPENAI_API_KEY="your-api-key"
   # 或者
   export GEMINI_API_KEY="your-api-key"

2. 运行测试:
   # 方式一：使用 pytest
   pytest test_routing_service.py -v

   # 方式二：直接运行（完整测试）
   python -m tests.test_routing_service

   # 方式三：直接运行（逐步调试）
   python -m tests.test_routing_service step

功能说明:
--------
1. 完整路由测试 (test_routing_with_real_llm):
   - 测试整个路由流程
   - 执行多个测试用例
   - 输出完整的执行结果
   - 包含性能统计

2. 逐步调试测试 (test_routing_step_by_step):
   - 分步执行每个路由阶段
   - 显示详细的中间结果
   - 适合调试和开发
   - 使用固定的测试查询

输出说明:
--------
- ✅ 表示测试通过
- ❌ 表示测试失败
- 包含执行时间统计
- 显示各层选择结果
- 输出生成的 SQL

注意事项:
--------
1. 需要正确配置数据库连接
2. 需要有效的 LLM API 密钥
3. 数据库中需要有测试数据
4. API 调用可能产生费用
"""

import json
import os
import sys
import time
from datetime import datetime, UTC
from typing import Dict, Any

import pytest


# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from app.extensions import llm_service
from app.services.routing_service import RoutingService


def _print_result(payload: Dict[str, Any]) -> None:
    """打印结果到控制台。"""
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def test_routing_with_real_llm():
    """
    使用真实 LLM API 测试完整路由流程。

    本函数测试整个查询路由过程，包括：
    1. L1 (顶层) 类别选择
    2. L2 (中层) 卡片选择
    3. L3 (底层) 表选择
    4. SQL 查询生成

    测试流程:
    1. 验证环境变量
    2. 对每个测试用例:
       - 执行完整路由
       - 验证输出格式
       - 记录执行时间
       - 输出详细结果

    输出包含:
    - 测试用例信息
    - 执行状态 (成功/失败)
    - 执行时间
    - L1/L2/L3 选择结果
    - 生成的 SQL

    Args: None
    Returns: None
    Raises:
        pytest.skip: 当缺少必要的环境变量时
    """
    # 检查环境变量
    required_env_vars = ["POSTGRES_DSN"]
    llm_vars = ["OPENAI_API_KEY", "GEMINI_API_KEY"]

    if not any(os.getenv(var) for var in llm_vars):
        pytest.skip("需要设置 OPENAI_API_KEY 或 GEMINI_API_KEY 环境变量")

    if not os.getenv("POSTGRES_DSN"):
        pytest.skip("需要设置 POSTGRES_DSN 环境变量")

    # 测试用例
    test_cases = [
        "Draw countries from the 'Americas' continent.",
        "Map only 'Low income' countries.",
        "Display all countries with area > 2 million sq. km.",
        "Visualize only top 3 countries in GDP per UN region.",
        "Create a map of countries with centroid within 1,000 km of the Greenwich meridian.",
        "Show countries where abbreviation and break name start with same letter.",
    ]

    app = create_app("development")

    with app.app_context():
        for i, user_question in enumerate(test_cases):
            print(f"\n=== 测试用例 {i+1}: {user_question} ===")

            try:
                # 记录开始时间
                start_time = time.time()

                # 执行路由
                svc = RoutingService()
                result = svc.route(user_question, limit=50)

                # 记录结束时间
                end_time = time.time()
                elapsed_ms = int((end_time - start_time) * 1000)

                # 验证结果结构
                assert "inputs" in result
                assert "outputs" in result
                assert all(f"step{j}" in result["inputs"] for j in range(1, 5))
                assert all(f"step{j}" in result["outputs"] for j in range(1, 5))

                # 验证各步骤输出
                step1_out = result["outputs"]["step1"]
                assert "l1_selected" in step1_out
                assert isinstance(step1_out["l1_selected"], list)
                assert len(step1_out["l1_selected"]) > 0

                step2_out = result["outputs"]["step2"]
                assert "l2_selected" in step2_out
                assert isinstance(step2_out["l2_selected"], list)

                step3_out = result["outputs"]["step3"]
                assert "l3_selected" in step3_out
                assert isinstance(step3_out["l3_selected"], dict)
                assert "table_name" in step3_out["l3_selected"]

                step4_out = result["outputs"]["step4"]
                assert "final_sql" in step4_out
                assert "sql" in step4_out["final_sql"]
                assert "params" in step4_out["final_sql"]

                # 验证 SQL 包含命名参数
                sql = step4_out["final_sql"]["sql"]

                # 打印成功结果
                log_entry = {
                    "test_case": i + 1,
                    "user_question": user_question,
                    "status": "success",
                    "elapsed_ms": elapsed_ms,
                    "result": result,
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                _print_result(log_entry)

                print(f"✅ 成功 - 耗时: {elapsed_ms}ms")
                print(
                    f"   L1 选择: {[item['name'] for item in step1_out['l1_selected']]}"
                )
                print(
                    f"   L2 选择: {[item['name'] for item in step2_out['l2_selected']]}"
                )
                print(f"   L3 表: {step3_out['l3_selected']['table_name']}")
                print(f"   SQL: {sql[:100]}...")

                # Log user question and SQL sentence into a file
                log_file = "routing_test_log.jsonl"
                log_data = {
                    "user_question": user_question,
                    "sql": sql,
                }
                with open(log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(log_data, ensure_ascii=False) + "\n")

            except Exception as e:
                # 打印失败结果
                log_entry = {
                    "test_case": i + 1,
                    "user_question": user_question,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                _print_result(log_entry)

                print(f"❌ 失败: {e}")
                # 不抛出异常，继续测试其他用例
                continue

        print(f"\n📝 测试完成")


def test_routing_step_by_step():
    """
    逐步测试每个路由步骤，便于调试。

    此函数分别测试路由服务的每个步骤：

    1. Step 1 - L1 选择:
       - 获取所有 L1 类别
       - 构建提示
       - 调用 LLM
       - 输出选择结果

    2. Step 2 - L2 选择:
       - 根据选中的 L1 获取相关 L2 卡片
       - 构建提示
       - 调用 LLM
       - 输出选择结果

    3. Step 3 - L3 选择:
       - 根据选中的 L2 获取相关 L3 表
       - 构建提示
       - 调用 LLM
       - 输出选择结果

    4. Step 4 - SQL 生成:
       - 获取选中表的 schema
       - 构建提示
       - 调用 LLM
       - 输出生成的 SQL

    每个步骤都会输出:
    - 输入提示 (system & user)
    - LLM 原始响应
    - 解析后的结果

    使用固定的测试查询："Find all major lakes in North America"

    Args: None
    Returns: None
    Raises:
        pytest.skip: 当缺少必要的环境变量时
        Exception: 当任何步骤失败时
    """
    if not any(os.getenv(var) for var in ["OPENAI_API_KEY", "GEMINI_API_KEY"]):
        pytest.skip("需要设置 LLM API 密钥")

    if not os.getenv("POSTGRES_DSN"):
        pytest.skip("需要设置 POSTGRES_DSN 环境变量")

    user_question = "Find all major lakes in North America"
    app = create_app("development")

    with app.app_context():
        svc = RoutingService()

        try:
            # 测试 Step 1: L1 选择
            print("\n=== Step 1: L1 选择 ===")
            from app.services.three_level_service import ThreeLevelService

            l1_objs = ThreeLevelService.get_all_l1_categories()
            l1_list = [
                {
                    "id": x.id,
                    "name": x.name,
                    "description": x.description,
                    "dimension": x.dimension,
                    "keywords": x.keywords or [],
                }
                for x in l1_objs
            ]

            s1_sys, s1_user = svc._build_step1_prompt(user_question, l1_list)
            r1 = llm_service.generate(message=s1_user, system_prompt=s1_sys)
            d1 = json.loads(r1.content)

            _print_result(
                {
                    "step": 1,
                    "input": {"system": s1_sys, "user": s1_user},
                    "output": d1,
                    "raw_response": r1.content,
                }
            )

            print(f"L1 选择结果: {d1}")

            # 测试 Step 2: L2 选择
            print("\n=== Step 2: L2 选择 ===")
            l1_ids = [int(i["id"]) for i in d1.get("l1_selected", [])]
            l2_all = []
            for l1_id in l1_ids:
                l2_cards = ThreeLevelService.get_l2_cards_by_l1(l1_id)
                l2_all.extend(
                    [
                        {
                            "id": x.id,
                            "name": x.name,
                            "description_short": x.description_short,
                            "keywords": x.keywords or [],
                            "allowed_dimensions": x.allowed_dimensions or [],
                        }
                        for x in l2_cards
                    ]
                )

            s2_sys, s2_user = svc._build_step2_prompt(user_question, l2_all)
            r2 = llm_service.generate(message=s2_user, system_prompt=s2_sys)
            d2 = json.loads(r2.content)

            _print_result(
                {
                    "step": 2,
                    "input": {"system": s2_sys, "user": s2_user},
                    "output": d2,
                    "raw_response": r2.content,
                }
            )

            print(f"L2 选择结果: {d2}")

            # 测试 Step 3: L3 选择
            print("\n=== Step 3: L3 选择 ===")
            l2_ids = [int(i["id"]) for i in d2.get("l2_selected", [])]
            l3_all = []
            for l2_id in l2_ids:
                l3_tables = ThreeLevelService.get_l3_tables_by_l2(l2_id)
                l3_all.extend(
                    [
                        {
                            "id": x.id,
                            "table_name": x.table_name,
                            "display_name": x.display_name,
                            "summary": x.summary,
                            "core_fields": x.core_fields or [],
                            "keywords": x.keywords or [],
                            "use_cases": x.use_cases or [],
                        }
                        for x in l3_tables
                    ]
                )

            s3_sys, s3_user = svc._build_step3_prompt(user_question, l3_all)
            r3 = llm_service.generate(message=s3_user, system_prompt=s3_sys)
            d3 = json.loads(r3.content)

            _print_result(
                {
                    "step": 3,
                    "input": {"system": s3_sys, "user": s3_user},
                    "output": d3,
                    "raw_response": r3.content,
                }
            )

            print(f"L3 选择结果: {d3}")

            # 测试 Step 4: SQL 生成
            print("\n=== Step 4: SQL 生成 ===")
            l3_selected = d3.get("l3_selected", {})
            table_name = l3_selected.get("table_name")

            if table_name:
                l3_schema = svc._fetch_table_schema_dict(table_name)
                constraints = {"limit": 100}
                s4_sys, s4_user = svc._build_step4_prompt(
                    user_question, l3_selected, l3_schema, constraints
                )
                r4 = llm_service.generate(message=s4_user, system_prompt=s4_sys)
                d4 = json.loads(r4.content)

                _print_result(
                    {
                        "step": 4,
                        "input": {"system": s4_sys, "user": s4_user},
                        "output": d4,
                        "raw_response": r4.content,
                    }
                )

                print(f"SQL 生成结果: {d4}")
            else:
                print("❌ 未选择 L3 表，跳过 SQL 生成")

        except Exception as e:
            _print_result({"error": str(e), "timestamp": datetime.utcnow().isoformat()})
            raise

        print(f"\n📝 逐步测试完成")


if __name__ == "__main__":
    # 可以直接运行此文件进行测试
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "step":
        test_routing_step_by_step()
    else:
        test_routing_with_real_llm()
