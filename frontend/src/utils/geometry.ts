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
        ctx.fill();
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
