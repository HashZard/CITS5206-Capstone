import React, { useState } from 'react';
import { Copy, Download, Share2, MapPin, BarChart3, Globe, Check, Mail } from 'lucide-react';

// TypeScript interfaces
interface RiverData {
  id: string;
  name: string;
  length: string;
  continent: string;
  description: string;
  coordinates?: [number, number];
}

interface ResultsProps {
  query: string;
  results: RiverData[];
  generationTime: number;
}

// Mock data for demonstration
const mockResults: RiverData[] = [
  {
    id: '1',
    name: 'Amazon River',
    length: '6,400 km',
    continent: 'South America',
    description: 'The Amazon River is the longest river in the world, flowing through Brazil, Peru, Colombia, and several other South American countries. It carries more water than any other river and supports the world\'s largest rainforest ecosystem, home to incredible biodiversity.'
  },
  {
    id: '2',
    name: 'Nile River',
    length: '6,350 km',
    continent: 'Africa',
    description: 'The Nile River, traditionally considered the longest river in the world, flows northward through northeastern Africa. It has been the lifeline of Egyptian civilization for thousands of years, providing water and fertile soil for agriculture in an otherwise arid region.'
  },
  {
    id: '3',
    name: 'Yangtze River',
    length: '6,300 km',
    continent: 'Asia',
    description: 'The Yangtze River is the longest river in Asia and the third-longest in the world. Flowing entirely within China, it serves as a crucial waterway for transportation and commerce, supporting over 400 million people along its basin.'
  },
  {
    id: '4',
    name: 'Mississippi River',
    length: '6,275 km',
    continent: 'North America',
    description: 'The Mississippi River system is the second-longest river system in North America. It flows primarily through the United States, serving as a major transportation route and playing a crucial role in American history, culture, and economy.'
  },
  {
    id: '5',
    name: 'Yenisei River',
    length: '5,539 km',
    continent: 'Asia',
    description: 'The Yenisei River is the largest river system flowing to the Arctic Ocean. It flows through Russia from south to north, draining a vast area of Siberia and playing a vital role in the region\'s ecosystem and transportation network.'
  }
];

// Toast notification component
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

// Share modal component
const ShareModal: React.FC<{ isOpen: boolean; onClose: () => void; onEmailShare: () => void }> = ({ 
  isOpen, 
  onClose, 
  onEmailShare 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Share Results</h3>
        <p className="text-slate-600 mb-6">Choose how you'd like to share these results:</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onEmailShare}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>
      </div>
    </div>
  );
};

// Copy button component
const CopyButton: React.FC<{ text: string; onCopy: (message: string) => void }> = ({ 
  text, 
  onCopy 
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopy('Text copied to clipboard!');
    } catch (err) {
      onCopy('Failed to copy text');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-4 right-4 p-2 bg-white border border-slate-300 rounded-md hover:bg-purple-600 hover:text-white transition-all opacity-70 hover:opacity-100"
      title="Copy to clipboard"
    >
      <Copy className="w-4 h-4" />
    </button>
  );
};

// River detail card component
const RiverCard: React.FC<{ river: RiverData; onCopy: (message: string) => void }> = ({ 
  river, 
  onCopy 
}) => {
  const cardText = `${river.name}\nLength: ${river.length}, Continent: ${river.continent}\n\n${river.description}`;

  const handleCardCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardText);
      onCopy('River details copied to clipboard!');
    } catch (err) {
      onCopy('Failed to copy text');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative">
      {/* Map placeholder */}
      <div className="h-48 bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 400 200" 
            fill="none"
          >
            <defs>
              <pattern id={`grid-${river.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="rgb(147 51 234 / 0.3)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${river.id})`} />
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
      
      {/* Content */}
      <div className="p-6 relative">
        <button
          onClick={handleCardCopy}
          className="absolute top-4 right-4 p-2 bg-slate-100 border border-slate-200 rounded-md hover:bg-purple-600 hover:text-white transition-all opacity-70 hover:opacity-100"
          title="Copy river details"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        
        <h3 className="text-xl font-semibold text-slate-900 mb-4 pr-12">{river.name}</h3>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Length</div>
            <div className="text-lg font-semibold text-purple-600">{river.length}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Continent</div>
            <div className="text-lg font-semibold text-purple-600">{river.continent}</div>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-slate-600 leading-relaxed text-sm">{river.description}</p>
      </div>
    </div>
  );
};

// Main Results component
const GeoQueryResults: React.FC<ResultsProps> = ({ 
  query = "Find the largest cities near rivers in Europe", 
  results = mockResults, 
  generationTime = 2.3 
}) => {
  const [toast, setToast] = useState({ message: '', isVisible: false });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
  };

  const hideToast = () => {
    setToast({ message: '', isVisible: false });
  };

  const handleExportPDF = async () => {
    // In a real implementation, you would use a library like jsPDF or react-pdf
    const content = `GeoQuery Results: ${query}\n\n` +
      results.map((river, index) => 
        `${index + 1}. ${river.name}\nLength: ${river.length} | Continent: ${river.continent}\n${river.description}\n\n`
      ).join('');
    
    // Simulate PDF generation
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geoquery-results.txt'; // In real app, this would be .pdf
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Results exported successfully!');
    setIsExportModalOpen(false);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('GeoQuery Results: World\'s Five Largest Rivers');
    const body = encodeURIComponent('Here are the results from my GeoQuery search about the world\'s five largest rivers. View the full interactive results at: [URL would be here]');
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setIsShareModalOpen(false);
  };

  const overviewText = "The world's five largest rivers by length are distributed across multiple continents, showcasing the diverse geography of our planet. These major waterways have played crucial roles in human civilization, supporting agriculture, transportation, and urban development throughout history. From the Amazon's vast basin in South America to the Nile's life-giving flow through Africa, each river represents a vital ecosystem and cultural landmark.";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-white">
      {/* Query Header - 保持原色彩，增加白色透明覆盖 */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
        {/* 白色透明覆盖层 */}
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
          <h1 className="text-3xl font-semibold mb-2 text-slate-800">Search Results</h1>
          <p className="text-slate-700 text-lg">"{query}"</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 p-4 bg-slate-50 rounded-xl">
        <div className="text-slate-600 text-sm">
          Found {results.length} results • Generated in {generationTime}s
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Overview Section */}
      <div className="mb-12">
        <h2 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 mb-6">
          <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full"></div>
          Overview Map
        </h2>
        
        {/* Overview Map */}
        <div className="w-full h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center border-2 border-slate-200 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 800 400">
              <defs>
                <pattern id="world-grid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgb(59 130 246 / 0.3)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#world-grid)" />
              {/* Simulate river paths */}
              <path d="M100 200 Q300 180 500 200 Q600 210 700 200" stroke="rgb(59 130 246 / 0.6)" strokeWidth="4" fill="none" />
              <path d="M150 250 Q350 230 550 250" stroke="rgb(59 130 246 / 0.6)" strokeWidth="3" fill="none" />
              <path d="M200 150 Q400 140 600 150" stroke="rgb(59 130 246 / 0.6)" strokeWidth="3" fill="none" />
            </svg>
          </div>
          <div className="text-center z-10">
            <Globe className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Interactive World Map Showing the Five Largest Rivers</p>
            <p className="text-slate-500 text-sm mt-2">Highlighted: Amazon, Nile, Yangtze, Mississippi, Yenisei</p>
          </div>
        </div>

        {/* Overview Summary */}
        <div className="bg-slate-50 rounded-2xl p-6 relative">
          <CopyButton text={overviewText} onCopy={showToast} />
          <p className="text-slate-700 leading-relaxed pr-12">{overviewText}</p>
        </div>
      </div>

      {/* Detailed Results */}
      <h2 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 mb-6">
        <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full"></div>
        Detailed Results
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {results.map((river) => (
          <RiverCard key={river.id} river={river} onCopy={showToast} />
        ))}
      </div>

      {/* Toast Notification */}
      <Toast 
        message={toast.message} 
        isVisible={toast.isVisible} 
        onClose={hideToast} 
      />

      {/* Export Confirmation Modal */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onConfirm={handleExportPDF} 
      />

      {/* Share Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        onEmailShare={handleEmailShare} 
      />
    </div>
  );
};

// Export Modal component
const ExportModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ 
  isOpen, 
  onClose, 
  onConfirm 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Export Results</h3>
        <p className="text-slate-600 mb-6">Are you sure you want to export these results?</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeoQueryResults;