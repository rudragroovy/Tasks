import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Layout, Space } from 'antd';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Crown,
  FileText,
  FlaskConical,
  KeyRound,
  LogOut,
  Menu,
  Mic,
  ShieldCheck,
  Stethoscope,
  UserCircle2,
  UserRound,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useServiceNavigation from '../hooks/useServiceNavigation';
import AppIcon from './branding/AppIcon';
import '../pages/landing-page.css';

const { Header } = Layout;
const AIVoiceAssistant = lazy(() => import('./AIVoiceAssistant'));

const basePrimaryNav = [
  { key: 'patient', label: 'Patient', opensPanel: 'patient' },
  { key: 'doctor', label: 'Doctor', opensPanel: 'doctor' },
  { key: 'medical-links', label: 'Medical Links' },
  { key: 'more-options', label: 'More Options' },
];

const patientMenuServiceTypes = [
  {
    key: 'telehealth-consult',
    title: 'Telehealth Medical Consultation',
    description: 'Book an online consultation with licensed doctors.',
    icon: Video,
    categories: [
      { key: 'general-consultation', label: 'General Consultation', services: ['Standard Consultation'] },
      {
        key: 'other-consultation',
        label: 'Other Consultation',
        services: [
          'Weight Management',
          'Diabetes Management',
          'Hypertension Management',
          'Urinary Tract Infection Treatment',
          'Skincare Treatment',
          'Menopause',
          'Asthma Management',
          "Men's Health",
          "Women's Health",
        ],
      },
      {
        key: 'specialist-consultation',
        label: 'Specialist Consultation',
        services: [
          'Audiologist Consultation',
          'Cardiology',
          'Diabetes and Endocrinology',
          'General Physician',
          'Geriatrics',
          'Neurology',
          'Pain Management',
          'Renal and Blood Pressure',
          'Respiratory & Sleep',
          'Radiation Oncology',
          'Rheumatology',
          'Urology',
        ],
      },
      {
        key: 'mental-health',
        label: 'Mental Health',
        services: [
          'Psychiatrist Referral',
          'Psychologist Referral',
          'GP Mental Health Consultation',
          'Psychiatrist Consultation',
          'Psychologist Consultation',
        ],
      },
      { key: 'recall-consultation-standard', label: 'Recall Consultation - (Standard)', services: ['Recall Consultation - (Standard)'] },
      { key: 'geriatrics-consultation', label: 'Geriatrics Consultation', services: ['Dementia Management'] },
      { key: 'allied-health', label: 'Allied Health', services: ['Allied Health Referral'] },
    ],
  },
  {
    key: 'prescription',
    title: 'Prescription',
    description: 'Get prescriptions quickly and conveniently.',
    icon: FileText,
    categories: [{ key: 'prescription', label: 'Prescription', services: ['Single Prescription', 'Multiple Prescription'] }],
  },
  {
    key: 'medical-certificates',
    title: 'Medical Certificates',
    description: 'Request medical certificates for work or school.',
    icon: ShieldCheck,
    categories: [
      {
        key: 'medical-certificate',
        label: 'Medical Certificate',
        services: [
          'Single-Day Certificate for Work',
          'Single-Day Certificate for School or University',
          "Single Day Certificate for Carer's Leave",
          'Multiple-Day Certificate',
        ],
      },
    ],
  },
  {
    key: 'pathology-requests',
    title: 'Pathology Requests',
    description: 'Order blood tests without visiting a clinic.',
    icon: FlaskConical,
    categories: [
      { key: 'popular-blood-tests', label: 'Popular Blood Tests', services: ['General Health Blood Test', 'STI Blood Test', 'Vegan Blood Test'] },
      { key: 'recall-consultation-pathology', label: 'Recall Consultation - (Pathology)', services: ['Recall Consultation - (Pathology)'] },
      { key: 'mens-tests', label: "Men's Tests", services: ['Fertility Test (For Men)', 'Erectile Dysfunction Blood Test'] },
      {
        key: 'womens-tests',
        label: "Women's Tests",
        services: [
          'Pregnancy Planning Blood Test',
          'Pregnancy Blood Test',
          'Fertility Blood Test (For Women)',
          'Menopause and Perimenopause Blood Test',
          'Polycystic Ovarian Syndrome (PCOS) Risk Blood Test',
        ],
      },
      {
        key: 'other-general-tests',
        label: 'Other General Tests',
        services: [
          'Why Am I Sick All The Time? Blood Test',
          'Why Am I Tired? Blood Test',
          'Irritable Bowel Test',
          'Food Intolerance Breath Test',
          'COVID PCR Test',
          'Cholesterol Blood Test',
          'Fertility Blood Test (Men, Women)',
        ],
      },
    ],
  },
  {
    key: 'radiology-requests',
    title: 'Radiology Requests',
    description: 'Request X-rays, MRIs, or CT scans online.',
    icon: Activity,
    categories: [
      { key: 'radiology', label: 'Radiology', services: ['CT Scan', 'X-Ray', 'MRI'] },
      { key: 'recall-consultation-radiology', label: 'Recall Consultation - (Radiology)', services: ['Recall Consultation - (Radiology)'] },
    ],
  },
  {
    key: 'specialist-referral',
    title: 'Specialist Referral',
    description: 'Get referred to a specialist without a clinic visit.',
    icon: UserRound,
    categories: [
      {
        key: 'specialist-referral',
        label: 'Specialist Referral',
        services: [
          'Referral Specialist',
          'Dermatology Referral For General Skin/Mole Check',
          'Ophthalmologist Referral For Age-Related Macular Degeneration',
          'Ophthalmologist Referral For Cataracts',
          'Ophthalmologist Referral For Diabetes',
          'Ophthalmologist Referral For Glaucoma',
          'Gastroenterology (Colonoscopy) Referral for Initial Screen',
          'Gastroenterology (Colonoscopy) Referral For 3-5-Year Follow-Up',
          'Geriatric Psychiatry',
        ],
      },
    ],
  },
];

const doctorsMenuItems = [
  {
    key: 'our-team',
    title: 'Our Team',
    description: 'Read more about the doctors and team behind CareBridge.',
    icon: Users,
    pages: ['Overview', 'Our Team', 'Our Team of Medical Innovators', 'Join Our Healthcare Community'],
  },
  {
    key: 'our-providers',
    title: 'Our Providers',
    description: 'Read more about the doctors and team behind CareBridge.',
    icon: UserRound,
    pages: ['Overview', 'Why Choose CareBridge', 'For Providers, By Providers', 'How it Works', 'Community & Provider Benefits'],
  },
  {
    key: 'clinical-leadership',
    title: 'Clinical Leadership',
    description: 'Read more about the doctors and team behind CareBridge.',
    icon: Stethoscope,
    pages: ['Overview', 'Our Clinical Leadership', 'For Providers, By Providers', 'How it Works', 'Community & Provider Benefits'],
  },
  {
    key: 'provider-careers',
    title: 'Provider Careers',
    description: 'Read more about the doctors and team behind CareBridge.',
    icon: Crown,
    pages: [
      { label: 'Overview' },
      { label: 'Doctors' },
      { label: 'General Practitioners', indent: true },
      { label: 'Specialist', indent: true },
      { label: 'Dentist', indent: true },
      { label: 'Nurse' },
      { label: 'Nurse', indent: true },
      { label: 'Nurse Practitioners', indent: true },
      { label: 'Job Openings' },
    ],
  },
];

const serviceTypeRouteMap = {
  'telehealth-consult': 'telehealth-consultation',
  prescription: 'prescription',
  'medical-certificates': 'medical-certificates',
  'pathology-requests': 'pathology-requests',
  'radiology-requests': 'radiology-requests',
  'specialist-referral': 'specialist-referral',
};

function resolvePostAuthPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'DOCTOR') return '/dashboard';
  return '/';
}

function getUserDisplayName(user) {
  const rawName = String(user?.name || '').trim();
  if (!rawName) return 'Account';
  const [firstName] = rawName.split(/\s+/);
  return firstName || rawName;
}

export default function LandingNavbar({ activeKey = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, openAuthModal, logout } = useAuth();
  const navigateToService = useServiceNavigation();
  const isAuthenticated = Boolean(user);
  const isPatientUser = isAuthenticated && user?.role !== 'DOCTOR' && user?.role !== 'ADMIN';
  const displayName = getUserDisplayName(user);
  const navbarPanelRef = useRef(null);

  const [isPatientMenuOpen, setIsPatientMenuOpen] = useState(false);
  const [isDoctorMenuOpen, setIsDoctorMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAIVoiceAssistantOpen, setIsAIVoiceAssistantOpen] = useState(false);
  const [activeDoctorMenuItem, setActiveDoctorMenuItem] = useState(doctorsMenuItems[0].key);
  const [activePatientServiceType, setActivePatientServiceType] = useState(patientMenuServiceTypes[0].key);
  const [activePatientCategory, setActivePatientCategory] = useState(patientMenuServiceTypes[0].categories[0].key);

  const selectedKey = useMemo(() => activeKey, [activeKey]);
  const primaryNavItems = useMemo(() => {
    if (!isPatientUser) return basePrimaryNav;
    return [basePrimaryNav[0], { key: 'chat', label: 'Chat' }, ...basePrimaryNav.slice(1)];
  }, [isPatientUser]);
  const activeDoctorMenuItemData = useMemo(
    () => doctorsMenuItems.find((menuItem) => menuItem.key === activeDoctorMenuItem) ?? doctorsMenuItems[0],
    [activeDoctorMenuItem]
  );
  const activePatientServiceTypeData = useMemo(
    () =>
      patientMenuServiceTypes.find((serviceType) => serviceType.key === activePatientServiceType) ??
      patientMenuServiceTypes[0],
    [activePatientServiceType]
  );
  const activePatientCategoryData = useMemo(
    () =>
      activePatientServiceTypeData.categories.find((category) => category.key === activePatientCategory) ??
      activePatientServiceTypeData.categories[0],
    [activePatientCategory, activePatientServiceTypeData]
  );

  useEffect(() => {
    if (!isPatientMenuOpen && !isDoctorMenuOpen && !isProfileMenuOpen) return undefined;

    const onPointerDown = (event) => {
      if (!navbarPanelRef.current?.contains(event.target)) {
        setIsPatientMenuOpen(false);
        setIsDoctorMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setIsPatientMenuOpen(false);
        setIsDoctorMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isDoctorMenuOpen, isPatientMenuOpen, isProfileMenuOpen]);

  useEffect(() => {
    if (!location.hash || (location.pathname !== '/' && location.pathname !== '/home')) {
      return;
    }

    const targetId = location.hash.slice(1);
    const scrollToHashTarget = () => {
      const section = document.getElementById(targetId);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const timer = window.setTimeout(scrollToHashTarget, 90);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname]);

  const openLogin = () => {
    if (user) {
      navigate(resolvePostAuthPath(user));
      return;
    }
    openAuthModal({ mode: 'login', redirectTo: '/dashboard' });
  };

  const openAIVoiceAssistant = () => {
    setIsPatientMenuOpen(false);
    setIsDoctorMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsAIVoiceAssistantOpen(true);
  };

  const handleAIVoiceComplete = (data) => {
    setIsAIVoiceAssistantOpen(false);
    const practitionerType = data?.suggested_practitioner_type || 'General Practitioner (GP)';
    navigate(`/booking?practitionerType=${encodeURIComponent(practitionerType)}`, { state: { aiSummary: data } });
  };

  const handlePrimaryAction = () => {
    setIsPatientMenuOpen(false);
    setIsDoctorMenuOpen(false);
    setIsProfileMenuOpen(false);
    if (user) {
      navigate('/');
      return;
    }
    openAuthModal({ mode: 'login', redirectTo: '/dashboard' });
  };

  const navigateToSection = (sectionId) => {
    const onHomeSurface = location.pathname === '/' || location.pathname === '/home';
    if (onHomeSurface) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    navigate(`/home#${sectionId}`);
  };

  const handlePatientServiceTypeSelect = (serviceTypeKey) => {
    const matchedServiceType =
      patientMenuServiceTypes.find((serviceType) => serviceType.key === serviceTypeKey) ?? patientMenuServiceTypes[0];
    setActivePatientServiceType(matchedServiceType.key);
    setActivePatientCategory(matchedServiceType.categories[0].key);
  };

  const openCategoryPage = (categoryKey) => {
    if (!categoryKey) return;
    setIsPatientMenuOpen(false);
    setIsDoctorMenuOpen(false);
    navigate(`/category/${categoryKey}`);
  };

  const openServiceTypePage = (serviceTypeKey) => {
    if (!serviceTypeKey) return;
    const resolvedType = serviceTypeRouteMap[serviceTypeKey] || serviceTypeKey;
    setIsPatientMenuOpen(false);
    setIsDoctorMenuOpen(false);
    setIsProfileMenuOpen(false);
    navigate(`/service-type/${resolvedType}`);
  };

  const openServicePage = (serviceName) => {
    if (!serviceName) return;
    setIsPatientMenuOpen(false);
    setIsDoctorMenuOpen(false);
    navigateToService(serviceName);
  };

  const handlePrimaryNavClick = (item) => {
    if (item.key === 'chat') {
      setIsPatientMenuOpen(false);
      setIsDoctorMenuOpen(false);
      setIsProfileMenuOpen(false);
      navigate('/patient/chat');
      return;
    }

    if (item.opensPanel === 'patient') {
      setIsPatientMenuOpen((previous) => !previous);
      setIsDoctorMenuOpen(false);
      setIsProfileMenuOpen(false);
      return;
    }

    if (item.opensPanel === 'doctor') {
      setIsDoctorMenuOpen((previous) => !previous);
      setIsPatientMenuOpen(false);
      setIsProfileMenuOpen(false);
      return;
    }

    if (item.key === 'medical-links') {
      setIsPatientMenuOpen(false);
      setIsDoctorMenuOpen(false);
      setIsProfileMenuOpen(false);
      navigateToSection('steps');
      return;
    }

    if (item.key === 'more-options') {
      setIsPatientMenuOpen(false);
      setIsDoctorMenuOpen(false);
      setIsProfileMenuOpen(false);
      navigateToSection('pricing');
      return;
    }

    setIsPatientMenuOpen(false);
    setIsDoctorMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  return (
    <div ref={navbarPanelRef} className="landing-nav-v2-wrap landing-navbar-shell">
      <Header className="landing-nav-v2">
        <div className="landing-nav-v2__inner">
          <div className="landing-nav-v2__left">
            <Button
              type="text"
              className="landing-nav-v2__menu"
              aria-label="Open menu"
              onClick={() => {
                setIsPatientMenuOpen((previous) => !previous);
                setIsDoctorMenuOpen(false);
                setIsProfileMenuOpen(false);
              }}
            >
              <Menu size={20} />
            </Button>
            <button
              type="button"
              className="landing-nav-v2__brand"
              onClick={() => navigate('/')}
              aria-label="Go to landing page"
            >
              <AppIcon size={28} />
              <span>CareBridge</span>
            </button>
          </div>

          <Space className="landing-nav-v2__center landing-nav-v2__links" size={20}>
            {primaryNavItems.map((item) => (
              <Button
                key={item.key}
                type="text"
                className={item.key === 'patient' && isPatientMenuOpen
                  ? 'is-active'
                  : item.key === 'chat' && location.pathname === '/patient/chat'
                    ? 'is-active'
                  : item.key === 'doctor' && isDoctorMenuOpen
                    ? 'is-active'
                    : selectedKey === item.key
                      ? 'is-active'
                      : ''}
                onClick={() => handlePrimaryNavClick(item)}
              >
                {item.label}
              </Button>
            ))}
          </Space>

          <div className="landing-nav-v2__right">
            <Button className="landing-nav-v2__ai" icon={<Mic size={14} />} onClick={openAIVoiceAssistant}>
              <span className="label-full">CareBridge AI</span>
              <span className="label-short">AI</span>
            </Button>
            {!isAuthenticated ? (
              <>
                <Button
                  className="landing-nav-v2__ghost"
                  onClick={() => {
                    setIsPatientMenuOpen(false);
                    setIsDoctorMenuOpen(false);
                    setIsProfileMenuOpen(false);
                    navigateToSection('onboarding-videos');
                  }}
                >
                  <span className="label-full">Onboarding Videos</span>
                  <span className="label-short">Videos</span>
                </Button>
                <button type="button" className="landing-nav-v2__solid" onClick={handlePrimaryAction}>
                  <span className="label-full">Login</span>
                  <span className="label-short">Login</span>
                  <ArrowRight size={15} />
                </button>
              </>
            ) : isPatientUser ? (
              <div className="landing-nav-v2__profile">
                <button
                  type="button"
                  className={`landing-nav-v2__profile-trigger${isProfileMenuOpen ? ' is-open' : ''}`}
                  onClick={() => {
                    setIsProfileMenuOpen((previous) => !previous);
                    setIsPatientMenuOpen(false);
                    setIsDoctorMenuOpen(false);
                  }}
                >
                  <span className="landing-nav-v2__profile-avatar">{displayName.charAt(0).toUpperCase()}</span>
                  <span className="landing-nav-v2__profile-name">{displayName}</span>
                  <ChevronDown size={14} />
                </button>
                {isProfileMenuOpen ? (
                  <div className="landing-nav-v2__profile-menu" role="menu" aria-label="Account menu">
                    <button
                      type="button"
                      className="landing-nav-v2__profile-item"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/patient/account');
                      }}
                    >
                      <UserCircle2 size={15} />
                      My Profile
                    </button>
                    <button
                      type="button"
                      className="landing-nav-v2__profile-item"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/patient/account?tab=wallet');
                      }}
                    >
                      <Wallet size={15} />
                      My Wallet
                    </button>
                    <button
                      type="button"
                      className="landing-nav-v2__profile-item"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/patient/account?tab=security');
                      }}
                    >
                      <KeyRound size={15} />
                      Change password
                    </button>
                    <button
                      type="button"
                      className="landing-nav-v2__profile-item landing-nav-v2__profile-item--logout"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button type="button" className="landing-nav-v2__solid" onClick={handlePrimaryAction}>
                <span className="label-full">Home</span>
                <span className="label-short">Home</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </Header>

      {isDoctorMenuOpen ? (
        <section className="landing-doctor-menu" aria-label="Doctors quick access">
          <div className="landing-doctor-menu__grid">
            <div className="landing-doctor-menu__col landing-doctor-menu__col--left">
              <h4 className="landing-doctor-menu__heading">Doctor</h4>
              <div className="landing-doctor-menu__list">
                {doctorsMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeDoctorMenuItemData.key === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`landing-doctor-menu__item${isActive ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveDoctorMenuItem(item.key)}
                      onFocus={() => setActiveDoctorMenuItem(item.key)}
                      onClick={() => setActiveDoctorMenuItem(item.key)}
                    >
                      <span className={`landing-doctor-menu__item-icon landing-doctor-menu__item-icon--${index + 1}`}>
                        <Icon size={17} />
                      </span>
                      <span className="landing-doctor-menu__item-copy">
                        <span>{item.title}</span>
                        <small>{item.description}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="landing-doctor-menu__col landing-doctor-menu__col--middle">
              <h4 className="landing-doctor-menu__heading">Doctors Pages</h4>
              <div className="landing-doctor-menu__pages">
                {activeDoctorMenuItemData.pages.map((pageItem) => {
                  const pageConfig = typeof pageItem === 'string' ? { label: pageItem, indent: false } : pageItem;
                  return (
                    <button
                      key={`${activeDoctorMenuItemData.key}-${pageConfig.label}`}
                      type="button"
                      className={`landing-doctor-menu__page-btn${pageConfig.indent ? ' landing-doctor-menu__page-btn--indented' : ''}`}
                      onClick={openLogin}
                    >
                      {pageConfig.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="landing-doctor-menu__col landing-doctor-menu__col--right">
              <div className="landing-doctor-menu__hero">
                <img
                  src="https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=1400"
                  alt="Our doctors"
                  loading="lazy"
                  width="1200"
                  height="800"
                  decoding="async"
                />
                <button type="button" className="landing-doctor-menu__hero-cta" onClick={openLogin}>
                  Join Our Network Today <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isPatientMenuOpen ? (
        <section className="landing-patient-menu" aria-label="Patient services quick access">
          <div className="landing-patient-menu__grid">
            <div className="landing-patient-menu__col landing-patient-menu__col--type">
              <h4 className="landing-patient-menu__heading">Service Type</h4>
              <div className="landing-patient-menu__service-type-list">
                {patientMenuServiceTypes.map((serviceType) => {
                  const Icon = serviceType.icon;
                  const isActive = activePatientServiceTypeData.key === serviceType.key;
                  return (
                    <button
                      key={serviceType.key}
                      type="button"
                      className={`landing-patient-menu__service-type-btn${isActive ? ' is-active' : ''}`}
                      onMouseEnter={() => handlePatientServiceTypeSelect(serviceType.key)}
                      onFocus={() => handlePatientServiceTypeSelect(serviceType.key)}
                      onClick={() => openServiceTypePage(serviceType.key)}
                    >
                      <span className="landing-patient-menu__service-type-icon">
                        <Icon size={16} />
                      </span>
                      <span className="landing-patient-menu__service-type-copy">
                        <span>{serviceType.title}</span>
                        <small>{serviceType.description}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="landing-patient-menu__col landing-patient-menu__col--category">
              <h4 className="landing-patient-menu__heading">Categories</h4>
              <div className="landing-patient-menu__category-list">
                {activePatientServiceTypeData.categories.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    className={`landing-patient-menu__category-btn${
                      activePatientCategoryData.key === category.key ? ' is-active' : ''
                    }`}
                    onMouseEnter={() => setActivePatientCategory(category.key)}
                    onFocus={() => setActivePatientCategory(category.key)}
                    onClick={() => openCategoryPage(category.key)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="landing-patient-menu__col landing-patient-menu__col--services">
              <h4 className="landing-patient-menu__heading">Services</h4>
              <div className="landing-patient-menu__services-list">
                {activePatientCategoryData.services.map((serviceName) => (
                  <button
                    key={serviceName}
                    type="button"
                    className="landing-patient-menu__service-btn"
                    onClick={() => openServicePage(serviceName)}
                  >
                    {serviceName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isAIVoiceAssistantOpen ? (
        <div className="fixed inset-0 z-[1300] bg-slate-900/60 backdrop-blur-sm">
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">Loading AI triage...</div>}>
            <AIVoiceAssistant
              onComplete={handleAIVoiceComplete}
              onClose={() => setIsAIVoiceAssistantOpen(false)}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
