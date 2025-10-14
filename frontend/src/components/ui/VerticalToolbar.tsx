/**
 * VerticalToolbar - Vertical toolbar
 * - Floats on the right, providing Zoom In / Zoom Out / Refresh controls
 * - Accessibility: aria-labels, keyboard reachable, focus styles
 * - Mobile: bottom-right, respects safe area
 */
import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface VerticalToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRefresh: () => void;
  className?: string;
}

export const VerticalToolbar: React.FC<VerticalToolbarProps> = ({ onZoomIn, onZoomOut, onRefresh, className }) => {
  return (
    <div
      className={
        `pointer-events-auto fixed right-4 top-1/2 -translate-y-1/2 md:right-6 z-20 ${className ?? ''}`
      }
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex flex-col space-y-2 bg-white/90 backdrop-blur rounded-lg shadow border border-slate-200 p-2">
        <button
          aria-label="Zoom in"
          title="Zoom in"
          onClick={onZoomIn}
          className="p-2 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <ZoomIn className="w-4 h-4 text-slate-700" />
        </button>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          onClick={onZoomOut}
          className="p-2 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <ZoomOut className="w-4 h-4 text-slate-700" />
        </button>
        <button
          aria-label="Reset view"
          title="Reset view"
          onClick={onRefresh}
          className="p-2 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <RotateCcw className="w-4 h-4 text-slate-700" />
        </button>
      </div>
    </div>
  );
};

export default VerticalToolbar;
