/**
 * Toast 提示组件
 * 
 * 功能：显示临时通知消息，自动消失
 * - 支持成功、错误等不同类型的提示
 * - 错误消息显示更长时间（6秒）
 * - 带有滑入滑出动画效果
 * - 固定在屏幕右下角显示
 * 
 * 使用场景：复制成功、操作完成、错误提示等
 */

import React from "react";
import { Check, AlertCircle } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  isVisible, 
  onClose,
  type = 'success'
}) => {
  React.useEffect(() => {
    if (isVisible) {
      // 错误消息显示更长时间
      const duration = type === 'error' ? 6000 : 3000;
      const t = setTimeout(onClose, duration);
      return () => clearTimeout(t);
    }
  }, [isVisible, onClose, type]);

  const isError = type === 'error';
  const bgColor = isError ? 'bg-red-600' : 'bg-green-600';
  const Icon = isError ? AlertCircle : Check;

  return (
    <div
      className={`fixed bottom-6 right-6 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg transition-transform duration-300 z-50 flex items-start gap-2 max-w-md ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message}</div>
    </div>
  );
};
