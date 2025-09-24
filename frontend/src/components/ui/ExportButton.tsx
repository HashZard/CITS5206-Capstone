/**
 * ExportButton 导出按钮
 * - 替换所有 Copy 按钮
 * - 点击后打开导出弹窗
 */
import React from 'react';
import { FileDown } from 'lucide-react';

export const ExportButton: React.FC<{ onOpen: () => void; className?: string }> = ({ onOpen, className }) => {
  return (
    <button
      onClick={onOpen}
      className={`inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-md hover:bg-purple-600 hover:text-white transition-colors ${className ?? ''}`}
      aria-label="Export as PDF"
      title="Export as PDF"
    >
      <FileDown className="w-4 h-4" />
      <span className="text-sm">Export</span>
    </button>
  );
};

export default ExportButton;
