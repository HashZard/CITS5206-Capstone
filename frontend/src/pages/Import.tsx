import React from "react";
import { Upload } from "lucide-react";

/** Import page placeholder */
export default function Import() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          <Upload className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-semibold text-white">Import</h1>
        <p className="text-white/80">
          This is the Import page. Future upload functionality will be added here.
        </p>
      </header>

      <section className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm p-6 text-white/90">
        <p>
          Replace this block with your actual import form and logic later. For now, it serves as a placeholder to validate navigation to <code>/upload</code>.
        </p>
      </section>
    </div>
  );
}
