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
      
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">Process a user query and return results</div>
          
          <div className="mb-3">
            <div className="text-xs font-medium text-slate-500 mb-1">Request JSON:</div>
            <pre className="text-xs bg-slate-50 rounded-lg p-3 border border-slate-200">
{`"question": "Highlight countries with extreme population rank (1 or >200)."`}
            </pre>
          </div>

          <div className="mb-3">
            <div className="text-xs font-medium text-slate-500 mb-1">Success Response (200):</div>
            <pre className="text-xs bg-green-50 rounded-lg p-3 border border-green-200">
{`{
  "results": [...],
  "columns": [...],
  "sql": "${meta.sql || 'SELECT ...'}",
  "is_fallback": ${meta.isFallback || false},
  "model_used": "${meta.model || 'gpt-4o-mini'}",
  "reasoning": [
    ${meta.reasoning ? `"${meta.reasoning.split('\n\n').join('",\n    "')}"` : '"..."'}
  ]
}`}
            </pre>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">Error Response (400/500):</div>
            <pre className="text-xs bg-red-50 rounded-lg p-3 border border-red-200">
{`{
  "detail": "Error message"
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
