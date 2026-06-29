import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Avatar,
  Button,
  Card,
  ConfigProvider,
  Empty,
  Input,
  List,
  Segmented,
  Typography,
} from 'antd';
import { Search } from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { formatDoctorName } from '../utils/doctorName';
import { getPractitionerTypeLabel } from '../utils/doctorConsultation';

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

function isFamilyAppointment(appointment) {
  return Boolean(appointment?.familyMemberId || appointment?.familyMember?.id);
}

function buildGroupTitle(doctorName, patientName, familyName) {
  const parts = [doctorName, patientName, familyName]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(' • ');
}

function getDoctorFirstName(doctorName) {
  const raw = String(doctorName || '').trim();
  if (!raw) return 'Doctor';
  const withoutPrefix = raw.replace(/^dr\.?\s+/i, '').trim();
  const first = withoutPrefix.split(/\s+/)[0];
  return first || 'Doctor';
}

function getFirstName(name, fallback = 'User') {
  const raw = String(name || '').trim();
  if (!raw) return fallback;
  const first = raw.split(/\s+/)[0];
  return first || fallback;
}

function getMessageSenderLabel(message, patientId, doctorName, patientDisplayName) {
  if (message?.senderRole === 'PATIENT') {
    if (message?.senderId === patientId) return 'You';
    return message?.senderName || patientDisplayName || 'Care Participant';
  }
  if (message?.senderRole === 'DOCTOR') return message?.senderName || doctorName;
  return message?.senderName || 'System';
}

export default function PatientChat() {
  const { user } = useAuth();
  const socket = useSocket();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [chatScope, setChatScope] = useState('chat');
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [newMessage, setNewMessage] = useState('');

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

  const conversations = useMemo(() => {
    const groupedByDoctor = new Map();

    appointments.forEach((appointment) => {
      const isGroupConversation = isFamilyAppointment(appointment);
      const doctorId = appointment?.doctor?.id || appointment?.doctorId;
      const fallbackDoctorName = formatDoctorName(appointment?.doctor?.name, appointment?.doctor?.name || 'Doctor');
      const familyMemberId = appointment?.familyMember?.id || appointment?.familyMemberId || null;
      const familyMemberName = appointment?.familyMember?.name || 'Family Member';
      const linkedFamilyUserName = appointment?.familyMember?.linkedUser?.name || '';
      const resolvedFamilyName = linkedFamilyUserName || familyMemberName;
      const primaryPatientName = appointment?.patient?.name || 'Patient';
      const keyBase = doctorId || `name:${fallbackDoctorName.toLowerCase()}`;
      const key = isGroupConversation
        ? `group:${keyBase}:${familyMemberId || familyMemberName.toLowerCase()}`
        : `chat:${keyBase}`;

      if (!groupedByDoctor.has(key)) {
        groupedByDoctor.set(key, {
          id: key,
          scope: isGroupConversation ? 'group' : 'chat',
          doctorName: fallbackDoctorName,
          doctorSpecialization: getPractitionerTypeLabel(appointment?.doctor, 'General Practitioner'),
          patientName: primaryPatientName,
          familyMemberName: isGroupConversation ? resolvedFamilyName : '',
          groupTitle: isGroupConversation
            ? buildGroupTitle(
              getDoctorFirstName(fallbackDoctorName),
              getFirstName(primaryPatientName, 'Patient'),
              getFirstName(resolvedFamilyName, 'User')
            )
            : '',
          avatarSeed: fallbackDoctorName,
          messages: [],
          latestConsultedAppointmentId: null,
          latestConsultedAt: null,
          latestAppointmentId: null,
          latestAppointmentAt: null,
        });
      }

      const group = groupedByDoctor.get(key);
      const messages = Array.isArray(appointment?.messages) ? appointment.messages : [];
      const appointmentActivityAt = appointment?.updatedAt || appointment?.createdAt || null;
      const appointmentActivityTs = getTimestampValue(appointmentActivityAt);
      const linkedFamilyUserId = appointment?.familyMember?.linkedUser?.id || null;

      if (appointment?.id && appointmentActivityTs >= getTimestampValue(group.latestAppointmentAt)) {
        group.latestAppointmentId = appointment.id;
        group.latestAppointmentAt = appointmentActivityAt;
      }

      const isConsultedAppointment = ['ACCEPTED', 'COMPLETED'].includes(String(appointment?.status || '').toUpperCase());
      if (isConsultedAppointment && appointment?.id && appointmentActivityTs >= getTimestampValue(group.latestConsultedAt)) {
        group.latestConsultedAppointmentId = appointment.id;
        group.latestConsultedAt = appointmentActivityAt;
      }

      messages.forEach((message) => {
        let resolvedSenderName = String(message?.senderName || '').trim();
        if (!resolvedSenderName) {
          if (message?.senderRole === 'DOCTOR') {
            resolvedSenderName = fallbackDoctorName;
          } else if (message?.senderRole === 'PATIENT') {
            if (message?.senderId === appointment?.patientId) {
              resolvedSenderName = primaryPatientName;
            } else if (linkedFamilyUserId && message?.senderId === linkedFamilyUserId) {
              resolvedSenderName = familyMemberName;
            } else {
              resolvedSenderName = familyMemberName || primaryPatientName;
            }
          }
        }

        group.messages.push({
          ...message,
          senderName: resolvedSenderName || message?.senderName || '',
          appointmentId: message?.appointmentId || appointment?.id,
        });
      });
    });

    return Array.from(groupedByDoctor.values())
      .map((group) => {
        const sortedMessages = [...group.messages].sort((a, b) => {
          return getTimestampValue(a?.createdAt || a?.updatedAt) - getTimestampValue(b?.createdAt || b?.updatedAt);
        });
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const lastActivity = lastMessage?.createdAt || lastMessage?.updatedAt || group.latestConsultedAt || group.latestAppointmentAt;
        const targetAppointmentId = group.latestConsultedAppointmentId || group.latestAppointmentId || null;
        const hasConsultedHistory = Boolean(group.latestConsultedAppointmentId);

        return {
          ...group,
          messages: sortedMessages,
          lastMessageText: (lastMessage?.text || '').trim() || (hasConsultedHistory ? 'Start a new conversation' : ''),
          lastActivity,
          timeLabel: formatMessageTime(lastActivity),
          targetAppointmentId,
          hasConsultedHistory,
        };
      })
      .filter((conversation) => conversation.messages.length > 0 || conversation.hasConsultedHistory)
      .sort((a, b) => getTimestampValue(b.lastActivity) - getTimestampValue(a.lastActivity));
  }, [appointments]);

  const scopedConversations = useMemo(
    () => conversations.filter((conversation) => conversation.scope === chatScope),
    [conversations, chatScope]
  );

  const filteredConversations = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return scopedConversations;
    return scopedConversations.filter((conversation) => {
      return (
        conversation.groupTitle.toLowerCase().includes(q) ||
        conversation.doctorName.toLowerCase().includes(q) ||
        conversation.patientName.toLowerCase().includes(q) ||
        conversation.familyMemberName.toLowerCase().includes(q) ||
        conversation.doctorSpecialization.toLowerCase().includes(q) ||
        conversation.lastMessageText.toLowerCase().includes(q)
      );
    });
  }, [scopedConversations, searchText]);

  const selectedConversation = useMemo(
    () => scopedConversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [scopedConversations, selectedConversationId]
  );

  useEffect(() => {
    if (!scopedConversations.length) {
      if (selectedConversationId !== null) setSelectedConversationId(null);
      return;
    }
    if (
      !selectedConversationId ||
      !scopedConversations.some((conversation) => conversation.id === selectedConversationId)
    ) {
      setSelectedConversationId(scopedConversations[0].id);
    }
  }, [scopedConversations, selectedConversationId]);

  useEffect(() => {
    setNewMessage('');
  }, [selectedConversationId]);

  const sendMessage = () => {
    const text = String(newMessage || '').trim();
    if (!text || !socket || !selectedConversation?.targetAppointmentId) return;
    socket.emit('chat:send', {
      appointmentId: selectedConversation.targetAppointmentId,
      senderId: user?.id,
      senderRole: user?.role,
      senderName: user?.name,
      text,
    });
    setNewMessage('');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0e7490',
          borderRadius: 12,
          fontFamily: '"Outfit", sans-serif',
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
      <div className="h-[100dvh] overflow-hidden bg-[#f5f8ff] pt-16 text-slate-900">
        <LandingNavbar activeKey="chat" />

        <main className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-1 px-4 py-3 sm:px-6 lg:px-8">
          <Card bordered={false} className="h-full w-full shadow-sm [&_.ant-card-body]:h-full [&_.ant-card-body]:overflow-hidden [&_.ant-card-body]:p-0">
            <div className="grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[290px_minmax(0,1fr)]">
              <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                  {filteredConversations.length === 0 && !loading ? (
                    <div className="flex h-full min-h-[240px] items-center justify-center px-3">
                      <Empty description={chatScope === 'group' ? 'No groups yet' : 'No doctor chat history yet'} />
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
                                    {conversation.scope === 'group' ? conversation.groupTitle : conversation.doctorName}
                                  </Text>
                                  <Text className="!whitespace-nowrap !text-xs !font-bold !text-slate-700">
                                    {conversation.timeLabel}
                                  </Text>
                                </div>
                                <Text className="!block !truncate !text-xs !text-slate-500">
                                  {conversation.scope === 'group'
                                    ? 'Family booking group'
                                    : conversation.doctorSpecialization}
                                </Text>
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

              <section className="min-h-0 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200">
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
                              {selectedConversation.scope === 'group'
                                ? selectedConversation.groupTitle
                                : selectedConversation.doctorName}
                            </Text>
                            <Text className="!text-xs !text-slate-500">
                              {selectedConversation.scope === 'group'
                                ? 'Family booking group'
                                : selectedConversation.doctorSpecialization}
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
                                          selectedConversation.doctorName,
                                          selectedConversation.familyMemberName
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
                      <div className="border-t border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-end gap-2">
                          <Input.TextArea
                            value={newMessage}
                            onChange={(event) => setNewMessage(event.target.value)}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            placeholder="Type a message..."
                            onPressEnter={(event) => {
                              if (event.shiftKey) return;
                              event.preventDefault();
                              sendMessage();
                            }}
                          />
                          <Button
                            type="primary"
                            onClick={sendMessage}
                            disabled={!String(newMessage || '').trim() || !selectedConversation?.targetAppointmentId}
                          >
                            Send
                          </Button>
                        </div>
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
