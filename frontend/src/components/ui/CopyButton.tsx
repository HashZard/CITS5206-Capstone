import React from "react";
import { Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
  onCopy: (message: string) => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, onCopy }) => {
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopy("Text copied to clipboard!");
    } catch {
      onCopy("Failed to copy text");
    }
  };

  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 p-2 bg-white border border-slate-300 rounded-md hover:bg-purple-600 hover:text-white transition-all opacity-70 hover:opacity-100"
      title="Copy to clipboard"
    >
      <Copy className="w-4 h-4" />
    </button>
  );
};
