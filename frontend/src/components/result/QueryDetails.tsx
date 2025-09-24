/**
 * QueryDetails 查询详情组件
 * 
 * 功能：显示查询的技术详情信息
 * - 展示生成的SQL查询语句
 * - 显示AI推理过程和逻辑
 * - 代码高亮和格式化显示
 * - 可折叠的详情面板
 * 
 * 使用场景：为开发者和高级用户提供查询的技术细节
 */

import React from "react";
import { MetaData } from '@/types/result';

interface QueryDetailsProps {
  meta: MetaData;
}

export const QueryDetails: React.FC<QueryDetailsProps> = ({ meta }) => {
  if (!meta.sql && !meta.reasoning) return null;

  return (
    <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">Query Details</h3>
      {meta.sql && (
        <div className="mb-4">
          <div className="text-xs font-medium text-slate-500 mb-1">SQL</div>
          <pre className="text-xs bg-slate-50 rounded-xl p-4 overflow-auto border border-slate-100">
            {meta.sql}
          </pre>
        </div>
      )}
      {meta.reasoning && (
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Reasoning</div>
          <pre className="text-xs bg-slate-50 rounded-xl p-4 overflow-auto border border-slate-100 whitespace-pre-wrap">
            {meta.reasoning}
          </pre>
        </div>
      )}
    </div>
  );
};
