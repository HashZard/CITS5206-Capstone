/**
 * LoadingBar - Loading progress bar component
 * 
 * Function: Displays a polished loading progress animation
 * - Horizontal progress bar smoothly animates from 0% to 90%
 * - Quickly completes to 100% and fades out after data returns
 * - Supports custom loading text and color themes
 * - Fully accessible design with screen reader support
 * - Automatically hides on error states
 * 
 * Accessibility:
 * - role="status" for status update announcements
 * - aria-live="polite" to ensure screen-reader friendly announcements
 * - aria-label provides progress description
 * 
 * Use cases: API calls, data loading, long-running operations
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

  // Color theme configuration
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
      // Start loading: show and reset progress
      setIsVisible(true);
      setProgress(0);
      setIsCompleting(false);
      
      // Simulate progress growth: smoothly animate to 90%
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          // Non-linear growth: fast at the start, slower later
          const increment = Math.max(0.5, (90 - prev) * 0.1);
          return Math.min(90, prev + increment);
        });
      }, 100);

      return () => clearInterval(progressInterval);
    } else if (!isLoading && isVisible && !isCompleting) {
      // Finish loading: quickly go to 100% then fade out
      setIsCompleting(true);
      setProgress(100);
      
      // Delay fade-out
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
      className={`fixed top-0 left-0 right-0 z-50 pointer-events-none ${isCompleting ? 'animate-fade-out' : 'animate-fade-in'} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading progress: ${Math.round(progress)}%`}
      data-export-ignore
    >
      {/* Background mask */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
      
      {/* Progress bar container */}
      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Loading text */}
        <div className="text-center mb-4">
          <h3 className={`text-lg font-medium ${colors.text}`}>
            {message}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Please wait while we process your query...
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative">
          {/* Progress bar background */}
          <div className={`w-full h-2 ${colors.bg} rounded-full overflow-hidden shadow-inner`}>
            {/* Progress bar fill */}
            <div 
              className={`h-full ${colors.bar} rounded-full transition-all duration-300 ease-out relative overflow-hidden`}
              style={{ width: `${progress}%` }}
            >
              {/* Sheen animation effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          
          {/* Progress percentage */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400">Processing...</span>
            <span className="text-xs text-slate-600 font-medium">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Loading dots animation */}
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

// CSS animation styles (add to global CSS or Tailwind config)
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

// Export styles for global use
export const loadingBarStyles = styles;
