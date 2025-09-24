/**
 * Geometry 几何数据处理工具库
 * 
 * 功能：处理地理几何数据的核心工具集
 * - parseWKBGeometry: 解析WKB（Well-Known Binary）几何数据为GeoJSON
 * - calculateCentroid: 计算几何体的质心坐标
 * - getBounds: 计算几何体的边界框
 * - drawGeometry: 在Canvas上绘制GeoJSON几何体
 * - drawGeometryWithProjection: 使用自定义投影绘制几何体
 * 
 * 支持的几何类型：
 * - Point: 点
 * - Polygon: 多边形
 * - MultiPolygon: 多个多边形
 * 
 * 技术实现：
 * - 使用wkx库解析WKB格式
 * - Buffer polyfill确保浏览器兼容性
 * - 支持复杂的多边形（含内环挖空）
 * 
 * 使用场景：地图渲染、坐标计算、几何数据转换
 */

import { Buffer } from "buffer";
import * as wkx from "wkx";

// 确保Buffer在全局可用
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

// WKB几何数据解析器
export const parseWKBGeometry = (wkbHex: string) => {
  try {
    console.log('Parsing WKB hex string, length:', wkbHex.length);
    const buffer = Buffer.from(wkbHex, 'hex');
    console.log('Created buffer, length:', buffer.length);
    
    // 使用wkx解析WKB
    const geometry = wkx.Geometry.parse(buffer);
    console.log('Parsed WKB geometry type:', geometry.constructor.name);
    
    // 转换为GeoJSON格式
    const geoJSON = (geometry as any).toGeoJSON();
    console.log('Converted to GeoJSON:', (geoJSON as any).type);
    
    return geoJSON;
  } catch (error) {
    console.warn('Failed to parse WKB geometry:', error);
    return null;
  }
};

// 计算几何体的质心
export const calculateCentroid = (geometry: any): [number, number] | null => {
  if (!geometry || !geometry.coordinates) return null;
  
  let totalLat = 0, totalLon = 0, count = 0;
  
  const processCoordinates = (coords: any) => {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoordinates);
    } else if (coords.length >= 2) {
      totalLon += coords[0];
      totalLat += coords[1];
      count++;
    }
  };
  
  if (geometry.type === 'Point') {
    return [geometry.coordinates[1], geometry.coordinates[0]]; // [lat, lon]
  } else if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(processCoordinates);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon: any) => {
      polygon.forEach(processCoordinates);
    });
  }
  
  return count > 0 ? [totalLat / count, totalLon / count] : null;
};

// 计算多边形的面积（用于选择最大多边形）
const calculatePolygonArea = (coordinates: number[][]): number => {
  if (!coordinates || coordinates.length < 3) return 0;
  
  let area = 0;
  const n = coordinates.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }
  
  return Math.abs(area) / 2;
};

// 检查点是否在多边形内部（射线投射算法）
const isPointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// 计算多边形的视觉质心（如果质心在外部，寻找内部点）
const calculatePolygonVisualCenter = (coordinates: number[][]): [number, number] | null => {
  if (!coordinates || coordinates.length < 3) return null;
  
  // 首先计算几何质心
  let sumX = 0, sumY = 0;
  for (const [x, y] of coordinates) {
    sumX += x;
    sumY += y;
  }
  const centroid: [number, number] = [sumX / coordinates.length, sumY / coordinates.length];
  
  // 检查质心是否在多边形内部
  if (isPointInPolygon(centroid, coordinates)) {
    return centroid;
  }
  
  // 如果质心在外部，使用简化的极点搜索
  // 找到多边形边界框的中心点，然后向内搜索
  const bounds = {
    minX: Math.min(...coordinates.map(c => c[0])),
    maxX: Math.max(...coordinates.map(c => c[0])),
    minY: Math.min(...coordinates.map(c => c[1])),
    maxY: Math.max(...coordinates.map(c => c[1]))
  };
  
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const center: [number, number] = [centerX, centerY];
  
  if (isPointInPolygon(center, coordinates)) {
    return center;
  }
  
  // 如果边界框中心也在外部，进行网格搜索
  const gridSize = 10;
  const stepX = (bounds.maxX - bounds.minX) / gridSize;
  const stepY = (bounds.maxY - bounds.minY) / gridSize;
  
  for (let i = 1; i < gridSize; i++) {
    for (let j = 1; j < gridSize; j++) {
      const testPoint: [number, number] = [
        bounds.minX + i * stepX,
        bounds.minY + j * stepY
      ];
      if (isPointInPolygon(testPoint, coordinates)) {
        return testPoint;
      }
    }
  }
  
  // 最后回退到质心
  return centroid;
};

// 为复杂几何体计算最佳标签锚点
export const calculateOptimalLabelAnchor = (geometry: any): [number, number] | null => {
  if (!geometry || !geometry.coordinates) return null;
  
  if (geometry.type === 'Point') {
    return [geometry.coordinates[1], geometry.coordinates[0]]; // [lat, lon]
  }
  
  if (geometry.type === 'Polygon') {
    const outerRing = geometry.coordinates[0];
    if (!outerRing || outerRing.length < 3) return null;
    
    const center = calculatePolygonVisualCenter(outerRing);
    return center ? [center[1], center[0]] : null; // [lat, lon]
  }
  
  if (geometry.type === 'MultiPolygon') {
    // 找到面积最大的多边形作为主要多边形
    let largestPolygon = null;
    let largestArea = 0;
    
    for (const polygon of geometry.coordinates) {
      const outerRing = polygon[0];
      if (!outerRing || outerRing.length < 3) continue;
      
      const area = calculatePolygonArea(outerRing);
      if (area > largestArea) {
        largestArea = area;
        largestPolygon = outerRing;
      }
    }
    
    if (largestPolygon) {
      const center = calculatePolygonVisualCenter(largestPolygon);
      return center ? [center[1], center[0]] : null; // [lat, lon]
    }
  }
  
  // 回退到原始质心计算
  return calculateCentroid(geometry);
};

// 计算几何边界框
export const getBounds = (geometry: any): GeoBounds | null => {
  if (!geometry || !geometry.coordinates) return null;
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  const processCoords = (coords: any) => {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoords);
    } else if (coords.length >= 2) {
      const [lon, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
  };
  
  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates;
    return { minLat: lat - 1, maxLat: lat + 1, minLon: lon - 1, maxLon: lon + 1 };
  } else if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(processCoords);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon: any) => {
      polygon.forEach(processCoords);
    });
  }
  
  // 添加一些边距
  const latPadding = (maxLat - minLat) * 0.1;
  const lonPadding = (maxLon - minLon) * 0.1;
  
  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding
  };
};

/**
 * Normalize longitudes to handle antimeridian wrapping.
 * Strategy: try offsets of -360, 0, +360 (per polygon group) and pick the one with minimal bbox width.
 */
export function normalizeLongitudes(geometry: any): any {
  if (!geometry || !geometry.coordinates) return geometry;

  const applyOffset = (coords: number[][], offset: number): number[][] =>
    coords.map(([lon, lat]) => [lon + offset, lat]);

  const ringBBoxWidth = (ring: number[][]): number => {
    if (!ring || ring.length === 0) return 0;
    let minX = Infinity, maxX = -Infinity;
    for (const [lon] of ring) {
      if (lon < minX) minX = lon;
      if (lon > maxX) maxX = lon;
    }
    return Math.max(0, maxX - minX);
  };

  const pickBestOffsetForRing = (ring: number[][]): number => {
    const candidates = [-360, 0, 360];
    let best = 0; let bestW = Infinity;
    for (const off of candidates) {
      const w = ringBBoxWidth(applyOffset(ring, off));
      if (w < bestW) { bestW = w; best = off; }
    }
    return best;
  };

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][];
    const outer = rings[0] || [];
    const off = pickBestOffsetForRing(outer);
    const newRings = rings.map(r => applyOffset(r, off));
    return { ...geometry, coordinates: newRings };
  }

  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as number[][][][];
    // 找最大多边形及其平均经度作为参考
    let largestIdx = 0; let largestArea = -Infinity;
    polys.map((poly, idx) => {
      const outer = poly[0] || [];
      const a = calculatePolygonArea(outer as any);
      if (a > largestArea) { largestArea = a; largestIdx = idx; }
      return a;
    });
    const meanLon = (ring: number[][]) => ring.reduce((s,[lon])=>s+lon,0)/Math.max(1,ring.length);
    const refLon = meanLon(polys[largestIdx][0] || []);

    const pickByRef = (ring: number[][]): number => {
      const candidates = [-360, 0, 360];
      let best = 0; let bestDist = Infinity;
      for (const off of candidates) {
        const m = meanLon(applyOffset(ring, off));
        const d = Math.abs(m - refLon);
        if (d < bestDist) { bestDist = d; best = off; }
      }
      return best;
    };

    const newPolys = polys.map((poly) => {
      const off = pickByRef(poly[0] || []);
      return poly.map(r => applyOffset(r, off));
    });
    return { ...geometry, coordinates: newPolys };
  }

  return geometry;
}

/**
 * Equirectangular projection from lon/lat to canvas space (width/height in CSS pixels).
 */
export function projectLonLat(lon: number, lat: number, width: number, height: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

export interface FitTransform { scale: number; tx: number; ty: number; normalizedGeometry: any }

/**
 * Compute uniform fit transform (scale, tx, ty) so geometry fits within canvas with padding.
 */
export function getFitTransform(geometry: any, opts: { width: number; height: number; padding: number }): FitTransform {
  const { width, height, padding } = opts;
  const normalizedGeometry = normalizeLongitudes(geometry);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const consider = (lon: number, lat: number) => {
    const { x, y } = projectLonLat(lon, lat, width, height);
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  };

  const walkCoords = (coords: any) => {
    if (Array.isArray(coords[0][0])) {
      // deeper
      coords.forEach(walkCoords);
    } else {
      // ring/point list
      for (const [lon, lat] of coords) consider(lon, lat);
    }
  };

  if (!normalizedGeometry || !normalizedGeometry.coordinates) {
    return { scale: 1, tx: 0, ty: 0, normalizedGeometry };
  }

  if (normalizedGeometry.type === 'Point') {
    const [lon, lat] = normalizedGeometry.coordinates;
    consider(lon, lat);
  } else if (normalizedGeometry.type === 'Polygon') {
    walkCoords(normalizedGeometry.coordinates);
  } else if (normalizedGeometry.type === 'MultiPolygon') {
    normalizedGeometry.coordinates.forEach((poly: any) => walkCoords(poly));
  }

  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);
  const scale = Math.max(0.0001, Math.min((width - 2 * padding) / bboxW, (height - 2 * padding) / bboxH));
  const cx = minX + bboxW / 2;
  const cy = minY + bboxH / 2;
  const tx = width / 2 - scale * cx;
  const ty = height / 2 - scale * cy;

  return { scale, tx, ty, normalizedGeometry };
}

// 绘制GeoJSON几何体到Canvas
export const drawGeometry = (
  ctx: CanvasRenderingContext2D, 
  geometry: any, 
  w: number, 
  h: number, 
  fillStyle: string, 
  strokeStyle: string = '#475569'
) => {
  if (!geometry || !geometry.coordinates) return;
  
  const projectCoord = (coord: [number, number]): [number, number] => {
    const [lon, lat] = coord;
    const x = ((lon + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    return [x, y];
  };
  
  const drawPolygon = (coordinates: number[][][]) => {
    coordinates.forEach((ring, ringIndex) => {
      if (ring.length < 3) return;
      
      ctx.beginPath();
      const [startX, startY] = projectCoord(ring[0] as [number, number]);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = projectCoord(ring[i] as [number, number]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      if (ringIndex === 0) {
        // 外环：填充
        ctx.fillStyle = fillStyle;
        ctx.fill();
      } else {
        // 内环：挖空（复合路径）
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    
    // 绘制边框
    coordinates.forEach(ring => {
      if (ring.length < 3) return;
      ctx.beginPath();
      const [startX, startY] = projectCoord(ring[0] as [number, number]);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = projectCoord(ring[i] as [number, number]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };
  
  switch (geometry.type) {
    case 'Polygon':
      drawPolygon(geometry.coordinates);
      break;
      
    case 'MultiPolygon':
      geometry.coordinates.forEach((polygon: number[][][]) => {
        drawPolygon(polygon);
      });
      break;
      
    case 'Point':
      const [x, y] = projectCoord(geometry.coordinates);
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
      
    default:
      console.warn('Unsupported geometry type:', geometry.type);
  }
};

// 使用自定义投影的几何绘制函数
export const drawGeometryWithProjection = (
  ctx: CanvasRenderingContext2D, 
  geometry: any, 
  fillStyle: string, 
  strokeStyle: string,
  projectCoord: (coord: [number, number]) => [number, number]
) => {
  if (!geometry || !geometry.coordinates) return;
  
  const drawPolygon = (coordinates: number[][][]) => {
    coordinates.forEach((ring, ringIndex) => {
      if (ring.length < 3) return;
      
      ctx.beginPath();
      const [startX, startY] = projectCoord(ring[0] as [number, number]);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = projectCoord(ring[i] as [number, number]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      if (ringIndex === 0) {
        ctx.fillStyle = fillStyle;
        // 使用 evenodd 以正确处理洞
        ctx.fill('evenodd');
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    
    // 绘制边框
    coordinates.forEach(ring => {
      if (ring.length < 3) return;
      ctx.beginPath();
      const [startX, startY] = projectCoord(ring[0] as [number, number]);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = projectCoord(ring[i] as [number, number]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  };
  
  switch (geometry.type) {
    case 'Polygon':
      drawPolygon(geometry.coordinates);
      break;
      
    case 'MultiPolygon':
      geometry.coordinates.forEach((polygon: number[][][]) => {
        drawPolygon(polygon);
      });
      break;
      
    case 'Point':
      const [x, y] = projectCoord(geometry.coordinates);
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }
};
