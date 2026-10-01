import React from 'react';
import { Shield, Sparkles, RefreshCw, Cpu } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  hasResult: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasResult }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#050811]/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-[1px] shadow-sm shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0a0f1d] rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-white tracking-tight">PayShield</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">AI</span>
            </div>
            <div className="h-3 w-[1px] bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-slate-300 bg-white/[0.04] border border-white/[0.08]">
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span>Jev AI Engine Active</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {hasResult && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all"
            >
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span>Scan New Receipt</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden xs:inline">Engine Online</span>
          </div>
        </div>
      </div>
    </header>
  );
};
