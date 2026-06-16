import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Send, FileText, Pill, Plus, Activity, Settings, MessageSquare, Menu, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '1480fbbff91244f7a77f0a8ed1359c19'; 

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
  const clientRef = useRef(null);

  if (!clientRef.current) {
    clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  }
  const client = clientRef.current;

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef(null);

  // Doctor Panel State
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'notes'
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState([]);
  const [medInput, setMedInput] = useState({ name: '', dosage: '', frequency: '', duration: '' });

  // Google Meet UI specific state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="h-screen h-[100dvh] bg-white text-slate-800 font-sans flex flex-col overflow-hidden select-none">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-6">
          <Menu className="w-6 h-6 text-gray-500 cursor-pointer" />
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-8 h-8 bg-[#48206d] rounded flex items-center justify-center relative overflow-hidden">
               <div className="absolute w-4 h-4 bg-white top-0 left-0 rounded-br" />
               <div className="absolute w-4 h-4 bg-[#8ab4f8] bottom-0 right-0 rounded-tl" />
            </div>
            <span className="font-heading font-bold text-[#48206d] text-xl tracking-tight">MyDrScripts</span>
          </div>
          <div className="hidden md:flex items-center gap-5 font-bold text-[13px] text-gray-800 ml-4">
             <span className="cursor-pointer hover:text-[#48206d]">Dashboard</span>
             <span className="cursor-pointer hover:text-[#48206d]">Appointments</span>
             {isDoctor && <span className="cursor-pointer hover:text-[#48206d]">Patients</span>}
             <span className="cursor-pointer hover:text-[#48206d]">Chat</span>
             <span className="cursor-pointer hover:text-[#48206d]">More Options</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Wallet/AI placeholders */}
           <div className="hidden sm:flex items-center gap-2">
              <span className="font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">💳 $0.00</span>
           </div>
           
           <div className="px-4 py-1.5 bg-[#48206d] text-white rounded-full font-bold text-[13px] flex items-center gap-2">
              <div className="w-5 h-5 bg-white text-[#48206d] rounded-full flex items-center justify-center text-[10px]">{user?.name?.charAt(0)}</div>
              {user?.name?.toUpperCase()}
              <div className="w-5 h-5 border border-white/30 rounded-full flex items-center justify-center ml-1">
                 <Plus className="w-3 h-3 rotate-45" />
              </div>
           </div>
           <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              ONLINE <div className="w-2 h-2 bg-white rounded-full"></div>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 md:px-8 md:py-6 overflow-hidden max-w-screen-2xl mx-auto w-full">
         
         {/* Name and Time Above Video */}
         <div className="flex items-center gap-4 mb-2 px-1 shrink-0">
            <h2 className="text-[22px] font-bold text-gray-900">
              {isDoctor ? appointment?.patient?.name : `Dr. ${appointment?.doctor?.name}`}
            </h2>
            <div className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-bold text-xs flex items-center gap-1.5 border border-gray-200">
               <span>🕒</span> {currentTime}
            </div>
         </div>

         {/* Meeting View & Sidebar Container */}
         <div className="flex-1 flex gap-6 overflow-hidden min-h-0 relative">
           
           {/* Video Area */}
           <div className={`flex flex-col flex-1 transition-all duration-300 relative min-w-0`}>
              
              {/* Video Container */}
              <div className="flex-1 bg-[#f8f9fc] border border-gray-200 rounded-2xl relative overflow-hidden flex flex-col justify-center items-center shadow-sm">
                 
                 {remoteUsers.length === 0 ? (
                    <div className="flex flex-col items-center">
                       <div className="w-24 h-24 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center mb-3 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${isDoctor ? appointment?.patient?.name : appointment?.doctor?.name}`} className="w-full h-full opacity-50 grayscale" alt="Avatar" />
                       </div>
                       <p className="text-[#48206d] font-bold text-lg mb-1">{isDoctor ? appointment?.patient?.name : `Dr. ${appointment?.doctor?.name}`}</p>
                       <p className="text-gray-400 font-medium text-xs">Waiting to join...</p>
                    </div>
                 ) : (
                    <div className="absolute inset-0 w-full h-full">
                       {remoteUsers.map(u => (
                         <div key={u.uid} className="absolute inset-0 w-full h-full flex items-center justify-center">
                           {u.hasVideo ? (
                             <div className="w-full h-full object-cover" ref={el => remoteVideoRefs.current[u.uid] = el}></div>
                           ) : (
                             <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-full bg-[#f1f3f4] border-2 border-white shadow-md flex items-center justify-center text-3xl font-bold text-gray-600 relative z-10 overflow-hidden">
                                   {u.hasAudio && (
                                     <div 
                                       id={`volume-ring-${u.uid}`}
                                       className="absolute inset-0 rounded-full bg-[#48206d] transition-transform duration-75"
                                       style={{ opacity: 0.1, zIndex: -1 }}
                                     ></div>
                                   )}
                                   <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${isDoctor ? appointment?.patient?.name : appointment?.doctor?.name}`} className="w-full h-full" alt="Avatar" />
                                </div>
                                <span className="mt-3 font-medium text-[#48206d] text-base">
                                  {isDoctor ? appointment?.patient?.name : `Dr. ${appointment?.doctor?.name}`}
                                </span>
                             </div>
                           )}
                           
                           {/* Remote Muted Notification (Pill) */}
                           {!u.hasAudio && (
                             <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 bg-gray-500/90 text-white px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">
                               <MicOff className="w-3.5 h-3.5" />
                               {isDoctor ? appointment?.patient?.name : `Dr. ${appointment?.doctor?.name}`} has muted their microphone.
                             </div>
                           )}
                         </div>
                       ))}
                    </div>
                 )}

                 {/* Local PIP */}
                 <div className="absolute top-4 right-4 w-32 md:w-40 aspect-[4/3] bg-gradient-to-b from-gray-300 to-gray-500 rounded-lg overflow-hidden shadow-sm border border-gray-300 z-20">
                    {!videoMuted && localTracks.length > 0 ? (
                      <div className="w-full h-full object-cover transform scale-x-[-1]" ref={localVideoRef}></div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                         <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center text-sm font-bold text-gray-700">
                           {user?.name?.substring(0,2)?.toUpperCase() || 'ME'}
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Action Buttons inside Video Container at Bottom */}
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                     <button className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-[#e8eaed] text-gray-700 hover:bg-gray-300 shadow-sm text-[10px] font-bold">
                        CC
                     </button>

                     <button onClick={toggleMic} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${micMuted ? 'bg-[#e8eaed] text-gray-700' : 'bg-[#e8eaed] text-gray-700 hover:bg-gray-300'}`}>
                        {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                     </button>
                     
                     {!inCall ? (
                       <button onClick={joinCall} className="w-10 h-10 rounded-full bg-[#ea4335] hover:bg-red-600 text-white transition-all shadow-md flex items-center justify-center">
                         <PhoneOff className="w-4 h-4" />
                       </button>
                     ) : (
                       <button onClick={leaveCall} className="w-12 h-12 rounded-full bg-[#ea4335] hover:bg-red-600 text-white transition-all shadow-md flex items-center justify-center">
                          <PhoneOff className="w-5 h-5" />
                       </button>
                     )}

                     <button onClick={toggleVideo} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${videoMuted ? 'bg-[#e8eaed] text-gray-700' : 'bg-[#e8eaed] text-gray-700 hover:bg-gray-300'}`}>
                        {videoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                     </button>

                     <button className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-[#e8eaed] text-gray-700 hover:bg-gray-300 shadow-sm">
                        <Plus className="w-4 h-4 rotate-45" />
                     </button>
                 </div>

              </div>

              {/* Bottom Tabs Row */}
              <div className="flex items-center justify-center gap-8 mt-4 pb-2 shrink-0 px-2 border-t border-transparent">
                 <button 
                   onClick={() => { 
                     if (isSidebarOpen && activeTab === 'chat') setIsSidebarOpen(false);
                     else { setIsSidebarOpen(true); setActiveTab('chat'); }
                   }} 
                   className={`flex flex-col items-center justify-center min-w-[80px] py-2 transition-all border-b-2 ${isSidebarOpen && activeTab === 'chat' ? 'border-[#48206d]' : 'border-transparent hover:border-gray-200'}`}
                 >
                    <div className={`w-12 h-12 rounded flex items-center justify-center mb-1 ${isSidebarOpen && activeTab === 'chat' ? 'bg-[#f4f0f8]' : 'bg-transparent'}`}>
                      <MessageSquare className="w-6 h-6 text-[#48206d]" />
                    </div>
                    <span className="text-[11px] font-bold text-[#48206d]">Chat</span>
                 </button>
                 
                 {isDoctor && (
                   <button 
                     onClick={() => { 
                       if (isSidebarOpen && activeTab === 'triage') setIsSidebarOpen(false);
                       else { setIsSidebarOpen(true); setActiveTab('triage'); }
                     }} 
                     className={`flex flex-col items-center justify-center min-w-[80px] py-2 transition-all border-b-2 ${isSidebarOpen && activeTab === 'triage' ? 'border-[#48206d]' : 'border-transparent hover:border-gray-200'}`}
                   >
                      <div className={`w-12 h-12 rounded flex items-center justify-center mb-1 ${isSidebarOpen && activeTab === 'triage' ? 'bg-[#f4f0f8]' : 'bg-transparent'}`}>
                        <Activity className="w-6 h-6 text-[#48206d]" />
                      </div>
                      <span className="text-[11px] font-bold text-[#48206d]">AI Triage</span>
                   </button>
                 )}

                 {isDoctor && (
                   <button 
                     onClick={() => { 
                       if (isSidebarOpen && activeTab === 'notes') setIsSidebarOpen(false);
                       else { setIsSidebarOpen(true); setActiveTab('notes'); }
                     }} 
                     className={`flex flex-col items-center justify-center min-w-[80px] py-2 transition-all border-b-2 ${isSidebarOpen && activeTab === 'notes' ? 'border-[#48206d]' : 'border-transparent hover:border-gray-200'}`}
                   >
                      <div className={`w-12 h-12 rounded flex items-center justify-center mb-1 ${isSidebarOpen && activeTab === 'notes' ? 'bg-[#f4f0f8]' : 'bg-transparent'}`}>
                        <FileText className="w-6 h-6 text-[#48206d]" />
                      </div>
                      <span className="text-[11px] font-bold text-[#48206d]">Clinical Notes</span>
                   </button>
                 )}
              </div>
           </div>

           {/* Sidebar Container */}
           <AnimatePresence>
           {isSidebarOpen && (
             <motion.div 
                initial={{ width: 0, opacity: 0, marginLeft: -20 }}
                animate={{ width: 380, opacity: 1, marginLeft: 0 }}
                exit={{ width: 0, opacity: 0, marginLeft: -20 }}
                className="bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col overflow-hidden shrink-0 h-full max-h-[85vh]"
             >
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white shrink-0">
                   <h2 className="text-lg font-bold text-[#48206d] flex items-center gap-2">
                     {activeTab === 'chat' && <><MessageSquare className="w-5 h-5" /> Live Chat</>}
                     {activeTab === 'triage' && <><Activity className="w-5 h-5" /> AI Triage</>}
                     {activeTab === 'notes' && <><FileText className="w-5 h-5" /> Clinical Workspace</>}
                   </h2>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                     <Plus className="w-5 h-5 rotate-45" />
                   </button>
                </div>
                
                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="bg-amber-50/50 p-3 text-[11px] font-bold text-amber-700 text-center border-b border-amber-100 uppercase tracking-wider shrink-0">
                      End-to-End Encrypted Session
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar" ref={chatContainerRef}>
                      {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                           <MessageSquare className="w-10 h-10 text-slate-400 mb-3" />
                           <p className="text-slate-600 font-bold">No messages yet</p>
                        </div>
                      )}
                      <AnimatePresence>
                        {messages.map((msg, idx) => {
                          const isMe = msg.senderId === user.id;
                          return (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
                               <div className="flex items-baseline gap-2 mb-1 px-1">
                                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isMe ? 'You' : msg.senderName}</span>
                               </div>
                               <div className={`text-sm leading-relaxed p-3.5 w-fit max-w-[90%] break-words whitespace-pre-wrap shadow-sm border ${isMe ? 'bg-primary-900 text-white rounded-t-2xl rounded-bl-2xl rounded-br-sm border-primary-800' : 'bg-slate-50 text-slate-800 rounded-t-2xl rounded-br-2xl rounded-bl-sm border-slate-200'}`}>
                                 {msg.text}
                               </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type message..." 
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                      />
                      <button type="submit" disabled={!newMessage.trim()} className="w-12 h-12 bg-primary-900 rounded-xl text-white hover:bg-primary-800 disabled:opacity-50 transition-all flex items-center justify-center shadow-md">
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                )}

                {/* AI Triage Tab */}
                {activeTab === 'triage' && isDoctor && (
                  <div className="flex-1 flex flex-col overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
                      {!appointment?.aiSummary ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                          <Activity className="w-10 h-10 text-slate-400 mb-3" />
                          <p className="text-slate-600 font-bold">No AI Data Available</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5" /> AI Summary
                            </p>
                            <p className="text-sm text-slate-800 font-medium leading-relaxed">
                              {appointment.aiSummary.summary || 'No summary provided.'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Raw Transcript</p>
                            <div className="space-y-4">
                              {appointment.aiSummary.chatHistory?.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm break-words whitespace-pre-wrap shadow-sm ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'}`}>
                                    <span className="text-[10px] font-black opacity-50 block mb-1 uppercase tracking-wider">{msg.role === 'user' ? 'Patient' : 'AI'}</span>
                                    {msg.text}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Clinical Notes Tab */}
                {activeTab === 'notes' && isDoctor && (
                  <div className="flex-1 flex flex-col overflow-y-auto p-6 custom-scrollbar bg-white">
                    <div className="mb-6">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observations</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Type your clinical notes here..."
                        className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-health-500 outline-none resize-none shadow-inner"
                      />
                    </div>
                    <div className="mb-6 flex-1">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Prescription Rx</label>
                      <div className="space-y-3 mb-4">
                        {prescription.map((med, i) => (
                          <div key={i} className="bg-health-50 p-4 rounded-2xl border border-health-100 flex justify-between items-center group">
                            <div>
                              <span className="font-bold text-health-900 text-[15px]">{med.name}</span>
                              <div className="text-[10px] font-black text-health-600/70 uppercase tracking-wider mt-1">
                                {med.dosage} • {med.frequency} • {med.duration}
                              </div>
                            </div>
                            <button onClick={() => setPrescription(prescription.filter((_, idx) => idx !== i))} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm transition-colors border border-health-100">
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {/* Med Input Form */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 shadow-inner">
                        <input type="text" placeholder="Medicine Name" value={medInput.name} onChange={e => setMedInput({...medInput, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl text-sm font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-health-500" />
                        <div className="flex gap-3">
                          <input type="text" placeholder="Dosage" value={medInput.dosage} onChange={e => setMedInput({...medInput, dosage: e.target.value})} className="w-1/2 bg-white border border-slate-200 rounded-xl text-sm font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-health-500" />
                          <input type="text" placeholder="Freq" value={medInput.frequency} onChange={e => setMedInput({...medInput, frequency: e.target.value})} className="w-1/2 bg-white border border-slate-200 rounded-xl text-sm font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-health-500" />
                        </div>
                        <div className="flex gap-3">
                          <input type="text" placeholder="Duration" value={medInput.duration} onChange={e => setMedInput({...medInput, duration: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl text-sm font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-health-500" />
                          <button onClick={addMedicine} className="bg-health-600 hover:bg-health-700 text-white px-4 rounded-xl flex items-center justify-center shadow-md shadow-health-600/20 transition-colors">
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-6 border-t border-slate-100">
                      <button onClick={completeConsultation} className="w-full bg-health-600 hover:bg-health-700 text-white font-black font-heading py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-health-600/20">
                        <FileText className="w-5 h-5" /> Sign & Complete
                      </button>
                    </div>
                  </div>
                )}
             </motion.div>
           )}
           </AnimatePresence>

         </div>
      </div>
    </div>
  );
}
