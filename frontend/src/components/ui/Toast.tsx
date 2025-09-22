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
