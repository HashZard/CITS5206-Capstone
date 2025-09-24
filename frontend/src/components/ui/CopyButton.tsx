/**
 * CopyButton 复制按钮组件
 * 
 * 功能：一键复制文本到剪贴板
 * - 点击复制指定文本内容
 * - 复制成功后显示反馈提示
 * - 悬停效果和视觉反馈
 * - 绝对定位，通常放在卡片右上角
 * 
 * 使用场景：复制查询结果、SQL语句、国家信息等
 */

import React from "react";
import { Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
  onCopy: (message: string) => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, onCopy }) => {
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopy("Text copied to clipboard!");
    } catch {
      onCopy("Failed to copy text");
    }
  };

  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 p-2 bg-white border border-slate-300 rounded-md hover:bg-purple-600 hover:text-white transition-all opacity-70 hover:opacity-100"
      title="Copy to clipboard"
    >
      <Copy className="w-4 h-4" />
    </button>
  );
};
