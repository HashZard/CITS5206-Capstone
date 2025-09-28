/**
 * QueryService (simple mock-only version)
 * Always calls /api/query/mock.
 * Optional testCase can be passed from the page if you want to switch cases.
 */

import axios from "axios";
import { ApiSuccess, RowItem } from "@/types/result";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string) ?? "http://localhost:8000/api";

export class QueryService {
  private static async fetchResults(
    query: string,
    testCase?: number
  ): Promise<ApiSuccess> {
    const payload: any = { question: query };
    if (typeof testCase === "number") payload.test_case = testCase;

    const { data } = await axios.post<ApiSuccess>(
      `${API_BASE}/query/mock`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    return data;
  }

  private static extractCoordinates(item: any) {
    const regionCoords: Record<string, [number, number]> = {
      Russia: [61.524, 105.3188],
      Canada: [56.1304, -106.3468],
      China: [35.8617, 104.1954],
      "United States": [37.0902, -95.7129],
      Brazil: [-14.235, -51.9253],
      Australia: [-25.2744, 133.7751],
      India: [20.5937, 78.9629],
      Argentina: [-38.4161, -63.6167],
      Kazakhstan: [48.0196, 66.9237],
      Algeria: [28.0339, 1.6596],
    };

    const name = item.name_en || item.name || item.featurecla || "";
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
        name:
          item.name_en ||
          item.name ||
          item.country ||
          item.country_name ||
          item.featurecla,
        population: item.population || item.pop,
        incomeGroup: item.income_group || item.incomegroup || item.income,
        region: item.region || item.featurecla,
        lat: coords.lat || item.lat || item.latitude || item.y,
        lon: coords.lon || item.lon || item.lng || item.longitude || item.x,
        reason:
          item.reason ||
          item.explanation ||
          item.rationale ||
          (item.area_km2
            ? `Area: ${Math.round(item.area_km2).toLocaleString()} km²`
            : "N/A"),
        raw: item,
      };
    });
  }

  public static async executeQuery(
    query: string,
    testCase?: number
  ): Promise<{
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
      sql: (data as any).sql,
      reasoning: Array.isArray((data as any).reasoning)
        ? (data as any).reasoning.join("\n\n")
        : (data as any).reasoning,
      model: (data as any).model_used,
      isFallback: (data as any).is_fallback,
    };

    return { items, meta };
  }
}
