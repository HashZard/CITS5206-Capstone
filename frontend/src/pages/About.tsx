import React from "react";
import { Github, Linkedin } from "lucide-react";

/** About page: project overview and team members */
export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto text-white px-4 sm:px-6 lg:px-8">
      {/* Project overview */}
      <section className="mb-12">
        <h1 className="text-3xl font-semibold mb-4">About the Project</h1>
        <p className="text-white/80 leading-relaxed">
          GeoQuery is a capstone project that transforms natural language into geographic insights.
          The system enables users to query, analyze, and visualize spatial data in an intuitive way.
          Our team collaborated across frontend and backend to build a user-friendly platform that
          connects advanced geospatial analytics with a clean, interactive interface.
        </p>
      </section>

      {/* Team members */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Our Team</h2>

        {/* Backend team */}
        <h3 className="text-xl font-semibold mb-4">Backend Team</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Member name="Xudong Zhao" />
          <Member name="Runzhi Zhao" />
          <Member
            name="Zeke Ding"
            github="https://github.com/Dzx1025"
            linkedin="https://www.linkedin.com/in/zekeding/"
          />
          <Member
            name="Meitong Jin"
            github="https://github.com/MeitongJin"
            linkedin="https://www.linkedin.com/in/meitong-jin-3aba5635a"
          />
        </div>

        {/* Frontend team */}
        <h3 className="text-xl font-semibold mb-4">Frontend Team</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Member
            name="Brielle Wang"
            github="https://github.com/briellewang"
            linkedin="https://www.linkedin.com/in/brielle-wang-2a640b314"
          />
          <Member
            name="Anandhu Raveendran"
            github="https://github.com/anandhur26"
            linkedin="http://www.linkedin.com/in/anandhu-raveendran-b56629222"
          />
          <Member
            name="Yao Qin"
            github="https://github.com/5km5km"
          />
        </div>
      </section>
    </div>
  );
}

/** Reusable member card */
function Member({
  name,
  github,
  linkedin,
}: {
  name: string;
  github?: string;
  linkedin?: string;
}) {
  return (
    <div className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2 shadow">
      <p className="font-medium text-lg mb-3">{name}</p>
      <div className="flex gap-3">
        {github && (
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        )}
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-5 h-5" />
          </a>
        )}
      </div>
    </div>
  );
}
