import { RowItem, VisualizationMode } from '@/types/result';

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
