/**
 * Result Types - Result page type definitions
 * 
 * Features: Define all TypeScript types related to query results
 * - RowItem: Data structure for single query result item
 * - ApiSuccess: Data structure for successful API response
 * - ApiError: Data structure for error API response
 * - VisualizationMode: Map visualization mode enumeration
 * - ToastState: Toast component state
 * - MetaData: Query metadata information
 * 
 * Type safety:
 * - Ensure frontend-backend data consistency
 * - Provide complete IDE intelligent suggestions
 * - Compile-time type checking
 * 
 * Use cases: Type foundation for entire Result feature module
 */

export interface RowItem {
  id: string;
  name?: string;
  population?: number;
  incomeGroup?: string;
  region?: string;
  reason?: string;
  lat?: number;
  lon?: number;
  raw?: Record<string, any>;
  geometry?: any;
}

export interface ApiSuccess {
  results: any[];
  sql?: string;
  reasoning?: string | string[];
  model_used?: string;
  is_fallback?: boolean;
}

export interface ApiError {
  detail?: string;
}

export type VisualizationMode = 'area' | 'countries' | 'economy' | 'terrain' | 'general' | 'empty';

export interface ToastState {
  message: string;
  isVisible: boolean;
  type?: 'success' | 'error';
}

export interface MetaData {
  sql?: string;
  reasoning?: string;
  model?: string;
  isFallback?: boolean;
}
