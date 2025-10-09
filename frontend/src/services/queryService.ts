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
 * 
 * 使用场景：Result组件的数据层，封装所有API调用逻辑
 */

import axios from "axios";
import { ApiSuccess, RowItem } from '@/types/result';

export class QueryService {
  private static async fetchResults(query: string): Promise<ApiSuccess> {
    const payload = { question: query };

    console.log('🚀 Sending request to /api/query with payload:', payload);

    try {
      const response = await axios.post<ApiSuccess>(
        "/api/query",  // 使用相对路径，开发时通过 Vite 代理到 localhost:8000
        payload, 
        { 
          headers: { "Content-Type": "application/json" },
          timeout: 60000, // 60秒超时，LLM 调用可能需要时间
        }
      );

      console.log('✅ Received response:', {
        status: response.status,
        hasResults: !!response.data?.results,
        resultCount: response.data?.results?.length,
        model: response.data?.model_used,
        isFallback: response.data?.is_fallback,
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ API request failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data,
        }
      });
      throw error;
    }
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
      // ✅ 完整保留后端原始数据，不删除、不重命名任何字段
      const raw = { ...item };
      
      // 🔍 仅用于 UI 显示的兜底提取（不影响 raw）
      const coords = this.extractCoordinates(item);
      
      // 📝 显示名称兜底（优先级顺序，不修改 raw）
      const displayName = item.name || item.name_en || item.formal_en || 
                          item.brk_name || item.country || item.country_name || 
                          item.featurecla || item.title || `Item ${idx + 1}`;
      
      return {
        id: String(item.gid || item.ne_id || item.id || idx + 1),
        name: displayName,
        population: item.population || item.pop || item.pop_est,
        incomeGroup: item.income_group || item.incomegroup || item.income,
        region: item.region || item.continent || item.featurecla,
        lat: coords.lat || item.lat || item.latitude || item.y,
        lon: coords.lon || item.lon || item.lng || item.longitude || item.x,
        reason: item.reason || item.explanation || item.rationale || '',
        raw  // ✅ 完整保留后端所有字段
      };
    });
  }

  public static async executeQuery(query: string): Promise<{
    items: RowItem[];
    rawResults: any[];  // 新增：原始后端数据
    meta: {
      sql?: string;
      reasoning?: string;
      model?: string;
      isFallback?: boolean;
    };
  }> {
    const data = await this.fetchResults(query);
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Unexpected API response");
    }

    // 🔍 可观测性：记录后端原始响应（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Backend → Frontend Data Mapping');
      console.log('📥 Backend raw response:', {
        resultCount: data.results.length,
        sampleRow: data.results[0],
        allKeys: data.results[0] ? Object.keys(data.results[0]) : [],
        sql: data.sql,
      });
    }

    const items = this.mapResultsToRowItems(data.results);
    const meta = {
      sql: data.sql,
      reasoning: Array.isArray(data.reasoning) ? data.reasoning.join('\n\n') : data.reasoning,
      model: data.model_used,
      isFallback: data.is_fallback,
    };

    // 🔍 可观测性：对比转换后数据（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Frontend mapped items:', {
        itemCount: items.length,
        sampleItem: items[0],
        rawKeysPreserved: items[0]?.raw ? Object.keys(items[0].raw).length : 0,
        originalKeysCount: data.results[0] ? Object.keys(data.results[0]).length : 0,
      });
      console.log('✅ Field preservation check:', 
        items[0]?.raw && data.results[0] && 
        Object.keys(items[0].raw).length === Object.keys(data.results[0]).length
          ? 'PASS - All fields preserved'
          : '❌ FAIL - Fields missing!'
      );
      console.groupEnd();
    }

    return { 
      items, 
      rawResults: data.results,  // 保存原始数据用于表格显示
      meta 
    };
  }
}
