import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useConversation, ConversationProvider } from '@elevenlabs/react';
import { Mic, MicOff, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppIcon from './branding/AppIcon';

async function safeEndSession(conversation) {
  try {
    const maybePromise = conversation?.endSession?.();
    if (maybePromise && typeof maybePromise.then === 'function') {
      await maybePromise;
    }
  } catch (err) {
    console.error('[ElevenLabs] endSession failed:', err);
  }
}

function AIVoiceAssistantInner({ onComplete, onClose }) {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | ended
  const [micMuted, setMicMuted] = useState(false);
  const triageDataRef = useRef(null);
  const [hasTriageResult, setHasTriageResult] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const addMessage = useCallback((role, text) => {
    setHistory((prev) => {
      if (!text?.trim()) return prev;
      if (prev.length > 0 && prev[prev.length - 1].text === text && prev[prev.length - 1].role === role) {
        return prev;
      }
      return [...prev, { id: crypto.randomUUID(), role, text }];
    });
  }, []);

  const clientTools = useMemo(
    () => ({
      fetch_doctors: async (parameters) => {
        const practitionerType = parameters?.practitionerType || parameters?.specialization || '';
        try {
          const res = await fetch(
            `http://localhost:5000/api/appointments/doctors?practitionerType=${encodeURIComponent(practitionerType)}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const doctors = await res.json();

          if (!doctors || doctors.length === 0) {
            return JSON.stringify({ available: false, message: 'No doctors are currently online for this practitioner type.' });
          }

          const list = doctors.map((d) => ({
            id: d.userId,
            name: d.user?.name || 'Unknown',
            practitionerType: d.practitionerType || practitionerType,
            consultationFee: d.consultationFee || 75,
            isOnline: d.isOnline
          }));

          return JSON.stringify({ available: true, doctors: list });
        } catch (err) {
          console.error('[Tool] fetch_doctors error:', err);
          return JSON.stringify({ available: false, error: 'Could not reach the database. Please try again.' });
        }
      },

      save_symptom_session: async (parameters) => {
        const { summary, specialization, practitionerType, doctorId, doctorName } = parameters || {};
        const resolvedPractitionerType = practitionerType || specialization || 'General Practitioner (GP)';

        if (!doctorId || !doctorName) {
          return 'Error: Doctor information is missing. Please ask the patient to select a doctor first.';
        }

        triageDataRef.current = {
          status: 'complete',
          suggested_practitioner_type: resolvedPractitionerType,
          summary: summary || 'Symptoms recorded via AI voice triage.',
          assigned_doctor_id: doctorId,
          assigned_doctor_name: doctorName,
          chatHistory: historyRef.current
        };
        setHasTriageResult(true);

        return 'Success. The patient has been assigned and will be redirected to complete the booking now.';
      }
    }),
    []
  );

  const callbacks = useMemo(
    () => ({
      onConnect: () => {
        setStatus('connected');
      },
      onDisconnect: () => {
        setStatus('ended');
        setMicMuted(false);
        if (triageDataRef.current && onComplete) {
          setTimeout(() => onComplete(triageDataRef.current), 1200);
        }
      },
      onMessage: (message) => {
        const text = message?.message;
        const source = message?.source || message?.role;
        const role = source === 'ai' || source === 'agent' ? 'assistant' : 'user';
        if (text) addMessage(role, text);
      },
      onError: (err) => {
        console.error('[ElevenLabs] Error:', err);
        setStatus('idle');
      }
    }),
    [onComplete, addMessage]
  );

  const conversation = useConversation(
    useMemo(
      () => ({
        ...callbacks,
        clientTools
      }),
      [callbacks, clientTools]
    )
  );

  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    return () => {
      const liveConversation = conversationRef.current;
      if (liveConversation?.status === 'connected') {
        void safeEndSession(liveConversation);
      }
    };
  }, []);

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting' || status === 'connecting';
  const hasEnded = status === 'ended';

  const toggleSession = async () => {
    if (conversation.status === 'connected') {
      await safeEndSession(conversation);
      return;
    }

    setStatus('connecting');
    triageDataRef.current = null;
    setHasTriageResult(false);
    try {
      const res = await fetch('http://localhost:5000/api/ai/signed-url', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Could not get signed URL (HTTP ${res.status})`);
      }
      const { signedUrl } = await res.json();
      await conversation.startSession({ signedUrl });
    } catch (err) {
      console.error('[ElevenLabs] Failed to start session:', err);
      setStatus('idle');
      alert(`Could not connect to the voice agent: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleClose = async () => {
    if (conversation.status === 'connected') {
      await safeEndSession(conversation);
    }
    onClose?.();
  };

  const toggleMic = async () => {
    const newMuted = !micMuted;
    setMicMuted(newMuted);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (devices.some((d) => d.kind === 'audioinput')) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !newMuted;
          track.stop();
        });
      }
    } catch {
      // Keep UI state change even when direct device toggle is unavailable.
    }
  };

  const latestAssistantMessage = [...history].reverse().find((msg) => msg.role === 'assistant');
  const transcriptPreview = history.slice(-6);

  let agentStatusLabel = 'Offline';
  if (isConnecting) agentStatusLabel = 'Connecting';
  if (isConnected) agentStatusLabel = conversation.isSpeaking ? 'Speaking' : 'Listening';
  if (hasEnded && hasTriageResult) agentStatusLabel = 'Session Complete';

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#02091f] text-white">
      <div className="ai-stars-layer ai-stars-layer-1" />
      <div className="ai-stars-layer ai-stars-layer-2" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.45),rgba(2,9,31,0.05)_40%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.22),transparent_45%)]" />

      <div className="relative z-10 flex h-full flex-col items-center">
        <div className="pt-4 sm:pt-5">
          <div className="flex items-center gap-3">
            <AppIcon size={32} className="border border-white/30 shadow-[0_0_16px_rgba(255,255,255,0.22)]" />
            <span className="font-heading text-[1.68rem] font-black tracking-tight text-white sm:text-[1.82rem]">CareBridge</span>
          </div>
        </div>

        <div className="relative flex w-full flex-1 flex-col items-center px-6 text-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            animate={
              isConnected
                ? { boxShadow: ['0 0 0 0 rgba(56,189,248,0.45)', '0 0 0 34px rgba(56,189,248,0)'] }
                : { scale: [1, 1.04, 1] }
            }
            transition={isConnected ? { duration: 1.9, repeat: Infinity } : { duration: 2.6, repeat: Infinity }}
            onClick={toggleSession}
            disabled={isConnecting || (hasEnded && hasTriageResult)}
            className="relative mt-[10vh] flex h-36 w-36 items-center justify-center rounded-full border border-white/40 bg-[radial-gradient(circle_at_30%_25%,#93c5fd,#3b82f6_35%,#312e81_70%,#1e1b4b)] shadow-[0_0_110px_rgba(59,130,246,0.5)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 sm:mt-[10vh] sm:h-44 sm:w-44"
            title={isConnected ? 'End AI triage call' : 'Start AI triage call'}
          >
            {isConnecting ? <Loader2 className="h-12 w-12 animate-spin" /> : <Mic className="h-12 w-12" />}
            <div className="absolute -top-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white text-indigo-700 shadow-xl">
              <Mic className="h-5 w-5" />
            </div>
          </motion.button>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
            {isConnecting ? 'Connecting' : hasEnded && hasTriageResult ? 'Triage Complete' : isConnected ? 'Listening' : 'Tap to Start'}
          </h1>
          <p className="mt-0 text-[1.35rem] font-semibold text-sky-200 sm:text-[1.5rem]">Voice Assistant</p>

          <AnimatePresence mode="wait">
            {latestAssistantMessage?.text && (
              <motion.p
                key={latestAssistantMessage.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 max-w-2xl rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-slate-100 backdrop-blur-sm"
              >
                {latestAssistantMessage.text}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="absolute bottom-[7.75rem] left-1/2 z-10 w-[min(92vw,430px)] -translate-x-1/2 rounded-2xl border border-white/20 bg-white/14 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-white/90 text-sm font-black text-indigo-700">OA</div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">Your AI Agent</p>
                  <p className="text-[1.35rem] font-black leading-none tracking-tight">OLA AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : isConnecting ? 'bg-amber-300' : 'bg-slate-400'
                  }`}
                />
                {agentStatusLabel}
              </div>
            </div>
          </div>

          <div className="absolute bottom-[2.8rem] left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
            {isConnected && (
              <button
                onClick={toggleMic}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition cursor-pointer ${
                  micMuted
                    ? 'border-red-300 bg-red-500/25 text-red-100'
                    : 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                }`}
                title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={isConnected ? toggleSession : handleClose}
              className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border border-red-300 bg-red-500/90 text-white shadow-[0_14px_28px_rgba(239,68,68,0.45)] transition hover:bg-red-500 cursor-pointer"
              title={isConnected ? 'End AI triage call' : 'Close AI triage'}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {hasEnded && hasTriageResult && (
            <div className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2">
              <p className="flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to booking...
              </p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="absolute bottom-5 left-5 z-20">
            <button
              onClick={() => setShowTranscript((prev) => !prev)}
              className="rounded-full border border-white/20 bg-slate-900/45 px-4 py-2 text-xs font-semibold text-slate-100 backdrop-blur-sm transition hover:bg-slate-900/60 cursor-pointer"
            >
              {showTranscript ? 'Hide Transcript' : 'View Transcript'}
            </button>
          </div>
        )}

        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-5 z-20 w-[min(92vw,460px)] max-h-64 overflow-y-auto rounded-2xl border border-white/20 bg-slate-950/70 p-3 backdrop-blur-md"
            >
              {transcriptPreview.map((msg) => (
                <div key={msg.id} className={`mb-2 rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-sky-500/30' : 'bg-white/10'}`}>
                  <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-300">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </p>
                  <p className="text-slate-100">{msg.text}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .ai-stars-layer {
          position: absolute;
          inset: 0;
          background-repeat: repeat;
          pointer-events: none;
        }
        .ai-stars-layer-1 {
          background-image:
            radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.95), transparent),
            radial-gradient(1.5px 1.5px at 130px 80px, rgba(255,255,255,0.85), transparent),
            radial-gradient(2px 2px at 300px 120px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 520px 60px, rgba(255,255,255,0.8), transparent),
            radial-gradient(2px 2px at 700px 150px, rgba(255,255,255,0.9), transparent);
          background-size: 800px 260px;
          opacity: 0.95;
          animation: ai-stars-drift 80s linear infinite;
        }
        .ai-stars-layer-2 {
          background-image:
            radial-gradient(1.5px 1.5px at 70px 40px, rgba(147,197,253,0.8), transparent),
            radial-gradient(1.5px 1.5px at 260px 160px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1.5px 1.5px at 460px 110px, rgba(191,219,254,0.8), transparent),
            radial-gradient(2px 2px at 660px 40px, rgba(255,255,255,0.65), transparent),
            radial-gradient(1.5px 1.5px at 760px 210px, rgba(255,255,255,0.75), transparent);
          background-size: 900px 280px;
          opacity: 0.55;
          animation: ai-stars-drift 110s linear infinite reverse;
        }
        @keyframes ai-stars-drift {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-120px, -80px, 0); }
        }
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
