import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  ChevronDown,
  ClipboardPlus,
  FileText,
  FlaskConical,
  Shield,
  ShieldCheck,
  Stethoscope,
  Timer,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import AppIcon from '../components/branding/AppIcon';
import LandingNavbar from '../components/LandingNavbar';
import { getPatientCategoryContent } from '../data/patientCategoryContent';
import { getServiceBySlug } from '../data/servicePageContent';
import { useAuth } from '../context/AuthContext';
import './service-detail-page.css';

const heroTitle = 'Comprehensive Medical Care, Virtually Anywhere';

const defaultProcessModes = [
  'Telephone & Televideo Consultation',
  'In-Person Doctor Visit',
  'Waiting Room',
];

const processStepImages = [
  'https://images.pexels.com/photos/7089629/pexels-photo-7089629.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/7088530/pexels-photo-7088530.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/7089624/pexels-photo-7089624.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/5214958/pexels-photo-5214958.jpeg?auto=compress&cs=tinysrgb&w=1400',
];

const serviceSummaryCards = [
  {
    title: 'E-prescriptions',
    text: 'Get digital prescriptions sent directly to your preferred pharmacy for quick and easy access.',
    icon: FileText,
    to: '/category/prescription',
  },
  {
    title: 'Medical Certificates',
    text: 'Obtain work or school medical certificates during your consultation when needed.',
    icon: ClipboardPlus,
    to: '/category/medical-certificate',
  },
  {
    title: 'Specialist Referrals',
    text: 'Get referred to specialists with complete history context and continuity support.',
    icon: UserRoundCheck,
    to: '/category/specialist-referral',
  },
  {
    title: 'Radiology Requests',
    text: 'Receive necessary imaging requests and guidance on where to get your tests done.',
    icon: Stethoscope,
    to: '/category/radiology',
  },
  {
    title: 'Pathology Requests',
    text: 'Get lab test orders and explanations about required tests and procedures.',
    icon: FlaskConical,
    to: '/category/popular-blood-tests',
  },
  {
    title: 'Follow-up Care',
    text: 'Schedule follow-up appointments to monitor your progress and adjust treatment plans.',
    icon: CalendarCheck2,
    to: '/category/recall-consultation-standard',
  },
];

const processStepTitles = [
  'Select Your Consultation Service',
  'Choose Your Doctor',
  'Book Your Appointment',
  'Connect & Receive Medical Documents',
];

function FaqRow({ question }) {
  return (
    <details className="service-faq-row">
      <summary>
        <span>{question}</span>
        <ChevronDown size={16} />
      </summary>
      <p>
        Our doctors will guide you through the right consultation path and provide required documents where clinically
        appropriate.
      </p>
    </details>
  );
}

export default function ServiceDetailPage() {
  const navigate = useNavigate();
  const { serviceSlug } = useParams();
  const { user, openAuthModal } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [activeProcessMode, setActiveProcessMode] = useState(0);
  const serviceRecord = useMemo(() => getServiceBySlug(serviceSlug || ''), [serviceSlug]);
  const getMotionProps = (delay = 0, y = 24) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
        };

  if (!serviceRecord) {
    return (
      <main className="service-page service-page--empty">
        <h1>Service not found</h1>
        <p>The requested service page does not exist.</p>
        <Link to="/home" className="service-primary-btn">
          Back to Home
        </Link>
      </main>
    );
  }

  const bookingPath = `/booking?service=${encodeURIComponent(serviceRecord.name)}`;

  const handleBookNow = () => {
    if (user) {
      navigate(bookingPath);
      return;
    }
    openAuthModal({ mode: 'login', redirectTo: bookingPath });
  };

  const whyCards = [
    {
      title: 'Expert Medical Team',
      text: serviceRecord.highlights[0] || 'Our doctor-led care provides trusted support through virtual consultations.',
      icon: Users,
    },
    {
      title: 'Convenient Virtual Care',
      text: serviceRecord.highlights[1] || 'Access quality care from home through secure video or audio consultations.',
      icon: Stethoscope,
    },
    {
      title: 'Flexible Scheduling',
      text: serviceRecord.highlights[2] || 'Book appointments at your convenience, including evenings and weekends.',
      icon: Timer,
    },
  ];

  const benefitCards = [
    {
      title: 'Safe & Secure',
      text: 'Our platform ensures your medical information remains private and secure.',
      icon: Shield,
    },
    {
      title: 'Cost-Effective',
      text: 'Affordable consultations with transparent pricing and no hidden charges.',
      icon: CalendarClock,
    },
    {
      title: 'Continuity of Care',
      text: 'Build a lasting relationship with your healthcare provider for consistent care.',
      icon: ShieldCheck,
    },
  ];

  const categoryProcessContent = getPatientCategoryContent(serviceRecord.categoryKey);
  const processModes = categoryProcessContent?.processModes?.length
    ? categoryProcessContent.processModes
    : defaultProcessModes;
  const activeModeLabel = processModes[activeProcessMode] ?? processModes[0];
  const fallbackProcessSteps = serviceRecord.process.map((step, index) => ({
    title: processStepTitles[index] || `Step ${index + 1}`,
    text: step,
    points: serviceRecord.includes.slice(index, index + 3),
    image: processStepImages[index % processStepImages.length],
  }));
  const processSteps =
    (activeModeLabel && categoryProcessContent?.processStepsByMode?.[activeModeLabel]) ||
    categoryProcessContent?.processSteps ||
    fallbackProcessSteps;

  useEffect(() => {
    if (!processModes.length) return;
    if (activeProcessMode >= processModes.length) {
      setActiveProcessMode(0);
    }
  }, [activeProcessMode, processModes.length]);

  return (
    <main className="service-page">
      <LandingNavbar activeKey="patient" />
      <section
        className="service-hero"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(21, 94, 117, 0.86), rgba(14, 116, 144, 0.72)), url(${serviceRecord.heroImage})`,
        }}
      >
        <div className="service-shell service-hero__content">
          <motion.h1 {...getMotionProps(0)}>{heroTitle}</motion.h1>
          <motion.p {...getMotionProps(0.1)}>
            Access quality healthcare from the comfort of your home with our expert medical team through video or audio
            consultations.
          </motion.p>
          <motion.button
            type="button"
            className="service-primary-btn"
            {...getMotionProps(0.2)}
            onClick={handleBookNow}
          >
            Book Appointment Now <ArrowRight size={16} />
          </motion.button>
        </div>
      </section>

      <section className="service-section">
        <div className="service-shell">
          <motion.h2 {...getMotionProps(0)}>Why Choose Our {serviceRecord.name} Service</motion.h2>
          <motion.p className="service-section__subtitle" {...getMotionProps(0.08)}>
            Quality healthcare, conveniently delivered to your doorstep.
          </motion.p>
          <div className="service-card-grid service-card-grid--three">
            {whyCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  className="service-card"
                  {...getMotionProps(0.14 + index * 0.07)}
                >
                  <span className="service-card__icon">
                    <Icon size={17} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="service-section service-section--tinted">
        <div className="service-shell">
          <motion.h2 {...getMotionProps(0)}>Our Comprehensive Services</motion.h2>
          <motion.p className="service-section__subtitle" {...getMotionProps(0.08)}>
            All essential healthcare services you need, available through virtual consultation.
          </motion.p>
          <div className="service-card-grid">
            {serviceSummaryCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.title}
                  type="button"
                  className="service-summary-card"
                  {...getMotionProps(0.12 + index * 0.06)}
                  onClick={() => navigate(item.to)}
                >
                  <span className="service-summary-card__icon">
                    <Icon size={16} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="service-section">
        <div className="service-shell">
          <motion.h2 {...getMotionProps(0)}>Benefits of Virtual Consultation</motion.h2>
          <motion.p className="service-section__subtitle" {...getMotionProps(0.08)}>
            Experience healthcare that fits your lifestyle.
          </motion.p>
          <div className="service-card-grid service-card-grid--three">
            {benefitCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  className="service-card"
                  {...getMotionProps(0.14 + index * 0.07)}
                >
                  <span className="service-card__icon">
                    <Icon size={17} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="service-section service-section--process">
        <div className="service-shell">
          <motion.h2 {...getMotionProps(0)}>
            {categoryProcessContent?.processHeading || 'How Our Consultation Process Works'}
          </motion.h2>
          <motion.p className="service-section__subtitle" {...getMotionProps(0.08)}>
            {categoryProcessContent?.processSubtitle ||
              'Follow these simple steps to book, connect, and get expert medical care anytime, anywhere.'}
          </motion.p>
          <motion.div
            className="service-mode-chips"
            role="tablist"
            aria-label="Consultation modes"
            {...getMotionProps(0.14)}
          >
            {processModes.map((mode, index) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={activeProcessMode === index}
                className={activeProcessMode === index ? 'is-active' : ''}
                onClick={() => setActiveProcessMode(index)}
              >
                {mode}
              </button>
            ))}
          </motion.div>

          <div className="service-process-steps">
            {processSteps.map((step, index) => (
              <motion.article
                key={`${step.title}-${index}`}
                className={`service-process-step${index % 2 === 1 ? ' service-process-step--reversed' : ''}`}
                {...getMotionProps(0.16 + index * 0.1)}
              >
                <div className="service-process-step__copy">
                  <span className="service-process-step__badge">Step {index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <ul>
                    {step.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="service-process-step__media">
                  <img src={step.image} alt={step.title} loading="lazy" />
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="service-cta">
        <div className="service-shell">
          <motion.h2 {...getMotionProps(0)}>{heroTitle}</motion.h2>
          <motion.p {...getMotionProps(0.09)}>
            Access quality healthcare from the comfort of your home with our expert medical team through video or audio
            consultations.
          </motion.p>
          <motion.button
            type="button"
            className="service-primary-btn service-primary-btn--light"
            {...getMotionProps(0.18)}
            onClick={handleBookNow}
          >
            Book Appointment Now <ArrowRight size={16} />
          </motion.button>
        </div>
      </section>

      <section className="service-section service-section--faq">
        <div className="service-shell service-shell--narrow">
          <motion.h2 {...getMotionProps(0)}>Frequently Asked Questions</motion.h2>
          <div className="service-faq-list">
            {serviceRecord.faq.map((question, index) => (
              <motion.div
                key={question}
                {...getMotionProps(0.08 + index * 0.06, 16)}
              >
                <FaqRow question={question} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer__grid">
          <div>
            <div className="landing-footer__brand">
              <AppIcon size={30} />
              <span>CareBridge</span>
            </div>
            <p>
              CareBridge is your all-in-one platform for consultations, prescriptions, referrals, and medical workflow
              support, helping patients access quality healthcare without delays.
            </p>
          </div>
          <div>
            <h4>Patient</h4>
            <a href="/">Telehealth Consultation</a>
            <a href="/">Prescription</a>
            <a href="/">Medical Certificates</a>
            <a href="/">Blood Test Requests</a>
            <a href="/">Radiology Requests</a>
          </div>
          <div>
            <h4>Quick Links</h4>
            <a href="/">About Us</a>
            <a href="/">Our Team</a>
            <a href="/">Blog</a>
            <a href="/">Career</a>
          </div>
          <div>
            <h4>Help &amp; Support</h4>
            <a href="/">Contact Us</a>
            <a href="/">Help Center</a>
            <a href="/">Privacy Policy</a>
            <a href="/">Terms &amp; Conditions</a>
          </div>
        </div>
        <div className="landing-footer__bar">2026 CareBridge. All rights reserved.</div>
      </footer>
    </main>
  );
}
