import React from 'react';
import { FolderOpen, UploadCloud, Loader2, AlertCircle, FileText } from 'lucide-react';

function UploadCard({
  docId,
  filename,
  totalPages,
  isUploading,
  uploadError,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileSelect,
  triggerFileInput,
  fileInputRef,
  chunkStrategy,
  setChunkStrategy
}) {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <FolderOpen className="w-4 h-4 text-white" />
        <h2>Upload Document</h2>
      </div>
      
      <div 
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 group relative overflow-hidden ${
          dragActive 
            ? 'border-white bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <div className="flex flex-col items-center gap-2.5">
          <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors duration-300" />
          <p className="text-sm text-zinc-200 font-medium group-hover:text-white transition-colors duration-300">
            Drag & drop your PDF file here
          </p>
          <p className="text-xs text-zinc-400">
            or click to browse from device
          </p>
        </div>
        
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept="application/pdf"
          onChange={handleFileSelect}
        />
      </div>

      {isUploading && (
        <div className="flex flex-col items-center justify-center gap-2 py-3 bg-white/5 rounded-xl border border-white/5">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Parsing PDF page-by-page...</p>
        </div>
      )}

      {!isUploading && !docId && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chunking Strategy</label>
          <select 
            value={chunkStrategy} 
            onChange={(e) => setChunkStrategy(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-zinc-200 text-sm rounded-lg block w-full p-2.5 focus:ring-zinc-500 focus:border-zinc-500"
          >
            <option value="sliding">Sliding Window (Overlap)</option>
            <option value="fixed">Fixed Size</option>
            <option value="semantic">Semantic (Paragraphs)</option>
            <option value="hierarchical">Hierarchical</option>
          </select>
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-zinc-700 text-zinc-300 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
          <span>{uploadError}</span>
        </div>
      )}

      {docId && !isUploading && (
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2.5 shadow-sm">
          <div className="text-sm font-semibold text-white truncate" title={filename}>
            {filename}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              Pages: <strong className="text-zinc-200">{totalPages}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white status-pulse-active shadow-[0_0_8px_rgba(255,255,255,0.6)]"></span>
              Status: <strong className="text-white font-semibold">Loaded</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadCard;
