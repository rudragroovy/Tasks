import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, MicOff, Send, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIVoiceAssistant({ onComplete }) {
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInputText('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (textToSend = inputText) => {
    if (!textToSend.trim()) return;
    if (isListening) recognitionRef.current?.stop();

    const newUserMsg = { id: Date.now(), role: 'user', text: textToSend };
    setHistory(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/ai/symptoms', {
        text: textToSend,
        history: history.map(h => ({ role: h.role, text: h.text }))
      });

      const data = response.data;

      if (data.status === 'complete') {
        const aiMsg = { id: Date.now() + 1, role: 'assistant', text: `Got it! Based on your symptoms, I suggest seeing a ${data.suggested_specialization}.` };
        const finalHistory = [...history, newUserMsg, aiMsg];
        setHistory(prev => [...prev, aiMsg]);
        speakText(aiMsg.text);
        if (onComplete) {
           setTimeout(() => onComplete({ ...data, chatHistory: finalHistory }), 2000);
        }
      } else {
        const aiMsg = { id: Date.now() + 1, role: 'assistant', text: data.next_question };
        setHistory(prev => [...prev, aiMsg]);
        speakText(data.next_question);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = { id: Date.now() + 1, role: 'assistant', text: "I'm having trouble connecting right now. Please try typing your symptoms." };
      setHistory(prev => [...prev, errorMsg]);
      speakText(errorMsg.text);
    } finally {
      setIsLoading(false);
    }
  };

  const startTriage = () => handleSend("Hello, I need to check my symptoms.");

  return (
    <div className="flex flex-col w-full h-[500px] relative">
      {/* Header Area inside the Chat (if no history) */}
      {history.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-6"
        >
           <button 
             onClick={startTriage}
             className="px-6 py-2.5 bg-primary-100 text-primary-800 text-sm font-bold rounded-full hover:bg-primary-200 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
           >
             <Activity className="w-4 h-4" /> Start AI Triage Checkup
           </button>
        </motion.div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 px-2 pr-4 custom-scrollbar">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-heading font-bold text-slate-600 mb-1">I am ready to listen.</p>
            <p>Click "Start AI Triage" or type your symptoms to begin. I will analyze your symptoms and connect you with the right specialist.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {history.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-primary-800 to-primary-900 text-white rounded-tr-sm font-medium' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {/* Typing Indicator */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex gap-1.5 items-center">
               <motion.div className="w-2 h-2 bg-health-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
               <motion.div className="w-2 h-2 bg-health-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
               <motion.div className="w-2 h-2 bg-health-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm relative z-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListen}
          className={`relative p-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
            isListening 
              ? 'bg-red-50 text-red-500' 
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
          title={isListening ? "Stop listening" : "Start speaking"}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-20"></span>
          )}
          {isListening ? <MicOff className="w-5 h-5 relative z-10" /> : <Mic className="w-5 h-5 relative z-10" />}
        </motion.button>
        
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? "Listening..." : "Describe your symptoms..."}
          className="flex-1 bg-transparent border-none px-2 text-[15px] text-slate-800 placeholder:text-slate-400 focus:ring-0 outline-none w-full"
        />
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
          className="p-3.5 bg-primary-900 text-white rounded-xl shadow-md shadow-primary-900/20 disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer shrink-0 flex items-center justify-center"
        >
          <Send className="w-5 h-5 ml-1" />
        </motion.button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
