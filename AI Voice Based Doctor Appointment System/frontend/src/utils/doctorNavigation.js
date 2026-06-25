export const DOCTOR_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'waiting-room', label: 'Waiting Room' },
  { key: 'appointments', label: 'My Appointment' },
  { key: 'patients', label: 'My Patients' },
  { key: 'chat', label: 'Chat' },
  { key: 'more', label: 'More Options' },
];

export function handleDoctorNavClick(key, navigate) {
  if (key === 'dashboard') navigate('/dashboard');
  if (key === 'waiting-room') navigate('/doctor/waiting-room');
  if (key === 'appointments') navigate('/doctor/appointments');
  if (key === 'patients') navigate('/doctor/patients');
  if (key === 'chat') navigate('/doctor/chat');
  if (key === 'pay-out') navigate('/doctor/payouts');
  if (key === 'medical-documents') navigate('/doctor/medical-documents');
  if (key === 'invoices') navigate('/doctor/invoices');
  if (key === 'reviews-list') navigate('/doctor/reviews');
  if (key === 'my-profile') navigate('/doctor/profile');
  if (key === 'change-password') navigate('/doctor/profile?tab=settings');
  if (key === 'patient-reports') navigate('/doctor/patients');
  if (key === 'reminders') navigate('/doctor/appointments?tab=upcoming');
  if (key === 'call-recordings') navigate('/doctor/chat');
}
