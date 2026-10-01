import React from 'react';
import { ExternalLink, Sparkles, Terminal, Code2, Heart } from 'lucide-react';

export const DeveloperFooter: React.FC = () => {
  // Only the actual technologies used in this project
  const actualTechnologies = [
    { name: 'React 19', tag: 'UI Library' },
    { name: 'TypeScript', tag: 'Type Safety' },
    { name: 'Jev AI Engine', tag: 'Decision Core' },
    { name: 'Gemini 3.8 Flash', tag: 'Vision & OCR' },
    { name: 'Tailwind CSS', tag: 'Styling' },
    { name: 'Node.js & Express', tag: 'Backend' },
    { name: 'Web Audio API', tag: 'Fintech Audio' },
  ];

  return (
    <footer className="w-full border-t border-white/[0.06] bg-[#050811] py-14 mt-20 text-slate-400">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center space-y-7">
        {/* EdgeDrop-style Developer Card */}
        <div className="w-full max-w-lg p-5 rounded-2xl bg-[#0b101d]/80 border border-white/[0.08] hover:border-emerald-500/30 shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-left">
              {/* Avatar Initials Badge */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-[1px] shadow-sm shrink-0">
                <div className="w-full h-full bg-[#0a0f1d] rounded-xl flex items-center justify-center text-emerald-400 font-extrabold text-sm tracking-wider">
                  LY
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Lalit Yadav
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Developer
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full Stack Engineer &bull; Creator of PayShield AI
                </p>
              </div>
            </div>

            {/* Direct Link to lalityadav.vercel.app */}
            <a
              href="https://lalityadav.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/30 text-xs font-semibold font-mono transition-all duration-200 shrink-0"
            >
              <span>Portfolio</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>

        {/* Real Technologies Actually Used */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-500">
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Technologies Actually Powering This App</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
            {actualTechnologies.map((tech) => (
              <span
                key={tech.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white/[0.03] text-slate-300 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                <span>{tech.name}</span>
                <span className="text-[9px] text-slate-500">&bull; {tech.tag}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Minimal Footer Signature */}
        <div className="pt-2 text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
          <span>&copy; {new Date().getFullYear()} PayShield</span>
          <span>&bull;</span>
          <a
            href="https://lalityadav.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors"
          >
            lalityadav.vercel.app
          </a>
          <span>&bull;</span>
          <span>Jev AI Decision Engine</span>
        </div>
      </div>
    </footer>
  );
};
