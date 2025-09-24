/**
 * GeoQueryResults 地理查询结果页面主组件
 * 
 * 功能：展示地理查询的完整结果页面
 * - 接收用户查询，调用后端API获取结果
 * - 智能地图可视化：自动选择最佳展示模式
 * - 结果展示：单条结果详细说明，多条结果卡片列表
 * - 交互功能：复制、分享、查看技术详情
 * - 错误处理：友好的错误提示和加载状态
 * 
 * 页面结构：
 * 1. ResultHeader: 查询标题和元信息
 * 2. AdvancedMapCanvas: 智能地图可视化
 * 3. 单条结果：大块reason说明区域
 * 4. 多条结果：CountryCard网格布局
 * 5. QueryDetails: SQL和推理技术详情
 * 6. Toast: 操作反馈提示
 * 
 * 使用场景：用户提交地理查询后的结果展示页面
 */

"use client";

import React, { useEffect, useState } from "react";
import { RowItem, ToastState, MetaData, ApiError } from '@/types/result';
import { Toast } from '@/components/ui/Toast';
import { ExportButton } from '@/components/ui/ExportButton';
import ExportModal from '@/components/ui/ExportModal';
import { LoadingBar } from '@/components/ui/LoadingBar';
import { AdvancedMapCanvas, AdvancedMapCanvasControlsHandle } from '@/components/map/AdvancedMapCanvas';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { CountryCard } from '@/components/result/CountryCard';
import { ResultHeader } from '@/components/result/ResultHeader';
import { QueryDetails } from '@/components/result/QueryDetails';
import { QueryService } from '@/services/queryService';

interface GeoQueryResultsProps {
  query: string;
  testCase?: number;
}

const GeoQueryResults: React.FC<GeoQueryResultsProps> = ({ query, testCase }) => {
  const [items, setItems] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "", isVisible: false });
  const [meta, setMeta] = useState<MetaData>({});

  const showToast = (message: string) => setToast({ message, isVisible: true });
  const hideToast = () => setToast({ message: "", isVisible: false });

  useEffect(() => {
    if (!query) return;

    const executeQuery = async () => {
      try {
        setLoading(true);
        
        // 模拟最小加载时间，确保用户能看到加载动画
        const [queryResult] = await Promise.all([
          QueryService.executeQuery(query, testCase),
          new Promise(resolve => setTimeout(resolve, 800)) // 最少显示800ms
        ]);
        
        const { items: resultItems, meta: resultMeta } = queryResult;
        setItems(resultItems);
        setMeta(resultMeta);
      } catch (error: any) {
        const msg = (error?.response?.data as ApiError)?.detail || error?.message || "查询失败，请重试";
        showToast(msg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    executeQuery();
  }, [query, testCase]);

  const exportTargetRef = React.useRef<HTMLDivElement>(null);
  const [isExportOpen, setExportOpen] = React.useState(false);
  const mapRef = React.useRef<AdvancedMapCanvasControlsHandle>(null);

  return (
    <div ref={exportTargetRef} className="mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-white max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px]">
      {/* 加载进度条 */}
      <LoadingBar 
        isLoading={loading} 
        message="Analyzing your geographic query..."
        color="purple"
      />
      {/* Header */}
      <ResultHeader query={query} meta={meta} />

      {/* 结果为空 */}
      {items.length === 0 && (
        <div className="bg-slate-50 rounded-2xl p-6 mb-12">
          <p className="text-slate-700">No results.</p>
        </div>
      )}

      {/* 高级地图可视化：自动识别数据类型并选择合适的可视化模式 */}
      {items.length >= 1 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 relative mb-12">
          {/* 标题 */}
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 text-center mb-2">Interactive Geo Visualization</h2>
          {/* 徽章 + 工具栏（同一行） */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2" >
            {/* 左：Area Distribution 徽章 */}
            <div className="px-2 py-1 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-700">
              面积分析图
            </div>
            {/* 右：工具栏（不导出） */}
            <div className="flex items-center gap-2 ml-auto" data-export-ignore>
              <button
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="p-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <ZoomIn className="w-4 h-4 text-slate-700" />
              </button>
              <button
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
                className="p-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <ZoomOut className="w-4 h-4 text-slate-700" />
              </button>
              <button
                aria-label="Reset view"
                title="Reset view"
                onClick={() => mapRef.current?.reset()}
                className="p-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <RotateCcw className="w-4 h-4 text-slate-700" />
              </button>
              <ExportButton onOpen={() => setExportOpen(true)} />
            </div>
          </div>
          {/* 地图 */}
          <div className="w-full flex justify-center">
            <AdvancedMapCanvas ref={mapRef} items={items} width={1200} height={560} showInternalToolbar={false} />
          </div>
        </div>
      )}

      {/* 单条 → 大块 reason 区域（reason 始终显示） */}
      {items.length === 1 && (
        <div className="bg-slate-50 rounded-2xl p-6 relative mb-12">
          <div className="absolute top-4 right-4">
            <ExportButton onOpen={() => setExportOpen(true)} />
          </div>
          <p className="text-slate-700 leading-relaxed pr-12">
            {items[0].reason ?? "暂无解释说明"}
          </p>
        </div>
      )}

      {/* Detailed Results：对每个结果渲染独立小地图 */}
      {items.length >= 1 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">Detailed Results</h2>
          {items.length === 1 ? (
            <div className="flex justify-center">
              <div className="max-w-4xl w-full">
                <CountryCard key={items[0].id} item={items[0]} showMiniMap={true} onCopy={showToast} large />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((item) => (
                <CountryCard key={item.id} item={item} showMiniMap={true} onCopy={showToast} />
              ))}
            </div>
          )}
        </>
      )}

      {/* SQL & Reasoning（有就展示） */}
      <QueryDetails meta={meta} />

      <ExportModal isOpen={isExportOpen} onClose={() => setExportOpen(false)} targetRef={exportTargetRef} />
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
};

export default GeoQueryResults;
