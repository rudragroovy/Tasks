import React from 'react';
import { Shield, Activity, Cpu } from 'lucide-react';

function SystemStatsCard({ currentModel }) {
  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3.5 shadow-xl">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        <Shield className="w-3.5 h-3.5 text-white" />
        <h2>System Environment</h2>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900 border border-white/5 text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-zinc-300" />
            Connection Status
          </span>
          <span className="text-white font-semibold flex items-center gap-1">
            Online
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900 border border-white/5 text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-300" />
            Model Engine
          </span>
          <span className="text-zinc-300 font-semibold truncate max-w-[150px]" title={currentModel || "openrouter/free"}>
            {currentModel ? currentModel.split('/').pop() : "openrouter/free"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SystemStatsCard;
