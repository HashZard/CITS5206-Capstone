/**
 * LoadingBar Usage Examples
 * 
 * Demonstrates various ways to use the LoadingBar component and its configuration options
 */

import React, { useState } from "react";
import { LoadingBar } from "./LoadingBar";

export const LoadingBarExample: React.FC = () => {
  const [isLoading1, setIsLoading1] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [isLoading3, setIsLoading3] = useState(false);

  const simulateAPICall = (setLoading: (loading: boolean) => void) => {
    setLoading(true);
    // Simulate a 2–4 second API call
    setTimeout(() => {
      setLoading(false);
    }, Math.random() * 2000 + 2000);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">LoadingBar Component Examples</h1>

      {/* Basic usage */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Basic Usage</h2>
        <button
          onClick={() => simulateAPICall(setIsLoading1)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          disabled={isLoading1}
        >
          {isLoading1 ? "Loading..." : "Start Basic Loading"}
        </button>
        <LoadingBar isLoading={isLoading1} />
      </div>

      {/* Custom message & color */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Custom Message & Color</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => simulateAPICall(setIsLoading2)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={isLoading2}
          >
            {isLoading2 ? "Processing..." : "Blue Theme Loading"}
          </button>
          <button
            onClick={() => simulateAPICall(setIsLoading3)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={isLoading3}
          >
            {isLoading3 ? "Analyzing..." : "Green Theme Loading"}
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

      {/* API integration example code */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">API Integration Example Code</h2>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// Use LoadingBar in a React component
const [isLoading, setIsLoading] = useState(false);

const handleAPICall = async () => {
  try {
    setIsLoading(true);
    
    // Ensure a minimum display time for good visual feedback
    const [apiResult] = await Promise.all([
      fetch('/api/query', { method: 'POST', body: data }),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
    
    const result = await apiResult.json();
    // Handle result...
    
  } catch (error) {
    console.error('API call failed:', error);
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
    {/* other content */}
  </div>
);`}
        </pre>
      </div>

      {/* Accessibility features */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Accessibility Features</h2>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><code>role="status"</code> - Mark as a status update region</li>
          <li><code>aria-live="polite"</code> - Screen-reader friendly announcements</li>
          <li><code>aria-label</code> - Provide progress percentage description</li>
          <li>Semantic loading text and progress indicator</li>
          <li>Keyboard-navigation friendly design</li>
        </ul>
      </div>
    </div>
  );
};
