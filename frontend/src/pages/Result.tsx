"use client";

import React, { useEffect, useState } from "react";
import { RowItem, ToastState, MetaData, ApiError } from '@/types/result';
import { Toast } from '@/components/ui/Toast';
import { CopyButton } from '@/components/ui/CopyButton';
import { AdvancedMapCanvas } from '@/components/map/AdvancedMapCanvas';
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
        const { items: resultItems, meta: resultMeta } = await QueryService.executeQuery(query, testCase);
        setItems(resultItems);
        setMeta(resultMeta);
      } catch (error: any) {
        const msg = (error?.response?.data as ApiError)?.detail || error?.message || "加载失败";
        showToast(msg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    executeQuery();
  }, [query, testCase]);

  if (loading) return <p className="p-6">Loading results…</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-white">
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
        <div className="bg-slate-50 rounded-2xl p-6 relative mb-12">
          <CopyButton text={`Visualization: ${items.length} data point(s)`} onCopy={showToast} />
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Interactive Geo Visualization</h2>
          <AdvancedMapCanvas items={items} width={980} height={500} />
        </div>
      )}

      {/* 单条 → 大块 reason 区域（reason 始终显示） */}
      {items.length === 1 && (
        <div className="bg-slate-50 rounded-2xl p-6 relative mb-12">
          <CopyButton text={items[0].reason ?? "暂无解释说明"} onCopy={showToast} />
          <p className="text-slate-700 leading-relaxed pr-12">
            {items[0].reason ?? "暂无解释说明"}
          </p>
        </div>
      )}

      {/* 多条 → Detailed 列表；卡片内小地图：results > 1 且该条有坐标才显示 */}
      {items.length > 1 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">Detailed Results</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((item) => (
              <CountryCard key={item.id} item={item} showMiniMap={true} onCopy={showToast} />
            ))}
          </div>
        </>
      )}

      {/* SQL & Reasoning（有就展示） */}
      <QueryDetails meta={meta} />

      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
};

export default GeoQueryResults;
