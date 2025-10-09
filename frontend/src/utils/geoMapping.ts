/**
 * 地理映射回退系统
 * 
 * 功能：将地名转换为GeoJSON几何图形（用于无几何数据时的地图渲染）
 * 
 * 使用场景：
 * - 后端SQL未返回geometry字段
 * - 数据包含地理名称（continent/country/region）
 * - 需要在地图上可视化聚合数据
 */

/**
 * 简化的大陆/国家GeoJSON查找表
 * 注：这些是简化的边界框，用于在没有精确几何数据时提供可视化
 */
const GEOGRAPHIC_LOOKUP: Record<string, any> = {
  // 大陆（简化多边形）
  'africa': {
    type: 'Polygon',
    coordinates: [[
      [-20, 35], [52, 35], [52, -35], [-20, -35], [-20, 35]
    ]]
  },
  'asia': {
    type: 'Polygon',
    coordinates: [[
      [26, 80], [180, 80], [180, -10], [26, -10], [26, 80]
    ]]
  },
  'europe': {
    type: 'Polygon',
    coordinates: [[
      [-25, 71], [40, 71], [40, 35], [-25, 35], [-25, 71]
    ]]
  },
  'north america': {
    type: 'Polygon',
    coordinates: [[
      [-170, 85], [-50, 85], [-50, 15], [-170, 15], [-170, 85]
    ]]
  },
  'south america': {
    type: 'Polygon',
    coordinates: [[
      [-82, 13], [-35, 13], [-35, -56], [-82, -56], [-82, 13]
    ]]
  },
  'oceania': {
    type: 'Polygon',
    coordinates: [[
      [110, 30], [180, 30], [180, -50], [110, -50], [110, 30]
    ]]
  },
  'antarctica': {
    type: 'Polygon',
    coordinates: [[
      [-180, -60], [180, -60], [180, -90], [-180, -90], [-180, -60]
    ]]
  },
  
  // 主要国家中心点（用于聚合数据）
  'china': { type: 'Point', coordinates: [104.1954, 35.8617] },
  'united states': { type: 'Point', coordinates: [-95.7129, 37.0902] },
  'india': { type: 'Point', coordinates: [78.9629, 20.5937] },
  'brazil': { type: 'Point', coordinates: [-51.9253, -14.2350] },
  'russia': { type: 'Point', coordinates: [105.3188, 61.5240] },
  'japan': { type: 'Point', coordinates: [138.2529, 36.2048] },
  'germany': { type: 'Point', coordinates: [10.4515, 51.1657] },
  'united kingdom': { type: 'Point', coordinates: [-3.4359, 55.3781] },
  'france': { type: 'Point', coordinates: [2.2137, 46.2276] },
  'italy': { type: 'Point', coordinates: [12.5674, 41.8719] },
  'canada': { type: 'Point', coordinates: [-106.3468, 56.1304] },
  'australia': { type: 'Point', coordinates: [133.7751, -25.2744] },
  'mexico': { type: 'Point', coordinates: [-102.5528, 23.6345] },
  'south korea': { type: 'Point', coordinates: [127.7669, 35.9078] },
  'spain': { type: 'Point', coordinates: [-3.7492, 40.4637] },
  'indonesia': { type: 'Point', coordinates: [113.9213, -0.7893] },
  'netherlands': { type: 'Point', coordinates: [5.2913, 52.1326] },
  'saudi arabia': { type: 'Point', coordinates: [45.0792, 23.8859] },
  'turkey': { type: 'Point', coordinates: [35.2433, 38.9637] },
  'switzerland': { type: 'Point', coordinates: [8.2275, 46.8182] },
  'argentina': { type: 'Point', coordinates: [-63.6167, -38.4161] },
  'poland': { type: 'Point', coordinates: [19.1451, 51.9194] },
  'belgium': { type: 'Point', coordinates: [4.4699, 50.5039] },
  'sweden': { type: 'Point', coordinates: [18.6435, 60.1282] },
  'norway': { type: 'Point', coordinates: [8.4689, 60.4720] },
  'austria': { type: 'Point', coordinates: [14.5501, 47.5162] },
  'denmark': { type: 'Point', coordinates: [9.5018, 56.2639] },
  'finland': { type: 'Point', coordinates: [25.7482, 61.9241] },
  'greece': { type: 'Point', coordinates: [21.8243, 39.0742] },
  'portugal': { type: 'Point', coordinates: [-8.2245, 39.3999] },
  'czech republic': { type: 'Point', coordinates: [15.4730, 49.8175] },
  'romania': { type: 'Point', coordinates: [24.9668, 45.9432] },
  'vietnam': { type: 'Point', coordinates: [108.2772, 14.0583] },
  'thailand': { type: 'Point', coordinates: [100.9925, 15.8700] },
  'egypt': { type: 'Point', coordinates: [30.8025, 26.8206] },
  'south africa': { type: 'Point', coordinates: [22.9375, -30.5595] },
  'nigeria': { type: 'Point', coordinates: [8.6753, 9.0820] },
  'kenya': { type: 'Point', coordinates: [37.9062, -0.0236] },
  
  // 额外添加：示例数据中的国家
  'ghana': { type: 'Point', coordinates: [-1.0232, 7.9465] },
  'guinea': { type: 'Point', coordinates: [-9.6966, 9.9456] },
  'uganda': { type: 'Point', coordinates: [32.2903, 1.3733] },
  'nepal': { type: 'Point', coordinates: [84.1240, 28.3949] },
  'nicaragua': { type: 'Point', coordinates: [-85.2072, 12.8654] },
  'fiji': { type: 'Point', coordinates: [178.0650, -17.7134] },
  'åland': { type: 'Point', coordinates: [19.9444, 60.1785] },
  'puerto rico': { type: 'Point', coordinates: [-66.5901, 18.2208] },
};

/**
 * 检测数据中的地理字段
 */
export function detectGeographicFields(data: Record<string, any>): {
  nameFields: string[];
  latField?: string;
  lonField?: string;
  hasCoordinates: boolean;
} {
  // 检测地理名称字段（更宽松的匹配）
  const nameFields = Object.keys(data).filter(k => {
    const lower = k.toLowerCase();
    return lower.includes('continent') || 
           lower.includes('country') || 
           lower.includes('region') || 
           lower.includes('area') ||
           lower.includes('territory') ||
           lower.includes('place') ||
           lower.includes('location') ||
           lower.includes('zone') ||
           lower === 'name' ||
           lower === 'name_en' ||
           lower === 'brk_name' ||
           lower === 'formal_en';
  });
  
  // 检测经纬度字段
  const latField = Object.keys(data).find(k => {
    const lower = k.toLowerCase();
    return lower === 'lat' || lower === 'latitude' || lower === 'y';
  });
  
  const lonField = Object.keys(data).find(k => {
    const lower = k.toLowerCase();
    return lower === 'lon' || lower === 'lng' || lower === 'longitude' || lower === 'x';
  });
  
  return {
    nameFields,
    latField,
    lonField,
    hasCoordinates: !!(latField && lonField && 
                       typeof data[latField] === 'number' && 
                       typeof data[lonField] === 'number')
  };
}

/**
 * 根据地名查找预定义的GeoJSON几何图形
 */
function lookupGeometryByName(name: string): any | null {
  if (!name) return null;
  
  const normalized = name.toLowerCase().trim();
  
  // 直接匹配
  if (GEOGRAPHIC_LOOKUP[normalized]) {
    return GEOGRAPHIC_LOOKUP[normalized];
  }
  
  // 模糊匹配
  for (const [key, geometry] of Object.entries(GEOGRAPHIC_LOOKUP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return geometry;
    }
  }
  
  return null;
}

/**
 * 将普通JSON数据转换为GeoJSON FeatureCollection（回退方案）
 * 
 * @param data - 查询结果数组
 * @returns GeoJSON FeatureCollection 或 null
 */
export function convertToGeoJSONFallback(data: any[]): any | null {
  if (!data || data.length === 0) return null;
  
  console.log('🔍 Starting geographic mapping for', data.length, 'items');
  console.log('📋 First item:', data[0]);
  
  const features: any[] = [];
  
  for (const item of data) {
    const geoFields = detectGeographicFields(item);
    console.log('🗺️ Detected geo fields:', {
      item: item,
      nameFields: geoFields.nameFields,
      latField: geoFields.latField,
      lonField: geoFields.lonField,
      hasCoordinates: geoFields.hasCoordinates
    });
    
    let geometry: any = null;
    
    // 优先使用坐标
    if (geoFields.hasCoordinates && geoFields.latField && geoFields.lonField) {
      geometry = {
        type: 'Point',
        coordinates: [item[geoFields.lonField], item[geoFields.latField]]
      };
      console.log(`🗺️ Created Point geometry from lat/lon for:`, item[geoFields.nameFields[0]] || item.name || 'unknown');
    }
    
    // 尝试从地名查找几何图形
    if (!geometry && geoFields.nameFields.length > 0) {
      for (const field of geoFields.nameFields) {
        const name = item[field];
        if (typeof name === 'string') {
          geometry = lookupGeometryByName(name);
          if (geometry) {
            console.log(`🗺️ Mapped "${name}" (from field "${field}") to geometry via lookup table`);
            break;
          }
        }
      }
    }
    
    // 如果找到了几何图形，创建Feature
    if (geometry) {
      features.push({
        type: 'Feature',
        geometry,
        properties: { ...item }
      });
    }
  }
  
  if (features.length === 0) {
    console.warn('⚠️ No geographic mapping found for any items');
    return null;
  }
  
  console.log(`✅ Created GeoJSON FeatureCollection with ${features.length} features via fallback mapping`);
  
  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * 检查数据是否有地理信息
 */
export function hasAnyGeographicInfo(data: any[]): boolean {
  if (!data || data.length === 0) return false;
  
  const firstItem = data[0];
  const geoFields = detectGeographicFields(firstItem);
  
  return geoFields.hasCoordinates || geoFields.nameFields.length > 0;
}

