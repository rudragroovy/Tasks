import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useConversation, ConversationProvider } from '@elevenlabs/react';
import { Mic, MicOff, PhoneOff, Activity, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AIVoiceAssistantInner({ onComplete }) {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | ended
  const [micMuted, setMicMuted] = useState(false);
  const chatEndRef = useRef(null);
  const triageDataRef = useRef(null);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const addMessage = useCallback((role, text) => {
    setHistory(prev => {
      // Deduplicate consecutive identical messages
      if (prev.length > 0 && prev[prev.length - 1].text === text && prev[prev.length - 1].role === role) return prev;
      return [...prev, { id: crypto.randomUUID(), role, text }];
    });
  }, []);

  // ─── Client Tools ────────────────────────────────────────────────────────────
  const clientTools = useMemo(() => ({

    fetch_doctors: async (parameters) => {
      const spec = parameters?.specialization || '';
      console.log('[Tool] fetch_doctors called with specialization:', spec);
      try {
        const res = await fetch(
          `http://localhost:5000/api/appointments/doctors?specializationName=${encodeURIComponent(spec)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const doctors = await res.json();

        if (!doctors || doctors.length === 0) {
          return JSON.stringify({ available: false, message: 'No doctors are currently online for this specialization.' });
        }

        const list = doctors.map(d => ({
          id: d.userId,
          name: d.user?.name || 'Unknown',
          specialization: d.specialization?.name || spec,
          fee: d.fee || 150,
          isOnline: d.isOnline
        }));

        console.log('[Tool] fetch_doctors returning:', list);
        return JSON.stringify({ available: true, doctors: list });
      } catch (err) {
        console.error('[Tool] fetch_doctors error:', err);
        return JSON.stringify({ available: false, error: 'Could not reach the database. Please try again.' });
      }
    },

    save_symptom_session: async (parameters) => {
      console.log('[Tool] save_symptom_session called with:', parameters);
      const { summary, specialization, doctorId, doctorName } = parameters || {};

      if (!doctorId || !doctorName) {
        return 'Error: Doctor information is missing. Please ask the patient to select a doctor first.';
      }

      // Store triage data — the onComplete callback will fire after disconnect
      triageDataRef.current = {
        status: 'complete',
        suggested_specialization: specialization || 'General Physician',
        summary: summary || 'Symptoms recorded via AI voice triage.',
        assigned_doctor_id: doctorId,
        assigned_doctor_name: doctorName,
        chatHistory: historyRef.current
      };

      console.log('[Tool] Triage data saved:', triageDataRef.current);
      return 'Success. The patient has been assigned and will be redirected to complete the booking now.';
    }

  }), []);

  // ─── Conversation Callbacks ──────────────────────────────────────────────────
  const callbacks = useMemo(() => ({
    onConnect: () => {
      console.log('[ElevenLabs] Connected');
      setStatus('connected');
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected');
      setStatus('ended');
      if (triageDataRef.current && onComplete) {
        // Small delay to let the AI finish speaking
        setTimeout(() => onComplete(triageDataRef.current), 1500);
      }
    },
    onMessage: (message) => {
      console.log('[ElevenLabs] Message:', message);
      const text = message?.message;
      const source = message?.source || message?.role;
      if (!text) return;
      const role = (source === 'ai' || source === 'agent') ? 'assistant' : 'user';
      addMessage(role, text);
    },
    onError: (err) => {
      console.error('[ElevenLabs] Error:', err);
      setStatus('idle');
    }
  }), [onComplete, addMessage]);

  // Memoize the full options object to prevent WebSocket reconnect on every render
  const conversationOptions = useMemo(() => ({
    ...callbacks,
    clientTools
  }), [callbacks, clientTools]);

  const conversation = useConversation(conversationOptions);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession().catch(() => {});
      }
    };
  }, []);

  // ─── Start / End session ────────────────────────────────────────────────────
  const toggleSession = async () => {
    if (conversation.status === 'connected') {
      await conversation.endSession();
      return;
    }

    setStatus('connecting');
    try {
      const res = await fetch('http://localhost:5000/api/ai/signed-url', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Could not get signed URL');
      const { signedUrl } = await res.json();
      await conversation.startSession({ signedUrl });
    } catch (err) {
      console.error('[ElevenLabs] Failed to start session:', err);
      setStatus('idle');
      alert('Could not connect to the voice agent. Please check your connection and try again.');
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (conversation.status === 'connected') {
      try {
        conversation.sendUserMessage(inputText);
        addMessage('user', inputText);
      } catch (err) {
        console.error('Failed to send text:', err);
      }
    } else {
      addMessage('user', inputText);
      setTimeout(() => addMessage('assistant', "Please start the AI triage call first by clicking the microphone button."), 400);
    }
    setInputText('');
  };

  const toggleMic = async () => {
    const newMuted = !micMuted;
    setMicMuted(newMuted);
    // Mute/unmute all active browser audio tracks
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (devices.some(d => d.kind === 'audioinput')) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getAudioTracks().forEach(track => {
          track.enabled = !newMuted;
          // Stop the extra stream we just created — we only needed to reach the shared track
          track.stop();
        });
      }
    } catch {
      // No mic permission or unavailable — state still toggles for UX
    }
  };

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting' || status === 'connecting';
  const hasEnded = status === 'ended';

  // Reset mic mute state when session ends
  useEffect(() => {
    if (!isConnected) setMicMuted(false);
  }, [isConnected]);


  return (
    <div className="flex flex-col w-full h-[500px] relative">

      {/* Start button — shown only when no history */}
      {history.length === 0 && !isConnected && !hasEnded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-6"
        >
          <button
            onClick={toggleSession}
            disabled={isConnecting}
            className="px-6 py-2.5 bg-primary-100 text-primary-800 text-sm font-bold rounded-full hover:bg-primary-200 transition-colors shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Activity className="w-4 h-4" />
            {isConnecting ? 'Connecting...' : 'Start AI Triage Checkup'}
          </button>
        </motion.div>
      )}

      {/* Ended state */}
      {hasEnded && !triageDataRef.current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center mb-4"
        >
          <div className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
            Conversation ended
          </div>
        </motion.div>
      )}

      {/* Redirecting state */}
      {hasEnded && triageDataRef.current && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-4"
        >
          <div className="px-5 py-2.5 bg-health-50 border border-health-200 text-health-700 text-sm font-bold rounded-full flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-health-500 border-t-transparent rounded-full animate-spin" />
            Redirecting to your doctor...
          </div>
        </motion.div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 px-2 pr-4 custom-scrollbar">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-heading font-bold text-slate-600 mb-1">I'm ready to listen.</p>
            <p>Click "Start AI Triage Checkup" above to begin. I'll ask about your symptoms and connect you with the right specialist.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {history.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
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

        {/* Speaking Indicator */}
        {conversation.isSpeaking && (
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

      {/* Input Bar */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm items-center">
        {/* Hang-up / Start button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSession}
          disabled={isConnecting || hasEnded}
          className={`relative p-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40 ${
            isConnected
              ? 'bg-red-50 text-red-500'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
          title={isConnected ? 'End voice call' : 'Start voice call'}
        >
          {isConnected && <span className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-20" />}
          {isConnected ? <PhoneOff className="w-5 h-5 relative z-10" /> : <Mic className="w-5 h-5 relative z-10" />}
        </motion.button>

        {/* Mic mute/unmute — only while connected */}
        {isConnected && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMic}
            className={`relative p-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              micMuted
                ? 'bg-red-50 text-red-500 ring-1 ring-red-200'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
            title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {micMuted
              ? <MicOff className="w-5 h-5" />
              : <Mic className="w-5 h-5" />
            }
            {!micMuted && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
          </motion.button>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isConnected ? (micMuted ? 'Mic muted — type instead…' : 'Speak or type here...') : 'Start the call to chat'}
          className="flex-1 bg-transparent border-none px-2 text-[15px] text-slate-800 placeholder:text-slate-400 focus:ring-0 outline-none w-full"
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="p-3.5 bg-primary-900 text-white rounded-xl shadow-md shadow-primary-900/20 disabled:opacity-40 disabled:shadow-none transition-all cursor-pointer shrink-0 flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
}

export default function AIVoiceAssistant(props) {
  return (
    <ConversationProvider>
      <AIVoiceAssistantInner {...props} />
    </ConversationProvider>
  );
}
