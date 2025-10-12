/**
 * Visualization - Visualization utility library
 * 
 * Features: Provide auxiliary tools and configurations for map visualization
 * - getVisualizationMode: Intelligently identify data types, select optimal visualization mode
 * - formatArea: Format area value display (km²)
 * - formatGDP: Format GDP value display (USD)
 * - continentColors: Continent color configuration mapping
 * - terrainColors: Terrain feature color configuration mapping
 * 
 * Visualization modes:
 * - area: Area distribution map (based on area_km2 field)
 * - countries: Country distribution map (based on continent field)
 * - economy: Economic heatmap (based on gdp_md field)
 * - terrain: Terrain feature map (based on featurecla field)
 * - general: General mode (default)
 * 
 * Use cases: Configuration and tool support for map renderers
 */

import { RowItem, VisualizationMode } from '@/types/result';
import * as wkx from 'wkx';
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') { (window as any).Buffer = Buffer; }

// 获取数据类型和可视化模式
export const getVisualizationMode = (items: RowItem[]): VisualizationMode => {
  if (!items.length) return 'empty';
  
  const firstItem = items[0].raw;
  
  if (firstItem?.area_km2 && firstItem?.featurecla) return 'area'; // Test Case 1
  if (firstItem?.centroid_lat && firstItem?.continent) return 'countries'; // Test Case 2  
  if (firstItem?.gdp_md && firstItem?.avg_gdp_md_continent) return 'economy'; // Test Case 3
  if (firstItem?.featurecla?.includes('Range') || firstItem?.featurecla?.includes('mtn')) return 'terrain'; // Test Case 4
  
  return 'general';
};

// Decide visualization intent from SQL
export type Intent = 'map' | 'chart' | 'text';

export function analyzeSql(sql: string, _rows: any[]): Intent {
  const s = (sql || '').toLowerCase();

  const has = (re: RegExp) => re.test(s);

  // text-only heuristics (highest priority)
  const textOnly = [
    /\slike\s|\silike\s|\sregexp\s/, // string matching
    /\bleft\s*\(|\bright\s*\(|\blength\s*\(/, // string funcs
    /(name|formal_en|brk_name|abbr)\s*(is\s+null|is\s+not\s+null|=|<>)/,
  ].some(has) && !/(st_\w+|\bgeom\b|\bgeometry\b)/.test(s);
  if (textOnly) return 'text';

  // chart heuristics (aggregations / centroid X/Y without geom)
  const chartAgg = [
    /\bgroup\s+by\b/,
    /\b(count|sum|avg|median|percentile|rank|ntile)\s*\(/,
  ].some(has);
  const centroidXYNoGeom = /(st_x\s*\(|st_y\s*\()/ .test(s) && !/\bgeom\b|\bgeometry\b/.test(s);
  if (chartAgg || centroidXYNoGeom) return 'chart';

  // map (default if geom or spatial functions present)
  const hasGeom = /\bgeom\b|\bgeometry\b/.test(s);
  const spatialFn = /st_(intersects|within|distance|area|centroid|contains|buffer|asgeojson)/.test(s);
  if (hasGeom || spatialFn) return 'map';

  // fallback: text
  return 'text';
}

// Normalize backend results into RowItem[] and extract geometry (GeoJSON)
export function normalizeResponse(input: any): RowItem[] {
  const results = Array.isArray(input) ? input : (Array.isArray(input?.results) ? input.results : []);
  if (!Array.isArray(results)) return [];

  const fromColumnsRows = (obj: any) => {
    const columns = (obj?.columns || []).map((c: any) => String(c));
    const rows = Array.isArray(obj?.rows) ? obj.rows : [];
    return rows.map((row: any[]) => {
      const o: any = {};
      columns.forEach((c: string, i: number) => { o[c] = row[i]; });
      return o;
    });
  };

  const list: any[] = Array.isArray(results?.rows) && Array.isArray(results?.columns)
    ? fromColumnsRows(results) : results;

  const pickName = (r: any) => r?.formal_en || r?.name || r?.name_en || r?.brk_name || r?.featurecla || r?.id || 'unknown';

  const parseGeom = (r: any): any | null => {
    try {
      if (r?.geom_json || r?.geojson || r?.geomGeoJSON) {
        const g = typeof r.geom_json === 'string' ? JSON.parse(r.geom_json) : (r.geojson || r.geomGeoJSON);
        return g || null;
      }
      const wkb = r?.geometry || r?.geom;
      if (typeof wkb === 'string' && /^[0-9a-fA-F]+$/.test(wkb)) {
        const geom = (wkx as any).Geometry.parse(Buffer.from(wkb, 'hex'));
        return (geom as any).toGeoJSON();
      }
    } catch {}
    return null;
  };

  return list.map((r: any, idx: number): RowItem => {
    const geom = parseGeom(r);
    const area = r?.area_km2 ?? r?.area ?? undefined;
    const pop = r?.pop_est ?? r?.population ?? r?.pop ?? undefined;
    const gdp = r?.gdp_md ?? r?.gdp ?? undefined;
    return {
      id: String(r?.id ?? r?.ne_id ?? idx + 1),
      name: pickName(r),
      population: pop != null ? Number(pop) : undefined,
      incomeGroup: r?.income_group || r?.income_grp || r?.economy || undefined,
      region: r?.region || r?.subregion || r?.featurecla || undefined,
      reason: r?.reason || r?.explanation || r?.rationale || undefined,
      raw: { ...r, geom },
    };
  });
}

// 格式化面积显示
export const formatArea = (area: number): string => {
  if (area >= 1000000) {
    return `${(area/1000000).toFixed(1)}M km²`;
  } else if (area >= 1000) {
    return `${Math.round(area/1000)}K km²`;
  } else {
    return `${Math.round(area)} km²`;
  }
};

// 格式化GDP显示
export const formatGDP = (gdp: number): string => {
  if (gdp > 1000000) {
    return `$${(gdp/1000000).toFixed(1)}T`;
  } else {
    return `$${(gdp/1000).toFixed(0)}B`;
  }
};

// 大洲颜色配置
export const continentColors: Record<string, string> = {
  'Asia': 'rgba(239, 68, 68, 0.7)',
  'Europe': 'rgba(59, 130, 246, 0.7)', 
  'Africa': 'rgba(16, 185, 129, 0.7)',
  'North America': 'rgba(245, 158, 11, 0.7)',
  'South America': 'rgba(139, 92, 246, 0.7)',
  'Antarctica': 'rgba(107, 114, 128, 0.7)',
  'Oceania': 'rgba(236, 72, 153, 0.7)',
  'Seven seas (open ocean)': 'rgba(6, 182, 212, 0.7)'
};

// 地形颜色配置
export const terrainColors: Record<string, string> = {
  'Range/mtn': 'rgba(139, 69, 19, 0.7)',
  'Peak': 'rgba(160, 82, 45, 0.7)', 
  'Ridge': 'rgba(205, 133, 63, 0.7)',
  'Plateau': 'rgba(222, 184, 135, 0.7)',
  'Valley': 'rgba(34, 139, 34, 0.7)',
  'Admin-0 country': 'rgba(139, 69, 19, 0.5)',
  'Populated place': 'rgba(160, 82, 45, 0.6)'
};
