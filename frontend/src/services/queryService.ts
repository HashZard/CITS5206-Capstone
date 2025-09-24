/**
 * QueryService 查询服务类
 * 
 * 功能：处理所有与后端API的交互和数据转换
 * - executeQuery: 执行地理查询，返回处理后的结果
 * - fetchResults: 发送HTTP请求到后端API
 * - extractCoordinates: 从地名提取近似坐标（回退方案）
 * - mapResultsToRowItems: 将API响应转换为前端数据格式
 * 
 * 数据处理功能：
 * - 统一数据格式转换
 * - 坐标提取和映射
 * - 错误处理和异常捕获
 * - 支持测试用例参数
 * 
 * 使用场景：Result组件的数据层，封装所有API调用逻辑
 */

import axios from "axios";
import { ApiSuccess, RowItem } from '@/types/result';

export class QueryService {
  private static async fetchResults(query: string, testCase?: number): Promise<ApiSuccess> {
    const payload: any = { question: query };
    if (typeof testCase === "number") payload.test_case = testCase;

    const response = await axios.post<ApiSuccess>(
      "http://localhost:8000/api/query/mock", 
      payload, 
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data;
  }

  private static extractCoordinates(item: any) {
    // Helper function to extract coordinates from geometry (simplified approach)
    const regionCoords: Record<string, [number, number]> = {
      'Russia': [61.5240, 105.3188],
      'Canada': [56.1304, -106.3468],
      'China': [35.8617, 104.1954],
      'United States': [37.0902, -95.7129],
      'Brazil': [-14.2350, -51.9253],
      'Australia': [-25.2744, 133.7751],
      'India': [20.5937, 78.9629],
      'Argentina': [-38.4161, -63.6167],
      'Kazakhstan': [48.0196, 66.9237],
      'Algeria': [28.0339, 1.6596],
    };
    
    const name = item.name_en || item.name || item.featurecla || '';
    for (const [region, coords] of Object.entries(regionCoords)) {
      if (name.toLowerCase().includes(region.toLowerCase())) {
        return { lat: coords[0], lon: coords[1] };
      }
    }
    
    return { lat: undefined, lon: undefined };
  }

  private static mapResultsToRowItems(results: any[]): RowItem[] {
    return results.map((item: any, idx: number) => {
      const coords = this.extractCoordinates(item);
      return {
        id: String(item.ne_id || item.id || idx + 1),
        name: item.name_en || item.name || item.country || item.country_name || item.featurecla,
        population: item.population || item.pop,
        incomeGroup: item.income_group || item.incomegroup || item.income,
        region: item.region || item.featurecla,
        lat: coords.lat || item.lat || item.latitude || item.y,
        lon: coords.lon || item.lon || item.lng || item.longitude || item.x,
        reason: item.reason || item.explanation || item.rationale || 
          `Area: ${item.area_km2 ? Math.round(item.area_km2).toLocaleString() + ' km²' : 'N/A'}`,
        raw: item
      };
    });
  }

  public static async executeQuery(query: string, testCase?: number): Promise<{
    items: RowItem[];
    meta: {
      sql?: string;
      reasoning?: string;
      model?: string;
      isFallback?: boolean;
    };
  }> {
    const data = await this.fetchResults(query, testCase);
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Unexpected API response");
    }

    const items = this.mapResultsToRowItems(data.results);
    const meta = {
      sql: data.sql,
      reasoning: Array.isArray(data.reasoning) ? data.reasoning.join('\n\n') : data.reasoning,
      model: data.model_used,
      isFallback: data.is_fallback,
    };

    return { items, meta };
  }
}
