import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Layout,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  Clock,
  FileText,
  House,
  MapPin,
  Menu,
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
import './landing-page.css';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

const primaryNav = [
  { label: 'Patient', target: 'services' },
  { label: 'Organization', target: 'consult-types' },
  { label: 'Doctors', target: 'doctors' },
  { label: 'Medical Links', target: 'steps' },
  { label: 'More Options', target: 'pricing' },
];

const heroSlides = [
  '/landing/images/v1_2846.png',
  '/landing/images/v1_3394.png',
  '/landing/images/v1_3415.png',
  '/landing/images/v1_3436.png',
];
const heroTypedPhrase = 'Quality Care, Anytime, Anywhere';

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
  { label: 'Rating On app Store', icon: Star, metric: '4.9' },
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
    image: '/landing/images/v1_3373.png',
  },
  {
    title: 'Choose Consultation Type',
    desc: 'Select video, telephone, in-person or home visit and pick a time slot.',
    image: '/landing/images/v1_3394.png',
  },
  {
    title: 'View Doctor Details',
    desc: 'Review doctor experience, specialization, and patient feedback.',
    image: '/landing/images/v1_3415.png',
  },
  {
    title: 'Get Your Solution',
    desc: 'Confirm your booking and receive consultation or required documents.',
    image: '/landing/images/v1_3436.png',
  },
];

const doctors = [
  { name: 'Dr Deepak Nair', spec: 'General Practitioner', exp: '15+ years', fee: '$45' },
  { name: 'Dr Anna Jones', spec: 'General Practitioner', exp: '12+ years', fee: '$45' },
  { name: 'Dr Fabian Andrews', spec: 'General Practitioner', exp: '20+ years', fee: '$45' },
];

const tutorials = [
  { title: 'Patient Onboarding Guide', duration: '3 min', image: '/landing/images/v1_5559.png' },
  { title: 'Standard Consultation Booking', duration: '2 min', image: '/landing/images/v1_5575.png' },
  { title: 'Get Your Prescription', duration: '2 min', image: '/landing/images/v1_5591.png' },
];

const pricingData = [
  { key: '1', service: 'General Consultation', clinic: '$75', ours: '$45', save: 'Save $30' },
  { key: '2', service: 'Specialist Consultation', clinic: '$150', ours: '$80', save: 'Save $70' },
  { key: '3', service: 'Medical Certificate', clinic: '$60', ours: '$35', save: 'Save $25' },
];

const pricingColumns = [
  {
    title: 'Service',
    dataIndex: 'service',
    key: 'service',
  },
  {
    title: 'Traditional Clinic',
    dataIndex: 'clinic',
    key: 'clinic',
    align: 'center',
  },
  {
    title: 'MyDrScripts',
    dataIndex: 'ours',
    key: 'ours',
    align: 'center',
    render: (_, row) => (
      <Space direction="vertical" size={0}>
        <Text strong className="pricing-ours-value">{row.ours}</Text>
        <Text className="pricing-save-text">{row.save}</Text>
      </Space>
    ),
  },
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

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [typedHeroText, setTypedHeroText] = useState(() =>
    prefersReducedMotion ? heroTypedPhrase : ''
  );

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveHeroSlide((previous) => (previous + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) {
      return undefined;
    }

    let characterIndex = 0;
    const intervalId = window.setInterval(() => {
      characterIndex += 1;
      setTypedHeroText(heroTypedPhrase.slice(0, characterIndex));
      if (characterIndex >= heroTypedPhrase.length) {
        window.clearInterval(intervalId);
      }
    }, 75);

    return () => window.clearInterval(intervalId);
  }, [prefersReducedMotion]);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

        <Header className="landing-nav-v2">
          <div className="landing-nav-v2__left">
            <Button type="text" className="landing-nav-v2__menu" aria-label="Open menu">
              <Menu size={20} />
            </Button>
            <div className="landing-nav-v2__brand">
              <AppIcon size={28} />
              <span>MyDrScripts</span>
            </div>
          </div>

          <Space className="landing-nav-v2__center landing-nav-v2__links" size={20}>
            {primaryNav.map((item) => (
              <Button key={item.label} type="text" onClick={() => scrollToSection(item.target)}>
                {item.label}
              </Button>
            ))}
          </Space>

          <div className="landing-nav-v2__right">
            <Button
              className="landing-nav-v2__ai"
              icon={<Mic size={14} />}
              onClick={() => navigate('/login')}
            >
              <span className="label-full">OLA AI</span>
              <span className="label-short">AI</span>
            </Button>
            <Button className="landing-nav-v2__ghost" onClick={() => scrollToSection('onboarding-videos')}>
              <span className="label-full">Onboarding Videos</span>
              <span className="label-short">Videos</span>
            </Button>
            <Link to="/login" className="landing-nav-v2__solid">
              <span className="label-full">Login</span>
              <span className="label-short">Login</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </Header>

        <div className="landing-hero-v2__content">
          <div className="landing-hero-v2__left">
            <Space direction="vertical" size={12} className="landing-hero-v2__copy">
              <Tag className="landing-chip" bordered={false}>
                <ShieldCheck size={14} /> AHPRA Verified Doctors
              </Tag>
              <Title level={1}>
                MyDrScripts is
                <span className="landing-hero-v2__typed-wrap">
                  <span className="landing-hero-v2__typed">{typedHeroText}</span>
                  <span className="landing-hero-v2__typed-caret" aria-hidden="true">
                    |
                  </span>
                </span>
              </Title>
              <Paragraph className="landing-hero-v2__subtitle">
                Choose how you want to see a doctor-video, phone, in-person, or at home.
              </Paragraph>
              <ul>
                <li>
                  <CheckCircle size={16} /> Available 24/7, including weekends
                </li>
                <li>
                  <CheckCircle size={16} /> Prescriptions & referrals provided
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
          </div>
          <div className="landing-hero-v2__right">
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
          </div>
        </div>

        <Card className="landing-hero-v2__banner" bordered={false}>
          <ShieldCheck size={18} />
          <p>
            MyDrScripts is Australia's first truly digital GP clinic, combining personalised care, smart technology, and
            long-term health support so every patient has a doctor who knows them.
          </p>
        </Card>
      </section>

      <Content>
        <section className="landing-tag-carousel" aria-label="MyDrScripts highlights">
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
          <SectionHeader
            badge="Comprehensive Healthcare Solutions"
            title="Our"
            highlighted="Healthcare Services"
            subtitle="Access professional healthcare services delivered by AHPRA verified doctors. Choose the service that best fits your needs."
          />
          <Row className="service-row" gutter={[16, 16]}>
            {serviceCards.map((service) => {
              const Icon = service.icon;
              return (
                <Col xs={24} md={12} lg={8} key={service.title}>
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
                </Col>
              );
            })}
          </Row>
        </section>

        <section className="landing-highlight">
          <div className="container">
            <Row className="highlight-row" gutter={[14, 14]}>
              <Col xs={24} md={8}>
                <Card className="highlight-card">
                  <Title level={4}>24/7</Title>
                  <Text strong>Available Anytime</Text>
                  <Paragraph>Round-the-clock access to healthcare</Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="highlight-card">
                  <Title level={4}>100%</Title>
                  <Text strong>AHPRA Verified</Text>
                  <Paragraph>All doctors professionally certified</Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="highlight-card">
                  <Title level={4}>15min</Title>
                  <Text strong>Fast Service</Text>
                  <Paragraph>Quick consultations & responses</Paragraph>
                </Card>
              </Col>
            </Row>
          </div>
        </section>

        <section id="steps" className="landing-section container landing-steps-v2">
          <SectionHeader
            title="4 Easy"
            highlighted="Steps"
            subtitle="Getting quality healthcare is simple with MyDrScripts."
          />
          <div className="landing-steps-v2__grid">
            {steps.map((step, index) => (
              <article className="landing-steps-v2__item" key={step.title}>
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
              </article>
            ))}
          </div>
          <Link to="/login" className="landing-btn landing-btn--primary landing-steps-v2__cta">
            <CalendarClock size={16} /> Book Standard Consultation now <ArrowRight size={16} />
          </Link>
        </section>

        <section id="consult-types" className="landing-section landing-consult-types">
          <div className="container">
            <SectionHeader
              badge="Choose Your Consultation Type"
              title="Flexible Healthcare"
              highlighted="On Your Terms"
              subtitle="Select the consultation method that works best for you. All options connect you with verified Australian healthcare professionals."
            />

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

            <div className="consult-panel">
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
                    <CheckCircle size={14} /> What's Included
                  </Text>
                  <ul className="consult-include-list">
                    <li>
                      <CheckCircle size={16} /> HD video consultation with specialist
                    </li>
                    <li>
                      <CheckCircle size={16} /> Digital prescription via email/SMS
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
                      <Mic size={14} /> Secure & private
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
                      <p>Fill in medical history & symptoms</p>
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
                      <p>Get prescriptions & follow-up advice</p>
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
            </div>
          </div>
        </section>

        <section id="doctors" className="landing-section container">
          <SectionHeader title="Top Rated" highlighted="Doctors & Specialists" />
          <Row className="doctor-row" gutter={[16, 16]}>
            {doctors.map((doctor) => (
              <Col xs={24} md={12} lg={8} key={doctor.name}>
                <Card className="doctor-card">
                  <div className="doctor-card__avatar">{doctor.name.slice(3, 4)}</div>
                  <Title level={4}>{doctor.name}</Title>
                  <Paragraph>{doctor.spec}</Paragraph>
                  <div className="doctor-card__meta">
                    <span>{doctor.exp}</span>
                    <span>{doctor.fee}</span>
                  </div>
                  <Button className="landing-btn landing-btn--outline">Book Consultation</Button>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        <section className="landing-section container">
          <SectionHeader title="Awesome" highlighted="Features" />
          <Row className="feature-row" gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <Clock size={18} />
                <Title level={4}>Same Day Visits</Title>
                <Paragraph>Get appointments with qualified doctors quickly.</Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <ShieldCheck size={18} />
                <Title level={4}>AHPRA Verified Doctors</Title>
                <Paragraph>Every practitioner is professionally accredited.</Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <Activity size={18} />
                <Title level={4}>All Services In One Place</Title>
                <Paragraph>Consultation, scripts, referrals and certificates.</Paragraph>
              </Card>
            </Col>
          </Row>
        </section>

        <section id="pricing" className="landing-section landing-pricing">
          <div className="container">
            <SectionHeader
              title="Transparent"
              highlighted="Pricing"
              subtitle="No hidden fees. Pay less than traditional clinics."
            />
            <Table
              className="pricing-table-ant"
              dataSource={pricingData}
              columns={pricingColumns}
              pagination={false}
              bordered
            />
          </div>
        </section>

        <section id="onboarding-videos" className="landing-section container">
          <SectionHeader
            title="How"
            highlighted="It Works"
            subtitle="Watch our simple guides to get started."
          />
          <Row className="tutorial-row" gutter={[16, 16]}>
            {tutorials.map((item) => (
              <Col xs={24} md={8} key={item.title}>
                <Card className="tutorial-card" cover={<img src={item.image} alt={item.title} loading="lazy" />}>
                  <Text>{item.duration}</Text>
                  <Title level={4}>{item.title}</Title>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        <section className="landing-section landing-app">
          <div className="container">
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} lg={13}>
                <SectionHeader
                  badge="Available on iOS & Android"
                  title="Download"
                  highlighted="Our Mobile App"
                  subtitle="Access healthcare services on the go. Book appointments, consult with doctors and manage your health from your smartphone."
                  leftAligned
                />
                <Space className="app-cta" wrap>
                  <Button>Download on App Store</Button>
                  <Button>Get it on Google Play</Button>
                </Space>
              </Col>
              <Col xs={24} lg={11}>
                <div className="app-image-wrap">
                  <img src="/landing/images/v1_5723.png" alt="MyDrScripts app preview" loading="lazy" />
                </div>
              </Col>
            </Row>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="container">
            <Title level={2}>Book the best-priced telehealth appointment today.</Title>
            <Paragraph>Find top-rated doctors available today. Pay less than anywhere else.</Paragraph>
            <Link to="/login" className="landing-btn landing-btn--primary">
              Book Telehealth Appointment <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </Content>

      <Footer className="landing-footer">
        <div className="container landing-footer__grid">
          <div>
            <div className="landing-footer__brand">
              <AppIcon size={30} />
              <span>MyDrScripts</span>
            </div>
            <Paragraph>
              MyDrScripts is your all-in-one platform for managing prescriptions, patient records, and medical workflows
              securely and efficiently.
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
            <Title level={4}>Help & Support</Title>
            <a href="/">Contact Us</a>
            <a href="/">Help Center</a>
            <a href="/">Privacy Policy</a>
            <a href="/">Terms & Conditions</a>
          </div>
        </div>
        <div className="landing-footer__bar">2026 MyDrScripts. All rights reserved.</div>
      </Footer>
    </Layout>
  );
}
