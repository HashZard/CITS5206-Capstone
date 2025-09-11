import React, { useState, useEffect } from 'react';
import { Copy, Download, Share2, MapPin, BarChart3, Globe, Check, Mail, AlertCircle, Loader2 } from 'lucide-react';

// TypeScript 接口定义
interface QueryResult {
  id: string;
  name?: string;
  [key: string]: any;
}

interface QueryMeta {
  total?: number;
  limit: number;
  offset: number;
  count: number;
  sql_preview?: string;
}

interface ApiResponse {
  ok: boolean;
  data?: QueryResult[];
  meta?: QueryMeta;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ResultsProps {
  query: string;
  onBack?: () => void;
}

// 提示通知组件
const Toast: React.FC<{ message: string; isVisible: boolean; onClose: () => void }> = ({ 
  message, 
  isVisible, 
  onClose 
}) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <div className={`fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg transition-transform duration-300 z-50 flex items-center gap-2 ${
      isVisible ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <Check className="w-4 h-4" />
      {message}
    </div>
  );
};

// 错误显示组件
const ErrorDisplay: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="max-w-4xl mx-auto px-4 py-8">
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-900 mb-2">查询错误</h3>
      <p className="text-red-700 mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      )}
    </div>
  </div>
);

// 加载显示组件
const LoadingDisplay: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-8">
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">处理查询中</h3>
      <p className="text-slate-600">正在分析您的地理查询并获取结果...</p>
    </div>
  </div>
);

// 分享模态框组件
const ShareModal: React.FC<{ isOpen: boolean; onClose: () => void; onEmailShare: () => void }> = ({ 
  isOpen, 
  onClose, 
  onEmailShare 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-slate-900 mb-4">分享结果</h3>
        <p className="text-slate-600 mb-6">选择您想要分享这些结果的方式：</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onEmailShare}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            邮件
          </button>
        </div>
      </div>
    </div>
  );
};

// 导出模态框组件
const ExportModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  isExporting: boolean;
}> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  isExporting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-slate-900 mb-4">导出结果</h3>
        <p className="text-slate-600 mb-6">将您的查询结果导出为 JSON 格式以供进一步分析。</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导出中...
              </>
            ) : (
              '导出'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// 复制按钮组件
const CopyButton: React.FC<{ text: string; onCopy: (message: string) => void }> = ({ 
  text, 
  onCopy 
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopy('文本已复制到剪贴板！');
    } catch (err) {
      onCopy('复制文本失败');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-4 right-4 p-2 bg-white border border-slate-300 rounded-md hover:bg-purple-600 hover:text-white transition-all opacity-70 hover:opacity-100"
      title="复制到剪贴板"
    >
      <Copy className="w-4 h-4" />
    </button>
  );
};

// 结果卡片组件
const ResultCard: React.FC<{ 
  result: QueryResult; 
  onCopy: (message: string) => void;
  index: number;
}> = ({ 
  result, 
  onCopy,
  index
}) => {
  const title = result.name || result.id || `结果 ${index + 1}`;
  
  // 提取指标（非id、非name字段）
  const metrics = Object.entries(result)
    .filter(([key, value]) => key !== 'id' && key !== 'name' && key !== 'geometry')
    .slice(0, 4); // 限制为4个指标以适应布局

  const cardText = `${title}\n${metrics.map(([key, value]) => `${key}: ${value}`).join('\n')}`;

  const handleCardCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardText);
      onCopy('结果详情已复制到剪贴板！');
    } catch (err) {
      onCopy('复制文本失败');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative">
      {/* 地图占位符 */}
      <div className="h-48 bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
            <defs>
              <pattern id={`grid-${result.id || index}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="rgb(147 51 234 / 0.3)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${result.id || index})`} />
            <path 
              d="M50 100 Q200 80 350 100" 
              stroke="rgb(147 51 234 / 0.6)" 
              strokeWidth="3" 
              fill="none"
            />
          </svg>
        </div>
        <MapPin className="w-12 h-12 text-purple-600 z-10" />
      </div>
      
      {/* 内容 */}
      <div className="p-6 relative">
        <button
          onClick={handleCardCopy}
          className="absolute top-4 right-4 p-2 bg-slate-100 border border-slate-200 rounded-md hover:bg-purple-600 hover:text-white transition-all opacity-70 hover:opacity-100"
          title="复制结果详情"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        
        <h3 className="text-xl font-semibold text-slate-900 mb-4 pr-12">{title}</h3>
        
        {/* 指标网格 */}
        {metrics.length > 0 && (
          <div className={`grid ${metrics.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-4`}>
            {metrics.map(([key, value]) => (
              <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium truncate" title={key}>
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-lg font-semibold text-purple-600 truncate" title={String(value)}>
                  {String(value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 主要的结果组件
const GeoQueryResults: React.FC<ResultsProps> = ({ 
  query,
  onBack
}) => {
  const [results, setResults] = useState<QueryResult[]>([]);
  const [meta, setMeta] = useState<QueryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState({ message: '', isVisible: false });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [startTime] = useState(Date.now());

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
  };

  const hideToast = () => {
    setToast({ message: '', isVisible: false });
  };

  // 组件挂载时执行查询
  useEffect(() => {
    executeQuery();
  }, [query]);

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('未提供查询');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim()
        }),
      });

      const data: ApiResponse = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || '查询失败');
      }

      setResults(data.data || []);
      setMeta(data.meta || null);
    } catch (err) {
      console.error('查询错误:', err);
      setError(err instanceof Error ? err.message : '处理您的查询时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/media/export/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: results
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || '导出失败');
      }

      // 创建并下载JSON文件
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geoquery-results-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('结果导出成功！');
    } catch (err) {
      console.error('导出错误:', err);
      showToast('导出结果失败');
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`GeoQuery 结果: ${query}`);
    const body = encodeURIComponent(`这是我的 GeoQuery 搜索结果。\n\n查询: ${query}\n结果: 找到 ${results.length} 项\n\n生成时间: ${new Date().toLocaleString()}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setIsShareModalOpen(false);
  };

  const generationTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // 显示加载状态
  if (loading) {
    return <LoadingDisplay />;
  }

  // 显示错误状态
  if (error) {
    return <ErrorDisplay error={error} onRetry={executeQuery} />;
  }

  const overviewText = results.length > 0 
    ? `为您的地理查询找到了 ${results.length} 个结果。数据涵盖各种位置，为您正在探索的空间模式提供了洞察。`
    : '没有找到符合您查询的结果。请尝试优化您的搜索词或扩大搜索范围。';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-white">
      {/* 查询标题 */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/60 rounded-2xl"></div>
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2 text-slate-800">搜索结果</h1>
              <p className="text-slate-700 text-lg">"{query}"</p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-slate-800 rounded-lg transition-colors"
              >
                ← 返回搜索
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 p-4 bg-slate-50 rounded-xl">
        <div className="text-slate-600 text-sm">
          找到 {results.length} 个结果 • 生成时间 {generationTime}秒
          {meta?.sql_preview && (
            <details className="mt-2">
              <summary className="cursor-pointer text-purple-600 hover:text-purple-700">查看 SQL</summary>
              <code className="block mt-2 p-2 bg-slate-100 rounded text-xs overflow-x-auto">
                {meta.sql_preview}
              </code>
            </details>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            分享
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            导出 JSON
          </button>
        </div>
      </div>

      {results.length > 0 ? (
        <>
          {/* 概览部分 */}
          <div className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 mb-6">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full"></div>
              概览
            </h2>
            
            {/* 概览摘要 */}
            <div className="bg-slate-50 rounded-2xl p-6 relative">
              <CopyButton text={overviewText} onCopy={showToast} />
              <p className="text-slate-700 leading-relaxed pr-12">{overviewText}</p>
            </div>
          </div>

          {/* 详细结果 */}
          <h2 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 mb-6">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full"></div>
            详细结果 ({results.length})
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {results.map((result, index) => (
              <ResultCard 
                key={result.id || index} 
                result={result} 
                onCopy={showToast}
                index={index}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Globe className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">未找到结果</h3>
          <p className="text-slate-600 mb-4">请尝试优化您的搜索词或扩大搜索条件。</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              返回搜索
            </button>
          )}
        </div>
      )}

      {/* 提示通知 */}
      <Toast 
        message={toast.message} 
        isVisible={toast.isVisible} 
        onClose={hideToast} 
      />

      {/* 导出模态框 */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onConfirm={handleExportJSON}
        isExporting={isExporting}
      />

      {/* 分享模态框 */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        onEmailShare={handleEmailShare} 
      />
    </div>
  );
};

export default GeoQueryResults;