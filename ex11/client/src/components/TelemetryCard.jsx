import React from 'react';
import { BarChart3, DollarSign, HelpCircle, Clock, Coins } from 'lucide-react';

function TelemetryCard({
  totalCost,
  totalQueries,
  totalPromptTokens,
  totalCompletionTokens,
  getAvgLatency,
  formatNum
}) {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <BarChart3 className="w-4 h-4 text-white" />
          <h2>Cost & Telemetry</h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-white/10 text-zinc-400 font-semibold">
          Real-time
        </span>
      </div>
      
      <div className="flex flex-col gap-4">
        {/* Cost Panel */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-white/10 flex flex-col gap-1 shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-300">
            <DollarSign className="w-16 h-16 text-white" />
          </div>
          <span className="text-[10px] text-zinc-300 uppercase font-bold tracking-wider">Cumulative Cost</span>
          <span className="text-3xl font-extrabold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight">
            ${totalCost.toFixed(6)}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 font-medium">OpenRouter API rates</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-medium">
              <HelpCircle className="w-3 h-3 text-zinc-400" />
              Queries
            </span>
            <span className="text-lg font-bold text-zinc-200">{totalQueries}</span>
          </div>
          
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-zinc-400" />
              Avg Latency
            </span>
            <span className="text-lg font-bold text-zinc-200">{getAvgLatency()}</span>
          </div>
        </div>

        {/* Token Usage */}
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              <Coins className="w-3.5 h-3.5 text-zinc-400" />
              Total Tokens
            </span>
            <span className="font-semibold text-white">
              {formatNum(totalPromptTokens + totalCompletionTokens)}
            </span>
          </div>
          
          {/* Visual bar split */}
          {totalPromptTokens + totalCompletionTokens > 0 ? (
            <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden flex">
              <div 
                className="h-full bg-white" 
                style={{ width: `${(totalPromptTokens / (totalPromptTokens + totalCompletionTokens)) * 100}%` }}
                title={`Prompt Tokens: ${formatNum(totalPromptTokens)}`}
              ></div>
              <div 
                className="h-full bg-zinc-500" 
                style={{ width: `${(totalCompletionTokens / (totalPromptTokens + totalCompletionTokens)) * 100}%` }}
                title={`Completion Tokens: ${formatNum(totalCompletionTokens)}`}
              ></div>
            </div>
          ) : (
            <div className="w-full h-1.5 rounded-full bg-slate-800"></div>
          )}
          
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
            <span>In: {formatNum(totalPromptTokens)}</span>
            <span>Out: {formatNum(totalCompletionTokens)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TelemetryCard;
