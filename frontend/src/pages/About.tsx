import React from "react";
import { Github, Linkedin, MapPin, Users, Code2, Globe } from "lucide-react";

/** About page: project overview and team members */
export default function AboutPage() {
  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url("/earth.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-white px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 rounded-full bg-black/40 border border-white/20">
            <Globe className="w-5 h-5 text-blue-300" />
            <span className="text-blue-200 text-sm font-medium">CITS5206 Capstone Project</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">
            About GeoQuery
          </h1>
          <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            Transforming natural language into powerful geographic insights through 
            advanced AI and interactive visualization.
          </p>
        </section>

        {/* Project overview */}
        <section className="mb-16">
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/20 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-bold">Project Overview</h2>
            </div>
            <div className="space-y-4 text-white/80 leading-relaxed">
              <p>
                GeoQuery is an innovative capstone project that bridges the gap between natural language 
                and complex geospatial data analysis. Our platform empowers users to explore, query, and 
                visualize geographic information through intuitive conversational interfaces.
              </p>
              <p>
                By leveraging cutting-edge AI technologies and robust backend systems, we've created a 
                seamless experience that makes geographic insights accessible to everyone, from researchers 
                to casual explorers.
              </p>
              <p>
                The system combines advanced geospatial analytics with a clean, interactive frontend, 
                enabling users to uncover patterns and relationships in spatial data like never before.
              </p>
            </div>
          </div>
        </section>

        {/* Team members */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Users className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold">Our Team</h2>
          </div>

          {/* Backend team */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Code2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-semibold">Backend Team</h3>
            </div>
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
          </div>

          {/* Frontend team */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-green-400" />
              <h3 className="text-xl font-semibold">Frontend Team</h3>
            </div>
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
          </div>
        </section>
      </div>
    </div>
  );
}

/** Enhanced member card */
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
    <div className="group rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-6 shadow-lg hover:bg-black/50 hover:border-white/30 transition-all duration-300 hover:scale-[1.02]">
      <p className="font-semibold text-lg mb-4 text-white group-hover:text-blue-200 transition-colors">
        {name}
      </p>
      <div className="flex gap-3">
        {github && (
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-black/40 hover:bg-black/60 hover:scale-110 transition-all duration-200 group"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5 group-hover:text-purple-300 transition-colors" />
          </a>
        )}
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-black/40 hover:bg-black/60 hover:scale-110 transition-all duration-200 group"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-5 h-5 group-hover:text-blue-300 transition-colors" />
          </a>
        )}
      </div>
    </div>
  );
}