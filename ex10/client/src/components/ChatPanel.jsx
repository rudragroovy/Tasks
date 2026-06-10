import React from 'react';
import { MessageSquare, FileQuestion, Clock, DollarSign, Coins, Loader2, Send, AlertTriangle } from 'lucide-react';

function ChatPanel({
  docId,
  messages,
  inputMsg,
  setInputMsg,
  isWaitingResponse,
  chatError,
  handleSubmitMsg,
  renderMessageContent,
  messagesEndRef
}) {
  return (
    <main className="lg:col-span-8 glass-panel rounded-2xl flex flex-col overflow-hidden h-full max-h-full min-h-0 shadow-2xl relative">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-neutral-900/50 flex items-center justify-between backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-white" />
          <h2 className="text-sm font-semibold text-zinc-200">Document Chat</h2>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-neutral-900 border border-white/5 px-2.5 py-1 rounded-full font-medium">
          <span className={`w-2 h-2 rounded-full ${docId ? 'bg-white status-pulse-active shadow-[0_0_6px_rgba(255,255,255,0.6)]' : 'bg-zinc-600'}`}></span>
          <span>{docId ? "Ready" : "Waiting for PDF"}</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 max-w-sm mx-auto my-auto py-12">
            <div className="p-4 bg-white/5 rounded-full border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.03)]">
              <FileQuestion className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-bold text-zinc-200">No document loaded yet</h3>
            <p className="text-sm text-zinc-400 leading-relaxed font-medium">
              Upload a PDF document in the left panel to begin. Once loaded, you can ask questions and explore its contents interactively.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col max-w-[85%] rounded-2xl p-4 gap-2.5 transition-all duration-200 ${
                msg.role === 'user'
                  ? 'self-end ml-auto chat-bubble-user rounded-tr-none'
                  : 'self-start mr-auto chat-bubble-ai text-zinc-100 rounded-tl-none'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {renderMessageContent(msg.content)}
              </div>
              
              {msg.telemetry && (
                <div className={`flex items-center gap-3 text-[10px] border-t pt-2.5 mt-1 font-medium ${msg.role === 'user' ? 'border-black/10 text-neutral-600' : 'border-white/5 text-zinc-400'}`}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 opacity-60" />
                    Speed: {(msg.telemetry.latency_ms / 1000).toFixed(2)}s
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 opacity-60" />
                    Cost: ${msg.telemetry.cost ? msg.telemetry.cost.toFixed(6) : "0.000000"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 opacity-60" />
                    Tokens: {msg.telemetry.prompt_tokens + msg.telemetry.completion_tokens}
                  </span>
                </div>
              )}
            </div>
          ))
        )}

        {isWaitingResponse && (
          <div className="self-start mr-auto chat-bubble-ai rounded-2xl rounded-tl-none p-4 flex items-center gap-3 text-sm text-zinc-400 font-medium">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
            <span>OpenRouter is reading document context...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form */}
      <div className="p-4 border-t border-white/5 bg-neutral-900/40 backdrop-blur-md">
        <form onSubmit={handleSubmitMsg} className="flex gap-3">
          <input
            type="text"
            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
            placeholder={docId ? "Ask a question about the document..." : "Please upload a PDF to start chatting..."}
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={!docId || isWaitingResponse}
          />
          <button 
            type="submit" 
            className="bg-white hover:bg-zinc-200 disabled:bg-neutral-800 disabled:text-zinc-600 text-black font-bold rounded-xl px-5 text-sm flex items-center gap-2 shadow-[0_4px_12px_rgba(255,255,255,0.05)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.1)] disabled:shadow-none transition-all duration-300 cursor-pointer disabled:cursor-not-allowed"
            disabled={!docId || isWaitingResponse || !inputMsg.trim()}
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        {chatError && (
          <div className="flex items-center gap-1.5 mt-2.5 text-zinc-300 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
            <span>Error: {chatError}</span>
          </div>
        )}
      </div>
    </main>
  );
}

export default ChatPanel;
