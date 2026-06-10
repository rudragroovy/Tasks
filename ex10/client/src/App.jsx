import React, { useState, useRef, useEffect } from 'react';
import { TextQuote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

    try {
      const response = await fetch("http://localhost:5005/api/upload", {
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
      const response = await fetch("http://localhost:5005/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docId,
          messages: newMessages.filter(m => !m.isSystemInit)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to query the document");
      }

      // Append assistant answer
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer,
        telemetry: data.usage
      }]);

      // Update Telemetry state
      const pTokens = data.usage.prompt_tokens;
      const cTokens = data.usage.completion_tokens;
      const latency = data.usage.latency_ms;
      const model = data.usage.model;
      const queryCost = data.usage.cost || 0;

      setTotalQueries(prev => prev + 1);
      setTotalPromptTokens(prev => prev + pTokens);
      setTotalCompletionTokens(prev => prev + cTokens);
      setTotalCost(prev => prev + queryCost);
      setTotalLatency(prev => prev + latency);
      setCurrentModel(model);

    } catch (err) {
      setChatError(err.message || "Something went wrong.");
      // Remove last user message since it failed
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
      const response = await fetch(`http://localhost:5005/api/pages/${docId}/${pageNum}`);
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
    const processedContent = content.replace(/\[Page (\d+)\]/g, '[Page $1](#page-$1)');

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3">{children}</ol>,
          li: ({ children }) => <li className="mb-1.5">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mb-3 mt-2">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ inline, children }) => inline 
            ? <code className="bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code> 
            : <pre className="bg-black/80 dark:bg-black/40 p-3.5 rounded-xl overflow-x-auto text-[0.85em] font-mono mb-3 text-zinc-200"><code>{children}</code></pre>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-500 pl-4 py-0.5 mb-3 text-zinc-400 italic">{children}</blockquote>
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
