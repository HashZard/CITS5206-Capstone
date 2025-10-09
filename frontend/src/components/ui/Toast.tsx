/**
 * Toast notification component
 * 
 * Features: Display temporary notification messages that auto-dismiss
 * - Support different types of notifications (success, error, etc.)
 * - Error messages display for longer duration (6 seconds)
 * - Slide in/out animation effects
 * - Fixed display in bottom-right corner of screen
 * 
 * Use cases: Copy success, operation completion, error notifications, etc.
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
      // Error messages display for longer duration
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
