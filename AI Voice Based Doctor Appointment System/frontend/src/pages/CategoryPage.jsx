import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Shield,
  Stethoscope,
  Timer,
  UserRound,
} from 'lucide-react';
import AppIcon from '../components/branding/AppIcon';
import LandingNavbar from '../components/LandingNavbar';
import { useAuth } from '../context/AuthContext';
import { getPatientCategoryContent } from '../data/patientCategoryContent';
import './category-page.css';

const whyCardIcons = [Stethoscope, Shield, Timer];
const benefitIcons = [CheckCircle2, Timer, UserRound];

function FaqRow({ question }) {
  return (
    <details className="category-faq-row">
      <summary>
        <span>{question}</span>
        <ChevronDown size={16} />
      </summary>
      <p>
        We will match you with the right care pathway for this service category and share next steps after booking.
      </p>
    </details>
  );
}

export default function CategoryPage() {
  const { categoryKey } = useParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [activeProcessMode, setActiveProcessMode] = useState(0);
  const categoryData = useMemo(
    () => getPatientCategoryContent((categoryKey || '').toLowerCase()),
    [categoryKey]
  );
  const activeModeLabel = categoryData?.processModes?.[activeProcessMode] ?? categoryData?.processModes?.[0];
  const processStepsForActiveMode =
    (activeModeLabel && categoryData?.processStepsByMode?.[activeModeLabel]) || categoryData?.processSteps || [];
  const getMotionProps = (delay = 0, y = 20) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
        };

  useEffect(() => {
    if (!categoryData?.processModes?.length) return;
    if (activeProcessMode >= categoryData.processModes.length) {
      setActiveProcessMode(0);
    }
  }, [activeProcessMode, categoryData?.processModes]);

  if (!categoryData) {
    return (
      <main className="category-page category-page--empty">
        <h1>Category Not Found</h1>
        <p>We could not find the category you requested.</p>
        <Link to="/home" className="category-primary-btn">
          Back to Home
        </Link>
      </main>
    );
  }

  const openBooking = (serviceName) => {
    const params = new URLSearchParams();
    params.set('category', categoryData.key);
    params.set('service', serviceName || categoryData.label);
    const destination = `/booking?${params.toString()}`;
    if (user) {
      navigate(destination);
      return;
    }
    openAuthModal({ mode: 'login', redirectTo: destination });
  };

  const scrollToServices = () => {
    const section = document.getElementById('telehealth-services');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="category-page category-page--reference-layout">
      <LandingNavbar activeKey="patient" />

      <motion.section className="category-hero" {...getMotionProps(0)}>
        <div className="category-shell category-hero__grid">
          <motion.div className="category-hero__copy" {...getMotionProps(0.04, 24)}>
            <p className="category-overline">{categoryData.group}</p>
            <h1>{categoryData.heroTitle}</h1>
            <p>{categoryData.heroDescription}</p>
            <button
              type="button"
              className="category-primary-btn"
              onClick={scrollToServices}
            >
              View Telehealth Services
            </button>
          </motion.div>
          <motion.div className="category-hero__image-wrap" {...getMotionProps(0.08, 24)}>
            <img src={categoryData.heroImage} alt={categoryData.heroTitle} loading="eager" />
          </motion.div>
        </div>
      </motion.section>

      <section className="category-section">
        <div className="category-shell">
          <motion.h2 {...getMotionProps(0)}>{categoryData.whyHeading}</motion.h2>
          <motion.p className="category-subtitle" {...getMotionProps(0.05)}>
            {categoryData.whySubtitle}
          </motion.p>
          <div className="category-card-grid category-card-grid--three">
            {categoryData.whyCards.map((card, index) => {
              const Icon = whyCardIcons[index % whyCardIcons.length];
              return (
                <motion.article
                  key={card.title}
                  className="category-card"
                  {...getMotionProps(0.1 + index * 0.06)}
                >
                  <span className="category-card__icon">
                    <Icon size={18} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="telehealth-services" className="category-section category-section--tinted">
        <div className="category-shell">
          <motion.h2 {...getMotionProps(0)}>{categoryData.servicesHeading}</motion.h2>
          <motion.p className="category-subtitle" {...getMotionProps(0.05)}>
            {categoryData.servicesSubtitle}
          </motion.p>
          <div className="category-card-grid category-card-grid--services">
            {categoryData.services.map((service, index) => (
              <motion.article
                key={service.id}
                className="category-service-card"
                {...getMotionProps(0.1 + index * 0.06)}
              >
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="category-service-card__footer">
                  <p className="category-price">
                    {service.price}
                    <span>{service.oldPrice}</span>
                  </p>
                  <button type="button" onClick={() => openBooking(service.name)}>
                    Book Now
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="category-section">
        <div className="category-shell">
          <motion.h2 {...getMotionProps(0)}>{categoryData.benefitsHeading}</motion.h2>
          <motion.p className="category-subtitle" {...getMotionProps(0.05)}>
            {categoryData.benefitsSubtitle}
          </motion.p>
          <div className="category-card-grid category-card-grid--three">
            {categoryData.benefits.map((benefit, index) => {
              const Icon = benefitIcons[index % benefitIcons.length];
              return (
                <motion.article
                  key={benefit.title}
                  className="category-card"
                  {...getMotionProps(0.1 + index * 0.06)}
                >
                  <span className="category-card__icon">
                    <Icon size={18} />
                  </span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="category-section category-section--process">
        <div className="category-shell">
          <motion.h2 {...getMotionProps(0)}>{categoryData.processHeading}</motion.h2>
          <motion.p className="category-subtitle" {...getMotionProps(0.05)}>
            {categoryData.processSubtitle}
          </motion.p>
          <motion.div
            className="category-mode-chips"
            role="tablist"
            aria-label="Consultation modes"
            {...getMotionProps(0.08)}
          >
            {categoryData.processModes.map((mode, index) => (
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
          <motion.div
            key={activeModeLabel}
            className="category-steps"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {processStepsForActiveMode.map((step, index) => (
              <motion.article
                key={step.title}
                className={`category-step${index % 2 === 1 ? ' category-step--reversed' : ''}`}
                {...getMotionProps(0.1 + index * 0.07)}
              >
                <div className="category-step__copy">
                  <span className="category-step__badge">Step {index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <ul>
                    {step.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="category-step__media">
                  <img src={step.image} alt={step.title} loading="lazy" />
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <motion.section className="category-cta" {...getMotionProps(0)}>
        <motion.div className="category-shell" {...getMotionProps(0.04)}>
          <motion.h2 {...getMotionProps(0.06)}>{categoryData.ctaTitle}</motion.h2>
          <motion.p {...getMotionProps(0.1)}>{categoryData.ctaSubtitle}</motion.p>
          <button
            type="button"
            className="category-primary-btn category-primary-btn--light"
            onClick={() => openBooking(categoryData.services[0]?.name || categoryData.label)}
          >
            {categoryData.ctaAction} <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.section>

      <section className="category-section category-section--faq">
        <div className="category-shell category-shell--narrow">
          <motion.h2 {...getMotionProps(0)}>{categoryData.faqHeading}</motion.h2>
          <div className="category-faq-list">
            {categoryData.faqItems.map((question, index) => (
              <motion.div key={question} {...getMotionProps(0.08 + index * 0.04, 16)}>
                <FaqRow question={question} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer__grid">
          <motion.div {...getMotionProps(0.02, 18)}>
            <div className="landing-footer__brand">
              <AppIcon size={30} />
              <span>CareBridge</span>
            </div>
            <p>
              CareBridge is your all-in-one platform for consultations, prescriptions, referrals, and medical workflow
              support, helping patients access quality healthcare without delays.
            </p>
          </motion.div>
          <motion.div {...getMotionProps(0.06, 18)}>
            <h4>Patient</h4>
            <a href="/">Telehealth Consultation</a>
            <a href="/">Prescription</a>
            <a href="/">Medical Certificates</a>
            <a href="/">Blood Test Requests</a>
            <a href="/">Radiology Requests</a>
          </motion.div>
          <motion.div {...getMotionProps(0.1, 18)}>
            <h4>Quick Links</h4>
            <a href="/">About Us</a>
            <a href="/">Our Team</a>
            <a href="/">Blog</a>
            <a href="/">Career</a>
          </motion.div>
          <motion.div {...getMotionProps(0.14, 18)}>
            <h4>Help &amp; Support</h4>
            <a href="/">Contact Us</a>
            <a href="/">Help Center</a>
            <a href="/">Privacy Policy</a>
            <a href="/">Terms &amp; Conditions</a>
          </motion.div>
        </div>
        <div className="landing-footer__bar">2026 CareBridge. All rights reserved.</div>
      </footer>
    </main>
  );
}
