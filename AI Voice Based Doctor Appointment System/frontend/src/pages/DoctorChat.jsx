import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Avatar,
  Card,
  ConfigProvider,
  Empty,
  Input,
  List,
  Segmented,
  Typography,
} from 'antd';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import SharedNavbar from '../components/SharedNavbar';
import { formatDoctorName } from '../utils/doctorName';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatMessageTime(rawDate) {
  if (!rawDate) return '';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getDateKey(rawDate) {
  if (!rawDate) return 'unknown';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatMessageDate(rawDate) {
  if (!rawDate) return 'Unknown Date';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return 'Unknown Date';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTimestampValue(rawDate) {
  if (!rawDate) return 0;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

function getMessageSenderLabel(message, doctorId, patientName, doctorName) {
  if (message?.senderRole === 'PATIENT') return patientName;
  if (message?.senderRole === 'DOCTOR') {
    return message?.senderId === doctorId ? 'You' : doctorName;
  }
  return message?.senderName || 'System';
}

export default function DoctorChat() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [chatScope, setChatScope] = useState('chat');
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
  }, [user?.doctorProfile?.isOnline]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/appointments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const list = Array.isArray(response.data) ? response.data : [];
        setAppointments(list);
      } catch (error) {
        console.error('Failed to fetch chat conversations', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    if (!socket) return;
    if (!Array.isArray(appointments) || appointments.length === 0) return;

    appointments.forEach((appointment) => {
      if (appointment?.id) {
        socket.emit('join_appointment', appointment.id);
      }
    });
  }, [appointments, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (message) => {
      if (!message?.appointmentId) return;
      setAppointments((prev) =>
        prev.map((appointment) => {
          if (appointment.id !== message.appointmentId) return appointment;
          const currentMessages = Array.isArray(appointment.messages) ? appointment.messages : [];
          return {
            ...appointment,
            messages: [...currentMessages, message],
            updatedAt: message.createdAt || appointment.updatedAt,
          };
        })
      );
    };

    socket.on('chat:message', handleIncomingMessage);
    return () => socket.off('chat:message', handleIncomingMessage);
  }, [socket]);

  const doctorName = formatDoctorName(user?.name, 'Doctor');

  const doctorNavItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'waiting-room', label: 'Waiting Room' },
    { key: 'appointments', label: 'My Appointment' },
    { key: 'patients', label: 'My Patients' },
    { key: 'chat', label: 'Chat' },
    { key: 'more', label: 'More Options' },
  ];

  const handleDoctorNavClick = (key) => {
    if (key === 'dashboard') navigate('/dashboard');
    if (key === 'waiting-room') navigate('/doctor/waiting-room');
    if (key === 'appointments') navigate('/doctor/appointments');
    if (key === 'patients') navigate('/doctor/patients');
    if (key === 'chat') navigate('/doctor/chat');
    if (key === 'pay-out') navigate('/doctor/payouts');
  };

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      await axios.put(
        `${API_URL}/api/doctors/me/online`,
        { isOnline: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to update doctor online status', error);
      setIsOnline(!nextStatus);
    }
  };

  const conversations = useMemo(() => {
    const groupedByPatient = new Map();

    appointments.forEach((appointment) => {
      const patientId = appointment?.patient?.id || appointment?.patientId;
      const fallbackPatientName = appointment?.patient?.name || appointment?.familyMember?.name || 'Unknown Patient';
      const key = patientId || `name:${fallbackPatientName.toLowerCase()}`;

      if (!groupedByPatient.has(key)) {
        groupedByPatient.set(key, {
          id: key,
          patientName: appointment?.patient?.name || fallbackPatientName,
          patientEmail: appointment?.patient?.email || '',
          avatarSeed: appointment?.patient?.name || fallbackPatientName,
          messages: [],
        });
      }

      const group = groupedByPatient.get(key);
      const messages = Array.isArray(appointment?.messages) ? appointment.messages : [];

      messages.forEach((message) => {
        group.messages.push({
          ...message,
          appointmentId: message?.appointmentId || appointment?.id,
        });
      });
    });

    return Array.from(groupedByPatient.values())
      .map((group) => {
        const sortedMessages = [...group.messages].sort((a, b) => {
          return getTimestampValue(a?.createdAt || a?.updatedAt) - getTimestampValue(b?.createdAt || b?.updatedAt);
        });
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const lastActivity = lastMessage?.createdAt || lastMessage?.updatedAt;

        return {
          ...group,
          messages: sortedMessages,
          lastMessageText: (lastMessage?.text || '').trim(),
          lastActivity,
          timeLabel: formatMessageTime(lastActivity),
        };
      })
      .filter((conversation) => conversation.messages.length > 0 && Boolean(conversation.lastMessageText))
      .sort((a, b) => getTimestampValue(b.lastActivity) - getTimestampValue(a.lastActivity));
  }, [appointments]);

  const filteredConversations = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conversation) => {
      return (
        conversation.patientName.toLowerCase().includes(q) ||
        conversation.patientEmail.toLowerCase().includes(q) ||
        conversation.lastMessageText.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchText]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!conversations.length) {
      if (selectedConversationId !== null) setSelectedConversationId(null);
      return;
    }
    if (!selectedConversationId || !conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const pendingCount = appointments.filter((appointment) => appointment.status === 'PENDING').length;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0e7490',
          borderRadius: 12,
          fontFamily: '"Noto Sans", sans-serif',
        },
        components: {
          Segmented: {
            trackBg: '#e6f7fb',
            itemColor: '#155e75',
            itemHoverColor: '#0e7490',
            itemSelectedBg: '#0e7490',
            itemSelectedColor: '#ffffff',
          },
        },
      }}
    >
      <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
        <SharedNavbar
          user={user}
          brandLabel="MyDrScripts"
          onLogoClick={() => navigate('/dashboard')}
          navItems={doctorNavItems}
          activeTab="chat"
          onTabClick={handleDoctorNavClick}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
          pendingCount={pendingCount}
          doctorName={doctorName}
          onLogout={logout}
          showMobileTabs
        />

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <Card bordered={false} className="shadow-sm">
            <div className="grid min-h-[620px] gap-3 lg:grid-cols-[290px_minmax(0,1fr)]">
              <aside className="flex h-full min-h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="p-3">
                  <Input
                    allowClear
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search"
                    prefix={<Search size={14} />}
                    size="large"
                  />
                </div>

                <div className="px-3 pb-3">
                  <Title level={4} style={{ margin: 0 }}>
                    Messages
                  </Title>
                </div>

                <div className="px-3 pb-3">
                  <Segmented
                    block
                    value={chatScope}
                    onChange={setChatScope}
                    options={[
                      { value: 'chat', label: 'Chat' },
                      { value: 'group', label: 'Group' },
                    ]}
                    style={{ padding: 4 }}
                  />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pb-2">
                  {chatScope === 'group' ? (
                    <div className="flex h-full min-h-[240px] items-center justify-center px-3">
                      <Empty description="No groups yet" />
                    </div>
                  ) : filteredConversations.length === 0 && !loading ? (
                    <div className="flex h-full min-h-[240px] items-center justify-center px-3">
                      <Empty description="No patient chat history yet" />
                    </div>
                  ) : (
                    <List
                      loading={loading}
                      dataSource={filteredConversations}
                      renderItem={(conversation) => {
                        const isActive = selectedConversationId === conversation.id;
                        return (
                          <List.Item
                            onClick={() => setSelectedConversationId(conversation.id)}
                            className={`mx-2 cursor-pointer rounded-xl px-2 py-2 transition-colors ${
                              isActive ? 'bg-primary-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex w-full items-start gap-2">
                              <Avatar
                                size={44}
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  conversation.avatarSeed
                                )}&backgroundColor=f1f5f9`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <Text strong className="!truncate !text-base !text-primary-900">
                                    {conversation.patientName}
                                  </Text>
                                  <Text className="!whitespace-nowrap !text-xs !font-bold !text-slate-700">
                                    {conversation.timeLabel}
                                  </Text>
                                </div>
                                <Text className="!block !truncate !text-sm !text-slate-600">
                                  {conversation.lastMessageText}
                                </Text>
                              </div>
                            </div>
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </div>
              </aside>

              <section className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex h-full min-h-[600px] flex-col overflow-hidden rounded-xl border border-slate-200">
                  {!selectedConversation ? (
                    <div className="flex h-full items-center justify-center p-8 text-center">
                      <Text className="!text-[34px] !font-semibold !text-primary-900">
                        Please select a chat from the list to start messaging...
                      </Text>
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            size={42}
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              selectedConversation.avatarSeed
                            )}&backgroundColor=f1f5f9`}
                          />
                          <div className="min-w-0">
                            <Text strong className="!block !truncate !text-base">
                              {selectedConversation.patientName}
                            </Text>
                            <Text className="!text-xs !text-slate-500">
                              Combined conversation history
                            </Text>
                          </div>
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30 px-4 py-4">
                        {selectedConversation.messages.length === 0 ? (
                          <div className="flex h-full items-center justify-center">
                            <Empty description="No messages in this chat yet" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedConversation.messages.map((message, index) => {
                              const isMine = message?.senderId === user?.id;
                              const messageDate = message?.createdAt || message?.updatedAt;
                              const currentDateKey = getDateKey(messageDate);
                              const previousMessage = index > 0 ? selectedConversation.messages[index - 1] : null;
                              const previousDateKey = getDateKey(
                                previousMessage?.createdAt || previousMessage?.updatedAt
                              );
                              const showDateDivider = index === 0 || currentDateKey !== previousDateKey;

                              return (
                                <div key={`${message?.id || index}-${index}`} className="space-y-1.5">
                                  {showDateDivider ? (
                                    <div className="flex items-center justify-center py-1">
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                        {formatMessageDate(messageDate)}
                                      </span>
                                    </div>
                                  ) : null}

                                  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                      className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                                        isMine
                                          ? 'rounded-br-md bg-primary-700 text-white'
                                          : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                                      }`}
                                    >
                                      <p
                                        className={`mb-1 text-[10px] font-black uppercase tracking-wider ${
                                          isMine ? 'text-primary-100' : 'text-slate-400'
                                        }`}
                                      >
                                        {getMessageSenderLabel(
                                          message,
                                          user?.id,
                                          selectedConversation.patientName,
                                          doctorName
                                        )}
                                      </p>
                                      <p className="text-sm">{message?.text}</p>
                                      <p
                                        className={`mt-1 text-[10px] font-semibold ${
                                          isMine ? 'text-primary-100/90' : 'text-slate-400'
                                        }`}
                                      >
                                        {formatMessageTime(messageDate)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </Card>
        </main>
      </div>
    </ConfigProvider>
  );
}
