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
}

export interface MetaData {
  sql?: string;
  reasoning?: string;
  model?: string;
  isFallback?: boolean;
}
