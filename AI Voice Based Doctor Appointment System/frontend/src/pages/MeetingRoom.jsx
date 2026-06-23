import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Send, FileText,
  Pill, Plus, Activity, MessageSquare, ChevronRight, CheckCircle2,
  Wifi, Shield, Clock, UserPlus, Search, X, Check, LogOut,
  LayoutDashboard, Calendar, Settings, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '1480fbbff91244f7a77f0a8ed1359c19';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MeetingRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const socket = useSocket();

  const [appointment, setAppointment] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [activeRemoteUid, setActiveRemoteUid] = useState(null);
  const [isManualFocus, setIsManualFocus] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [joining, setJoining] = useState(true); // auto-join in progress
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [showNotesSuccess, setShowNotesSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // For notifications while in meeting
  const [incomingCall, setIncomingCall] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const consultationMode = appointment?.consultationMode || 'VIDEO';
  const isAudioMode = consultationMode === 'AUDIO';
  const isInPersonMode = consultationMode === 'IN_PERSON';
  const isRtcMode = !isInPersonMode;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const clientRef = useRef(null);
  const initRef = useRef(false);
  if (!clientRef.current) {
    clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  }
  const client = clientRef.current;

  // Chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef(null);

  // Sidebar
  const [activeTab, setActiveTab] = useState(null); // null = closed
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState([]);
  const [medInput, setMedInput] = useState({ name: '', dosage: '', frequency: '', duration: '' });

  const [userNames, setUserNames] = useState({});
  const myUidRef = useRef(null);

  // Duration timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Completion confirmation flow
  const [waitingForPatientConfirmation, setWaitingForPatientConfirmation] = useState(false);
  const [showPatientEndConfirm, setShowPatientEndConfirm] = useState(false);
  const notesRef = useRef('');
  const prescriptionRef = useRef([]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { prescriptionRef.current = prescription; }, [prescription]);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    if (incomingCall && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (incomingCall && timeLeft === 0) {
      setIncomingCall(null);
    }
  }, [incomingCall, timeLeft]);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [doctorsList, setDoctorsList] = useState([]);
  const [invitingDoctorId, setInvitingDoctorId] = useState(null);

  // â”€â”€ Fetch doctors for invite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchDoctorsForInvite = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/appointments/doctors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Exclude self and already invited
      const available = res.data.filter(d =>
        d.userId !== user.id &&
        !appointment?.invitedDoctors?.some(inv => inv.doctorId === d.userId)
      );
      setDoctorsList(available);
    } catch (err) { console.error('Failed to fetch doctors', err); }
  };

  useEffect(() => {
    if (showInviteModal) {
      fetchDoctorsForInvite();
    }
  }, [showInviteModal, appointment]);

  const handleInviteDoctor = async (doctorId) => {
    try {
      setInvitingDoctorId(doctorId);
      await axios.post(`${API_URL}/api/appointments/${appointmentId}/invite`, {
        doctorId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Optionally show a toast
      setShowInviteModal(false);
      showToast('Doctor invited successfully!');
    } catch (err) {
      console.error('Failed to invite doctor', err);
      showToast('Failed to invite doctor');
    } finally {
      setInvitingDoctorId(null);
    }
  };


  // â”€â”€ Fetch appointment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const fetchAppt = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAppointment(data);
        if (data.messages) {
          setMessages(data.messages.map(m => ({
            ...m,
            senderName: m.senderRole === 'DOCTOR' ? data.doctor.name : (data.familyMember?.name || data.patient.name)
          })));
        }
      } catch (err) { console.error(err); }
    };
    fetchAppt();
  }, [appointmentId]);

  useEffect(() => {
    if (!appointment) return;
    if (appointment.consultationMode === 'IN_PERSON') {
      setActiveTab((prev) => prev || 'chat');
    }
  }, [appointment]);

  // â”€â”€ Socket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!socket || !appointmentId) return;
    socket.emit('join_appointment', appointmentId);
    const handleMsg = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chat:message', handleMsg);
    return () => socket.off('chat:message', handleMsg);
  }, [socket, appointmentId]);

  useEffect(() => {
    if (!socket || !appointmentId || !appointment) return;
    if (user?.role === 'DOCTOR' && appointment.status === 'ACCEPTED' && isRtcMode) {
      socket.emit('call:initiate', {
        appointmentId,
        patientId: appointment.patientId,
        doctorName: user.name,
        invitedDoctorIds: appointment.invitedDoctors?.map(inv => inv.doctorId) || []
      });
    }
    const handleAnswered = (data) => {
      if (data.appointmentId === appointmentId && !data.accepted) {
        navigate('/dashboard');
      }
    };

    const handleStatusUpdate = (updatedApt) => {
      if (updatedApt.id === appointmentId && updatedApt.status === 'COMPLETED') {
        setShowCompletedDialog(true);
      }
    };

    const handleRequestComplete = (data) => {
      if (data.appointmentId === appointmentId && user?.role === 'PATIENT') {
        setShowPatientEndConfirm(true);
      }
    };

    const handleAcceptComplete = async (data) => {
      if (data.appointmentId === appointmentId && user?.role === 'DOCTOR') {
        setWaitingForPatientConfirmation(false);
        try {
          await axios.put(`${API_URL}/api/appointments/${appointmentId}/status`,
            { status: 'COMPLETED', notes: notesRef.current, prescription: prescriptionRef.current },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          leaveCall();
        } catch (err) {
          if (err.response?.status === 400) {
            showToast(err.response?.data?.error || 'Cannot complete consultation yet.');
          } else {
            showToast('Failed to complete consultation');
          }
        }
      }
    };

    const handleDeclineComplete = (data) => {
      if (data.appointmentId === appointmentId && user?.role === 'DOCTOR') {
        setWaitingForPatientConfirmation(false);
        showToast('The patient requested to continue the consultation.');
      }
    };

    const handleIncomingCall = (data) => {
      // Ignore if the incoming call is for the meeting we are currently already inside
      if (data.appointmentId === appointmentId) return;

      // Even if they are in another meeting, show the incoming call notification
      setIncomingCall(data);
      setTimeLeft(30);
      playSuccessSound();
    };

    const handleAgoraUserJoined = (data) => {
      if (data.appointmentId === appointmentId) {
        setUserNames(prev => ({ ...prev, [data.uid]: data.name }));
        if (data.requestReply && myUidRef.current) {
          socket.emit('agora:name_reply', { appointmentId, uid: myUidRef.current, name: user.name, requestReply: false });
        }
      }
    };

    socket.on('call:answered', handleAnswered);
    socket.on('appointment:updated', handleStatusUpdate);
    socket.on('call:request_complete', handleRequestComplete);
    socket.on('call:accept_complete', handleAcceptComplete);
    socket.on('call:decline_complete', handleDeclineComplete);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('agora:user_joined', handleAgoraUserJoined);
    return () => {
      socket.off('call:answered', handleAnswered);
      socket.off('appointment:updated', handleStatusUpdate);
      socket.off('call:request_complete', handleRequestComplete);
      socket.off('call:accept_complete', handleAcceptComplete);
      socket.off('call:decline_complete', handleDeclineComplete);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('agora:user_joined', handleAgoraUserJoined);
    };
  }, [socket, appointmentId, appointment, user, navigate, isRtcMode]);

  // Guarantee that we broadcast our name to the room as soon as we are in the call 
  // and the socket is fully available. This covers the edge case where the socket 
  // connects slightly after the Agora setup useEffect has already run.
  useEffect(() => {
    if (isRtcMode && inCall && socket && myUidRef.current && user?.name) {
      socket.emit('agora:join', { appointmentId, uid: myUidRef.current, name: user.name, requestReply: true });
    }
  }, [inCall, socket, appointmentId, user?.name, isRtcMode]);

  // â”€â”€ Agora setup + AUTO JOIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!appointment) return;
    if (!isRtcMode) {
      setJoining(false);
      setInCall(true);
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      }
      return () => {
        clearInterval(timerRef.current);
        timerRef.current = null;
      };
    }

    if (initRef.current) return;
    initRef.current = true;

    // Remote events
    client.on('user-joined', (u) => setRemoteUsers(prev => [...prev.filter(x => x.uid !== u.uid), u]));
    client.on('user-published', async (u, mediaType) => {
      try {
        await client.subscribe(u, mediaType);
        setRemoteUsers(prev => [...prev.filter(x => x.uid !== u.uid), u]);
        if (mediaType === 'audio') u.audioTrack.play();
      } catch (err) {
        console.error('Failed to subscribe:', err);
      }
    });
    client.on('user-unpublished', (u) => setRemoteUsers(prev => [...prev.filter(x => x.uid !== u.uid), u]));
    client.on('user-left', (u) => setRemoteUsers(prev => prev.filter(x => x.uid !== u.uid)));

    client.enableAudioVolumeIndicator();
    client.on('volume-indicator', (volumes) => {
      volumes.forEach(vol => {
        const ring = document.getElementById(`vol-${vol.uid}`);
        if (ring) {
          ring.style.transform = `scale(${1 + (vol.level / 100) * 1.4})`;
          ring.style.opacity = Math.max(0.1, (vol.level / 100) * 0.7);
        }
      });
    });

    let mounted = true;

    const init = async () => {
      let tracks = [];
      try {
        if (isAudioMode) {
          const at = await AgoraRTC.createMicrophoneAudioTrack();
          tracks = [at, null];
        } else {
          tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        }
      } catch (err) {
        console.warn('Camera/Mic failed:', err);
        try {
          const at = await AgoraRTC.createMicrophoneAudioTrack();
          tracks = [at, null];
        } catch (audioErr) {
          console.warn('Mic fallback failed:', audioErr);
          showToast(`Could not access camera or microphone.`);
        }
      }

      if (!mounted) {
        // If component unmounted while waiting for permissions, discard tracks and abort
        tracks.forEach(t => t && t.close());
        return;
      }

      setLocalTracks(tracks);

      // Auto-join immediately
      try {
        const res = await axios.get(`${API_URL}/api/agora/token?channelName=${appointmentId}`);
        if (!mounted) return;

        const uid = await client.join(APP_ID, appointmentId, res.data.token, null);
        myUidRef.current = uid;
        if (!mounted) {
          client.leave();
          return;
        }

        if (socket) {
          socket.emit('agora:join', { appointmentId, uid, name: user.name, requestReply: true });
        }

        if (tracks.length > 0) {
          await client.publish(tracks.filter(Boolean));
        }

        if (!mounted) return;
        setInCall(true);
        // Start timer
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      } catch (err) {
        console.error('Auto-join failed:', err);
        if (mounted) {
          showToast('Failed to join the meeting. Check console logs.');
        }
      }
      if (mounted) {
        setJoining(false);
      }
    };
    init();

    return () => {
      mounted = false;
      client.removeAllListeners();
      try { client.leave(); } catch (e) { }
      clearInterval(timerRef.current);
      timerRef.current = null;
      initRef.current = false;
    };
  }, [appointment, isRtcMode, isAudioMode]); // eslint-disable-line

  useEffect(() => {
    return () => localTracks.forEach(t => { if (t) { t.stop(); t.close(); } });
  }, [localTracks]);

  // Local video (self preview tile)
  useEffect(() => {
    const localVideoTrack = localTracks[1];
    if (!localVideoTrack) return;

    if (videoMuted) {
      try {
        localVideoTrack.stop();
      } catch (err) {
        console.warn('Failed to stop local video track:', err);
      }
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = '';
      }
      return;
    }

    if (!localVideoRef.current) return;
    if (!localVideoRef.current.querySelector('video')) {
      localVideoRef.current.innerHTML = '';
      try {
        localVideoTrack.play(localVideoRef.current);
      } catch (err) {
        console.warn('Failed to play local video track:', err);
      }
    }
  }, [localTracks, videoMuted, remoteUsers.length, inCall]);

  // Remote video (main stage + stacked participant tiles)
  useEffect(() => {
    remoteUsers.forEach((u) => {
      const container = remoteVideoRefs.current[u.uid];
      if (!u?.videoTrack || !container) return;
      try {
        // Avoid redundant replays/flicker if this container already has a playing video element.
        if (!container.querySelector('video')) {
          container.innerHTML = '';
          u.videoTrack.play(container);
        }
      } catch (err) {
        console.warn('Failed to play remote video track:', err);
      }
    });
  }, [remoteUsers, activeRemoteUid]);

  // Keep one active remote user selected for the main display.
  // Doctor view: prefer patient in center.
  // Patient view: prefer primary doctor in center.
  useEffect(() => {
    if (remoteUsers.length === 0) {
      setActiveRemoteUid(null);
      setIsManualFocus(false);
      return;
    }

    const normalizeName = (name = '') => name.toLowerCase().replace(/^dr\.?\s+/, '').replace(/[^a-z0-9]/g, '');
    const roleIsDoctor = user?.role === 'DOCTOR';
    const preferredCenterName = roleIsDoctor
      ? (appointment?.familyMember?.name || appointment?.patient?.name || '')
      : (appointment?.doctor?.name || '');
    const preferredCenterNorm = normalizeName(preferredCenterName);
    const preferredMatch = remoteUsers.find((u) => normalizeName(userNames[u.uid] || '') === preferredCenterNorm);
    const preferredUid = preferredMatch?.uid || remoteUsers[0]?.uid;

    // Doctors should always keep the patient on the main screen.
    if (roleIsDoctor) {
      if (preferredUid) {
        setActiveRemoteUid(preferredUid);
      }
      if (isManualFocus) {
        setIsManualFocus(false);
      }
      return;
    }

    setActiveRemoteUid((prev) => {
      const prevStillPresent = prev && remoteUsers.some((u) => u.uid === prev);
      if (isManualFocus && prevStillPresent) return prev;
      if (preferredMatch?.uid) return preferredMatch.uid;
      if (prevStillPresent) return prev;
      return preferredUid;
    });

    const prevStillPresent = activeRemoteUid && remoteUsers.some((u) => u.uid === activeRemoteUid);
    if (isManualFocus && !prevStillPresent) {
      setIsManualFocus(false);
    }
  }, [remoteUsers, appointment, userNames, isManualFocus, activeRemoteUid, user?.role]);

  // Chat scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const leaveCall = async (skipNavigate = false) => {
    localTracks.forEach(t => { if (t) { t.stop(); t.close(); } });
    setLocalTracks([]);
    clearInterval(timerRef.current);
    timerRef.current = null;
    if (isRtcMode) {
      await client.leave();
    }
    setInCall(false);
    if (skipNavigate !== true) {
      navigate('/dashboard');
    }
  };

  const toggleMic = async () => {
    if (localTracks[0]) { await localTracks[0].setMuted(!micMuted); setMicMuted(!micMuted); }
  };

  const toggleVideo = async () => {
    if (localTracks[1]) { await localTracks[1].setMuted(!videoMuted); setVideoMuted(!videoMuted); }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    socket.emit('chat:send', { appointmentId, senderId: user.id, senderRole: user.role, text: newMessage, senderName: user.name });
    setNewMessage('');
  };

  const addMedicine = () => {
    if (!medInput.name) return;
    setPrescription(p => [...p, medInput]);
    setMedInput({ name: '', dosage: '', frequency: '', duration: '' });
  };

  const completeConsultation = async () => {
    // Force completion directly without patient approval (fallback for doctor)
    try {
      await axios.put(`${API_URL}/api/appointments/${appointmentId}/status`,
        { status: 'COMPLETED', notes: notesRef.current || notes, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      leaveCall();
    } catch (err) {
      if (err.response?.status === 400) {
        showToast(err.response?.data?.error || 'Cannot complete consultation yet.');
      } else {
        showToast('Failed to complete consultation');
      }
    }
  };

  const submitInvitedDoctorNotes = async () => {
    try {
      await axios.post(`${API_URL}/api/appointments/${appointmentId}/notes`,
        { notes: notesRef.current || notes, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      // Show success toast before leaving
      setShowNotesSuccess(true);
      setTimeout(() => {
        leaveCall();
      }, 2000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit notes');
    }
  };

  const requestCompleteConsultation = async () => {
    try {
      // PRE-FLIGHT CHECK
      const { data: aptData } = await axios.get(`${API_URL}/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const pendingInvites = aptData.invitedDoctors?.filter(inv => inv.status !== 'COMPLETED');
      if (pendingInvites && pendingInvites.length > 0) {
        showToast('Cannot complete: Waiting for invited doctors to submit their notes.');
        return;
      }

      await axios.post(`${API_URL}/api/appointments/${appointmentId}/notes`,
        { notes: notesRef.current || notes, prescription: prescriptionRef.current || prescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setWaitingForPatientConfirmation(true);
      socket.emit('call:request_complete', { appointmentId });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save notes before completing');
    }
  };

  const isDoctor = user?.role === 'DOCTOR';
  const isPrimaryDoctor = isDoctor && appointment?.doctorId === user?.id;
  const isInvitedDoctor = isDoctor && appointment?.invitedDoctors?.some(inv => inv.doctorId === user?.id);

  const otherName = isDoctor
    ? (appointment?.familyMember?.name || appointment?.patient?.name)
    : formatDoctorName(appointment?.doctor?.name, appointment?.doctor?.name);
  const patientName = appointment?.familyMember?.name || appointment?.patient?.name || 'Patient';
  const activeRemoteUser = remoteUsers.find((u) => u.uid === activeRemoteUid) || remoteUsers[0] || null;
  const stackedRemoteUsers = activeRemoteUser
    ? remoteUsers.filter((u) => u.uid !== activeRemoteUser.uid)
    : remoteUsers;
  const getRemoteDisplayName = (u) => {
    const known = userNames[u.uid];
    if (known) return known;
    if (u.uid === activeRemoteUser?.uid && isDoctor) return patientName;
    if (remoteUsers.length === 1) return otherName;
    return 'Participant';
  };
  const activeRemoteHasVideo = Boolean(activeRemoteUser?.videoTrack || activeRemoteUser?.hasVideo);
  const activeRemoteHasAudio = Boolean(activeRemoteUser?.audioTrack || activeRemoteUser?.hasAudio);
  const participantStackUsers = activeRemoteUser ? [activeRemoteUser, ...stackedRemoteUsers] : [];
  const participantStackCount = 1 + participantStackUsers.length; // includes "You" tile
  const participantTileWidthClass = participantStackCount >= 6
    ? 'w-20 sm:w-24 md:w-28'
    : participantStackCount >= 4
      ? 'w-24 sm:w-28 md:w-32'
      : 'w-28 sm:w-32 md:w-36';
  const participantStackMaxHeightClass = participantStackCount > 3
    ? 'max-h-[calc(100%-1.25rem)]'
    : 'max-h-[calc(100%-1.5rem)]';
  const participantStackScrollClass = participantStackCount > 3
    ? 'overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
    : '';
  const sidebarOpen = activeTab !== null;
  const consultationModeLabel = isInPersonMode ? 'In-Person' : (isAudioMode ? 'Audio' : 'Video');
  const roomTitle = isInPersonMode ? `${consultationModeLabel} Consultation Room` : `${consultationModeLabel} Consultation`;
  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex flex-col font-sans select-none overflow-hidden" style={{ height: '100dvh', background: '#f8fafc' }}>

      {/* â”€â”€ Top Nav â€” matches patient TopHeader exactly â”€â”€ */}
      <SharedNavbar
        className="bg-white border-b border-slate-200 shrink-0 z-40"
        user={user}
        onLogoClick={() => leaveCall()}
        navItems={[
          { key: 'queue', icon: LayoutDashboard, label: 'Queue' },
          { key: 'schedule', icon: Calendar, label: 'Schedule' },
          { key: 'history', icon: Clock, label: 'History' }
        ]}
        activeTab={null}
        onTabClick={() => leaveCall()}
        statusOverride={{
          text: 'In Call',
          color: '#059669',
          bg: '#f0fdf4',
          borderColor: '#bbf7d0',
          ping: true,
          dotColor: '#059669'
        }}
        pendingCount={0}
        doctorName={user?.name}
        isDoctor={isDoctor}
        onLogout={() => { leaveCall(true).then(() => { if (typeof logout === 'function') logout(); else navigate('/login'); }) }}
      />

      {/* â”€â”€ Joining overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {joining && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
            style={{ background: '#f8fafc' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-14 h-14 rounded-full border-4 border-primary-500 border-t-transparent"
            />
            <p className="text-slate-900 font-heading font-black text-xl tracking-tight">Connecting to call...</p>
            <p className="text-slate-500 text-sm font-medium">Setting up your camera & microphone</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Call Incoming Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-white p-6 rounded-3xl shadow-2xl border border-primary-100 max-w-sm w-full"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-health-600 animate-pulse" style={{ background: 'rgba(5,150,105,0.1)' }}>
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">Joining Request</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{incomingCall.doctorName} is waiting</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6 text-sm font-medium">You have been requested to join another consultation.</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: false });
                    setIncomingCall(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    socket.emit('call:tentative_join', {
                      appointmentId: incomingCall.appointmentId,
                      doctorName: user.name || 'Invited Doctor',
                      delayMinutes: 5
                    });
                    try {
                      const saved = localStorage.getItem('deferredInvites');
                      const invites = saved ? JSON.parse(saved) : [];
                      invites.push(incomingCall);
                      localStorage.setItem('deferredInvites', JSON.stringify(invites));
                    } catch (e) { }
                    setIncomingCall(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-orange-100 text-orange-600 font-bold text-sm hover:bg-orange-200 transition-colors cursor-pointer"
                >
                  +5 Mins
                </button>
              </div>
              <button
                onClick={() => {
                  socket.emit('call:response', { appointmentId: incomingCall.appointmentId, accepted: true });
                  leaveCall(true).then(() => {
                    // Force a full unmount/remount to cleanly initialize the new WebRTC connection
                    window.location.href = `/room/${incomingCall.appointmentId}`;
                  });
                }}
                className="w-full py-2.5 rounded-xl text-slate-900 font-bold text-sm transition-transform hover:scale-105 shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}
              >
                <Check className="w-4 h-4" /> End Current & Join
              </button>
            </div>
            <div className="w-full bg-slate-100 h-1 mt-4 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / 30) * 100}%` }}
                className="h-full bg-primary-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Patient End Confirmation Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showPatientEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-health-100 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-health-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">End Consultation?</h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                The doctor has requested to end the consultation. Do you agree to end the meeting now?
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => {
                    socket.emit('call:decline_complete', { appointmentId });
                    setShowPatientEndConfirm(false);
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Continue Call
                </button>
                <button
                  onClick={() => {
                    socket.emit('call:accept_complete', { appointmentId });
                    setShowPatientEndConfirm(false);
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-900 transition-transform hover:scale-105 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#0e7490,#059669)', boxShadow: '0 8px 20px rgba(14,116,144,0.3)' }}
                >
                  Yes, End Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Doctor Waiting Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {waitingForPatientConfirmation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="mb-6">
                <Activity className="w-12 h-12 text-primary-500" />
              </motion.div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Waiting for Patient</h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                We have asked the patient to confirm they are ready to end the consultation.
              </p>
              <button
                onClick={() => {
                  setWaitingForPatientConfirmation(false);
                  completeConsultation();
                }}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
              >
                Force End Consultation
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Invite Doctor Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary-500" />
                  Invite Doctor
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or specialization..."
                  value={inviteSearchQuery}
                  onChange={e => setInviteSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[200px]" style={{ scrollbarWidth: 'thin' }}>
                {doctorsList.filter(d =>
                  d.user.name.toLowerCase().includes(inviteSearchQuery.toLowerCase()) ||
                  d.specialization.name.toLowerCase().includes(inviteSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center text-slate-500 py-8 font-medium">
                    No doctors available to invite.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doctorsList.filter(d =>
                      d.user.name.toLowerCase().includes(inviteSearchQuery.toLowerCase()) ||
                      d.specialization.name.toLowerCase().includes(inviteSearchQuery.toLowerCase())
                    ).map(d => (
                      <div key={d.userId} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-primary-100 bg-slate-50 hover:bg-primary-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                            {d.user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{formatDoctorName(d.user.name, d.user.name)}</p>
                            <p className="text-xs text-slate-500 font-medium">{d.specialization.name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInviteDoctor(d.userId)}
                          disabled={invitingDoctorId === d.userId}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:scale-105 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}
                        >
                          {invitingDoctorId === d.userId ? 'Inviting...' : 'Invite'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Consultation Completed overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showCompletedDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-slate-100"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-health-50 to-transparent pointer-events-none" />

              <div className="w-20 h-20 bg-health-100 text-health-600 rounded-full flex items-center justify-center mb-6 relative z-10 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-heading font-black text-slate-900 mb-2 relative z-10">Consultation Complete</h2>
              <p className="text-slate-500 text-sm mb-8 relative z-10 leading-relaxed">
                {isDoctor
                  ? "The patient has confirmed and ended this consultation. You will now be redirected to your dashboard."
                  : "The doctor has ended this consultation. You will now be redirected to your dashboard."}
              </p>
              <button
                onClick={leaveCall}
                className="w-full py-4 bg-health-500 hover:bg-health-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-health-500/20 relative z-10 active:scale-95"
              >
                Return to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Notes Success Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showNotesSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-white p-6 rounded-3xl shadow-2xl border border-health-100 max-w-sm w-full"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-health-100 flex items-center justify-center text-health-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">Notes Submitted</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Success</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm font-medium">Your notes have been saved. You are now leaving the consultation.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Global Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[200] bg-white text-slate-900 px-6 py-3 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <span className="font-bold text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 z-10" style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        {/* Left: logo + name */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0e7490, #059669)' }}>
            {isInPersonMode ? <MessageSquare className="w-4 h-4 text-slate-900" /> : (isAudioMode ? <Phone className="w-4 h-4 text-slate-900" /> : <Video className="w-4 h-4 text-slate-900" />)}
          </div>
          <div className="min-w-0">
            <p className="text-slate-900 font-heading font-black text-sm leading-tight truncate">
              {otherName || roomTitle}
            </p>
            <p className="text-slate-500 text-[10px] font-medium">{consultationModeLabel} · {appointment?.doctor?.specialization || 'Consultation Session'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inCall && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-slate-900 font-mono font-bold text-xs">{fmt(elapsed)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: inCall ? 'rgba(5,150,105,0.15)' : 'rgba(234,67,53,0.15)', border: `1px solid ${inCall ? 'rgba(5,150,105,0.3)' : 'rgba(234,67,53,0.3)'}` }}>
            <div className={`w-2 h-2 rounded-full ${inCall ? 'bg-health-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${inCall ? 'text-health-600' : 'text-red-400'}`}>
              {inCall ? (isInPersonMode ? 'Active Chat' : 'Live') : 'Connecting'}
            </span>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 relative flex overflow-hidden min-h-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-20 sm:pb-20">
        {/* Video section */}
        <div className="flex-1 flex flex-col relative overflow-hidden w-full max-w-[1180px] mx-auto border rounded-2xl">
          <div className="flex-1 relative overflow-hidden min-h-0">
            <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
              {isInPersonMode ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <h3 className="mt-4 text-xl font-heading font-black text-slate-900">In-Person Consultation Workspace</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Use the chat tab to coordinate with the patient and the prescription tab to record medicines.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      This mode does not start an Agora call.
                    </p>
                  </div>
                </div>
              ) : remoteUsers.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-2 border-primary-500"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3], opacity: [0.35, 0] }}
                        transition={{ duration: 2, delay: 0.6, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-2 border-primary-400"
                      />
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 relative z-10" style={{ borderColor: 'rgba(14,116,144,0.5)' }}>
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${otherName}&backgroundColor=0e7490`}
                          alt={otherName}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                    <p className="text-slate-900 font-heading font-black text-lg">{otherName}</p>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent"
                      />
                      Waiting for them to join…
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-slate-900">
                  {activeRemoteHasVideo ? (
                    <div className="w-full h-full [&>div>video]:object-cover" ref={(el) => { remoteVideoRefs.current[activeRemoteUser.uid] = el; }} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-100">
                      <div className="relative w-28 h-28">
                        <div
                          id={`vol-${activeRemoteUser?.uid}`}
                          className="absolute inset-0 rounded-full transition-all duration-75"
                          style={{ background: 'rgba(14,116,144,0.3)', opacity: 0.1 }}
                        />
                        <div className="absolute inset-0 rounded-full overflow-hidden border-4" style={{ borderColor: 'rgba(14,116,144,0.4)' }}>
                          <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeRemoteUser ? getRemoteDisplayName(activeRemoteUser) : 'Participant'}&backgroundColor=0e7490`}
                            alt={activeRemoteUser ? getRemoteDisplayName(activeRemoteUser) : 'Participant'}
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                      <p className="text-slate-900 font-heading font-black text-lg">
                        {activeRemoteUser ? getRemoteDisplayName(activeRemoteUser) : 'Participant'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeRemoteUser && remoteUsers.length > 0 && (
                <div className="absolute bottom-20 left-4 z-20">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 backdrop-blur-md border border-slate-200">
                    <span className="text-slate-900 text-sm font-bold truncate max-w-[180px]">{getRemoteDisplayName(activeRemoteUser)}</span>
                    <div className="w-px h-3 bg-slate-300 mx-1" />
                    {!activeRemoteHasAudio ? (
                      <MicOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Mic className="w-4 h-4 text-emerald-500" />
                    )}
                    {!activeRemoteHasVideo ? (
                      <VideoOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Video className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </div>
              )}

              {/* Right-side participant stack: active/main participant first, then others */}
              {!isInPersonMode && (participantStackUsers.length > 0 || Boolean(localTracks[1]) || Boolean(localTracks[0])) && (
                <div className={`absolute top-3 right-3 z-20 ${participantStackMaxHeightClass} ${participantStackScrollClass}`}>
                  <div className="flex flex-col gap-2">
                    {/* You tile */}
                    <div
                      className={`${participantTileWidthClass} text-left rounded-xl overflow-hidden border border-white/50 shadow-lg bg-slate-900/90`}
                      style={{ aspectRatio: '4/3' }}
                    >
                      <div className="relative w-full h-full">
                        {!videoMuted && Boolean(localTracks[1]) ? (
                          <div className="w-full h-full transform scale-x-[-1] [&>div>video]:object-cover" ref={localVideoRef} />
                        ) : (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-900/70 via-slate-800/50 to-slate-700/40">
                            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/35 bg-slate-700/45">
                              <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'Me'}&backgroundColor=334155`}
                                alt="You"
                                className="w-full h-full"
                              />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-2 py-1 bg-gradient-to-t from-slate-900/70 to-transparent text-white text-[10px]">
                          <span className="font-bold truncate">You</span>
                          <div className="flex items-center gap-1">
                            {micMuted ? <MicOff className="w-3 h-3 text-red-300 shrink-0" /> : <Mic className="w-3 h-3 text-emerald-300 shrink-0" />}
                            {isAudioMode ? <Phone className="w-3 h-3 text-emerald-300 shrink-0" /> : (videoMuted ? <VideoOff className="w-3 h-3 text-red-300 shrink-0" /> : <Video className="w-3 h-3 text-emerald-300 shrink-0" />)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {participantStackUsers.map((u, idx) => {
                      const isActiveTile = idx === 0;
                      const remoteHasVideo = Boolean(u.videoTrack || u.hasVideo);
                      const remoteHasAudio = Boolean(u.audioTrack || u.hasAudio);
                      return (
                        <button
                          key={u.uid}
                          onClick={() => {
                            if (isDoctor) return;
                            setIsManualFocus(true);
                            setActiveRemoteUid(u.uid);
                          }}
                          className={`${participantTileWidthClass} text-left rounded-xl overflow-hidden shadow-lg bg-slate-900/90 ${isDoctor ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'} transition-transform ${isActiveTile ? 'border-2 border-primary-300' : 'border border-white/50'}`}
                          style={{ aspectRatio: '4/3' }}
                          title={`${isActiveTile ? 'On main screen: ' : 'Show on main screen: '}${getRemoteDisplayName(u)}`}
                        >
                          <div className="relative w-full h-full">
                            {remoteHasVideo && !isActiveTile ? (
                              <div
                                className="w-full h-full [&>div>video]:object-cover"
                                ref={(el) => { remoteVideoRefs.current[u.uid] = el; }}
                              />
                            ) : (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-900/70 via-slate-800/50 to-slate-700/40">
                                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/35 bg-slate-700/45">
                                  <img
                                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${getRemoteDisplayName(u)}&backgroundColor=0e7490`}
                                    alt={getRemoteDisplayName(u)}
                                    className="w-full h-full"
                                  />
                                </div>
                              </div>
                            )}
                            {isActiveTile && (
                              <div className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-500/90 text-white">
                                MAIN
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-2 py-1 bg-gradient-to-t from-slate-900/70 to-transparent text-white text-[10px]">
                              <span className="font-bold truncate">{getRemoteDisplayName(u)}</span>
                              <div className="flex items-center gap-1">
                                {remoteHasAudio ? <Mic className="w-3 h-3 text-emerald-300 shrink-0" /> : <MicOff className="w-3 h-3 text-red-300 shrink-0" />}
                                 {isAudioMode ? <Phone className="w-3 h-3 text-emerald-300 shrink-0" /> : (remoteHasVideo ? <Video className="w-3 h-3 text-emerald-300 shrink-0" /> : <VideoOff className="w-3 h-3 text-red-300 shrink-0" />)}
                               </div>
                             </div>
                           </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {inCall && (
                <div className="sm:hidden absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-900 font-mono font-bold text-xs">{fmt(elapsed)}</span>
                </div>
              )}

              {/* Floating controls inside the stage */}
              {isRtcMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-3 py-2 rounded-full bg-white/90 border border-slate-200 shadow-lg">
                  <VideoOverlayBtn label="CC" icon={<span className="text-[11px] font-black">CC</span>} onClick={() => { }} />
                  <VideoOverlayBtn
                    label={micMuted ? 'Unmute' : 'Mute'}
                    icon={micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    onClick={toggleMic}
                    danger={micMuted}
                  />
                  {!isAudioMode && (
                    <VideoOverlayBtn
                      label={videoMuted ? 'Show' : 'Hide'}
                      icon={videoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      onClick={toggleVideo}
                      danger={videoMuted}
                    />
                  )}
                  <button
                    onClick={() => leaveCall()}
                    className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-lg"
                    style={{ background: '#ea4335', boxShadow: '0 4px 16px rgba(234,67,53,0.45)' }}
                    title="End call"
                  >
                    <PhoneOff className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs row — below video, horizontal scrollable */}
          <div
            className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex items-stretch justify-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <TabBtn icon={<MessageSquare className="w-5 h-5" />} label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')} badge={messages.length || null} />
            {isDoctor && (
              <>
                <TabBtn icon={<FileText className="w-5 h-5" />} label="Prescription" active={activeTab === 'notes'} onClick={() => setActiveTab(activeTab === 'notes' ? null : 'notes')} />
                <TabBtn icon={<Activity className="w-5 h-5" />} label="AI Triage" active={activeTab === 'triage'} onClick={() => setActiveTab(activeTab === 'triage' ? null : 'triage')} />
                {isPrimaryDoctor && (
                  <TabBtn icon={<UserPlus className="w-5 h-5" />} label="Invite Doctor" active={showInviteModal} onClick={() => setShowInviteModal(true)} />
                )}
                {isPrimaryDoctor ? (
                  <TabBtn icon={<CheckCircle2 className="w-5 h-5" />} label="Complete" active={false} onClick={requestCompleteConsultation} accent />
                ) : (
                  <TabBtn icon={<CheckCircle2 className="w-5 h-5" />} label="Submit & Leave" active={false} onClick={() => setActiveTab('notes')} accent />
                )}
              </>
            )}
          </div>
        </div>
        {/* â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 z-40 h-full w-[min(92vw,360px)] flex flex-col overflow-hidden min-h-0"
              style={{ background: '#f8fafc', borderLeft: '1px solid rgba(0,0,0,0.05)' }}
            >
              {/* Sidebar header */}
              <div className="shrink-0 flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 className="text-slate-900 font-heading font-black text-base flex items-center gap-2">
                  {activeTab === 'chat' && <><MessageSquare className="w-4 h-4 text-primary-600" /> Live Chat</>}
                  {activeTab === 'triage' && <><Activity className="w-4 h-4 text-health-600" /> AI Triage</>}
                  {activeTab === 'notes' && <><FileText className="w-4 h-4 text-health-600" /> Clinical Notes</>}
                </h3>
                <button
                  onClick={() => setActiveTab(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* â”€â”€ CHAT TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Encrypted badge */}
                  <div className="shrink-0 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest"
                    style={{ background: 'rgba(5,150,105,0.08)', borderBottom: '1px solid rgba(5,150,105,0.15)', color: '#34d399' }}>
                    <Shield className="w-3 h-3" /> End-to-End Encrypted
                  </div>

                  {/* Messages */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                  >
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 py-12">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.03)' }}>
                          <MessageSquare className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm">No messages yet</p>
                        <p className="text-slate-600 text-xs font-medium">Start the conversation</p>
                      </div>
                    )}
                    <AnimatePresence>
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {/* Avatar dot */}
                            <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden mt-1">
                              <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.senderName}&backgroundColor=${isMe ? '0e7490' : '475569'}`}
                                alt={msg.senderName}
                                className="w-full h-full"
                              />
                            </div>
                            <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-bold px-1 uppercase tracking-wider" style={{ color: isMe ? '#0e7490' : '#94a3b8' }}>
                                {isMe ? 'You' : msg.senderName}
                              </span>
                              <div
                                className="text-sm leading-relaxed px-3.5 py-2.5 break-words"
                                style={{
                                  borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                  background: isMe
                                    ? 'linear-gradient(135deg, #0e7490 0%, #059669 100%)'
                                    : 'rgba(0,0,0,0.08)',
                                  color: isMe ? 'white' : '#334155',
                                  border: isMe ? 'none' : '1px solid rgba(0,0,0,0.08)'
                                }}
                              >
                                {msg.text}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Input bar */}
                  <form
                    onSubmit={handleSendMessage}
                    className="shrink-0 flex items-center gap-2 p-3"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.01)' }}
                  >
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 text-sm font-medium px-4 py-3 rounded-2xl outline-none text-slate-900 placeholder-slate-600 transition-all"
                      style={{
                        background: 'rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(14,116,144,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-900 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 shrink-0"
                      style={{ background: 'linear-gradient(135deg,#0e7490,#059669)' }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* â”€â”€ AI TRIAGE TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === 'triage' && isDoctor && (
                <div
                  className="flex-1 overflow-y-auto p-5 space-y-4"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                >
                  {!appointment?.aiSummary ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 py-16">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <Activity className="w-8 h-8 text-slate-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-slate-600 font-bold text-sm mb-1">No Triage Data</p>
                        <p className="text-slate-600 text-xs font-medium">AI triage not yet completed</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* AI Summary card */}
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(14,116,144,0.3)' }}>
                        <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(14,116,144,0.2)' }}>
                          <Activity className="w-4 h-4 text-primary-600" />
                          <span className="text-[11px] font-black text-primary-300 uppercase tracking-widest">AI Clinical Summary</span>
                          {appointment.aiSummary?.urgency && (
                            <span className="ml-auto text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                              style={{
                                background: appointment.aiSummary.urgency === 'high' ? 'rgba(234,67,53,0.3)' : 'rgba(245,158,11,0.2)',
                                color: appointment.aiSummary.urgency === 'high' ? '#f87171' : '#fbbf24',
                                border: `1px solid ${appointment.aiSummary.urgency === 'high' ? 'rgba(234,67,53,0.4)' : 'rgba(245,158,11,0.3)'}`
                              }}>
                              {appointment.aiSummary.urgency}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-4" style={{ background: 'rgba(0,0,0,0.02)' }}>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {appointment?.aiSummary?.summary || 'No summary provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Symptoms pills if available */}
                      {Array.isArray(appointment?.aiSummary?.symptoms) && appointment.aiSummary.symptoms.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Reported Symptoms</p>
                          <div className="flex flex-wrap gap-2">
                            {appointment.aiSummary.symptoms.map((s, i) => (
                              <span key={i} className="text-xs font-bold px-3 py-1 rounded-full"
                                style={{ background: 'rgba(14,116,144,0.2)', color: '#0e7490', border: '1px solid rgba(14,116,144,0.3)' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transcript */}
                      {Array.isArray(appointment?.aiSummary?.chatHistory) && appointment.aiSummary.chatHistory.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Patient Conversation</p>
                          <div className="space-y-2.5">
                            {appointment?.aiSummary?.chatHistory?.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className="max-w-[88%] text-xs leading-relaxed px-3.5 py-2.5 break-words"
                                  style={{
                                    borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                                    background: msg.role === 'user' ? 'rgba(14,116,144,0.25)' : 'rgba(0,0,0,0.03)',
                                    color: '#334155',
                                    border: msg.role === 'user' ? '1px solid rgba(14,116,144,0.3)' : '1px solid rgba(0,0,0,0.05)'
                                  }}
                                >
                                  <span className="text-[9px] font-black uppercase tracking-widest block mb-1.5 opacity-50">
                                    {msg.role === 'user' ? 'ðŸ‘¤ Patient' : 'ðŸ¤– AI'}
                                  </span>
                                  {msg.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* â”€â”€ AI TRIAGE mic control bar â”€â”€ sticky bottom â”€â”€ */}
              {activeTab === 'triage' && isDoctor && (
                <div
                  className="shrink-0 flex items-center justify-between px-5 py-3 gap-3"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.05)', background: '#ffffff' }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`relative w-2 h-2 rounded-full ${micMuted ? '' : 'bg-green-500'}`}>
                      {!micMuted && <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-60" />}
                      {micMuted && <span className="block w-2 h-2 rounded-full bg-slate-600" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: micMuted ? '#64748b' : '#34d399' }}>
                      {micMuted ? 'Mic muted' : 'Mic live'}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={toggleMic}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all"
                    style={
                      micMuted
                        ? { background: 'rgba(234,67,53,0.18)', color: '#f87171', border: '1px solid rgba(234,67,53,0.35)' }
                        : { background: 'rgba(5,150,105,0.18)', color: '#34d399', border: '1px solid rgba(5,150,105,0.35)' }
                    }
                  >
                    {micMuted
                      ? <><MicOff className="w-4 h-4" /> Unmute</>
                      : <><Mic className="w-4 h-4" /> Mute</>
                    }
                  </motion.button>
                </div>
              )}

              {/* â”€â”€ PRESCRIPTION / NOTES TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === 'notes' && isDoctor && (
                <div
                  className="flex-1 flex flex-col overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
                >
                  <div className="flex-1 p-5 space-y-5">
                    {/* Observations */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">
                        <FileText className="w-3 h-3" /> Clinical Observations
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Enter your clinical observations, diagnosis, and recommendations..."
                        rows={5}
                        className="w-full text-sm font-medium px-4 py-3 rounded-2xl outline-none text-slate-900 placeholder-slate-600 resize-none transition-all leading-relaxed"
                        style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(14,116,144,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                      />
                    </div>

                    {/* Prescription */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                        <Pill className="w-3 h-3" /> Prescription Rx
                      </label>

                      {/* Added meds list */}
                      {prescription.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {prescription.map((med, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-start justify-between p-3.5 rounded-xl gap-3"
                              style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}
                            >
                              <div className="min-w-0">
                                <p className="text-health-300 font-bold text-sm leading-tight">{med.name}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {med.dosage && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.2)', color: '#059669' }}>{med.dosage}</span>}
                                  {med.frequency && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.2)', color: '#059669' }}>{med.frequency}</span>}
                                  {med.duration && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.2)', color: '#059669' }}>{med.duration}</span>}
                                </div>
                              </div>
                              <button
                                onClick={() => setPrescription(p => p.filter((_, j) => j !== i))}
                                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer mt-0.5"
                              >
                                <Plus className="w-3.5 h-3.5 rotate-45" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Add medicine form */}
                      <div className="space-y-2.5 p-4 rounded-2xl" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Add Medicine</p>
                        <input
                          type="text"
                          placeholder="Medicine name *"
                          value={medInput.name}
                          onChange={e => setMedInput({ ...medInput, name: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 rounded-xl outline-none text-slate-900 placeholder-slate-600 transition-all"
                          style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(14,116,144,0.5)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 500mg)"
                            value={medInput.dosage}
                            onChange={e => setMedInput({ ...medInput, dosage: e.target.value })}
                            className="text-sm px-3.5 py-2.5 rounded-xl outline-none text-slate-900 placeholder-slate-600 transition-all"
                            style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)' }}
                            onFocus={e => e.target.style.borderColor = 'rgba(14,116,144,0.5)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                          />
                          <input
                            type="text"
                            placeholder="Frequency"
                            value={medInput.frequency}
                            onChange={e => setMedInput({ ...medInput, frequency: e.target.value })}
                            className="text-sm px-3.5 py-2.5 rounded-xl outline-none text-slate-900 placeholder-slate-600 transition-all"
                            style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)' }}
                            onFocus={e => e.target.style.borderColor = 'rgba(14,116,144,0.5)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Duration (e.g. 7 days)"
                            value={medInput.duration}
                            onChange={e => setMedInput({ ...medInput, duration: e.target.value })}
                            className="flex-1 text-sm px-3.5 py-2.5 rounded-xl outline-none text-slate-900 placeholder-slate-600 transition-all"
                            style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)' }}
                            onFocus={e => e.target.style.borderColor = 'rgba(14,116,144,0.5)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                          />
                          <button
                            onClick={addMedicine}
                            disabled={!medInput.name.trim()}
                            className="px-4 rounded-xl text-slate-900 cursor-pointer hover:scale-105 transition-all disabled:opacity-30 flex items-center gap-1.5 font-bold text-xs shrink-0"
                            style={{ background: 'linear-gradient(135deg,#059669,#06b6d4)' }}
                          >
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sign & Complete â€” sticky bottom */}
                  <div className="shrink-0 p-4" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    {isPrimaryDoctor ? (
                      <button
                        onClick={requestCompleteConsultation}
                        className="w-full py-3.5 rounded-2xl font-heading font-black text-slate-900 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-all text-sm"
                        style={{ background: 'linear-gradient(135deg,#059669,#0e7490)', boxShadow: '0 6px 20px rgba(5,150,105,0.35)' }}
                      >
                        <CheckCircle2 className="w-5 h-5" /> Sign & Complete Consultation
                      </button>
                    ) : (
                      <button
                        onClick={submitInvitedDoctorNotes}
                        className="w-full py-3.5 rounded-2xl font-heading font-black text-slate-900 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-all text-sm"
                        style={{ background: 'linear-gradient(135deg,#059669,#0e7490)', boxShadow: '0 6px 20px rgba(5,150,105,0.35)' }}
                      >
                        <CheckCircle2 className="w-5 h-5" /> Submit Notes & Leave
                      </button>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* Small round button INSIDE the video overlay */
function VideoOverlayBtn({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
      style={{
        background: danger ? 'rgba(234,67,53,0.1)' : '#f1f5f9',
        border: danger ? '1px solid rgba(234,67,53,0.3)' : '1px solid #e2e8f0',
        color: danger ? '#ef4444' : '#475569'
      }}
    >
      {icon}
    </button>
  );
}

/* Tab button in the bottom row below the video */
function TabBtn({ icon, label, active, onClick, badge, accent }) {
  return (
    <button
      onClick={onClick}
      className="relative w-28 sm:w-32 flex flex-col items-center justify-center gap-1.5 py-3 shrink-0 cursor-pointer transition-all group hover:scale-100 hover:overflow-hidden"
      style={{
        border: active ? '1px solid rgba(14,116,144,0.35)' : '1px solid rgba(100,116,139,0.2)',
        background: active ? 'rgba(14,116,144,0.08)' : 'transparent',
        borderBottom: active ? '2px solid #0e7490' : '2px solid transparent',
        color: active ? '#0e7490' : accent ? '#059669' : '#64748b'
      }}
    >
      <span className="group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{label}</span>
      {badge && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 text-slate-900 text-[9px] font-black flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </button>
  );
}

function RoundBtn({ icon, onClick, muted, label }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer group">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
        style={{
          background: muted ? 'rgba(234,67,53,0.2)' : 'rgba(0,0,0,0.1)',
          border: muted ? '1px solid rgba(234,67,53,0.4)' : '1px solid rgba(255,255,255,0.12)',
          color: muted ? '#f87171' : 'white'
        }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
    </button>
  );
}

function ControlBtn({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-1 cursor-pointer group">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-105"
        style={{
          background: active ? 'rgba(14,116,144,0.25)' : 'rgba(0,0,0,0.05)',
          border: active ? '1px solid rgba(14,116,144,0.5)' : '1px solid rgba(0,0,0,0.08)',
          color: active ? '#0e7490' : '#94a3b8'
        }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold" style={{ color: active ? '#0e7490' : '#64748b' }}>{label}</span>
      {badge && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-slate-900 text-[9px] font-black flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </button>
  );
}

