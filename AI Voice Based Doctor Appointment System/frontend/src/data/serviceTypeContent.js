const sharedBlogCards = [
  {
    title: 'Daily Habits for Better Health',
    summary: 'Small lifestyle changes can improve overall wellbeing and long-term outcomes.',
    image:
      'https://images.pexels.com/photos/7089624/pexels-photo-7089624.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tag: 'General',
    date: '15 Sep 2025',
    readTime: '1 min read',
  },
  {
    title: 'The Power of Preventive Care',
    summary: 'Preventive care helps detect issues early and reduces overall healthcare burden.',
    image:
      'https://images.pexels.com/photos/7088530/pexels-photo-7088530.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tag: 'General',
    date: '15 Sep 2025',
    readTime: '1 min read',
  },
  {
    title: 'Why Choose Telemedicine Services',
    summary: 'Telemedicine makes healthcare more accessible, convenient, and affordable.',
    image:
      'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tag: 'Medical Info',
    date: '15 Sep 2025',
    readTime: '1 min read',
  },
];

const serviceTypeContentMap = {
  'telehealth-consultation': {
    key: 'telehealth-consultation',
    label: 'Telehealth Medical Consultation',
    heroDescription: 'Book an online consultation with licensed doctors.',
    heroImage:
      'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=1600',
    heroCtaLabel: 'How it works',
    primaryCtaTo: '/category/general-consultation',
    processCategoryKey: 'general-consultation',
    supportCards: [
      {
        title: 'Get dedicated support',
        description: 'Work with a support team through onboarding and care follow-up.',
      },
      {
        title: 'Achieve ROI with virtual care',
        description: 'Drive healthier outcomes and reduce consultation friction.',
      },
      {
        title: 'Customize delivery',
        description: 'Choose a consultation model for your patients and workflow.',
      },
    ],
  },
  prescription: {
    key: 'prescription',
    label: 'Prescription Services',
    heroDescription: 'Get doctor-reviewed prescriptions quickly and securely online.',
    heroImage:
      'https://images.pexels.com/photos/7088524/pexels-photo-7088524.jpeg?auto=compress&cs=tinysrgb&w=1600',
    heroCtaLabel: 'Explore prescriptions',
    primaryCtaTo: '/category/prescription',
    processCategoryKey: 'prescription',
    supportCards: [
      {
        title: 'Faster turnaround',
        description: 'Skip long queues and receive digital scripts where clinically appropriate.',
      },
      {
        title: 'Secure handling',
        description: 'Prescription data is managed with privacy-first safeguards.',
      },
      {
        title: 'Clear next steps',
        description: 'Receive practical medication guidance and follow-up directions.',
      },
    ],
  },
  'medical-certificates': {
    key: 'medical-certificates',
    label: 'Medical Certificates',
    heroDescription: 'Request work or school medical certificates through telehealth.',
    heroImage:
      'https://images.pexels.com/photos/6129687/pexels-photo-6129687.jpeg?auto=compress&cs=tinysrgb&w=1600',
    heroCtaLabel: 'View certificate options',
    primaryCtaTo: '/category/medical-certificate',
    processCategoryKey: 'medical-certificate',
    supportCards: [
      {
        title: 'Same-day availability',
        description: 'Get documentation quickly after clinical review.',
      },
      {
        title: 'Compliant format',
        description: 'Certificates include required medical context where applicable.',
      },
      {
        title: 'Digital convenience',
        description: 'Receive and store your certificate online for easy access.',
      },
    ],
  },
  'pathology-requests': {
    key: 'pathology-requests',
    label: 'Pathology Requests',
    heroDescription: 'Request blood and lab investigations with guided telehealth care.',
    heroImage:
      'https://images.pexels.com/photos/3825529/pexels-photo-3825529.jpeg?auto=compress&cs=tinysrgb&w=1600',
    heroCtaLabel: 'Browse pathology services',
    primaryCtaTo: '/category/popular-blood-tests',
    processCategoryKey: 'popular-blood-tests',
    supportCards: [
      {
        title: 'Doctor-led test selection',
        description: 'Choose relevant tests based on symptoms and history.',
      },
      {
        title: 'Guided preparation',
        description: 'Get clear instructions before your pathology collection.',
      },
      {
        title: 'Follow-up ready',
        description: 'Plan result review and ongoing care with your doctor.',
      },
    ],
  },
  'radiology-requests': {
    key: 'radiology-requests',
    label: 'Radiology Requests',
    heroDescription: 'Get imaging requests like X-ray, CT, or MRI through telehealth.',
    heroImage:
      'https://images.pexels.com/photos/7089019/pexels-photo-7089019.jpeg?auto=compress&cs=tinysrgb&w=1600',
    heroCtaLabel: 'Explore radiology requests',
    primaryCtaTo: '/category/radiology',
    processCategoryKey: 'radiology',
    supportCards: [
      {
        title: 'Appropriate imaging',
        description: 'Doctors evaluate symptoms before issuing imaging requests.',
      },
      {
        title: 'Transparent process',
        description: 'Understand modality, timing, and what to expect next.',
      },
      {
        title: 'Care continuity',
        description: 'Use reports to continue treatment with guided next steps.',
      },
    ],
  },
  'specialist-referral': {
    key: 'specialist-referral',
    label: 'Specialist Referral',
    heroDescription: 'Connect with doctors and get referrals for specialist care when needed.',
    heroImage:
      'https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=1600',
    heroCtaLabel: 'View specialist referral',
    primaryCtaTo: '/category/specialist-referral',
    processCategoryKey: 'specialist-referral',
    supportCards: [
      {
        title: 'Triage with confidence',
        description: 'Get clinical review before referral to the right specialty.',
      },
      {
        title: 'Referral-ready docs',
        description: 'Receive specialist letters with relevant medical context.',
      },
      {
        title: 'Coordinated care',
        description: 'Reduce delays between GP review and specialist consultation.',
      },
    ],
  },
};

const serviceTypeAliases = {
  'telehealth-consult': 'telehealth-consultation',
  'telehealth-consultation-page': 'telehealth-consultation',
  telehealth: 'telehealth-consultation',
  'medical-certificates-page': 'medical-certificates',
  'pathology-requests-page': 'pathology-requests',
  'radiology-requests-page': 'radiology-requests',
  'specialist-referral-page': 'specialist-referral',
};

const normalizeServiceTypeKey = (rawKey) =>
  String(rawKey || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-page$/, '');

export function getServiceTypeContent(rawKey) {
  const normalized = normalizeServiceTypeKey(rawKey);
  const resolvedKey = serviceTypeAliases[normalized] || normalized;
  const serviceType = serviceTypeContentMap[resolvedKey];
  if (!serviceType) return null;

  return {
    ...serviceType,
    appSection: {
      badge: 'Available on iOS & Android',
      title: 'Download Our Mobile App',
      description:
        'Access healthcare services on the go. Book appointments, consult with doctors, and manage your health from your smartphone.',
      stats: [
        { value: '50K+', label: 'Active users' },
        { value: '4.8', label: 'App rating' },
        { value: '24/7', label: 'Support' },
      ],
      bullets: [
        'Direct consultation with doctors',
        'Prescription management',
        'Real-time health monitoring',
        'Secure health data storage',
      ],
      image:
        'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    blogSection: {
      badge: 'Insights & Resources',
      title: 'Latest from our blog',
      description: 'Explore expert insights, industry trends, and best practices for workplace healthcare.',
      featured: {
        title: 'Daily Habits for Better Health',
        summary: 'Small, practical lifestyle changes can improve your overall health outcomes.',
        tag: 'Featured',
        date: '15 Sep 2025',
        readTime: '1 min read',
        image:
          'https://images.pexels.com/photos/7089624/pexels-photo-7089624.jpeg?auto=compress&cs=tinysrgb&w=1200',
      },
      cards: sharedBlogCards,
    },
  };
}

