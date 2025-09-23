/**
 * Toast 提示组件
 * 
 * 功能：显示临时通知消息，自动消失
 * - 支持成功、错误等不同类型的提示
 * - 自动在3秒后消失
 * - 带有滑入滑出动画效果
 * - 固定在屏幕右下角显示
 * 
 * 使用场景：复制成功、操作完成、错误提示等
 */

import React from "react";
import { Check } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  React.useEffect(() => {
    if (isVisible) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [isVisible, onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg transition-transform duration-300 z-50 flex items-center gap-2 ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <Check className="w-4 h-4" />
      {message}
    </div>
  );
};
