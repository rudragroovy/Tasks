import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, ArrowRight, Calendar, Clock, CheckCircle2, ShieldCheck, Activity, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import AppIcon from '../components/branding/AppIcon';
import { useAuth } from '../context/AuthContext';
import { getPatientCategoryContent } from '../data/patientCategoryContent';
import { getServiceTypeContent } from '../data/serviceTypeContent';
import './category-page.css';
import './service-type-page.css';

export default function ServiceTypePage() {
  const { serviceTypeKey } = useParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [activeProcessMode, setActiveProcessMode] = useState(0);

  const serviceTypeData = useMemo(() => getServiceTypeContent(serviceTypeKey), [serviceTypeKey]);
  const processContent = useMemo(() => {
    if (!serviceTypeData?.processCategoryKey) return null;
    return getPatientCategoryContent(serviceTypeData.processCategoryKey);
  }, [serviceTypeData?.processCategoryKey]);

  const processModes = processContent?.processModes?.length
    ? processContent.processModes
    : ['Telephone & Televideo Consultation'];
  const activeModeLabel = processModes[activeProcessMode] ?? processModes[0];
  const processSteps =
    (activeModeLabel && processContent?.processStepsByMode?.[activeModeLabel]) ||
    processContent?.processSteps ||
    [];

  useEffect(() => {
    if (!processModes.length) return;
    if (activeProcessMode >= processModes.length) {
      setActiveProcessMode(0);
    }
  }, [activeProcessMode, processModes.length]);

  const getMotionProps = (delay = 0, y = 18) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.15 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
        };

  if (!serviceTypeData) {
    return (
      <main className="service-type-page service-type-page--empty">
        <h1>Service Type Not Found</h1>
        <p>The requested service type page does not exist.</p>
        <Link to="/home" className="category-primary-btn">
          Back to Home
        </Link>
      </main>
    );
  }

  const supportIcons = [ShieldCheck, Activity, Users];

  const handlePrimaryAction = () => {
    const isHowItWorksCta = String(serviceTypeData.heroCtaLabel || '')
      .toLowerCase()
      .includes('how it works');

    if (isHowItWorksCta) {
      const target = document.getElementById('service-type-consultation-process');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    if (user) {
      navigate(serviceTypeData.primaryCtaTo);
      return;
    }
    openAuthModal({ mode: 'login', redirectTo: serviceTypeData.primaryCtaTo });
  };

  return (
    <main className="service-type-page">
      <LandingNavbar activeKey="patient" />

      <section
        className="service-type-hero"
        style={{
          backgroundImage: `linear-gradient(130deg, rgba(15, 23, 42, 0.65), rgba(8, 145, 178, 0.56)), url(${serviceTypeData.heroImage})`,
        }}
      >
        <div className="service-type-shell service-type-hero__inner">
          <motion.h1 {...getMotionProps(0)}>{serviceTypeData.label}</motion.h1>
          <motion.p {...getMotionProps(0.06)}>{serviceTypeData.heroDescription}</motion.p>
          <motion.button
            type="button"
            className="category-primary-btn service-type-hero__cta"
            onClick={handlePrimaryAction}
            {...getMotionProps(0.1)}
          >
            {serviceTypeData.heroCtaLabel} <ArrowRight size={16} />
          </motion.button>
        </div>
      </section>

      <section className="service-type-proof">
        <div className="service-type-shell service-type-proof__grid">
          {serviceTypeData.supportCards.map((card, index) => {
            const Icon = supportIcons[index % supportIcons.length];
            return (
              <motion.article
                key={card.title}
                className="category-card service-type-proof-card"
                {...getMotionProps(0.05 + index * 0.04)}
              >
                <span className="category-card__icon service-type-proof-card__icon">
                  <Icon size={17} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="service-type-band">
        <div className="service-type-shell">
          <h2>Consult a Licensed Doctor Online Anytime, Anywhere</h2>
          <p>Book a secure telehealth consultation with qualified medical professionals from the comfort of your home.</p>
        </div>
      </section>

      <section id="service-type-consultation-process" className="service-type-process category-page--reference-layout">
        <div className="service-type-shell">
          <motion.h2 {...getMotionProps(0)}>How Our Consultation Process Works</motion.h2>
          <motion.p className="category-subtitle service-type-process__subtitle" {...getMotionProps(0.05)}>
            Follow these simple steps to book, connect, and get expert medical care anytime, anywhere.
          </motion.p>

          <motion.div className="category-mode-chips" role="tablist" aria-label="Consultation modes" {...getMotionProps(0.1)}>
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

          <div className="category-steps">
            {processSteps.map((step, index) => (
              <motion.article
                key={`${step.title}-${index}`}
                className={`category-step${index % 2 === 1 ? ' category-step--reversed' : ''}`}
                {...getMotionProps(0.14 + index * 0.06)}
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
          </div>
        </div>
      </section>

      <section className="service-type-app">
        <div className="service-type-shell service-type-app__grid">
          <motion.div className="service-type-app__copy" {...getMotionProps(0.03)}>
            <span className="service-type-pill">{serviceTypeData.appSection.badge}</span>
            <h2>{serviceTypeData.appSection.title}</h2>
            <p>{serviceTypeData.appSection.description}</p>

            <div className="service-type-app__stats">
              {serviceTypeData.appSection.stats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            <ul className="service-type-app__list">
              {serviceTypeData.appSection.bullets.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={14} /> {item}
                </li>
              ))}
            </ul>

            <div className="service-type-app__actions">
              <button type="button" className="service-type-store-btn">
                <Download size={14} /> Download on App Store
              </button>
              <button type="button" className="service-type-store-btn">
                <Download size={14} /> Get it on Google Play
              </button>
            </div>
          </motion.div>

          <motion.div className="service-type-app__media" {...getMotionProps(0.09)}>
            <img src={serviceTypeData.appSection.image} alt="CareBridge mobile app preview" loading="lazy" />
          </motion.div>
        </div>
      </section>

      <section className="service-type-blog">
        <div className="service-type-shell">
          <motion.div className="service-type-blog__header" {...getMotionProps(0.02)}>
            <span className="service-type-pill">{serviceTypeData.blogSection.badge}</span>
            <h2>{serviceTypeData.blogSection.title}</h2>
            <p>{serviceTypeData.blogSection.description}</p>
          </motion.div>

          <motion.article className="service-type-blog__featured" {...getMotionProps(0.06)}>
            <div className="service-type-blog__featured-copy">
              <span className="service-type-blog__meta">
                <Calendar size={13} /> {serviceTypeData.blogSection.featured.date}
                <Clock size={13} /> {serviceTypeData.blogSection.featured.readTime}
              </span>
              <h3>{serviceTypeData.blogSection.featured.title}</h3>
              <p>{serviceTypeData.blogSection.featured.summary}</p>
              <button type="button" className="service-type-outline-btn">
                Read article <ArrowRight size={15} />
              </button>
            </div>
            <div className="service-type-blog__featured-image">
              <img src={serviceTypeData.blogSection.featured.image} alt={serviceTypeData.blogSection.featured.title} loading="lazy" />
            </div>
          </motion.article>

          <div className="service-type-blog__grid">
            {serviceTypeData.blogSection.cards.map((card, index) => (
              <motion.article key={card.title} className="service-type-blog-card" {...getMotionProps(0.08 + index * 0.04)}>
                <img src={card.image} alt={card.title} loading="lazy" />
                <div className="service-type-blog-card__body">
                  <span className="service-type-blog__meta">
                    <Calendar size={12} /> {card.date}
                    <Clock size={12} /> {card.readTime}
                  </span>
                  <h4>{card.title}</h4>
                  <p>{card.summary}</p>
                  <button type="button" className="service-type-blog-card__link">
                    Read more
                  </button>
                </div>
              </motion.article>
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
            <a href="/">Terms & Conditions</a>
          </div>
        </div>
        <div className="landing-footer__bar">2026 CareBridge. All rights reserved.</div>
      </footer>
    </main>
  );
}
