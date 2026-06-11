import React, { useState, useRef, useEffect } from 'react';
import { TextQuote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import Header from './components/Header';
import UploadCard from './components/UploadCard';
import SystemStatsCard from './components/SystemStatsCard';
import TelemetryCard from './components/TelemetryCard';
import ChatPanel from './components/ChatPanel';
import CitationModal from './components/CitationModal';
import './App.css';

function App() {
  // Document State
  const [docId, setDocId] = useState(null);
  const [filename, setFilename] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [chatError, setChatError] = useState('');

  // Telemetry State
  const [totalQueries, setTotalQueries] = useState(0);
  const [totalPromptTokens, setTotalPromptTokens] = useState(0);
  const [totalCompletionTokens, setTotalCompletionTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0.0);
  const [totalLatency, setTotalLatency] = useState(0); // in ms
  const [currentModel, setCurrentModel] = useState('');

  // Citation Modal State
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedPageText, setSelectedPageText] = useState('');
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  const [chunkStrategy, setChunkStrategy] = useState('sliding');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingResponse]);

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        uploadFile(file);
      } else {
        setUploadError("Only PDF files are supported.");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Upload file API call
  const uploadFile = async (file) => {
    setIsUploading(true);
    setUploadError('');
    setDocId(null);
    setMessages([]);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("strategy", chunkStrategy);

    try {
      const response = await fetch("http://localhost:5006/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      setDocId(data.docId);
      setFilename(data.filename);
      setTotalPages(data.totalPages);
      
      // Initialize with assistant greeting
      setMessages([
        {
          role: "assistant",
          content: `Successfully uploaded **${data.filename}** (${data.totalPages} pages). I have processed your document. You can now ask any questions, and I will cite source page numbers.`,
          isSystemInit: true
        }
      ]);
    } catch (err) {
      setUploadError(err.message || "An error occurred during file parsing.");
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Q&A API call
  const handleSubmitMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !docId || isWaitingResponse) return;

    const userText = inputMsg;
    setInputMsg('');
    setChatError('');

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsWaitingResponse(true);

    try {
      const response = await fetch("http://localhost:5006/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docId,
          messages: newMessages.filter(m => !m.isSystemInit)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to query the document");
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: "",
        thinking: "",
        source_context: "",
        telemetry: null
      }]);
      setIsWaitingResponse(false); // Stop loading indicator since stream starts

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      let assistantContent = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n").filter(l => l.trim().startsWith("data: "));

          for (const line of lines) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'token') {
                  assistantContent += data.content;
              }

              setMessages(prev => {
                const updated = [...prev];
                // Deep clone the last message so we don't mutate the existing object twice in Strict Mode
                const lastMsg = { ...updated[updated.length - 1] };
                updated[updated.length - 1] = lastMsg;

                if (data.type === 'context') {
                  lastMsg.source_context = data.source_context;
                } else if (data.type === 'token') {
                  // Hide <thinking> blocks (even while streaming/incomplete) and strip <answer> tags
                  let displayContent = assistantContent.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '');
                  displayContent = displayContent.replace(/<\/?answer>/gi, '');
                  lastMsg.content = displayContent.trimStart();
                } else if (data.type === 'done') {
                  lastMsg.telemetry = {
                    latency_ms: data.latency_ms,
                    model: data.model,
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    cost: 0
                  };
                  
                  setTotalQueries(q => q + 1);
                  setTotalLatency(l => l + data.latency_ms);
                  setCurrentModel(data.model);
                }
                return updated;
              });
            } catch (err) {
              console.error("Parse error", err);
            }
          }
        }
      }

    } catch (err) {
      setChatError(err.message || "Something went wrong.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsWaitingResponse(false);
    }
  };

  // Click on citation badge
  const handleCitationClick = async (pageNum) => {
    setSelectedPage(pageNum);
    setIsLoadingPage(true);
    setSelectedPageText('');

    try {
      const response = await fetch(`http://localhost:5006/api/pages/${docId}/${pageNum}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch page text");
      }

      setSelectedPageText(data.text);
    } catch (err) {
      setSelectedPageText(`Failed to retrieve page text: ${err.message}`);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const closeCitationModal = () => {
    setSelectedPage(null);
    setSelectedPageText('');
  };

  // Helper: Format number with commas
  const formatNum = (num) => {
    return num.toLocaleString();
  };

  // Helper: Render message text with styled clickable citation badges and markdown support
  const renderMessageContent = (content) => {
    if (!content) return "";
    
    // Replace [Page X] with a markdown link to trigger custom link renderer
    let processedContent = content.replace(/\[Page (\d+)\]/g, '[Page $1](#page-$1)');
    
    // Normalize LLM math blocks \( \) and \[ \] to markdown math $ and $$
    processedContent = processedContent.replace(/\\\((.*?)\\\)/g, '$$$1$$');
    processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ node, href, children, ...props }) => {
            const pageMatch = href?.match(/^#page-(\d+)$/);
            if (pageMatch) {
              const pageNum = parseInt(pageMatch[1], 10);
              return (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-500 cursor-pointer shadow-sm transition-all duration-200 select-none align-middle no-underline"
                  onClick={(e) => { e.preventDefault(); handleCitationClick(pageNum); }}
                  title={`View page ${pageNum} text`}
                >
                  <TextQuote className="w-3 h-3 text-neutral-400" />
                  {children}
                </span>
              );
            }
            return <a href={href} {...props} className="text-blue-400 hover:underline">{children}</a>;
          },
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed opacity-90">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 opacity-90 space-y-1.5 marker:text-current">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 opacity-90 space-y-1.5 marker:text-current">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-2xl font-extrabold mb-4 mt-6 opacity-100 tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 opacity-100 tracking-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mb-3 mt-4 opacity-100">{children}</h3>,
          strong: ({ children }) => <strong className="font-bold opacity-100">{children}</strong>,
          code: ({ inline, children }) => inline 
            ? <code className="bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 font-mono text-[0.85em] font-medium">{children}</code> 
            : <pre className="bg-black/80 dark:bg-black/50 p-4 rounded-xl overflow-x-auto text-[0.85em] font-mono mb-4 text-zinc-200 border border-white/5 shadow-inner leading-relaxed text-shadow-none"><code>{children}</code></pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-current opacity-70 pl-4 py-1 mb-4 italic">{children}</blockquote>,
          table: ({ children }) => <div className="overflow-x-auto mb-4 rounded-lg border border-black/10 dark:border-white/10"><table className="w-full text-left border-collapse text-sm">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-black/5 dark:bg-black/40">{children}</thead>,
          th: ({ children }) => <th className="p-3 font-semibold opacity-100 border-b border-black/10 dark:border-white/10">{children}</th>,
          td: ({ children }) => <td className="p-3 opacity-90 border-b border-black/5 dark:border-white/5">{children}</td>
        }}
      >
        {processedContent}
      </ReactMarkdown>
    );
  };

  // Calculate Avg Latency
  const getAvgLatency = () => {
    if (totalQueries === 0) return "0.0s";
    return `${(totalLatency / totalQueries / 1000).toFixed(2)}s`;
  };

  return (
    <div className="h-screen flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-6 overflow-hidden selection:bg-neutral-800 selection:text-white">
      {/* Header */}
      <Header currentModel={currentModel} />

      {/* Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch overflow-hidden">
        
        {/* Left Panel: Upload + Telemetry */}
        <aside className={`${docId ? 'lg:col-span-4' : 'lg:col-span-12 max-w-2xl mx-auto w-full justify-center'} flex flex-col gap-6 overflow-y-auto pr-1 pb-4 transition-all duration-500`}>
          <UploadCard
            docId={docId}
            filename={filename}
            totalPages={totalPages}
            isUploading={isUploading}
            uploadError={uploadError}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileSelect={handleFileSelect}
            triggerFileInput={triggerFileInput}
            fileInputRef={fileInputRef}
            chunkStrategy={chunkStrategy}
            setChunkStrategy={setChunkStrategy}
          />

          <SystemStatsCard currentModel={currentModel} />

          {/* Show Telemetry only when there are queries or doc is uploaded */}
          {(docId || totalQueries > 0) && (
            <TelemetryCard
              totalCost={totalCost}
              totalQueries={totalQueries}
              totalPromptTokens={totalPromptTokens}
              totalCompletionTokens={totalCompletionTokens}
              getAvgLatency={getAvgLatency}
              formatNum={formatNum}
            />
          )}
        </aside>

        {/* Right Panel: Chat Q&A - Appears only after document is uploaded */}
        {docId && (
          <ChatPanel
            docId={docId}
            messages={messages}
            inputMsg={inputMsg}
            setInputMsg={setInputMsg}
            isWaitingResponse={isWaitingResponse}
            chatError={chatError}
            handleSubmitMsg={handleSubmitMsg}
            renderMessageContent={renderMessageContent}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      {/* Citation Source Text Modal */}
      {selectedPage !== null && (
        <CitationModal
          selectedPage={selectedPage}
          selectedPageText={selectedPageText}
          isLoadingPage={isLoadingPage}
          filename={filename}
          closeCitationModal={closeCitationModal}
        />
      )}
    </div>
  );
}

export default App;
