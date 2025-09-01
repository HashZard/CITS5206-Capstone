import React, { useMemo, useState } from "react";

/** Import page with basic file upload preview (frontend-only) */
export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");

  const info = useMemo(() => {
    if (!file) return null;
    const kb = (file.size / 1024).toFixed(1);
    return `${file.name} (${kb} KB, ${file.type || "unknown"})`;
  }, [file]);

  const onSelect = async (f: File | null) => {
    setFile(f);
    setText("");
    if (!f) return;
    // read a small chunk for preview (sufficient for demo)
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setText(content.slice(0, 2000)); // preview first 2KB
    };
    reader.readAsText(f);
  };

  return (
    <div className="max-w-4xl mx-auto text-white">
      <h1 className="text-3xl font-semibold mb-4">Import</h1>
      <p className="text-white/80 mb-6">
        Upload a data file (CSV, GeoJSON, or JSON). This demo does not send data to a server.
      </p>

      <div className="bg-white/10 border border-white/20 rounded-xl p-6 space-y-4">
        <input
          type="file"
          accept=".csv,.json,.geojson"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-white file:text-purple-700 hover:file:bg-gray-100"
        />
        {file && (
          <div className="space-y-2">
            <p className="text-white/90">Selected: {info}</p>
            <div className="bg-black/30 rounded-md p-3 max-h-64 overflow-auto text-xs whitespace-pre-wrap">
              {text || "Loading preview..."}
            </div>
            <button
              className="bg-white text-purple-700 font-medium py-2 px-4 rounded-md hover:bg-gray-100"
              onClick={() => alert("Mock submit: file accepted on client side.")}
            >
              Proceed (mock)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

