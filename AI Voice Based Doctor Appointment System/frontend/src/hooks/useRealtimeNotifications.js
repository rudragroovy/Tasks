import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const MAX_NOTIFICATIONS = 50;

function buildStorageKey(userId) {
  return `carebridge.notifications.${userId}`;
}

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function parseAiSummary(aiSummary) {
  if (!aiSummary) return {};
  if (typeof aiSummary === 'object') return aiSummary;
  return parseJson(aiSummary, {});
}

function toTitleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toIsoNow() {
  return new Date().toISOString();
}

function buildAppointmentLabel(payload) {
  const appointmentId = String(payload?.id || '').trim();
  return appointmentId ? `#${appointmentId}` : 'Appointment';
}

function buildServiceLabel(payload) {
  const summary = parseAiSummary(payload?.aiSummary);
  return (
    summary?.serviceName ||
    summary?.service ||
    summary?.service_name ||
    summary?.consultation_type ||
    summary?.primary_symptom ||
    ''
  );
}

function buildPatientLabel(payload) {
  return String(payload?.familyMember?.name || payload?.patient?.name || '').trim();
}

function createNotificationFromEvent(eventName, payload, role) {
  if (!payload || typeof payload !== 'object') return null;

  if (eventName === 'appointment:new') {
    const appointmentLabel = buildAppointmentLabel(payload);
    const serviceLabel = buildServiceLabel(payload);
    const patientLabel = buildPatientLabel(payload);
    const descriptionParts = [];
    if (role === 'DOCTOR' && patientLabel) descriptionParts.push(patientLabel);
    if (serviceLabel) descriptionParts.push(serviceLabel);
    return {
      id: `${eventName}:${payload.id || 'unknown'}:${Date.now()}`,
      signature: `${eventName}:${payload.id || 'unknown'}`,
      title: role === 'DOCTOR' ? 'New appointment request' : 'Appointment booked',
      description: [appointmentLabel, ...descriptionParts].filter(Boolean).join(' | '),
      createdAt: toIsoNow(),
      read: false,
      route: role === 'DOCTOR' ? '/doctor/appointments?tab=current' : '/patient/account?tab=medical-history',
    };
  }

  if (eventName === 'appointment:updated') {
    const appointmentLabel = buildAppointmentLabel(payload);
    const statusLabel = toTitleCase(payload?.status || 'updated');
    return {
      id: `${eventName}:${payload.id || 'unknown'}:${payload?.status || 'unknown'}:${Date.now()}`,
      signature: `${eventName}:${payload.id || 'unknown'}:${payload?.status || 'unknown'}`,
      title: 'Appointment updated',
      description: `${appointmentLabel} | ${statusLabel}`,
      createdAt: toIsoNow(),
      read: false,
      route: role === 'DOCTOR' ? '/doctor/appointments?tab=current' : '/patient/account?tab=medical-history',
    };
  }

  return null;
}

export function formatNotificationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const lastSignatureRef = useRef('');
  const lastSignatureAtRef = useRef(0);

  useEffect(() => {
    const userId = String(user?.id || '').trim();
    if (!userId) {
      setNotifications([]);
      return;
    }

    const raw = localStorage.getItem(buildStorageKey(userId));
    const parsed = parseJson(raw, []);
    setNotifications(Array.isArray(parsed) ? parsed : []);
  }, [user?.id]);

  useEffect(() => {
    const userId = String(user?.id || '').trim();
    if (!userId) return;
    localStorage.setItem(buildStorageKey(userId), JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  }, [notifications, user?.id]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timeout);
  }, [toast]);

  const pushNotification = useCallback((entry) => {
    if (!entry) return;

    const now = Date.now();
    const signature = String(entry.signature || '');
    if (signature && signature === lastSignatureRef.current && now - lastSignatureAtRef.current < 2000) {
      return;
    }
    lastSignatureRef.current = signature;
    lastSignatureAtRef.current = now;

    setNotifications((current) => [entry, ...current].slice(0, MAX_NOTIFICATIONS));
  }, []);

  useEffect(() => {
    if (!socket || !user?.id) return undefined;

    const handleAppointmentNew = (payload) => {
      const next = createNotificationFromEvent('appointment:new', payload, user.role);
      if (!next) return;
      pushNotification(next);
      if (user.role === 'DOCTOR') {
        setToast({
          id: `toast:${Date.now()}`,
          title: next.title,
          description: next.description,
        });
      }
    };

    const handleAppointmentUpdated = (payload) => {
      const next = createNotificationFromEvent('appointment:updated', payload, user.role);
      if (!next) return;
      pushNotification(next);
    };

    socket.on('appointment:new', handleAppointmentNew);
    socket.on('appointment:updated', handleAppointmentUpdated);

    return () => {
      socket.off('appointment:new', handleAppointmentNew);
      socket.off('appointment:updated', handleAppointmentUpdated);
    };
  }, [socket, user?.id, user?.role, pushNotification]);

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item?.read ? 0 : 1), 0),
    [notifications]
  );

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markRead = useCallback((notificationId) => {
    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    notifications,
    unreadCount,
    markAllRead,
    clearAll,
    markRead,
    toast,
    dismissToast,
  };
}
