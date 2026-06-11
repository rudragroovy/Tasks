import React from 'react';
import { TextQuote, X, Loader2 } from 'lucide-react';

function CitationModal({
  selectedPage,
  selectedPageText,
  isLoadingPage,
  filename,
  closeCitationModal
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={closeCitationModal}>
      <div className="glass-panel w-full max-w-2xl max-h-[80vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-neutral-900/40 flex items-center justify-between">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <TextQuote className="w-4 h-4" />
            Source Text: Page {selectedPage}
          </h3>
          <button 
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer"
            onClick={closeCitationModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
          {isLoadingPage ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <p className="text-zinc-400 font-medium">Retrieving source text excerpt...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                Document: {filename}
              </p>
              <div className="bg-black/40 border border-white/5 p-4 rounded-xl text-zinc-200 whitespace-pre-wrap font-sans">
                {selectedPageText}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-neutral-900/30 flex justify-end">
          <button 
            className="px-4 py-2 text-xs font-semibold text-zinc-300 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-205 cursor-pointer"
            onClick={closeCitationModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CitationModal;
