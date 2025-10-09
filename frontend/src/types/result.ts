/**
 * Result Types 结果页面类型定义
 * 
 * 功能：定义查询结果相关的所有TypeScript类型
 * - RowItem: 单条查询结果项的数据结构
 * - ApiSuccess: 成功API响应的数据结构
 * - ApiError: 错误API响应的数据结构
 * - VisualizationMode: 地图可视化模式枚举
 * - ToastState: 提示组件状态
 * - MetaData: 查询元数据信息
 * 
 * 类型安全：
 * - 确保前后端数据一致性
 * - 提供完整的IDE智能提示
 * - 编译时类型检查
 * 
 * 使用场景：整个Result功能模块的类型基础
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
