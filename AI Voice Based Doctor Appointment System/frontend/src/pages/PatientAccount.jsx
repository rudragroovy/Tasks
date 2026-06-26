import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck2,
  CalendarClock,
  Camera,
  CreditCard,
  FileText,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Save,
  ShieldCheck,
  Stethoscope,
  UserCircle2,
  UserPlus2,
  Users,
  Wallet,
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import { useAuth } from '../context/AuthContext';
import PatientMedicalHistoryTab from '../components/account/PatientMedicalHistoryTab';
import PatientMedicalDocumentsTab from '../components/account/PatientMedicalDocumentsTab';
import PatientPastDoctorsTab from '../components/account/PatientPastDoctorsTab';
import './patient-account.css';

const accountTabs = [
  { key: 'profile', label: 'My Profile', icon: UserCircle2 },
  { key: 'medical-history', label: 'My Appointments', icon: CalendarClock },
  { key: 'past-doctors', label: 'Past Doctors', icon: Stethoscope },
  { key: 'medical-documents', label: 'Medical Documents', icon: FileText },
  { key: 'family', label: 'My Family', icon: Users },
  { key: 'wallet', label: 'My Wallet', icon: Wallet },
  { key: 'security', label: 'Change password', icon: KeyRound },
  { key: 'healthcare', label: 'My Healthcare', icon: ShieldCheck },
];

const emptyProfileForm = {
  profilePictureUrl: '',
  givenName: '',
  secondaryName: '',
  familyName: '',
  noFamilyName: false,
  relation: '',
  gender: '',
  dateOfBirth: '',
  phoneCode: '+61',
  phone: '',
  email: '',
  address: '',
  ctgIslandOrigin: '',
  allergies: '',
  medicareCardNumber: '',
  medicareIrn: '',
  dvaCardNumber: '',
  dvaCardColor: '',
  currentGpName: '',
  currentGpEmail: '',
  partnerCode: '',
  noCurrentGpDetails: false,
  healthIdentifierType: 'Medicare Number',
  saveHealthIdentifier: false,
  onBehalfOfFamilyMember: false,
  patientConsentGiven: false,
};

function resolveActiveTab(searchParams) {
  const requested = searchParams.get('tab');
  return accountTabs.some((tab) => tab.key === requested) ? requested : 'profile';
}

function asString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function mapProfileFromApi(data, fallbackEmail) {
  return {
    ...emptyProfileForm,
    ...data,
    profilePictureUrl: asString(data?.profilePictureUrl),
    givenName: asString(data?.givenName),
    secondaryName: asString(data?.secondaryName),
    familyName: asString(data?.familyName),
    relation: asString(data?.relation),
    gender: asString(data?.gender),
    dateOfBirth: asString(data?.dateOfBirth),
    phoneCode: asString(data?.phoneCode || '+61', '+61'),
    phone: asString(data?.phone),
    email: asString(data?.email || fallbackEmail),
    address: asString(data?.address),
    ctgIslandOrigin: asString(data?.ctgIslandOrigin),
    allergies: asString(data?.allergies),
    medicareCardNumber: asString(data?.medicareCardNumber),
    medicareIrn: asString(data?.medicareIrn),
    dvaCardNumber: asString(data?.dvaCardNumber),
    dvaCardColor: asString(data?.dvaCardColor),
    currentGpName: asString(data?.currentGpName),
    currentGpEmail: asString(data?.currentGpEmail),
    partnerCode: asString(data?.partnerCode),
    healthIdentifierType: asString(data?.healthIdentifierType || 'Medicare Number', 'Medicare Number'),
    noFamilyName: Boolean(data?.noFamilyName),
    noCurrentGpDetails: Boolean(data?.noCurrentGpDetails),
    saveHealthIdentifier: Boolean(data?.saveHealthIdentifier),
    onBehalfOfFamilyMember: Boolean(data?.onBehalfOfFamilyMember),
    patientConsentGiven: Boolean(data?.patientConsentGiven),
  };
}

export default function PatientAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isFamilyLoading, setIsFamilyLoading] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const [autoReviewAppointmentId, setAutoReviewAppointmentId] = useState(() => {
    const value = typeof location.state?.promptReviewAppointmentId === 'string'
      ? location.state.promptReviewAppointmentId.trim()
      : '';
    return value || null;
  });
  const fileInputRef = useRef(null);

  const activeTab = useMemo(() => resolveActiveTab(searchParams), [searchParams]);
  const userName = String(user?.name || 'Patient').trim() || 'Patient';
  const userFirstName = userName.split(/\s+/)[0] || 'Patient';
  const userEmail = String(user?.email || '').trim();
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', []);
  const familyApiUrl = useMemo(() => `${apiBase}/api/family-members`, [apiBase]);
  const profileApiUrl = useMemo(() => `${apiBase}/api/patient-profile/me`, [apiBase]);

  useEffect(() => {
    const nextAutoReviewAppointmentId = typeof location.state?.promptReviewAppointmentId === 'string'
      ? location.state.promptReviewAppointmentId.trim()
      : '';
    if (!nextAutoReviewAppointmentId) return;
    setAutoReviewAppointmentId(nextAutoReviewAppointmentId);
    if (activeTab !== 'medical-history') {
      setSearchParams({ tab: 'medical-history' }, { replace: true });
    }
    navigate('/patient/account?tab=medical-history', { replace: true, state: null });
  }, [activeTab, location.state, navigate, setSearchParams]);

  useEffect(() => {
    if (activeTab !== 'family') return;

    const fetchFamilyMembers = async () => {
      setIsFamilyLoading(true);
      try {
        const { data } = await axios.get(familyApiUrl, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setFamilyMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch family members for account tab', error);
        setFamilyMembers([]);
      } finally {
        setIsFamilyLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [activeTab, familyApiUrl]);

  useEffect(() => {
    if (activeTab !== 'profile') return;

    const fetchProfile = async () => {
      setIsProfileLoading(true);
      setProfileSaveMessage('');
      try {
        const { data } = await axios.get(profileApiUrl, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setProfileForm(mapProfileFromApi(data, userEmail));
      } catch (error) {
        console.error('Failed to load patient profile', error);
        setProfileForm((previous) => ({
          ...previous,
          email: previous.email || userEmail,
        }));
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchProfile();
  }, [activeTab, profileApiUrl, userEmail]);

  const setTab = (tabKey) => {
    if (tabKey === 'profile') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ tab: tabKey }, { replace: true });
  };

  const updateField = (field, value) => {
    setProfileForm((previous) => ({ ...previous, [field]: value }));
  };

  const updateCheckbox = (field, checked) => {
    setProfileForm((previous) => ({ ...previous, [field]: Boolean(checked) }));
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('profilePictureUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setIsProfileSaving(true);
    setProfileSaveMessage('');
    try {
      await axios.put(profileApiUrl, profileForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfileSaveMessage('Profile saved successfully.');
    } catch (error) {
      console.error('Failed to save patient profile', error);
      setProfileSaveMessage(
        error?.response?.data?.error || 'Could not save profile. Please check required fields.'
      );
    } finally {
      setIsProfileSaving(false);
    }
  };

  const profileImageSrc =
    profileForm.profilePictureUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=e2e8f0`;

  return (
    <main className="patient-account-page">
      <LandingNavbar />

      <section className="patient-account-shell">
        <aside className="patient-account-sidebar">
          <div className="patient-account-user">
            <span className="patient-account-avatar">{userName.charAt(0).toUpperCase()}</span>
            <div>
              <h1>{userName}</h1>
              <p>{userEmail || 'patient@carebridge.com'}</p>
            </div>
          </div>

          <nav className="patient-account-nav" aria-label="Account sections">
            {accountTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={activeTab === tab.key ? 'is-active' : ''}
                  onClick={() => setTab(tab.key)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="patient-account-main">
          {activeTab === 'profile' ? (
            <>
              <header className="patient-account-main__header">
                <h2>My Profile</h2>
                <p>Update your account, healthcare, and verification details.</p>
              </header>

              <form onSubmit={handleProfileSave} className="patient-account-form-stack">
                <article className="patient-account-card">
                  <h3>
                    <Camera size={16} /> Profile Pictures (Optional)
                  </h3>
                  <div className="patient-account-photo-wrap">
                    <div className="patient-account-photo-frame">
                      <img src={profileImageSrc} alt={userName} />
                      <button
                        type="button"
                        className="patient-account-photo-icon-btn"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Upload profile photo"
                      >
                        <Camera size={14} />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      hidden
                    />
                    <div className="patient-account-photo-meta">
                      <p>Use a clear headshot so your doctor can identify you quickly.</p>
                      <button
                        type="button"
                        className="patient-account-photo-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera size={14} /> Change Photo
                      </button>
                    </div>
                  </div>
                </article>

                <article className="patient-account-card">
                  <h3>
                    <UserPlus2 size={16} /> Add Family Member
                  </h3>

                  <div className="patient-account-form-grid patient-account-form-grid--three">
                    <label>
                      <span className="is-required">Given Name</span>
                      <input
                        type="text"
                        required
                        value={profileForm.givenName}
                        onChange={(event) => updateField('givenName', event.target.value)}
                        placeholder="Please Enter Given Name"
                      />
                    </label>

                    <label>
                      Secondary Name (Optional)
                      <input
                        type="text"
                        value={profileForm.secondaryName}
                        onChange={(event) => updateField('secondaryName', event.target.value)}
                        placeholder="Please Enter Secondary Name"
                      />
                    </label>

                    <label>
                      <span className="is-required">Family Name</span>
                      <input
                        type="text"
                        required={!profileForm.noFamilyName}
                        disabled={profileForm.noFamilyName}
                        value={profileForm.familyName}
                        onChange={(event) => updateField('familyName', event.target.value)}
                        placeholder="Please Enter Family Name"
                      />
                    </label>

                    <label className="patient-account-checkbox-inline">
                      <input
                        type="checkbox"
                        checked={profileForm.noFamilyName}
                        onChange={(event) => updateCheckbox('noFamilyName', event.target.checked)}
                      />
                      I don't have family name
                    </label>

                    <label>
                      <span className="is-required">Relation</span>
                      <select
                        value={profileForm.relation}
                        onChange={(event) => updateField('relation', event.target.value)}
                      >
                        <option value="">Please select Relation</option>
                        <option value="Self">Self</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Child">Child</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    <label>
                      <span className="is-required">Gender</span>
                      <select
                        value={profileForm.gender}
                        onChange={(event) => updateField('gender', event.target.value)}
                      >
                        <option value="">Please select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    <label>
                      Date of Birth
                      <input
                        type="date"
                        value={profileForm.dateOfBirth}
                        onChange={(event) => updateField('dateOfBirth', event.target.value)}
                      />
                    </label>

                    <label>
                      Phone Number
                      <div className="patient-account-inline-inputs">
                        <input
                          type="text"
                          value={profileForm.phoneCode}
                          onChange={(event) => updateField('phoneCode', event.target.value)}
                          placeholder="+61"
                        />
                        <input
                          type="text"
                          value={profileForm.phone}
                          onChange={(event) => updateField('phone', event.target.value)}
                          placeholder="Please Enter Phone Number"
                        />
                      </div>
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder="Please Enter Email"
                      />
                    </label>

                    <label>
                      Address
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(event) => updateField('address', event.target.value)}
                        placeholder="Address"
                      />
                    </label>

                    <label>
                      Eligible for CTG (Closing the Gap)
                      <select
                        value={profileForm.ctgIslandOrigin}
                        onChange={(event) => updateField('ctgIslandOrigin', event.target.value)}
                      >
                        <option value="">Please select island origin</option>
                        <option value="Aboriginal">Aboriginal</option>
                        <option value="Torres Strait Islander">Torres Strait Islander</option>
                        <option value="Both">Both</option>
                        <option value="Not Eligible">Not Eligible</option>
                      </select>
                    </label>

                    <label className="patient-account-form-grid__full">
                      Allergies / Adverse Drug Reactions
                      <textarea
                        rows={3}
                        value={profileForm.allergies}
                        onChange={(event) => updateField('allergies', event.target.value)}
                        placeholder="Please add allergies"
                      />
                    </label>
                  </div>
                </article>

                <article className="patient-account-card">
                  <h3>
                    <CreditCard size={16} /> Medicare &amp; DVA Details
                  </h3>
                  <div className="patient-account-form-grid patient-account-form-grid--three">
                    <label>
                      Medicare Card Number
                      <input
                        type="text"
                        value={profileForm.medicareCardNumber}
                        onChange={(event) => updateField('medicareCardNumber', event.target.value)}
                        placeholder="Please Enter Medicare Number"
                      />
                    </label>
                    <label>
                      Medicare IRN
                      <input
                        type="text"
                        value={profileForm.medicareIrn}
                        onChange={(event) => updateField('medicareIrn', event.target.value)}
                        placeholder="Please Enter Medicare IRN"
                      />
                    </label>
                    <label>
                      DVA Card Number
                      <input
                        type="text"
                        value={profileForm.dvaCardNumber}
                        onChange={(event) => updateField('dvaCardNumber', event.target.value)}
                        placeholder="Please Enter DVA Card Number"
                      />
                    </label>
                    <label>
                      DVA Card Color
                      <select
                        value={profileForm.dvaCardColor}
                        onChange={(event) => updateField('dvaCardColor', event.target.value)}
                      >
                        <option value="">Please select Card Color</option>
                        <option value="Gold">Gold</option>
                        <option value="White">White</option>
                        <option value="Orange">Orange</option>
                      </select>
                    </label>
                  </div>
                </article>

                <article className="patient-account-card">
                  <h3>
                    <Users size={16} /> General Practitioner (GP) Details
                  </h3>
                  <div className="patient-account-form-grid patient-account-form-grid--three">
                    <label>
                      Current GP Name
                      <input
                        type="text"
                        disabled={profileForm.noCurrentGpDetails}
                        value={profileForm.currentGpName}
                        onChange={(event) => updateField('currentGpName', event.target.value)}
                        placeholder="Please Enter GP Name"
                      />
                    </label>
                    <label>
                      Current GP Email
                      <input
                        type="email"
                        disabled={profileForm.noCurrentGpDetails}
                        value={profileForm.currentGpEmail}
                        onChange={(event) => updateField('currentGpEmail', event.target.value)}
                        placeholder="Please Enter GP Email"
                      />
                    </label>
                    <label>
                      Partner Code
                      <input
                        type="text"
                        disabled={profileForm.noCurrentGpDetails}
                        value={profileForm.partnerCode}
                        onChange={(event) => updateField('partnerCode', event.target.value)}
                        placeholder="Enter Partner Code"
                      />
                    </label>
                    <label className="patient-account-checkbox-inline patient-account-form-grid__full">
                      <input
                        type="checkbox"
                        checked={profileForm.noCurrentGpDetails}
                        onChange={(event) => updateCheckbox('noCurrentGpDetails', event.target.checked)}
                      />
                      I don't have Current GP Details
                    </label>
                  </div>
                </article>

                <article className="patient-account-card">
                  <h3>
                    <ShieldCheck size={16} /> Health Identifier (HI)
                  </h3>
                  <div className="patient-account-form-grid">
                    <label>
                      Health Identifier
                      <select
                        value={profileForm.healthIdentifierType}
                        onChange={(event) => updateField('healthIdentifierType', event.target.value)}
                      >
                        <option value="Medicare Number">Medicare Number</option>
                        <option value="DVA Number">DVA Number</option>
                        <option value="IHI Number">IHI Number</option>
                      </select>
                    </label>
                  </div>

                  <div className="patient-account-checkbox-stack">
                    <label>
                      <input
                        type="checkbox"
                        checked={profileForm.saveHealthIdentifier}
                        onChange={(event) => updateCheckbox('saveHealthIdentifier', event.target.checked)}
                      />
                      Save my HI (Health Identifier) number for prescription
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={profileForm.onBehalfOfFamilyMember}
                        onChange={(event) => updateCheckbox('onBehalfOfFamilyMember', event.target.checked)}
                      />
                      On behalf of family member, I am approving the appointment and creating the account.
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={profileForm.patientConsentGiven}
                        onChange={(event) => updateCheckbox('patientConsentGiven', event.target.checked)}
                      />
                      The patient has given consent for the carer to act on their behalf.
                    </label>
                  </div>
                </article>

                <div className="patient-account-actions">
                  <button type="submit" className="patient-account-primary-btn" disabled={isProfileSaving}>
                    <Save size={15} /> {isProfileSaving ? 'Saving...' : 'Submit Form'}
                  </button>
                </div>

                {isProfileLoading ? <p className="patient-account-muted">Loading profile...</p> : null}
                {profileSaveMessage ? (
                  <p className="patient-account-save-message">{profileSaveMessage}</p>
                ) : null}
              </form>
            </>
          ) : null}

          {activeTab === 'medical-history' ? (
            <>
              <header className="patient-account-main__header">
                <h2>My Appointments</h2>
                <p>Track current, upcoming, and past consultations in one place.</p>
              </header>
              <PatientMedicalHistoryTab
                userFirstName={userFirstName}
                autoReviewAppointmentId={autoReviewAppointmentId}
                onAutoReviewHandled={() => setAutoReviewAppointmentId(null)}
              />
            </>
          ) : null}

          {activeTab === 'medical-documents' ? (
            <>
              <header className="patient-account-main__header">
                <h2>Medical Documents</h2>
                <p>Access prescriptions, certificates, referrals, and diagnostic letters.</p>
              </header>
              <PatientMedicalDocumentsTab />
            </>
          ) : null}

          {activeTab === 'past-doctors' ? (
            <>
              <header className="patient-account-main__header">
                <h2>Past Doctors</h2>
                <p>Review doctors you have already consulted and quickly book again.</p>
              </header>
              <PatientPastDoctorsTab />
            </>
          ) : null}

          {activeTab === 'wallet' ? (
            <>
              <header className="patient-account-main__header">
                <h2>My Wallet</h2>
                <p>Review your payment methods, credits, and recent transactions.</p>
              </header>

              <article className="patient-account-card">
                <h3>
                  <Wallet size={16} /> Wallet Balance
                </h3>
                <div className="patient-account-wallet-balance">
                  <strong>$145.00</strong>
                  <span>Available for future consultations</span>
                </div>
              </article>

              <article className="patient-account-card">
                <h3>
                  <CreditCard size={16} /> Saved Payment Method
                </h3>
                <p className="patient-account-muted">Visa ending in 2086</p>
              </article>

              <article className="patient-account-card">
                <h3>Recent Transactions</h3>
                <ul className="patient-account-list">
                  <li>
                    <span>General Consultation</span>
                    <strong>-$45.00</strong>
                  </li>
                  <li>
                    <span>Wallet Top-up</span>
                    <strong>+$100.00</strong>
                  </li>
                  <li>
                    <span>Medical Certificate</span>
                    <strong>-$35.00</strong>
                  </li>
                </ul>
              </article>
            </>
          ) : null}

          {activeTab === 'family' ? (
            <>
              <header className="patient-account-main__header">
                <h2>My Family</h2>
                <p>Manage family members and quickly book consultations on their behalf.</p>
              </header>

              <article className="patient-account-card">
                <h3>
                  <Users size={16} /> Family Members
                </h3>
                {isFamilyLoading ? (
                  <div className="patient-account-family-grid">
                    {[1, 2, 3].map((item) => (
                      <article
                        key={item}
                        className="patient-account-family-card patient-account-family-card--loading"
                      >
                        <div className="patient-account-family-skeleton patient-account-family-skeleton--title" />
                        <div className="patient-account-family-skeleton patient-account-family-skeleton--meta" />
                      </article>
                    ))}
                  </div>
                ) : familyMembers.length === 0 ? (
                  <div className="patient-account-family-empty">
                    <p>No family members added yet.</p>
                    <button type="button" onClick={() => navigate('/family-members')}>
                      Add Family Member
                    </button>
                  </div>
                ) : (
                  <div className="patient-account-family-grid">
                    {familyMembers.map((member) => (
                      <article key={member.id} className="patient-account-family-card">
                        <div>
                          <strong>{member.name}</strong>
                          <span>{`${member.relation || 'Family'} - ${member.age || '-'} years`}</span>
                        </div>
                        <button type="button" onClick={() => navigate('/family-members')}>
                          Manage
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <article className="patient-account-card">
                <h3>
                  <CalendarClock size={16} /> Family Booking Shortcuts
                </h3>
                <ul className="patient-account-list">
                  {(familyMembers.length ? familyMembers : [{ name: 'Family Member' }])
                    .slice(0, 3)
                    .map((member, index) => (
                      <li key={`${member.name}-${index}`}>
                        <span>{`Book consultation for ${member.name}`}</span>
                        <button
                          type="button"
                          className="patient-account-link-btn"
                          onClick={() => navigate('/booking')}
                        >
                          Open
                        </button>
                      </li>
                    ))}
                </ul>
              </article>

              <div className="patient-account-actions">
                <button
                  type="button"
                  className="patient-account-primary-btn"
                  onClick={() => navigate('/family-members')}
                >
                  <UserPlus2 size={15} /> Add Family Member
                </button>
              </div>
            </>
          ) : null}

          {activeTab === 'security' ? (
            <>
              <header className="patient-account-main__header">
                <h2>Change Password</h2>
                <p>Keep your account secure by updating your password regularly.</p>
              </header>

              <article className="patient-account-card">
                <h3>
                  <ShieldCheck size={16} /> Security Settings
                </h3>
                <div className="patient-account-form-grid">
                  <label className="patient-account-form-grid__full">
                    Current Password
                    <input type="password" placeholder="Enter current password" />
                  </label>
                  <label>
                    New Password
                    <input type="password" placeholder="Enter new password" />
                  </label>
                  <label>
                    Confirm New Password
                    <input type="password" placeholder="Re-enter new password" />
                  </label>
                </div>
              </article>

              <article className="patient-account-card">
                <h3>
                  <Phone size={16} /> Recovery
                </h3>
                <p className="patient-account-muted">Recovery phone: +61 412 345 678</p>
              </article>

              <div className="patient-account-actions">
                <button type="button" className="patient-account-primary-btn">
                  <KeyRound size={15} /> Update password
                </button>
              </div>
            </>
          ) : null}

          {activeTab === 'healthcare' ? (
            <>
              <header className="patient-account-main__header">
                <h2>My Healthcare</h2>
                <p>Quick access to your care history, doctors, records, and billing items.</p>
              </header>

              <article className="patient-account-card">
                <h3>
                  <ShieldCheck size={16} /> Healthcare Options
                </h3>
                <div className="patient-account-healthcare-grid">
                  <button
                    type="button"
                    className="patient-account-healthcare-option"
                    onClick={() => navigate('/patient/account?tab=medical-history')}
                  >
                    <span>
                      <CalendarCheck2 size={16} /> Past Appointments
                    </span>
                    <small>View your completed consultations and outcomes.</small>
                    <strong>Open</strong>
                  </button>

                  <button
                    type="button"
                    className="patient-account-healthcare-option"
                    onClick={() => navigate('/patient/account?tab=past-doctors')}
                  >
                    <span>
                      <Users size={16} /> Past Doctors
                    </span>
                    <small>See doctors you have consulted with previously.</small>
                    <strong>Open</strong>
                  </button>

                  <button
                    type="button"
                    className="patient-account-healthcare-option"
                    onClick={() => navigate('/patient/account?tab=medical-documents')}
                  >
                    <span>
                      <FileText size={16} /> Medical Documents
                    </span>
                    <small>Access certificates, referrals, and records.</small>
                    <strong>Open</strong>
                  </button>

                  <button
                    type="button"
                    className="patient-account-healthcare-option"
                    onClick={() => navigate('/dashboard')}
                  >
                    <span>
                      <Receipt size={16} /> Invoices
                    </span>
                    <small>Review payments and invoice history.</small>
                    <strong>Open</strong>
                  </button>
                </div>
              </article>

              <article className="patient-account-card">
                <h3>
                  <CreditCard size={16} /> Billing Snapshot
                </h3>
                <ul className="patient-account-list">
                  <li>
                    <span>Total Paid (This Year)</span>
                    <strong>$1,280.00</strong>
                  </li>
                  <li>
                    <span>Pending Invoices</span>
                    <strong>2</strong>
                  </li>
                  <li>
                    <span>Last Payment</span>
                    <strong>25 Jun 2026</strong>
                  </li>
                </ul>
              </article>
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}
