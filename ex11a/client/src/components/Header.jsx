import React from 'react';
import { FileText, Cpu } from 'lucide-react';

function Header({ currentModel }) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-neutral-900 border border-white/10 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.03)]">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            Smart Doc Q&A
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">Semantic document reading assistant</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-white border border-white/20 bg-white/5 rounded-full uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-white status-pulse-active shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
          Ask My Notes
        </span>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900 border border-white/5 rounded-xl text-xs text-zinc-300 shadow-sm backdrop-blur-sm">
        <Cpu className="w-4 h-4 text-zinc-400" />
        <span>Active Provider: <strong className="text-white font-medium">OpenRouter</strong></span>
      </div>
    </header>
  );
}

export default Header;
