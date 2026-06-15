import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Send, FileText, Pill, Plus, Activity, Settings, MessageSquare, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '1480fbbff91244f7a77f0a8ed1359c19'; 
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function MeetingRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [appointment, setAppointment] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef(null);

  // Doctor Panel State
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'notes'
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState([]);
  const [medInput, setMedInput] = useState({ name: '', dosage: '', frequency: '', duration: '' });

  useEffect(() => {
    const fetchAppt = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/appointments`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const appt = res.data.find(a => a.id === appointmentId);
        if (appt) setAppointment(appt);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAppt();
  }, [appointmentId]);

  useEffect(() => {
    if (!socket || !appointmentId) return;
    socket.emit('join_appointment', appointmentId);
    const handleNewMessage = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chat:message', handleNewMessage);
    return () => socket.off('chat:message', handleNewMessage);
  }, [socket, appointmentId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    const msg = { appointmentId, senderId: user.id, senderRole: user.role, text: newMessage, senderName: user.name };
    socket.emit('chat:send', msg);
    setNewMessage('');
  };

  useEffect(() => {
    client.on("user-joined", (user) => {
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
    });

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      
      // Update state to trigger re-render with new tracks
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    client.on("user-unpublished", (user, mediaType) => {
      // Update state to trigger re-render indicating track was removed (user.hasVideo will be false)
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
    });

    client.on("user-left", (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    // Enable high-frequency volume indicator
    client.enableAudioVolumeIndicator();
    client.on("volume-indicator", (volumes) => {
      volumes.forEach((vol) => {
        const ring = document.getElementById(`volume-ring-${vol.uid}`);
        if (ring) {
          const scale = 1 + (vol.level / 100) * 1.5;
          ring.style.transform = `scale(${scale})`;
          ring.style.opacity = Math.max(0.1, (vol.level / 100) * 0.8);
        }
      });
    });

    // Initialize local devices before joining
    const initDevices = async () => {
      try {
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalTracks(tracks);
      } catch (err) {
        console.error("Device initialization failed:", err);
        // Fallback: Try audio only if camera fails
        try {
           const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
           setLocalTracks([audioTrack, null]);
           alert("Camera not found or denied. Proceeding with audio only.");
        } catch (audioErr) {
           alert("Could not access camera or microphone. Please allow permissions in your browser.");
        }
      }
    };
    initDevices();

    return () => {
      client.removeAllListeners();
      client.leave();
    };
  }, []);

  // Play local video track when it becomes available
  useEffect(() => {
    if (localTracks.length > 0 && localTracks[1] && localVideoRef.current) {
      localTracks[1].play(localVideoRef.current);
    }
  }, [localTracks]);

  // Ensure tracks are stopped and closed when component unmounts
  useEffect(() => {
    return () => {
      localTracks.forEach(track => {
        if (track) {
          track.stop();
          track.close();
        }
      });
    };
  }, [localTracks]);

  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack && remoteVideoRefs.current[user.uid]) {
        user.videoTrack.play(remoteVideoRefs.current[user.uid]);
      }
    });
  }, [remoteUsers]);

  const joinCall = async () => {
    if (localTracks.length === 0) {
      alert("Please ensure your microphone or camera is connected and working.");
      return;
    }
    
    try {
      const res = await axios.get(`http://localhost:5000/api/agora/token?channelName=${appointmentId}`);
      const token = res.data.token;

      await client.join(APP_ID, appointmentId, token, null);
      // Only publish non-null tracks
      await client.publish(localTracks.filter(t => t !== null));
      setInCall(true);
    } catch (error) {
      console.error("Error joining call:", error);
      alert("Failed to join call. Make sure Agora App ID and Certificate are set in backend .env");
    }
  };

  const leaveCall = async () => {
    localTracks.forEach(track => {
      if (track) {
        track.stop();
        track.close();
      }
    });
    setLocalTracks([]);
    await client.leave();
    setInCall(false);
    navigate('/dashboard');
  };

  const toggleMic = async () => {
    if (localTracks[0]) {
      await localTracks[0].setMuted(!micMuted);
      setMicMuted(!micMuted);
    }
  };

  const toggleVideo = async () => {
    if (localTracks[1]) {
      await localTracks[1].setMuted(!videoMuted);
      setVideoMuted(!videoMuted);
    }
  };

  const addMedicine = () => {
    if (!medInput.name) return;
    setPrescription([...prescription, medInput]);
    setMedInput({ name: '', dosage: '', frequency: '', duration: '' });
  };

  const completeConsultation = async () => {
    try {
      await axios.put(`http://localhost:5000/api/appointments/${appointmentId}/status`, { 
        status: 'COMPLETED',
        notes,
        prescription
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Consultation Completed! Prescription saved.');
      leaveCall();
    } catch (err) {
      console.error(err);
      alert('Failed to complete consultation');
    }
  };

  const isDoctor = user?.role === 'DOCTOR';

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col relative overflow-hidden">
      {/* Background Orbs to match other dashboards */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-200 blur-[150px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-health-200 blur-[150px] pointer-events-none opacity-40"></div>

      {/* Header */}
      <header className="relative z-20 px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center relative overflow-hidden shadow-sm">
             <div className="absolute w-4 h-4 bg-white top-0 left-0 rounded-br-xl" />
             <div className="absolute w-4 h-4 bg-health-500 bottom-0 right-0 rounded-tl-xl" />
             <Video className="w-5 h-5 text-white relative z-10" />
          </div>
          <div className="flex flex-col">
             <h1 className="text-slate-900 font-heading font-black text-xl leading-tight flex items-center gap-2">
                Telehealth Session <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
             </h1>
             <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">ID: {appointmentId?.slice(0,8)}</p>
          </div>
        </div>

        {appointment && (
          <div className="hidden md:flex items-center gap-3 bg-white border border-slate-200 rounded-full px-5 py-2 shadow-sm">
             <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${isDoctor ? appointment.patient.name : appointment.doctor.name}`} alt="Avatar" />
             </div>
             <span className="text-sm font-bold text-slate-700">
               {isDoctor ? `Patient: ${appointment.patient.name}` : `Dr. ${appointment.doctor.name}`}
             </span>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 lg:p-6 gap-6 relative z-10 lg:overflow-hidden min-h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] max-w-7xl mx-auto w-full">
        
        {/* Left Column: Video */}
        <div className="flex-1 flex flex-col relative gap-4 w-full h-full min-h-[500px] lg:min-h-0">
          
          {/* Main Remote Video Container */}
          <div className="flex-1 w-full h-full min-h-[350px] bg-slate-900 rounded-3xl overflow-hidden relative shadow-xl border border-slate-200 flex flex-col">
            {remoteUsers.length === 0 ? (
              <div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center p-8 z-20 bg-white">
                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                    <Video className="w-10 h-10 text-slate-300" />
                 </div>
                 <p className="text-slate-800 font-heading font-black text-2xl mb-2">Waiting for {isDoctor ? 'patient' : 'doctor'}</p>
                 <p className="text-slate-500 text-sm font-medium max-w-md">They have been notified and should join the room shortly. Please ensure your camera and microphone are ready.</p>
              </div>
            ) : (
              remoteUsers.map(u => (
                <div key={u.uid} className="flex-1 w-full h-full relative bg-slate-900 flex items-center justify-center">
                  {u.hasVideo ? (
                    <div className="absolute inset-0 w-full h-full object-cover" ref={el => remoteVideoRefs.current[u.uid] = el}></div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                       <div className="w-40 h-40 rounded-full bg-slate-800 flex items-center justify-center text-5xl font-heading font-black text-slate-200 border-4 border-slate-700 shadow-2xl relative">
                          {u.hasAudio && (
                            <div 
                              id={`volume-ring-${u.uid}`}
                              className="absolute inset-0 rounded-full bg-primary-500 transition-transform duration-75"
                              style={{ opacity: 0.1, zIndex: -1 }}
                            ></div>
                          )}
                          <span className="relative z-10">
                            {isDoctor ? appointment?.patient?.name?.substring(0,2)?.toUpperCase() || 'PA' : appointment?.doctor?.name?.substring(0,2)?.toUpperCase() || 'DR'}
                          </span>
                       </div>
                    </div>
                  )}
                  
                  {/* Remote User Status Badge */}
                  <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 flex items-center gap-4 shadow-xl z-10">
                     <span className="text-white font-bold text-sm tracking-wide">
                        {isDoctor ? appointment?.patient?.name : `Dr. ${appointment?.doctor?.name}`}
                     </span>
                     <div className="w-px h-4 bg-white/20"></div>
                     <div className="flex items-center gap-2.5">
                        {u.hasAudio ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-red-400" />}
                        {u.hasVideo ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                     </div>
                  </div>
                </div>
              ))
            )}

            {/* Local Video Picture-in-Picture */}
            <div className="absolute top-6 right-6 w-32 h-24 sm:w-48 sm:h-32 md:w-64 md:h-40 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-4 border-white z-20">
              <div className="w-full h-full object-cover" ref={localVideoRef}></div>
              {!inCall && localTracks.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs sm:text-sm font-bold bg-slate-900 text-center px-2">Allow Camera Access</div>}
              
              {micMuted && (
                 <div className="absolute bottom-2 left-2 bg-red-500 p-1.5 rounded-lg text-white shadow-md">
                    <MicOff className="w-4 h-4" />
                 </div>
              )}
            </div>
          </div>
          
          {/* Controls Bar - Light Theme */}
          <div className="h-auto md:h-24 bg-white rounded-3xl border border-slate-200 flex items-center justify-center px-4 py-4 md:px-8 shadow-sm z-30 shrink-0">
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
              
              {!inCall && (
                <div className="text-sm font-bold text-slate-500 hidden md:flex items-center gap-2">
                   <Activity className="w-4 h-4 text-primary-500" /> Device Test
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={toggleMic} className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${micMuted ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}>
                  {micMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
                <button onClick={toggleVideo} className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${videoMuted ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}>
                  {videoMuted ? <VideoOff className="w-5 h-5 md:w-6 md:h-6" /> : <Video className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                {!inCall ? (
                  <button 
                    onClick={joinCall}
                    className="w-full md:w-auto bg-primary-900 hover:bg-primary-800 text-white px-6 md:px-8 py-3.5 rounded-2xl font-bold font-heading transition-all shadow-md shadow-primary-900/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Video className="w-5 h-5" /> Join Consultation
                  </button>
                ) : (
                  <button onClick={leaveCall} className="w-full md:w-auto px-6 md:px-8 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2">
                    <PhoneOff className="w-5 h-5" /> End Call
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar (Chat / Notes) */}
        <div className="w-full lg:w-[400px] h-[500px] lg:h-full bg-white rounded-3xl border border-slate-200 flex flex-col shadow-sm overflow-hidden shrink-0">
          
          {/* Tabs */}
          <div className="flex p-3 gap-2 bg-slate-50 border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'chat' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <MessageSquare className="w-4 h-4" /> Live Chat
            </button>
            {isDoctor && (
              <button 
                onClick={() => setActiveTab('notes')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'notes' ? 'bg-health-50 text-health-700 shadow-sm border border-health-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                <FileText className="w-4 h-4" /> Clinical Notes
              </button>
            )}
          </div>

          {/* Tab Content: Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-5 overflow-y-auto space-y-5 custom-scrollbar bg-slate-50/50" ref={chatContainerRef}>
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                     <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200">
                        <MessageSquare className="w-8 h-8 text-slate-400" />
                     </div>
                     <p className="text-slate-700 font-bold mb-1">No messages yet</p>
                     <p className="text-slate-500 text-sm font-medium">Messages sent here are encrypted and saved.</p>
                  </div>
                )}
                <AnimatePresence>
                  {messages.map((msg, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      key={idx} 
                      className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                        {msg.senderId === user.id ? 'You' : msg.senderName}
                      </span>
                      <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-[15px] leading-relaxed font-medium shadow-sm ${msg.senderId === user.id ? 'bg-primary-900 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'}`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder-slate-400"
                />
                <button type="submit" disabled={!newMessage.trim()} className="bg-primary-900 px-5 rounded-xl text-white hover:bg-primary-800 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center shadow-md shadow-primary-900/20">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {/* Tab Content: Notes & Prescription (DOCTOR ONLY) */}
          {activeTab === 'notes' && isDoctor && (
            <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 custom-scrollbar bg-white">
              
              {/* AI Summary Block */}
              {appointment?.aiSummary && (
                <div className="bg-health-50 border border-health-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 text-health-700 font-bold text-sm mb-4 font-heading uppercase tracking-wider relative z-10">
                    <Activity className="w-4 h-4" /> AI Triage Summary
                  </div>
                  <div className="text-sm font-medium text-slate-600 space-y-3 relative z-10">
                    <div className="flex justify-between items-center border-b border-health-100 pb-3">
                       <span className="text-slate-500">Symptom</span>
                       <span className="text-slate-800 text-right max-w-[60%] truncate bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{appointment.aiSummary.primary_symptom || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-health-100 pb-3">
                       <span className="text-slate-500">Duration</span>
                       <span className="text-slate-800 font-bold">{appointment.aiSummary.duration || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-slate-500">Severity</span>
                       <div className="flex items-center gap-2">
                         <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-health-500 rounded-full" style={{ width: `${(appointment.aiSummary.severity || 0) * 10}%` }}></div>
                         </div>
                         <span className="text-health-600 font-black">{appointment.aiSummary.severity || 0}/10</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold font-heading text-slate-700 mb-2">
                  Clinical Notes
                </label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type your clinical observations..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-health-500 outline-none resize-none transition-all placeholder-slate-400"
                />
              </div>

              {/* Prescription */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold font-heading text-slate-700 mb-3">
                  Prescription Builder
                </label>
                
                <div className="space-y-2 mb-4">
                  <AnimatePresence>
                    {prescription.map((med, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={i} 
                        className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center group shadow-sm"
                      >
                        <div>
                          <span className="font-bold text-slate-800 text-[15px]">{med.name}</span>
                          <div className="text-xs font-bold text-health-600 mt-1 uppercase tracking-wider flex items-center gap-2">
                            <span>{med.dosage}</span> • <span>{med.frequency}</span> • <span>{med.duration}</span>
                          </div>
                        </div>
                        <button onClick={() => setPrescription(prescription.filter((_, idx) => idx !== i))} className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer border border-slate-200">
                          ×
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 flex flex-col gap-3">
                  <input type="text" placeholder="Medicine Name" value={medInput.name} onChange={e => setMedInput({...medInput, name: e.target.value})} className="bg-white border border-slate-200 rounded-xl text-sm px-4 py-3.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-health-500 placeholder-slate-400 shadow-sm" />
                  <div className="flex gap-3">
                    <input type="text" placeholder="Dosage" value={medInput.dosage} onChange={e => setMedInput({...medInput, dosage: e.target.value})} className="w-1/2 bg-white border border-slate-200 rounded-xl text-sm px-4 py-3.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-health-500 placeholder-slate-400 shadow-sm" />
                    <input type="text" placeholder="Frequency" value={medInput.frequency} onChange={e => setMedInput({...medInput, frequency: e.target.value})} className="w-1/2 bg-white border border-slate-200 rounded-xl text-sm px-4 py-3.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-health-500 placeholder-slate-400 shadow-sm" />
                  </div>
                  <div className="flex gap-3 mt-1">
                     <input type="text" placeholder="Duration (e.g. 5 Days)" value={medInput.duration} onChange={e => setMedInput({...medInput, duration: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl text-sm px-4 py-3.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-health-500 placeholder-slate-400 shadow-sm" />
                     <button onClick={addMedicine} className="bg-health-600 hover:bg-health-500 text-white p-3.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center shadow-md shadow-health-600/20">
                       <Plus className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              </div>

              {/* End Button */}
              <div className="mt-auto pt-6">
                <button 
                  onClick={completeConsultation}
                  className="w-full bg-health-600 hover:bg-health-500 text-white font-black font-heading py-4 rounded-2xl shadow-md shadow-health-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" /> Complete & Generate Rx
                </button>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
