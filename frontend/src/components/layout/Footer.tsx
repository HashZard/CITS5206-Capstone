export type FooterProps = {
  className?: string;
  brand?: string;
  year?: number;
};

export default function Footer({ className = "", brand = "GeoAnswering", year = new Date().getFullYear() }: FooterProps) {
  return (
    <footer role="contentinfo" className={`border-t border-border bg-background text-foreground/70 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left */}
        <div className="flex items-center gap-2">
          <span>© {year} {brand}</span>
          <span className="hidden md:inline">·</span>
          <span className="text-foreground/60">Built with React, TypeScript & Tailwind CSS</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <a className="hover:underline" href="/tutorials">Tutorials</a>
          <a className="hover:underline" href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">
            Natural Earth
          </a>
          <a className="hover:underline" href="https://github.com/HashZard/CITS5206-Capstone/issues" target="_blank" rel="noopener noreferrer">
            Feedback
          </a>
        </div>
      </div>
    </footer>
  );
}
