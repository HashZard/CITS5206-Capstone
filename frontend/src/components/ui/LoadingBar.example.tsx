/**
 * LoadingBar 使用示例
 * 
 * 展示LoadingBar组件的各种使用方式和配置选项
 */

import React, { useState } from "react";
import { LoadingBar } from "./LoadingBar";

export const LoadingBarExample: React.FC = () => {
  const [isLoading1, setIsLoading1] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [isLoading3, setIsLoading3] = useState(false);

  const simulateAPICall = (setLoading: (loading: boolean) => void) => {
    setLoading(true);
    // 模拟2-4秒的API调用
    setTimeout(() => {
      setLoading(false);
    }, Math.random() * 2000 + 2000);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">LoadingBar 组件示例</h1>

      {/* 基础用法 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">基础用法</h2>
        <button
          onClick={() => simulateAPICall(setIsLoading1)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          disabled={isLoading1}
        >
          {isLoading1 ? "加载中..." : "开始基础加载"}
        </button>
        <LoadingBar isLoading={isLoading1} />
      </div>

      {/* 自定义消息和颜色 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">自定义消息和颜色</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => simulateAPICall(setIsLoading2)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={isLoading2}
          >
            {isLoading2 ? "处理中..." : "蓝色主题加载"}
          </button>
          <button
            onClick={() => simulateAPICall(setIsLoading3)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={isLoading3}
          >
            {isLoading3 ? "分析中..." : "绿色主题加载"}
          </button>
        </div>
        
        <LoadingBar 
          isLoading={isLoading2} 
          message="Processing your data..."
          color="blue"
        />
        
        <LoadingBar 
          isLoading={isLoading3} 
          message="Analyzing geographic patterns..."
          color="green"
        />
      </div>

      {/* API集成示例代码 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">API集成示例代码</h2>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// 在React组件中使用LoadingBar
const [isLoading, setIsLoading] = useState(false);

const handleAPICall = async () => {
  try {
    setIsLoading(true);
    
    // 确保最小显示时间，提供良好的视觉反馈
    const [apiResult] = await Promise.all([
      fetch('/api/query', { method: 'POST', body: data }),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
    
    const result = await apiResult.json();
    // 处理结果...
    
  } catch (error) {
    console.error('API调用失败:', error);
  } finally {
    setIsLoading(false);
  }
};

return (
  <div>
    <LoadingBar 
      isLoading={isLoading}
      message="Analyzing your geographic query..."
      color="purple"
    />
    {/* 其他内容 */}
  </div>
);`}
        </pre>
      </div>

      {/* 无障碍特性说明 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">无障碍特性</h2>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><code>role="status"</code> - 标识为状态更新区域</li>
          <li><code>aria-live="polite"</code> - 屏幕阅读器友好播报</li>
          <li><code>aria-label</code> - 提供进度百分比描述</li>
          <li>语义化的加载文本和进度指示</li>
          <li>键盘导航友好的设计</li>
        </ul>
      </div>
    </div>
  );
};
