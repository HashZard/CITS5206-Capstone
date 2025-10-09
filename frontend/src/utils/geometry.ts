/**
 * Geometry - Geometric data processing utility library
 * 
 * Features: Core toolset for processing geographic geometric data
 * - parseWKBGeometry: Parse WKB (Well-Known Binary) geometric data to GeoJSON
 * - calculateCentroid: Calculate centroid coordinates of geometric shapes
 * - getBounds: Calculate bounding box of geometric shapes
 * - drawGeometry: Draw GeoJSON geometries on Canvas
 * - drawGeometryWithProjection: Draw geometries with custom projection
 * 
 * Supported geometry types:
 * - Point: Point
 * - Polygon: Polygon
 * - MultiPolygon: Multiple polygons
 * 
 * Technical implementation:
 * - Use wkx library to parse WKB format
 * - Buffer polyfill ensures browser compatibility
 * - Support complex polygons (with inner ring holes)
 * 
 * Use cases: Map rendering, coordinate calculation, geometric data conversion
 */

import { Buffer } from "buffer";
import * as wkx from "wkx";

// Ensure Buffer is globally available
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

// WKB geometry data parser - supports PostGIS bytea format
export const parseWKBGeometry = (wkbData: string | Buffer) => {
  try {
    let wkbHex = wkbData;
    
    // Handle PostGIS bytea format (\x prefix)
    if (typeof wkbHex === 'string' && wkbHex.startsWith('\\x')) {
      wkbHex = wkbHex.substring(2); // Remove \x
    }
    
    // Handle 0x prefix
    if (typeof wkbHex === 'string' && wkbHex.startsWith('0x')) {
      wkbHex = wkbHex.substring(2);
    }
    
    console.log('📍 Parsing WKB geometry, hex length:', typeof wkbHex === 'string' ? wkbHex.length : wkbHex.byteLength);
    
    const buffer = typeof wkbHex === 'string' ? Buffer.from(wkbHex, 'hex') : wkbHex;
    console.log('✅ Buffer created, length:', buffer.length);
    
    // Use wkx to parse WKB
    const geometry = wkx.Geometry.parse(buffer);
    console.log('✅ Parsed geometry type:', geometry.constructor.name);
    
    // Convert to GeoJSON format
    const geoJSON = (geometry as any).toGeoJSON();
    console.log('✅ GeoJSON type:', (geoJSON as any).type);
    
    return geoJSON;
  } catch (error) {
    console.warn('❌ Failed to parse WKB geometry:', error);
    console.warn('   Input type:', typeof wkbData);
    console.warn('   Input sample:', typeof wkbData === 'string' ? wkbData.substring(0, 100) : 'Buffer');
    return null;
  }
};

// Calculate centroid of geometric shape
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

// Calculate polygon area (for selecting largest polygon)
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

// Check if point is inside polygon (ray casting algorithm)
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

// Calculate visual centroid of polygon (if centroid is outside, find interior point)
const calculatePolygonVisualCenter = (coordinates: number[][]): [number, number] | null => {
  if (!coordinates || coordinates.length < 3) return null;
  
  // First calculate geometric centroid
  let sumX = 0, sumY = 0;
  for (const [x, y] of coordinates) {
    sumX += x;
    sumY += y;
  }
  const centroid: [number, number] = [sumX / coordinates.length, sumY / coordinates.length];
  
  // Check if centroid is inside polygon
  if (isPointInPolygon(centroid, coordinates)) {
    return centroid;
  }
  
  // If centroid is outside, use simplified pole search
  // Find center point of polygon bounding box, then search inward
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
  
  // If bounding box center is also outside, perform grid search
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
  
  // Finally fallback to centroid
  return centroid;
};

// Calculate optimal label anchor for complex geometries
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
    // Find the polygon with largest area as the main polygon
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
  
  // Fallback to original centroid calculation
  return calculateCentroid(geometry);
};

// Calculate geometric bounding box
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
  
  // Add some padding
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
    // Find largest polygon and its average longitude as reference
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

// Draw GeoJSON geometry to Canvas
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
        // Outer ring: fill
        ctx.fillStyle = fillStyle;
        ctx.fill();
      } else {
        // Inner ring: hollow out (compound path)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    
    // Draw border
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

// Geometry drawing function with custom projection
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
        // Use evenodd to correctly handle holes
        ctx.fill('evenodd');
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    
    // Draw border
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
