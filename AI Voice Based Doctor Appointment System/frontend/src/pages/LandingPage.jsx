import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, Card, Col, Layout, Row, Space, Tag, Typography } from 'antd';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  House,
  MapPin,
  MessageSquare,
  Mic,
  Phone,
  ShieldCheck,
  Star,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react';
import AppIcon from '../components/branding/AppIcon';
import LandingNavbar from '../components/LandingNavbar';
import './landing-page.css';

const { Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

const imageLibrary = {
  doctorsTeam: '/landing/images/v1_2846.png',
  patientTablet: '/landing/images/v1_3373.png',
  telehealthSession: '/landing/images/v1_3394.png',
};

const heroSlides = [
  imageLibrary.doctorsTeam,
  imageLibrary.telehealthSession,
  imageLibrary.patientTablet,
  imageLibrary.telehealthSession,
];
const heroTypedPhrase = 'Healthcare Designed for You';

const heroCards = [
  { label: 'Video Consultation', icon: Video, tone: 'purple' },
  { label: 'Telephone Consultation', icon: Phone, tone: 'blue' },
  { label: 'In-Person Doctor Visit', icon: MapPin, tone: 'green' },
  { label: 'Waiting Room', icon: Users, tone: 'amber' },
];

const heroTagCarouselItems = [
  { label: 'Patient Satisfaction', icon: CheckCircle, metric: '99%' },
  { label: 'With or Without Insurance', icon: ShieldCheck },
  { label: 'Specialties Offered', icon: Stethoscope },
  { label: 'Choose Your Provider', icon: Users },
  { label: 'Rating On App Store', icon: Star, metric: '4.9' },
  { label: 'Services', icon: Activity, metric: '6' },
  { label: 'Same Day Visits', icon: CalendarClock },
];

const serviceCards = [
  {
    title: 'Telehealth Medical Consultation',
    description: 'Book an online consultation with licensed doctors.',
    icon: Stethoscope,
    tone: 'video',
  },
  {
    title: 'Prescription',
    description: 'Get prescriptions for medications quickly and conveniently.',
    icon: FileText,
    tone: 'prescription',
  },
  {
    title: 'Medical Certificates',
    description: 'Request medical certificates for work or school.',
    icon: CalendarClock,
    tone: 'certificates',
  },
  {
    title: 'Pathology Requests',
    description: 'Order blood tests without visiting a doctor in person.',
    icon: Activity,
    tone: 'pathology',
  },
  {
    title: 'Radiology Requests',
    description: 'Request X-rays, MRI, or CT scans through telehealth.',
    icon: MessageSquare,
    tone: 'radiology',
  },
  {
    title: 'Specialist Referral',
    description: 'Get a referral to a specialist without a clinic visit.',
    icon: Users,
    tone: 'referral',
  },
];

const steps = [
  {
    title: 'Select Service',
    desc: 'Choose the healthcare service that best suits your needs.',
    image: imageLibrary.patientTablet,
  },
  {
    title: 'Choose Consultation Type',
    desc: 'Select video, telephone, in-person, or home visit and pick a suitable time slot.',
    image: imageLibrary.telehealthSession,
  },
  {
    title: 'View Doctor Details',
    desc: 'Review doctor experience, specialization, and patient feedback.',
    image: imageLibrary.doctorsTeam,
  },
  {
    title: 'Get Your Solution',
    desc: 'Confirm your booking and receive consultation, prescription, or care plan.',
    image: imageLibrary.patientTablet,
  },
];

const awesomeFeatureTabs = [
  {
    key: 'patients',
    label: 'For Patients',
    items: [
      {
        title: 'Instant Access to Care',
        description: 'Speak to verified doctors in minutes without waiting in long queues.',
        icon: CalendarClock,
      },
      {
        title: 'All Medical Docs in One Place',
        description: 'Prescriptions, referrals, and certificates are delivered digitally.',
        icon: FileText,
      },
      {
        title: 'Flexible Consultation Modes',
        description: 'Video, phone, in-person, and home visit options for every lifestyle.',
        icon: Video,
      },
    ],
  },
  {
    key: 'families',
    label: 'For Families',
    items: [
      {
        title: 'Care for Every Age Group',
        description: 'Book appointments for adults, seniors, and children in one account.',
        icon: Users,
      },
      {
        title: 'Safer Ongoing Follow-ups',
        description: 'Track recurring conditions and maintain continuity of care.',
        icon: ShieldCheck,
      },
      {
        title: 'Shared Health Timeline',
        description: 'Keep your family appointments and records organized in one place.',
        icon: Activity,
      },
    ],
  },
  {
    key: 'providers',
    label: 'For Providers',
    items: [
      {
        title: 'Structured Consultation Flow',
        description: 'Reduce admin burden with streamlined intake and booking workflows.',
        icon: Clock,
      },
      {
        title: 'Secure Clinical Communication',
        description: 'Use compliant messaging and telehealth sessions for patient care.',
        icon: MessageSquare,
      },
      {
        title: 'Better Capacity Management',
        description: 'Publish slots, handle demand, and improve consultation throughput.',
        icon: CalendarClock,
      },
    ],
  },
];

const whyChooseCards = [
  {
    title: 'AHPRA-Verified Professionals',
    description: 'Every provider on CareBridge is credentialed and verified before onboarding.',
    icon: ShieldCheck,
  },
  {
    title: 'Faster Access, Better Outcomes',
    description: 'Get the right care sooner with shorter wait times and guided follow-ups.',
    icon: Activity,
  },
  {
    title: 'Patient-First Experience',
    description: 'Clear pricing, flexible appointment options, and an experience built around you.',
    icon: Users,
  },
];

const plusCards = [
  {
    title: 'Priority Booking Windows',
    description: 'Get faster access to peak-hour appointments and urgent telehealth slots.',
    icon: CalendarClock,
  },
  {
    title: 'Member-Only Price Protection',
    description: 'Lock in lower consultation fees and predictable out-of-pocket costs.',
    icon: ShieldCheck,
  },
  {
    title: 'Dedicated Care Follow-up',
    description: 'Receive guided post-consultation support for better long-term outcomes.',
    icon: CheckCircle,
  },
];

const testimonials = [
  {
    name: 'Sarah Thompson',
    role: 'Patient - Brisbane',
    message:
      'The whole process was seamless. I booked in five minutes, spoke to a doctor quickly, and received my prescription digitally right after the consultation.',
    image: imageLibrary.patientTablet,
  },
  {
    name: 'Michael Lewis',
    role: 'Patient - Sydney',
    message:
      'CareBridge saved me hours. The doctor was clear, professional, and I got my referral and care plan without visiting a clinic.',
    image: imageLibrary.telehealthSession,
  },
  {
    name: 'Priya Nair',
    role: 'Patient - Melbourne',
    message:
      'The home visit option was exactly what we needed for my parents. The experience was reliable, respectful, and easy to manage.',
    image: imageLibrary.doctorsTeam,
  },
];

const benefitsList = [
  'Book appointments anytime, anywhere',
  'Video and phone consultations on your device',
  'Access prescriptions and medical records instantly',
  'Track appointments and consultation history in one place',
  'Secure communication with verified Australian doctors',
];

const topRatedTabs = [
  { key: 'popular', label: 'Most Popular Services', icon: Stethoscope },
  { key: 'specialists', label: 'Specialist Consults', icon: Users },
  { key: 'documents', label: 'Medical Documents', icon: FileText },
];

const topRatedCards = {
  popular: [
    {
      title: 'General Consultation',
      description: 'Fast telehealth consultation for common symptoms and medical advice.',
      image: imageLibrary.telehealthSession,
      duration: '15-20 mins',
      mode: 'Video or Phone',
      rating: '4.9',
      price: '$45',
      badge: 'Save $30',
      note: 'Compared to traditional clinic rates',
    },
    {
      title: 'Weight Management',
      description: 'Evidence-based weight support plan with regular doctor follow-up.',
      image: imageLibrary.patientTablet,
      duration: '20-30 mins',
      mode: 'Video Consultation',
      rating: '4.8',
      price: '$59',
      badge: 'Save $36',
      note: 'Includes follow-up recommendations',
    },
    {
      title: 'Skin & Dermatology Advice',
      description: 'Review skin concerns and receive treatment options and referral guidance.',
      image: imageLibrary.doctorsTeam,
      duration: '20 mins',
      mode: 'Video Consultation',
      rating: '4.9',
      price: '$65',
      badge: 'Save $40',
      note: 'Digital scripts when clinically appropriate',
    },
  ],
  specialists: [
    {
      title: 'Cardiology Pre-Screen',
      description: 'Initial specialist-focused review and referral guidance for cardiac concerns.',
      image: imageLibrary.doctorsTeam,
      duration: '25 mins',
      mode: 'Video Consultation',
      rating: '4.8',
      price: '$80',
      badge: 'Save $70',
      note: 'Referral-ready documentation included',
    },
    {
      title: 'Endocrinology Review',
      description: 'Diabetes and hormone-related review with tailored clinical advice.',
      image: imageLibrary.telehealthSession,
      duration: '25-30 mins',
      mode: 'Video Consultation',
      rating: '4.9',
      price: '$85',
      badge: 'Save $65',
      note: 'Designed for ongoing condition support',
    },
    {
      title: 'Mental Health Consultation',
      description: 'Confidential consultation with pathway support for ongoing mental care.',
      image: imageLibrary.patientTablet,
      duration: '30 mins',
      mode: 'Video or Phone',
      rating: '4.9',
      price: '$75',
      badge: 'Save $45',
      note: 'Follow-up and referral options available',
    },
  ],
  documents: [
    {
      title: 'Digital Prescription',
      description: 'Get clinically appropriate scripts delivered digitally to your phone or email.',
      image: imageLibrary.patientTablet,
      duration: '10-15 mins',
      mode: 'Telehealth',
      rating: '4.9',
      price: '$35',
      badge: 'Save $25',
      note: 'Quick turnaround for eligible cases',
    },
    {
      title: 'Medical Certificate',
      description: 'Request same-day medical certificates for work or university requirements.',
      image: imageLibrary.telehealthSession,
      duration: '10 mins',
      mode: 'Telehealth',
      rating: '4.8',
      price: '$35',
      badge: 'Save $25',
      note: 'Delivered digitally after consultation',
    },
    {
      title: 'Specialist Referral',
      description: 'Receive specialist referral letters with complete consultation context.',
      image: imageLibrary.doctorsTeam,
      duration: '15 mins',
      mode: 'Telehealth',
      rating: '4.9',
      price: '$45',
      badge: 'Save $30',
      note: 'Accepted by specialist clinics nationwide',
    },
  ],
};

const scheduleTabs = [
  { key: 'gp', label: 'General Practitioners' },
  { key: 'specialists', label: 'Specialists' },
  { key: 'mental-health', label: 'Mental Health' },
];

const scheduleCardsByTab = {
  gp: [
    {
      doctor: 'Dr Deepak Nair',
      specialty: 'General Practitioner | Male',
      image: imageLibrary.telehealthSession,
      experience: '15+ Years',
      consultations: '5.2k+',
      day: 'Monday',
      date: '2026-06-29',
      slots: ['09:00 AM', '09:15 AM', '09:30 AM', '10:00 AM', '10:15 AM'],
    },
    {
      doctor: 'Dr Anna Jones',
      specialty: 'General Practitioner | Female',
      image: imageLibrary.patientTablet,
      experience: '12+ Years',
      consultations: '4.1k+',
      day: 'Monday',
      date: '2026-06-29',
      slots: ['09:00 AM', '09:30 AM', '09:45 AM', '10:15 AM', '10:30 AM'],
    },
    {
      doctor: 'Dr Fabian Andrews',
      specialty: 'General Practitioner | Male',
      image: imageLibrary.doctorsTeam,
      experience: '20+ Years',
      consultations: '6.8k+',
      day: 'Tuesday',
      date: '2026-06-30',
      slots: ['09:00 AM', '09:15 AM', '09:45 AM', '10:00 AM', '10:30 AM'],
    },
  ],
  specialists: [
    {
      doctor: 'Dr Amelia Hart',
      specialty: 'Endocrinology Specialist',
      image: imageLibrary.doctorsTeam,
      experience: '16+ Years',
      consultations: '2.4k+',
      day: 'Wednesday',
      date: '2026-07-01',
      slots: ['11:00 AM', '11:15 AM', '11:30 AM', '12:00 PM', '12:15 PM'],
    },
    {
      doctor: 'Dr Noah Parker',
      specialty: 'Cardiology Specialist',
      image: imageLibrary.telehealthSession,
      experience: '14+ Years',
      consultations: '2.0k+',
      day: 'Wednesday',
      date: '2026-07-01',
      slots: ['10:00 AM', '10:15 AM', '10:45 AM', '11:00 AM', '11:30 AM'],
    },
    {
      doctor: 'Dr Olivia Bennett',
      specialty: 'Respiratory Specialist',
      image: imageLibrary.patientTablet,
      experience: '18+ Years',
      consultations: '2.8k+',
      day: 'Thursday',
      date: '2026-07-02',
      slots: ['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:15 AM'],
    },
  ],
  'mental-health': [
    {
      doctor: 'Dr Liam Cooper',
      specialty: 'Psychiatrist',
      image: imageLibrary.patientTablet,
      experience: '13+ Years',
      consultations: '3.1k+',
      day: 'Friday',
      date: '2026-07-03',
      slots: ['01:00 PM', '01:30 PM', '02:00 PM', '02:15 PM', '02:30 PM'],
    },
    {
      doctor: 'Dr Emily Foster',
      specialty: 'Psychologist',
      image: imageLibrary.telehealthSession,
      experience: '10+ Years',
      consultations: '2.7k+',
      day: 'Friday',
      date: '2026-07-03',
      slots: ['10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM'],
    },
    {
      doctor: 'Dr Jacob Reed',
      specialty: 'Mental Health GP',
      image: imageLibrary.doctorsTeam,
      experience: '11+ Years',
      consultations: '2.2k+',
      day: 'Saturday',
      date: '2026-07-04',
      slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:15 AM', '10:45 AM'],
    },
  ],
};

const transparentPricingRows = [
  {
    type: 'service',
    service: 'General Consultation',
    detail: 'Standard telehealth visit',
    clinic: '$75',
    ours: '$45',
    save: 'Save $30',
  },
  {
    type: 'service',
    service: 'Specialist Consultation',
    detail: 'With referral support',
    clinic: '$150',
    ours: '$80',
    save: 'Save $70',
  },
  {
    type: 'service',
    service: 'Medical Certificate',
    detail: 'Digital delivery',
    clinic: '$60',
    ours: '$35',
    save: 'Save $25',
  },
  {
    type: 'state',
    service: 'Wait Time',
    detail: 'Average queue before doctor connect',
    clinicState: '30-60 mins',
    oursState: '5-10 mins',
  },
  {
    type: 'state',
    service: 'Prescription Delivery',
    detail: 'How scripts are delivered after consult',
    clinicState: 'Paper only',
    oursState: 'Instant digital',
  },
];

const tutorials = [
  { title: 'Patient Onboarding Guide', duration: '3 min', image: imageLibrary.patientTablet },
  { title: 'Standard Consultation Booking', duration: '2 min', image: imageLibrary.telehealthSession },
  { title: 'Get Your Prescription', duration: '2 min', image: imageLibrary.doctorsTeam },
];

function SectionHeader({ badge, title, highlighted, subtitle, leftAligned = false }) {
  return (
    <div className={`section-header${leftAligned ? ' section-header--left' : ''}`}>
      {badge ? <Tag className="section-badge">{badge}</Tag> : null}
      <Title level={2}>
        {title} <span>{highlighted}</span>
      </Title>
      {subtitle ? <Paragraph>{subtitle}</Paragraph> : null}
    </div>
  );
}

function getInitialByDirection(direction) {
  if (direction === 'left') return { opacity: 0, x: -34, y: 0 };
  if (direction === 'right') return { opacity: 0, x: 34, y: 0 };
  return { opacity: 0, x: 0, y: 28 };
}

export default function LandingPage() {
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const reduceMotion = useReducedMotion();
  const [typedHeroText, setTypedHeroText] = useState(() => (reduceMotion ? heroTypedPhrase : ''));
  const [activeFeatureTab, setActiveFeatureTab] = useState(awesomeFeatureTabs[0].key);
  const [activeTopRatedTab, setActiveTopRatedTab] = useState(topRatedTabs[0].key);
  const [activeScheduleTab, setActiveScheduleTab] = useState(scheduleTabs[0].key);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const activeFeatureItems = useMemo(
    () => awesomeFeatureTabs.find((tab) => tab.key === activeFeatureTab)?.items ?? awesomeFeatureTabs[0].items,
    [activeFeatureTab]
  );
  const activeTopRatedCards = useMemo(() => topRatedCards[activeTopRatedTab] ?? topRatedCards.popular, [activeTopRatedTab]);
  const activeScheduleCards = useMemo(
    () => scheduleCardsByTab[activeScheduleTab] ?? scheduleCardsByTab.gp,
    [activeScheduleTab]
  );

  useEffect(() => {
    if (heroSlides.length < 2 || reduceMotion) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveHeroSlide((previous) => (previous + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(intervalId);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return undefined;

    let characterIndex = 0;
    const intervalId = window.setInterval(() => {
      characterIndex += 1;
      setTypedHeroText(heroTypedPhrase.slice(0, characterIndex));
      if (characterIndex >= heroTypedPhrase.length) {
        window.clearInterval(intervalId);
      }
    }, 75);

    return () => window.clearInterval(intervalId);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 5200);
    return () => window.clearInterval(intervalId);
  }, [reduceMotion]);

  const revealProps = (direction = 'up', delay = 0) => {
    const initial = reduceMotion ? { opacity: 1, x: 0, y: 0 } : getInitialByDirection(direction);
    const transition = reduceMotion
      ? { duration: 0 }
      : { duration: 0.58, delay, ease: [0.22, 1, 0.36, 1] };

    return {
      initial,
      whileInView: { opacity: 1, x: 0, y: 0 },
      viewport: { once: true, amount: 0.2 },
      transition,
    };
  };

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeReview = testimonials[activeTestimonial];

  return (
    <Layout className="landing-page-v2">
      <section className="landing-hero-v2">
        <div className="landing-hero-v2__media" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              key={slide}
              className={`landing-hero-v2__media-slide${index === activeHeroSlide ? ' is-active' : ''}`}
              style={{ backgroundImage: `url(${slide})` }}
            />
          ))}
        </div>
        <div className="landing-hero-v2__overlay" />

        <LandingNavbar />

        <div className="landing-hero-v2__content">
          <motion.div className="landing-hero-v2__left" {...revealProps('left', 0.04)}>
            <Space direction="vertical" size={12} className="landing-hero-v2__copy">
              <Tag className="landing-chip" bordered={false}>
                <ShieldCheck size={14} /> AHPRA Verified Doctors
              </Tag>
              <Title level={1}>
                CareBridge is
                <span className="landing-hero-v2__typed-wrap">
                  <span className="landing-hero-v2__typed">{typedHeroText}</span>
                  <span className="landing-hero-v2__typed-caret" aria-hidden="true">
                    |
                  </span>
                </span>
              </Title>
              <Paragraph className="landing-hero-v2__subtitle">
                Choose how you want to see a doctor: video, phone, in-person, or at home.
              </Paragraph>
              <ul>
                <li>
                  <CheckCircle size={16} /> Available 24/7, including weekends
                </li>
                <li>
                  <CheckCircle size={16} /> Prescriptions and referrals provided
                </li>
                <li>
                  <CheckCircle size={16} /> Same-day appointments available
                </li>
              </ul>
              <Space className="landing-hero-v2__actions" wrap>
                <Link to="/login" className="landing-btn landing-btn--primary">
                  Book an Appointment <ArrowRight size={16} />
                </Link>
                <Button className="landing-btn landing-btn--outline" onClick={() => scrollToSection('steps')}>
                  How It Works
                </Button>
              </Space>
              <Space className="landing-hero-v2__meta" wrap>
                <span>
                  <Clock size={14} /> Avg. 5 min wait time
                </span>
                <span>10,000+ patients treated</span>
                <span>500+ verified doctors</span>
              </Space>
            </Space>
          </motion.div>

          <motion.div className="landing-hero-v2__right" {...revealProps('right', 0.08)}>
            <div className="landing-hero-v2__cards">
              {heroCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.label} className="hero-mode-card" bordered={false}>
                    <span className={`hero-mode-card__icon hero-mode-card__icon--${card.tone}`}>
                      <Icon size={18} />
                    </span>
                    <p>{card.label}</p>
                  </Card>
                );
              })}
              <Card className="hero-mode-card hero-mode-card--wide" bordered={false}>
                <span className="hero-mode-card__icon hero-mode-card__icon--pink">
                  <House size={18} />
                </span>
                <div>
                  <p>Home Visits</p>
                  <small>Doctors visit your location</small>
                </div>
                <ArrowRight size={18} />
              </Card>
            </div>
          </motion.div>
        </div>

        <motion.div {...revealProps('up', 0.12)}>
          <Card className="landing-hero-v2__banner" bordered={false}>
            <ShieldCheck size={18} />
            <p>
              CareBridge is Australia&apos;s first truly digital GP clinic, combining personalised care, smart technology,
              and long-term health support so every patient has a doctor who knows them.
            </p>
          </Card>
        </motion.div>
      </section>

      <Content>
        <section className="landing-tag-carousel" aria-label="CareBridge highlights">
          <div className="landing-tag-carousel__track" role="list">
            {[...heroTagCarouselItems, ...heroTagCarouselItems].map((item, index) => {
              const Icon = item.icon;
              const isDuplicate = index >= heroTagCarouselItems.length;
              return (
                <div
                  className="landing-tag-carousel__item"
                  role="listitem"
                  key={`${item.label}-${index}`}
                  aria-hidden={isDuplicate}
                >
                  <div className="landing-tag-carousel__head">
                    <span className="landing-tag-carousel__icon" aria-hidden="true">
                      <Icon size={22} />
                    </span>
                    {item.metric ? <span className="landing-tag-carousel__metric">{item.metric}</span> : null}
                  </div>
                  <span className="landing-tag-carousel__text">{item.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section id="services" className="landing-section container landing-services">
          <motion.div {...revealProps('up', 0.02)}>
            <SectionHeader
              badge="Comprehensive Healthcare Solutions"
              title="Our"
              highlighted="Healthcare Services"
              subtitle="Access professional healthcare services delivered by AHPRA verified doctors. Choose the service that best fits your needs."
            />
          </motion.div>
          <Row className="service-row" gutter={[16, 16]}>
            {serviceCards.map((service, index) => {
              const Icon = service.icon;
              return (
                <Col xs={24} md={12} lg={8} key={service.title}>
                  <motion.div {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.04 + index * 0.03)}>
                    <Card className={`service-card service-card--${service.tone}`}>
                      <span className="service-card__icon">
                        <Icon size={20} />
                      </span>
                      <Title level={4}>{service.title}</Title>
                      <Paragraph>{service.description}</Paragraph>
                      <div className="service-card__footer">
                        <Button type="text">Learn more</Button>
                        <span className="service-card__dots" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        </section>

        <section className="landing-highlight">
          <div className="container">
            <Row className="highlight-row" gutter={[14, 14]}>
              {[
                { value: '24/7', title: 'Available Anytime', copy: 'Round-the-clock access to healthcare' },
                { value: '100%', title: 'AHPRA Verified', copy: 'All doctors professionally certified' },
                { value: '15min', title: 'Fast Service', copy: 'Quick consultations and responses' },
              ].map((item, index) => (
                <Col xs={24} md={8} key={item.title}>
                  <motion.div {...revealProps('up', 0.05 + index * 0.04)}>
                    <Card className="highlight-card">
                      <Title level={4}>{item.value}</Title>
                      <Text strong>{item.title}</Text>
                      <Paragraph>{item.copy}</Paragraph>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </div>
        </section>

        <section id="steps" className="landing-section container landing-steps-v2">
          <motion.div {...revealProps('up', 0.02)}>
            <SectionHeader title="4 Easy" highlighted="Steps" subtitle="Getting quality healthcare is simple with CareBridge." />
          </motion.div>
          <div className="landing-steps-v2__grid">
            {steps.map((step, index) => (
              <motion.article
                className="landing-steps-v2__item"
                key={step.title}
                {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.04 + index * 0.04)}
              >
                <div className="landing-steps-v2__media-wrap">
                  <img src={step.image} alt={step.title} loading="lazy" />
                  <span className="landing-steps-v2__number">{index + 1}</span>
                </div>
                <Title level={4}>{step.title}</Title>
                <Paragraph>{step.desc}</Paragraph>
                {index < steps.length - 1 ? (
                  <span className="landing-steps-v2__arrow" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                ) : null}
              </motion.article>
            ))}
          </div>
          <motion.div {...revealProps('up', 0.08)}>
            <Link to="/login" className="landing-btn landing-btn--primary landing-steps-v2__cta">
              <CalendarClock size={16} /> Book Standard Consultation now <ArrowRight size={16} />
            </Link>
          </motion.div>
        </section>

        <section id="consult-types" className="landing-section landing-consult-types">
          <div className="container">
            <motion.div {...revealProps('up', 0.02)}>
              <SectionHeader
                badge="Choose Your Consultation Type"
                title="Flexible Healthcare"
                highlighted="On Your Terms"
                subtitle="Select the consultation method that works best for you. All options connect you with verified Australian healthcare professionals."
              />
            </motion.div>

            <Space className="consult-chip-list" wrap>
              <Button className="is-active">
                <Video size={14} /> Video Consultation
              </Button>
              <Button>
                <Phone size={14} /> Telephone Consultation
              </Button>
              <Button>
                <MapPin size={14} /> In-Person Doctor Visit
              </Button>
              <Button>
                <Users size={14} /> Waiting Room
              </Button>
              <Button>
                <House size={14} /> Doctor Visits Your Location
              </Button>
            </Space>

            <motion.div className="consult-panel" {...revealProps('up', 0.06)}>
              <div className="consult-panel__left">
                <div className="consult-panel__title-row">
                  <span className="consult-panel__title-icon">
                    <Video size={20} />
                  </span>
                  <Title level={4}>Video Consultation</Title>
                </div>
                <Paragraph>
                  Connect face-to-face with AHPRA verified doctors through secure video calls. Get medical advice,
                  prescriptions, and referrals without leaving home.
                </Paragraph>

                <div className="consult-panel__group">
                  <Text strong className="consult-section-head">
                    <Activity size={14} /> Key Features
                  </Text>
                  <div className="consult-feature-grid">
                    <div className="consult-feature-card">
                      <Clock size={14} />
                      <div>
                        <small>Average Wait Time</small>
                        <strong>5-10 mins</strong>
                      </div>
                    </div>
                    <div className="consult-feature-card">
                      <CalendarClock size={14} />
                      <div>
                        <small>Session Duration</small>
                        <strong>15-30 mins</strong>
                      </div>
                    </div>
                    <div className="consult-feature-card">
                      <Activity size={14} />
                      <div>
                        <small>Available</small>
                        <strong>24/7</strong>
                      </div>
                    </div>
                    <div className="consult-feature-card">
                      <FileText size={14} />
                      <div>
                        <small>Price Range</small>
                        <strong>From $59</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="consult-panel__group">
                  <Text strong className="consult-section-head">
                    <CheckCircle size={14} /> What&apos;s Included
                  </Text>
                  <ul className="consult-include-list">
                    <li>
                      <CheckCircle size={16} /> HD video consultation with specialist
                    </li>
                    <li>
                      <CheckCircle size={16} /> Digital prescription via email and SMS
                    </li>
                    <li>
                      <CheckCircle size={16} /> Medical certificate if required
                    </li>
                    <li>
                      <CheckCircle size={16} /> Follow-up notes and care plan
                    </li>
                    <li>
                      <CheckCircle size={16} /> Specialist referrals when needed
                    </li>
                  </ul>
                </div>

                <div className="consult-panel__group">
                  <Text strong className="consult-section-head">
                    <ShieldCheck size={14} /> Why Choose This
                  </Text>
                  <div className="consult-why-grid">
                    <span>
                      <ShieldCheck size={14} /> Fast connect in minutes
                    </span>
                    <span>
                      <Mic size={14} /> Secure and private
                    </span>
                    <span>
                      <Users size={14} /> AHPRA certified doctors
                    </span>
                    <span>
                      <MessageSquare size={14} /> Clear communication
                    </span>
                  </div>
                </div>
              </div>

              <div className="consult-panel__right">
                <Text strong className="consult-section-head">
                  <CalendarClock size={14} /> How It Works
                </Text>
                <ol className="consult-timeline">
                  <li>
                    <span>1</span>
                    <div>
                      <h5>Select Video Consultation</h5>
                      <p>Choose your preferred time slot</p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <h5>Provide Your Details</h5>
                      <p>Fill in medical history and symptoms</p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <h5>Join Video Call</h5>
                      <p>Connect with your doctor via video</p>
                    </div>
                  </li>
                  <li>
                    <span>4</span>
                    <div>
                      <h5>Receive Care Plan</h5>
                      <p>Get prescriptions and follow-up advice</p>
                    </div>
                  </li>
                </ol>

                <div className="consult-estimate">
                  <CheckCircle size={16} />
                  <div>
                    <small>Estimated Time</small>
                    <strong>15-30 minutes</strong>
                  </div>
                </div>

                <Link to="/login" className="landing-btn landing-btn--primary consult-panel__cta">
                  <CalendarClock size={16} /> Book Appointment Now <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="landing-section landing-awesome-features">
          <div className="container">
            <motion.div className="awesome-features__header" {...revealProps('up', 0.02)}>
              <h2>
                Awesome <span>Features</span>
              </h2>
              <Paragraph>
                Powerful capabilities for patients, families, and healthcare providers in one connected ecosystem.
              </Paragraph>
              <div className="awesome-features__tabs" role="tablist" aria-label="Feature categories">
                {awesomeFeatureTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={tab.key === activeFeatureTab}
                    className={`awesome-features__tab${tab.key === activeFeatureTab ? ' is-active' : ''}`}
                    onClick={() => setActiveFeatureTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>
            <div className="awesome-features__tab-panel" role="tabpanel">
              <div className="awesome-features__grid">
                {activeFeatureItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.article
                      key={item.title}
                      className="awesome-feature-card"
                      {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.04 + index * 0.03)}
                    >
                      <span className="awesome-feature-card__icon">
                        <Icon size={18} />
                      </span>
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-why-choose">
          <div className="container">
            <motion.div className="why-choose__header" {...revealProps('up', 0.02)}>
              <h2>
                Why Choose <span>CareBridge</span>
              </h2>
              <Paragraph>
                We combine quality clinical care with modern digital workflows so you can access healthcare with confidence.
              </Paragraph>
            </motion.div>
            <div className="why-choose__grid">
              {whyChooseCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article
                    key={card.title}
                    className="why-choose-card"
                    {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.04 + index * 0.03)}
                  >
                    <span className="why-choose-card__icon">
                      <Icon size={18} />
                    </span>
                    <h4>{card.title}</h4>
                    <p>{card.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section landing-plus">
          <div className="container">
            <motion.div className="plus-header" {...revealProps('up', 0.02)}>
              <Tag className="plus-badge">Membership</Tag>
              <h2>CareBridge Plus</h2>
            </motion.div>
            <div className="plus-grid">
              {plusCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article
                    key={card.title}
                    className="plus-card"
                    {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.05 + index * 0.03)}
                  >
                    <span className="plus-card__icon">
                      <Icon size={20} />
                    </span>
                    <h4>{card.title}</h4>
                    <p>{card.description}</p>
                  </motion.article>
                );
              })}
            </div>
            <motion.div className="plus-cta-wrap" {...revealProps('up', 0.08)}>
              <Link to="/login" className="landing-btn landing-btn--primary plus-cta">
                Join CareBridge Plus <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="landing-section landing-testimonials">
          <div className="container">
            <motion.div {...revealProps('up', 0.02)}>
              <SectionHeader
                title="What Our"
                highlighted="Patients Say"
                subtitle="Real stories from patients using CareBridge across Australia."
              />
            </motion.div>
            <div className="testimonials-wrap">
              <motion.article key={activeReview.name} className="testimonial-card" {...revealProps('up', 0.05)}>
                <div className="testimonial-card__stars" aria-label="5 star rating">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <span className="testimonial-card__quote-mark" aria-hidden="true">
                  &ldquo;
                </span>
                <p className="testimonial-card__message">{activeReview.message}</p>
                <div className="testimonial-card__person">
                  <img src={activeReview.image} alt={activeReview.name} loading="lazy" />
                  <div>
                    <h4>{activeReview.name}</h4>
                    <span>{activeReview.role}</span>
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </section>

        <section className="landing-section landing-benefits">
          <div className="container">
            <div className="benefits-layout">
              <motion.div className="benefits-visual" {...revealProps('left', 0.03)}>
                <span className="benefits-visual__orb" aria-hidden="true" />
                <img src={imageLibrary.telehealthSession} alt="Doctor assisting patient via telehealth" loading="lazy" />
              </motion.div>
              <motion.div className="benefits-copy" {...revealProps('right', 0.07)}>
                <h2>
                  What are the benefits of using <span>CareBridge?</span>
                </h2>
                <Paragraph>
                  CareBridge gives you easier access to quality healthcare with transparent pricing, short wait times, and
                  complete digital convenience.
                </Paragraph>
                <ul className="benefits-list">
                  {benefitsList.map((item) => (
                    <li key={item}>
                      <CheckCircle size={18} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-top-rated" id="doctors">
          <div className="container">
            <motion.div className="top-rated__header" {...revealProps('up', 0.02)}>
              <Tag className="top-rated__badge">
                <Star size={14} /> Top Rated
              </Tag>
              <h2>
                Top-Rated Doctors &amp; <span>Specialists</span>
              </h2>
              <Paragraph>
                Explore our most popular services and meet our highly qualified healthcare professionals.
              </Paragraph>
              <div className="top-rated__tabs" role="tablist" aria-label="Top rated categories">
                {topRatedTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={tab.key === activeTopRatedTab}
                      className={`top-rated__tab${tab.key === activeTopRatedTab ? ' is-active' : ''}`}
                      onClick={() => setActiveTopRatedTab(tab.key)}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <div className="top-rated__content">
              <div className="top-rated__grid">
                {activeTopRatedCards.map((card, index) => (
                  <motion.article
                    key={card.title}
                    className="top-rated-card"
                    {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.05 + index * 0.03)}
                  >
                    <div className="top-rated-card__media">
                      <img src={card.image} alt={card.title} loading="lazy" />
                    </div>
                    <div className="top-rated-card__body">
                      <h4>{card.title}</h4>
                      <p>
                        {card.description}
                        <span className="top-rated-card__read-more">Read more</span>
                      </p>
                      <div className="top-rated-card__meta">
                        <span>
                          <Clock size={12} /> {card.duration}
                        </span>
                        <span>
                          <Video size={12} /> {card.mode}
                        </span>
                        <span>
                          <Star size={12} /> {card.rating}
                        </span>
                      </div>
                      <div className="top-rated-card__footer">
                        <div className="top-rated-card__price">
                          <strong>
                            {card.price}
                            <small>{card.badge}</small>
                          </strong>
                          <em>{card.note}</em>
                        </div>
                        <Link to="/login" className="top-rated-card__cta">
                          Book now
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
              <span className="top-rated__next" aria-hidden="true">
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </section>

        <section className="landing-section landing-schedule">
          <div className="container">
            <motion.div className="landing-schedule__header" {...revealProps('up', 0.02)}>
              <h2>
                Select your <span>appointment</span>
              </h2>
              <Paragraph>
                Choose your preferred doctor and slot. Availability updates in real time across consultation categories.
              </Paragraph>
              <div className="landing-schedule__tabs" role="tablist" aria-label="Schedule categories">
                {scheduleTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={tab.key === activeScheduleTab}
                    className={`landing-schedule__tab${tab.key === activeScheduleTab ? ' is-active' : ''}`}
                    onClick={() => setActiveScheduleTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <div className="landing-schedule__content">
              <div className="landing-schedule__grid">
                {activeScheduleCards.map((card, index) => (
                  <motion.article
                    key={card.doctor}
                    className="schedule-card"
                    {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.05 + index * 0.03)}
                  >
                    <div className="schedule-card__media">
                      <img src={card.image} alt={card.doctor} loading="lazy" />
                    </div>
                    <div className="schedule-card__body">
                      <h4>{card.doctor}</h4>
                      <p>{card.specialty}</p>
                      <div className="schedule-card__stats">
                        <div>
                          <small>Experience</small>
                          <strong>{card.experience}</strong>
                        </div>
                        <div>
                          <small>Consultations</small>
                          <strong>{card.consultations}</strong>
                        </div>
                      </div>
                      <div className="schedule-card__availability">
                        <div className="schedule-card__date">
                          <span>{card.day}</span>
                          <span>{card.date}</span>
                        </div>
                        <div className="schedule-card__slots">
                          {card.slots.map((slot) => (
                            <button key={slot} type="button">
                              {slot}
                            </button>
                          ))}
                          <button type="button" className="schedule-card__more">
                            Show More
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
              <span className="landing-schedule__next" aria-hidden="true">
                <ChevronRight size={16} />
              </span>
            </div>
          </div>
        </section>

        <section id="pricing" className="landing-section landing-transparent-pricing">
          <div className="container">
            <motion.div className="transparent-pricing__header" {...revealProps('up', 0.02)}>
              <h2>
                Transparent <span>Pricing</span>
              </h2>
              <Paragraph>No hidden fees. Pay less than traditional clinics while getting faster digital healthcare.</Paragraph>
            </motion.div>
            <motion.div className="transparent-pricing__table-wrap" {...revealProps('up', 0.06)}>
              <div className="transparent-pricing__table">
                <div className="transparent-pricing__head">
                  <div>Service</div>
                  <div>Traditional Clinic</div>
                  <div>CareBridge</div>
                </div>
                {transparentPricingRows.map((row) => (
                  <div className="transparent-pricing__row" key={row.service}>
                    <div data-label="Service">
                      <div className="transparent-pricing__service">
                        <h4>{row.service}</h4>
                        <p>{row.detail}</p>
                      </div>
                    </div>
                    <div data-label="Traditional Clinic">
                      {row.type === 'state' ? (
                        <span className="transparent-pricing__state transparent-pricing__state--negative">{row.clinicState}</span>
                      ) : (
                        <div className="transparent-pricing__traditional">
                          <strong>{row.clinic}</strong>
                        </div>
                      )}
                    </div>
                    <div data-label="CareBridge">
                      {row.type === 'state' ? (
                        <span className="transparent-pricing__state transparent-pricing__state--positive">{row.oursState}</span>
                      ) : (
                        <div className="transparent-pricing__price-stack">
                          <strong>{row.ours}</strong>
                          <small>{row.save}</small>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="onboarding-videos" className="landing-section container">
          <motion.div {...revealProps('up', 0.02)}>
            <SectionHeader title="How" highlighted="It Works" subtitle="Watch our simple guides to get started." />
          </motion.div>
          <Row className="tutorial-row" gutter={[16, 16]}>
            {tutorials.map((item, index) => (
              <Col xs={24} md={8} key={item.title}>
                <motion.div {...revealProps(index % 2 === 0 ? 'left' : 'right', 0.04 + index * 0.03)}>
                  <Card className="tutorial-card" cover={<img src={item.image} alt={item.title} loading="lazy" />}>
                    <Text>{item.duration}</Text>
                    <Title level={4}>{item.title}</Title>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </section>

        <section className="landing-section landing-app">
          <div className="container app-layout">
            <motion.div className="landing-app__panel" {...revealProps('left', 0.04)}>
              <SectionHeader
                badge="Available on iOS and Android"
                title="Download"
                highlighted="Our Mobile App"
                subtitle="Access healthcare services on the go. Book appointments, consult with doctors, and manage your health from your smartphone."
                leftAligned
              />
              <ul className="benefits-list">
                <li>
                  <CheckCircle size={16} /> Book appointments anytime, anywhere
                </li>
                <li>
                  <CheckCircle size={16} /> Video and phone consultations on your device
                </li>
                <li>
                  <CheckCircle size={16} /> Access prescriptions and medical records instantly
                </li>
              </ul>
              <Space className="app-cta" wrap>
                <Button>Download on App Store</Button>
                <Button>Get it on Google Play</Button>
              </Space>
            </motion.div>

            <motion.div className="app-image-wrap" {...revealProps('right', 0.08)}>
              <span className="app-image-wrap__glow" aria-hidden="true" />
              <span className="app-image-chip app-image-chip--rating">
                <Star size={14} fill="currentColor" /> 4.9 Rating
              </span>
              <span className="app-image-chip app-image-chip--secure">
                <ShieldCheck size={14} /> Secure & Private
              </span>
              <div className="app-image-frame">
                <img src={imageLibrary.patientTablet} alt="Patient using CareBridge app on tablet" loading="lazy" />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="container">
            <motion.div className="landing-final-cta__panel" {...revealProps('up', 0.04)}>
              <span className="landing-final-cta__badge">
                <ShieldCheck size={14} /> Trusted by patients across Australia
              </span>
              <Title level={2}>Book the best-priced telehealth appointment today.</Title>
              <Paragraph>Find top-rated doctors available now and get care faster for less.</Paragraph>
              <div className="landing-final-cta__highlights">
                <span>
                  <Clock size={13} /> Avg. connect time: 5 minutes
                </span>
                <span>
                  <CheckCircle size={13} /> Prescriptions, referrals, certificates
                </span>
                <span>
                  <ShieldCheck size={13} /> AHPRA verified doctors
                </span>
              </div>
              <Link to="/login" className="landing-btn landing-btn--primary">
                Book Telehealth Appointment <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
        </section>
      </Content>

      <Footer className="landing-footer">
        <div className="container landing-footer__grid">
          <div>
            <div className="landing-footer__brand">
              <AppIcon size={30} />
              <span>CareBridge</span>
            </div>
            <Paragraph>
              CareBridge is your all-in-one platform for consultations, prescriptions, referrals, and medical workflow
              support, helping patients access quality healthcare without delays.
            </Paragraph>
          </div>
          <div>
            <Title level={4}>Patient</Title>
            <a href="/">Telehealth Consultation</a>
            <a href="/">Prescription</a>
            <a href="/">Medical Certificates</a>
            <a href="/">Blood Test Requests</a>
            <a href="/">Radiology Requests</a>
          </div>
          <div>
            <Title level={4}>Quick Links</Title>
            <a href="/">About Us</a>
            <a href="/">Our Team</a>
            <a href="/">Blog</a>
            <a href="/">Career</a>
          </div>
          <div>
            <Title level={4}>Help &amp; Support</Title>
            <a href="/">Contact Us</a>
            <a href="/">Help Center</a>
            <a href="/">Privacy Policy</a>
            <a href="/">Terms &amp; Conditions</a>
          </div>
        </div>
        <div className="landing-footer__bar">2026 CareBridge. All rights reserved.</div>
      </Footer>
    </Layout>
  );
}
