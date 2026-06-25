import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Camera, History, Info, Mail, Smartphone, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SharedNavbar from '../components/SharedNavbar';
import DoctorSlotSettings from '../components/doctor/DoctorSlotSettings';
import { formatDoctorName } from '../utils/doctorName';
import { DOCTOR_NAV_ITEMS, handleDoctorNavClick as navigateDoctorNavClick } from '../utils/doctorNavigation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PROFILE_TABS = [
  { key: 'personal-info', label: 'Personal Info' },
  { key: 'document', label: 'Document' },
  { key: 'service-slots', label: 'Service Slots' },
  { key: 'bank-details', label: 'Bank details' },
  { key: 'settings', label: 'Settings' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const QUALIFICATION_OPTIONS = ['MBBS', 'MD', 'MS', 'BDS', 'DM'];
const PRACTITIONER_TYPES = [
  'General Practitioner (GP)',
  'Specialist',
  'Consultant',
  'Resident Medical Officer',
];
const EXPERIENCE_OPTIONS = ['0-1', '2-5', '6-10', '11-15', '16+'];
const SERVICE_OPTIONS = [
  'General Consultation',
  'Follow-up',
  'Chronic Care Plan',
  'Mental Health Plan',
  'Prescription Renewal',
];

function splitUserName(fullName) {
  const cleaned = String(fullName || '')
    .replace(/^Dr\.?\s*/i, '')
    .trim();
  if (!cleaned) return { givenName: '', familyName: '' };
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 1) return { givenName: tokens[0], familyName: '' };
  return {
    givenName: tokens[0],
    familyName: tokens.slice(1).join(' '),
  };
}

function buildProfileState(user) {
  const profile = user?.doctorProfile || {};
  const { givenName: fallbackGivenName, familyName: fallbackFamilyName } = splitUserName(user?.name);
  return {
    givenName: profile.givenName || fallbackGivenName,
    secondaryName: profile.secondaryName || '',
    familyName: profile.familyName || fallbackFamilyName,
    noFamilyName: profile.noFamilyName ?? false,
    gender: profile.gender || 'Male',
    dateOfBirth: profile.dateOfBirth || '',
    phoneCode: profile.phoneCode || '+91',
    phoneNumber: profile.phone || '',
    email: user?.email || '',
    address: profile.address || '',
    experience: profile.experienceRange || (profile.experienceYears ? String(profile.experienceYears) : '0-1'),
    qualification: profile.qualification || 'MBBS',
    practitionerType: profile.practitionerType || 'General Practitioner (GP)',
    services: profile.services || '',
    about: profile.about || '',
    ahpraNumber: profile.ahpraNumber || '',
    prescriberNumber: profile.prescriberNumber || '',
    providerNumber: profile.providerNumber || '',
    hpiIndividualNumber: profile.hpiIndividualNumber || '',
    hpioNumber: profile.hpioNumber || '',
    saveMyHINumber: profile.saveMyHINumber ?? true,
    mimsUserId: profile.mimsUserId || '',
    mimsEulaAccepted: profile.mimsEulaAccepted ?? false,
    mimsTermsAccepted: profile.mimsTermsAccepted ?? false,
    prescriptionEntityId: profile.prescriptionEntityId || '',
    prescriptionAccessEnabled: profile.prescriptionAccessEnabled ?? true,
    accountHolderName: profile.accountHolderName || '',
    accountNumber: profile.accountNumber || '',
    routingNumber: profile.routingNumber || '',
    autoDraftNotesEnabled: profile.autoDraftNotesEnabled ?? false,
    showOnlineOnLogin: profile.showOnlineOnLogin ?? true,
    otpDeliveryChannel: profile.otpDeliveryChannel || 'BOTH',
    emailChannelConfigured: Boolean(String(user?.email || '').trim()),
    phoneChannelConfigured: Boolean(String(profile.phone || '').trim()),
    hiStatusLabel: profile.hpiIndividualNumber ? 'Configured' : 'Not Set',
    mimsStatusLabel: profile.mimsUserId ? 'Configured' : 'Not Set',
    otpDeliveryDescription:
      'Choose where you receive your one-time login code based on your configured contact details.',
    phoneChannelHint: profile.phone ? '' : 'Add a phone number in profile to use SMS OTP.',
    otpSecurityNote: profile.phone
      ? 'Your login code is delivered only to configured channels.'
      : 'Phone channel is missing. OTP will be delivered using email only.',
    otpSecurityActionText:
      'Update your email and phone details from your Profile to enable additional options.',
    hiInfoUrl: 'https://www.servicesaustralia.gov.au/health-identifiers-for-health-professionals',
    hiInfoText: 'Learn more about Health Identifiers.',
  };
}

function composeProfileName(profile, fallbackName) {
  const parts = [
    profile?.givenName,
    profile?.secondaryName,
    profile?.noFamilyName ? '' : profile?.familyName,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return parts.join(' ').trim() || fallbackName;
}

export default function DoctorProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = useMemo(() => {
    const requested = (searchParams.get('tab') || 'personal-info').toLowerCase();
    return PROFILE_TABS.some((tab) => tab.key === requested) ? requested : 'personal-info';
  }, [searchParams]);

  const [activeProfileTab, setActiveProfileTab] = useState(initialTab);
  const [isOnline, setIsOnline] = useState(Boolean(user?.doctorProfile?.isOnline));
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(() => buildProfileState(user));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMessage, setBankMessage] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    setActiveProfileTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setIsOnline(Boolean(user?.doctorProfile?.isOnline));
    setProfile(buildProfileState(user));
  }, [user]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/appointments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setAppointments(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch profile appointment context', error);
        setAppointments([]);
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchDoctorProfile = async () => {
      if (!user || user.role !== 'DOCTOR') return;

      try {
        const response = await axios.get(`${API_URL}/api/doctors/me/profile`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!isMounted) return;
        setProfile((prev) => ({ ...prev, ...(response.data || {}) }));
        if (typeof response.data?.isOnline === 'boolean') {
          setIsOnline(response.data.isOnline);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch doctor profile', error);
        }
      }
    };

    fetchDoctorProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const fetchDoctorSettings = async () => {
      if (!user || user.role !== 'DOCTOR') return;

      setSettingsLoading(true);
      setSettingsMessage('');
      try {
        const response = await axios.get(`${API_URL}/api/doctors/me/settings`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!isMounted) return;

        if (typeof response.data?.showOnlineOnLogin === 'boolean') {
          setProfile((prev) => ({
            ...prev,
            showOnlineOnLogin: response.data.showOnlineOnLogin,
            autoDraftNotesEnabled:
              typeof response.data?.autoDraftNotesEnabled === 'boolean'
                ? response.data.autoDraftNotesEnabled
                : prev.autoDraftNotesEnabled,
            otpDeliveryChannel: response.data?.otpDeliveryChannel || prev.otpDeliveryChannel,
          }));
        }
        if (typeof response.data?.isOnline === 'boolean') {
          setIsOnline(response.data.isOnline);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch doctor settings', error);
        }
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
        }
      }
    };

    fetchDoctorSettings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const profileDisplayName = composeProfileName(profile, user?.name || 'Doctor');
  const doctorName = formatDoctorName(profileDisplayName, 'Doctor');
  const pendingCount = appointments.filter((appointment) => appointment.status === 'PENDING').length;
  const hasEmailChannel = Boolean(String(profile.email || '').trim());
  const hasPhoneChannel = Boolean(String(profile.phoneNumber || '').trim());
  const hiStatusLabel = Boolean(String(profile.hpiIndividualNumber || '').trim()) ? 'Configured' : 'Not Set';
  const mimsStatusLabel = Boolean(String(profile.mimsUserId || '').trim()) ? 'Configured' : 'Not Set';

  const doctorNavItems = DOCTOR_NAV_ITEMS;

  const handleDoctorNavClick = (key) => {
    navigateDoctorNavClick(key, navigate);
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

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileTabClick = (tabKey) => {
    setActiveProfileTab(tabKey);
    if (tabKey === 'personal-info') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabKey });
    }
  };

  const handleSaveGeneralSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');

    try {
      const response = await axios.put(
        `${API_URL}/api/doctors/me/settings`,
        {
          showOnlineOnLogin: Boolean(profile.showOnlineOnLogin),
          autoDraftNotesEnabled: Boolean(profile.autoDraftNotesEnabled),
          otpDeliveryChannel: profile.otpDeliveryChannel,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      setProfile((prev) => ({
        ...prev,
        showOnlineOnLogin: Boolean(response.data?.showOnlineOnLogin),
        autoDraftNotesEnabled: Boolean(response.data?.autoDraftNotesEnabled),
        otpDeliveryChannel: response.data?.otpDeliveryChannel || prev.otpDeliveryChannel,
      }));
      setIsOnline(Boolean(response.data?.isOnline));
      setSettingsMessage('General settings saved successfully.');
    } catch (error) {
      console.error('Failed to save general settings', error);
      setSettingsMessage(error?.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage('');

    try {
      const response = await axios.put(
        `${API_URL}/api/doctors/me/profile`,
        {
          givenName: profile.givenName,
          secondaryName: profile.secondaryName,
          familyName: profile.familyName,
          noFamilyName: profile.noFamilyName,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth,
          phoneCode: profile.phoneCode,
          phoneNumber: profile.phoneNumber,
          email: profile.email,
          address: profile.address,
          experience: profile.experience,
          qualification: profile.qualification,
          practitionerType: profile.practitionerType,
          services: profile.services,
          about: profile.about,
          ahpraNumber: profile.ahpraNumber,
          prescriberNumber: profile.prescriberNumber,
          providerNumber: profile.providerNumber,
          hpiIndividualNumber: profile.hpiIndividualNumber,
          hpioNumber: profile.hpioNumber,
          saveMyHINumber: profile.saveMyHINumber,
          mimsUserId: profile.mimsUserId,
          mimsEulaAccepted: profile.mimsEulaAccepted,
          mimsTermsAccepted: profile.mimsTermsAccepted,
          prescriptionEntityId: profile.prescriptionEntityId,
          prescriptionAccessEnabled: profile.prescriptionAccessEnabled,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      setProfile((prev) => ({ ...prev, ...(response.data || {}) }));
      if (typeof response.data?.isOnline === 'boolean') {
        setIsOnline(response.data.isOnline);
      }
      setProfileMessage('Profile updated successfully.');
    } catch (error) {
      console.error('Failed to save doctor profile', error);
      setProfileMessage(error?.response?.data?.error || 'Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    setBankSaving(true);
    setBankMessage('');

    try {
      const response = await axios.put(
        `${API_URL}/api/doctors/me/bank-details`,
        {
          accountHolderName: profile.accountHolderName,
          accountNumber: profile.accountNumber,
          routingNumber: profile.routingNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      setProfile((prev) => ({
        ...prev,
        accountHolderName: response.data?.accountHolderName || '',
        accountNumber: response.data?.accountNumber || '',
        routingNumber: response.data?.routingNumber || '',
      }));
      setBankMessage('Bank details updated successfully.');
    } catch (error) {
      console.error('Failed to save bank details', error);
      setBankMessage(error?.response?.data?.error || 'Failed to save bank details.');
    } finally {
      setBankSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <SharedNavbar
        user={user}
        brandLabel="CareBridge"
        onLogoClick={() => navigate('/dashboard')}
        navItems={doctorNavItems}
        activeTab=""
        onTabClick={handleDoctorNavClick}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        pendingCount={pendingCount}
        doctorName={doctorName}
        onLogout={logout}
        showMobileTabs
      />

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
              {PROFILE_TABS.map((tab) => {
                const isActive = activeProfileTab === tab.key;
                return (
                  <button
                    type="button"
                    key={tab.key}
                    onClick={() => handleProfileTabClick(tab.key)}
                    className={`rounded-xl px-6 py-2.5 text-base font-bold transition-colors ${
                      isActive
                        ? 'bg-primary-700 text-white shadow-sm'
                        : 'bg-cyan-50 text-slate-900 hover:bg-cyan-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeProfileTab === 'personal-info' && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-primary-600 px-4 py-2 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50"
              >
                <History className="h-4 w-4" />
                Audit log
              </button>
            )}
          </div>

          {activeProfileTab === 'service-slots' ? (
            <DoctorSlotSettings scheduledAppointments={appointments} />
          ) : activeProfileTab === 'bank-details' ? (
            <div className="flex min-h-[380px] items-start justify-center pt-8">
              <div className="w-full max-w-[620px] rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>Account holder name
                    </label>
                    <input
                      value={profile.accountHolderName}
                      onChange={(event) => updateField('accountHolderName', event.target.value)}
                      placeholder="Enter Account Holder Name"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>Account number
                    </label>
                    <input
                      value={profile.accountNumber}
                      onChange={(event) => updateField('accountNumber', event.target.value)}
                      placeholder="Enter Account Number"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>Routing number
                    </label>
                    <input
                      value={profile.routingNumber}
                      onChange={(event) => updateField('routingNumber', event.target.value)}
                      placeholder="Enter BSB Number"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveBankDetails}
                  disabled={bankSaving}
                  className="mt-5 h-12 w-full rounded-lg bg-primary-700 text-xl font-black tracking-tight text-white transition-colors hover:bg-primary-800"
                >
                  {bankSaving ? 'Saving...' : 'Add Details'}
                </button>
                {bankMessage && (
                  <p className={`mt-2 text-center text-xs font-semibold ${bankMessage.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {bankMessage}
                  </p>
                )}
              </div>
            </div>
          ) : activeProfileTab === 'settings' ? (
            <div className="flex min-h-[420px] items-start justify-center pt-2">
              <div className="w-full max-w-[760px] space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">General Settings</h3>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-primary-300 bg-white px-3 py-2.5">
                      <span className="text-sm font-medium text-slate-700">
                        When enabled, AI will draft medical notes automatically after each consultation ends.
                      </span>
                      <button
                        type="button"
                        onClick={() => updateField('autoDraftNotesEnabled', !profile.autoDraftNotesEnabled)}
                        className={`relative h-6 w-12 rounded-full transition-colors ${
                          profile.autoDraftNotesEnabled ? 'bg-primary-700' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            profile.autoDraftNotesEnabled ? 'left-6' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-primary-300 bg-white px-3 py-2.5">
                      <span className="text-sm font-medium text-slate-700">Show me online automatically when I log in</span>
                      <button
                        type="button"
                        onClick={() => updateField('showOnlineOnLogin', !profile.showOnlineOnLogin)}
                        className={`relative h-6 w-12 rounded-full transition-colors ${
                          profile.showOnlineOnLogin ? 'bg-primary-700' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            profile.showOnlineOnLogin ? 'left-6' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={settingsSaving || settingsLoading}
                      className="rounded-md bg-primary-700 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-primary-800"
                    >
                      {settingsSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                  {settingsLoading && (
                    <p className="mt-2 text-xs font-semibold text-slate-500">Loading settings...</p>
                  )}
                  {settingsMessage && (
                    <p className={`mt-2 text-xs font-semibold ${settingsMessage.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {settingsMessage}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">Login OTP Delivery</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {profile.otpDeliveryDescription}
                  </p>

                  <div className="mt-3 space-y-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 hover:border-primary-300">
                      <input
                        type="radio"
                        name="otp-delivery"
                        checked={profile.otpDeliveryChannel === 'EMAIL'}
                        onChange={() => updateField('otpDeliveryChannel', 'EMAIL')}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary-700" />
                          <p className="text-sm font-bold text-slate-900">Email</p>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-black uppercase ${
                              hasEmailChannel
                                ? 'border-lime-300 bg-lime-50 text-lime-700'
                                : 'border-slate-300 bg-slate-100 text-slate-600'
                            }`}
                          >
                            {hasEmailChannel ? 'Configured' : 'Missing'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500">{profile.email || 'No email available'}</p>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 hover:border-primary-300">
                      <input
                        type="radio"
                        name="otp-delivery"
                        checked={profile.otpDeliveryChannel === 'PHONE'}
                        onChange={() => updateField('otpDeliveryChannel', 'PHONE')}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-primary-700" />
                          <p className="text-sm font-bold text-slate-900">Phone (SMS)</p>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-black uppercase ${
                              hasPhoneChannel
                                ? 'border-lime-300 bg-lime-50 text-lime-700'
                                : 'border-amber-300 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {hasPhoneChannel ? 'Configured' : 'Missing'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500">{`${profile.phoneCode} ${profile.phoneNumber}`.trim()}</p>
                        {!hasPhoneChannel && <p className="mt-1 text-xs font-semibold text-amber-600">{profile.phoneChannelHint}</p>}
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary-300 bg-white px-3 py-3">
                      <input
                        type="radio"
                        name="otp-delivery"
                        checked={profile.otpDeliveryChannel === 'BOTH'}
                        onChange={() => updateField('otpDeliveryChannel', 'BOTH')}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary-700" />
                          <p className="text-sm font-bold text-slate-900">Both email &amp; phone</p>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500">Code is sent to every configured channel.</p>
                      </div>
                    </label>
                  </div>

                  {!hasPhoneChannel && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-primary-200 bg-primary-100/50 px-3 py-2 text-sm font-semibold text-slate-700">
                      <TriangleAlert className="h-4 w-4 text-primary-700" />
                      {profile.otpSecurityNote}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      disabled={settingsSaving || settingsLoading}
                      className="rounded-md bg-primary-700 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-primary-800"
                    >
                      {settingsSaving ? 'Saving...' : 'Save Preference'}
                    </button>
                  </div>

                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                    <span className="font-black text-slate-700">Security:</span> {profile.otpSecurityNote} {profile.otpSecurityActionText}
                  </div>
                </div>
              </div>
            </div>
          ) : activeProfileTab !== 'personal-info' ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <h3 className="text-xl font-black text-slate-900">
                {PROFILE_TABS.find((tab) => tab.key === activeProfileTab)?.label || 'Section'} settings
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                This section is being prepared in the same profile experience.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                  <div className="md:col-span-2">
                    <div className="relative mx-auto w-fit">
                      <div className="h-32 w-32 overflow-hidden rounded-2xl border-2 border-primary-200 bg-white p-1">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            doctorName
                          )}&backgroundColor=f1f5f9`}
                          alt={doctorName}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        className="absolute -bottom-3 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-xl bg-primary-700 text-white shadow-md hover:bg-primary-800"
                        aria-label="Upload profile photo"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-10">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                          <span className="mr-1 text-rose-500">*</span>Given Name
                        </label>
                        <input
                          value={profile.givenName}
                          onChange={(event) => updateField('givenName', event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Secondary Name</label>
                        <input
                          value={profile.secondaryName}
                          onChange={(event) => updateField('secondaryName', event.target.value)}
                          placeholder="Please Enter Secondary Name"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                          <span className="mr-1 text-rose-500">*</span>Family Name
                        </label>
                        <input
                          value={profile.familyName}
                          onChange={(event) => updateField('familyName', event.target.value)}
                          disabled={profile.noFamilyName}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <label className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={profile.noFamilyName}
                            onChange={(event) => updateField('noFamilyName', event.target.checked)}
                          />
                          I don't have a family Name
                        </label>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                          <span className="mr-1 text-rose-500">*</span>Gender
                        </label>
                        <select
                          value={profile.gender}
                          onChange={(event) => updateField('gender', event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                        >
                          {GENDER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                          <span className="mr-1 text-rose-500">*</span>Date of Birth
                        </label>
                        <input
                          value={profile.dateOfBirth}
                          onChange={(event) => updateField('dateOfBirth', event.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                          <span className="mr-1 text-rose-500">*</span>Phone number{' '}
                          <span className="text-primary-700">(Configured)</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            value={profile.phoneCode}
                            onChange={(event) => updateField('phoneCode', event.target.value)}
                            className="h-11 w-20 rounded-xl border border-slate-200 bg-white px-2 text-center text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                          />
                          <input
                            value={profile.phoneNumber}
                            onChange={(event) => updateField('phoneNumber', event.target.value)}
                            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                          <span className="mr-1 text-rose-500">*</span>Email
                        </label>
                        <input
                          value={profile.email}
                          onChange={(event) => updateField('email', event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                          <span className="mr-1 text-rose-500">*</span>Address <Info className="ml-1 inline h-4 w-4 text-primary-700" />
                        </label>
                        <input
                          value={profile.address}
                          onChange={(event) => updateField('address', event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <h3 className="mb-3 border-l-4 border-primary-600 pl-2 font-heading text-2xl font-black tracking-tight text-slate-900">
                  Professional Background
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>Experience (years)
                    </label>
                    <select
                      value={profile.experience}
                      onChange={(event) => updateField('experience', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    >
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>Qualification
                    </label>
                    <select
                      value={profile.qualification}
                      onChange={(event) => updateField('qualification', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    >
                      {QUALIFICATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>Practitioner type
                    </label>
                    <select
                      value={profile.practitionerType}
                      onChange={(event) => updateField('practitionerType', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    >
                      {PRACTITIONER_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">Select Services</label>
                    <select
                      value={profile.services}
                      onChange={(event) => updateField('services', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    >
                      <option value="">Please select services</option>
                      {SERVICE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">About me</label>
                    <textarea
                      value={profile.about}
                      onChange={(event) => updateField('about', event.target.value.slice(0, 500))}
                      placeholder="Tell your patient more about you"
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] font-medium text-slate-900 outline-none focus:border-primary-400"
                    />
                    <div className="mt-1 text-right text-xs font-semibold text-slate-400">{profile.about.length}/500</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <h3 className="mb-3 border-l-4 border-primary-600 pl-2 font-heading text-2xl font-black tracking-tight text-slate-900">
                  Registration &amp; Identifiers
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>AHPRA Number
                    </label>
                    <input
                      value={profile.ahpraNumber}
                      onChange={(event) => updateField('ahpraNumber', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">Prescriber Number</label>
                    <input
                      value={profile.prescriberNumber}
                      onChange={(event) => updateField('prescriberNumber', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>Provider Number
                    </label>
                    <input
                      value={profile.providerNumber}
                      onChange={(event) => updateField('providerNumber', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    />
                    <p className="mt-1 text-xs font-medium text-primary-700">
                      Provider number needs to be associated with either a CareBridge organization or a residence address.
                    </p>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      <span className="mr-1 text-rose-500">*</span>HPI-I (Healthcare Provider Identifier - Individual) Number
                    </label>
                    <input
                      value={profile.hpiIndividualNumber}
                      onChange={(event) => updateField('hpiIndividualNumber', event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-primary-400"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-primary-600 px-3 py-1.5 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50"
                  >
                    <History className="h-4 w-4" />
                    HI Audit log
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 font-heading text-xl font-black tracking-tight text-slate-900">HI Details</h4>
                    <div className="space-y-2 text-sm font-semibold">
                      <p className="text-slate-500">HPI-O (Healthcare Provider Identifier - Organization) Number :</p>
                      <p className="text-base font-black text-primary-700">{profile.hpioNumber}</p>
                      <p className="text-slate-500">HPI-I (Healthcare Provider Identifier - Individual) Number :</p>
                      <p className="text-base font-black text-primary-700">{profile.hpiIndividualNumber}</p>
                      <p className="text-slate-500">HPI-I (Healthcare Provider Identifier - Individual) Number Status :</p>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-black uppercase ${
                          hiStatusLabel === 'Configured'
                            ? 'border-lime-300 bg-lime-50 text-lime-700'
                            : 'border-slate-300 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {hiStatusLabel}
                      </span>
                    </div>

                    <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={profile.saveMyHINumber}
                        onChange={(event) => updateField('saveMyHINumber', event.target.checked)}
                      />
                      Save My HI (Health Identifier) number for e-Prescription <Info className="h-4 w-4 text-primary-700" />
                    </label>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      <a
                        href={profile.hiInfoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-700 underline"
                      >
                        {profile.hiInfoText}
                      </a>
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 font-heading text-xl font-black tracking-tight text-slate-900">MIMS Details</h4>
                    <div className="space-y-2 text-sm font-semibold">
                      <p className="text-slate-500">MIMS User Id :</p>
                      <p className="break-all text-sm font-black text-primary-700">{profile.mimsUserId}</p>
                      <p className="text-slate-500">MIMS Status</p>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-black uppercase ${
                          mimsStatusLabel === 'Configured'
                            ? 'border-lime-300 bg-lime-50 text-lime-700'
                            : 'border-slate-300 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {mimsStatusLabel}
                      </span>
                    </div>

                    <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={profile.mimsEulaAccepted}
                        onChange={(event) => updateField('mimsEulaAccepted', event.target.checked)}
                      />
                      MIMS End User License Agreement <Info className="h-4 w-4 text-primary-700" />
                    </label>
                    <label className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={profile.mimsTermsAccepted}
                        onChange={(event) => updateField('mimsTermsAccepted', event.target.checked)}
                      />
                      MIMS Terms and Conditions <Info className="h-4 w-4 text-primary-700" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <h3 className="mb-3 font-heading text-xl font-black tracking-tight text-slate-900">Prescription Details</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-500">Entity ID</p>
                    <input
                      value={profile.prescriptionEntityId}
                      onChange={(event) => updateField('prescriptionEntityId', event.target.value)}
                      className="mt-1 w-full border-0 p-0 text-sm font-black text-primary-700 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-500">Prescription Access</p>
                    <button
                      type="button"
                      onClick={() => updateField('prescriptionAccessEnabled', !profile.prescriptionAccessEnabled)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-black uppercase ${
                        profile.prescriptionAccessEnabled
                          ? 'border-lime-300 bg-lime-50 text-lime-700'
                          : 'border-slate-300 bg-slate-100 text-slate-600'
                      }`}
                    >
                      {profile.prescriptionAccessEnabled ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="rounded-lg bg-primary-700 px-10 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-primary-800"
                >
                  {profileSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              {profileMessage && (
                <p className={`text-right text-xs font-semibold ${profileMessage.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {profileMessage}
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
