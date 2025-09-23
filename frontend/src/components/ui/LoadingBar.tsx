/**
 * LoadingBar 加载进度条组件
 * 
 * 功能：显示优雅的加载进度动画
 * - 水平进度条，从0%平滑动画到90%
 * - 数据返回后快速完成到100%并淡出
 * - 支持自定义加载文本和颜色主题
 * - 完全无障碍设计，支持屏幕阅读器
 * - 错误状态自动隐藏
 * 
 * 无障碍特性：
 * - role="status" 用于状态更新通知
 * - aria-live="polite" 确保屏幕阅读器友好播报
 * - aria-label 提供进度描述
 * 
 * 使用场景：API调用、数据加载、长时间操作等待
 */

import React, { useEffect, useState } from "react";

interface LoadingBarProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  color?: 'purple' | 'blue' | 'green' | 'orange';
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ 
  isLoading, 
  message = "Calculating results...", 
  className = "",
  color = 'purple'
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // 颜色主题配置
  const colorClasses = {
    purple: {
      bg: 'bg-purple-100',
      bar: 'bg-gradient-to-r from-purple-500 to-purple-600',
      text: 'text-purple-700'
    },
    blue: {
      bg: 'bg-blue-100', 
      bar: 'bg-gradient-to-r from-blue-500 to-blue-600',
      text: 'text-blue-700'
    },
    green: {
      bg: 'bg-green-100',
      bar: 'bg-gradient-to-r from-green-500 to-green-600', 
      text: 'text-green-700'
    },
    orange: {
      bg: 'bg-orange-100',
      bar: 'bg-gradient-to-r from-orange-500 to-orange-600',
      text: 'text-orange-700'
    }
  };

  const colors = colorClasses[color];

  useEffect(() => {
    if (isLoading && !isVisible) {
      // 开始加载：显示并重置进度
      setIsVisible(true);
      setProgress(0);
      setIsCompleting(false);
      
      // 模拟进度增长：平滑动画到90%
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          // 使用非线性增长，开始快后面慢
          const increment = Math.max(0.5, (90 - prev) * 0.1);
          return Math.min(90, prev + increment);
        });
      }, 100);

      return () => clearInterval(progressInterval);
    } else if (!isLoading && isVisible && !isCompleting) {
      // 完成加载：快速到100%然后淡出
      setIsCompleting(true);
      setProgress(100);
      
      // 延迟淡出
      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
        setIsCompleting(false);
        setProgress(0);
      }, 500);

      return () => clearTimeout(fadeOutTimer);
    }
  }, [isLoading, isVisible, isCompleting]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 ${isCompleting ? 'animate-fade-out' : 'animate-fade-in'} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading progress: ${Math.round(progress)}%`}
      data-export-ignore
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
      
      {/* 进度条容器 */}
      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* 加载文本 */}
        <div className="text-center mb-4">
          <h3 className={`text-lg font-medium ${colors.text}`}>
            {message}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Please wait while we process your query...
          </p>
        </div>

        {/* 进度条 */}
        <div className="relative">
          {/* 进度条背景 */}
          <div className={`w-full h-2 ${colors.bg} rounded-full overflow-hidden shadow-inner`}>
            {/* 进度条填充 */}
            <div 
              className={`h-full ${colors.bar} rounded-full transition-all duration-300 ease-out relative overflow-hidden`}
              style={{ width: `${progress}%` }}
            >
              {/* 光泽动画效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          
          {/* 进度百分比 */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400">Processing...</span>
            <span className="text-xs text-slate-600 font-medium">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* 加载点动画 */}
        <div className="flex justify-center items-center mt-4 space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full animate-bounce-dots ${
                color === 'purple' ? 'bg-purple-500' :
                color === 'blue' ? 'bg-blue-500' :
                color === 'green' ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ 
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.4s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// CSS动画样式（需要添加到全局CSS或Tailwind配置）
const styles = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}

.animate-fade-out {
  animation: fade-out 0.3s ease-out forwards;
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
`;

// 导出样式供全局使用
export const loadingBarStyles = styles;
