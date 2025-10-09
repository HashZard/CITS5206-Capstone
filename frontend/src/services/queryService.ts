/**
 * QueryService - Query service class
 * 
 * Features: Handle all backend API interactions and data transformations
 * - executeQuery: Execute geographic queries and return processed results
 * - fetchResults: Send HTTP requests to backend API
 * - extractCoordinates: Extract approximate coordinates from place names (fallback solution)
 * - mapResultsToRowItems: Convert API responses to frontend data format
 * 
 * Data processing features:
 * - Unified data format conversion
 * - Coordinate extraction and mapping
 * - Error handling and exception capture
 * 
 * Use cases: Data layer for Result component, encapsulating all API call logic
 */

import axios from "axios";
import { ApiSuccess, RowItem } from '@/types/result';

export class QueryService {
  private static async fetchResults(query: string): Promise<ApiSuccess> {
    const payload = { question: query };

    console.log('🚀 Sending request to /api/query with payload:', payload);

    try {
      const response = await axios.post<ApiSuccess>(
        "/api/query",  // Use relative path, proxied to localhost:8000 via Vite in development
        payload, 
        { 
          headers: { "Content-Type": "application/json" },
          timeout: 60000, // 60 second timeout, LLM calls may take time
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
      // ✅ Preserve all backend raw data completely, no deletion or renaming of any fields
      const raw = { ...item };
      
      // 🔍 Fallback extraction for UI display only (does not affect raw)
      const coords = this.extractCoordinates(item);
      
      // 📝 Display name fallback (priority order, does not modify raw)
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
        raw  // ✅ Preserve all backend fields completely
      };
    });
  }

  public static async executeQuery(query: string): Promise<{
    items: RowItem[];
    rawResults: any[];  // New: Raw backend data
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

    // 🔍 Observability: Log backend raw response (development environment)
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

    // 🔍 Observability: Compare converted data (development environment)
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
      rawResults: data.results,  // Save raw data for table display
      meta 
    };
  }
}
