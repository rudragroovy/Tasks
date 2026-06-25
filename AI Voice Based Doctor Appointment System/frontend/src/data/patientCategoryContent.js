const categoryDefinitions = [
  {
    key: 'general-consultation',
    label: 'General Consultation',
    group: 'Telehealth Medical Consultation',
    services: ['Standard Consultation'],
  },
  {
    key: 'other-consultation',
    label: 'Other Consultation',
    group: 'Telehealth Medical Consultation',
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
    group: 'Telehealth Medical Consultation',
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
    group: 'Telehealth Medical Consultation',
    services: [
      'Psychiatrist Referral',
      'Psychologist Referral',
      'GP Mental Health Consultation',
      'Psychiatrist Consultation',
      'Psychologist Consultation',
    ],
  },
  {
    key: 'recall-consultation-standard',
    label: 'Recall Consultation - (Standard)',
    group: 'Telehealth Medical Consultation',
    services: ['Recall Consultation - (Standard)'],
  },
  {
    key: 'geriatrics-consultation',
    label: 'Geriatrics Consultation',
    group: 'Telehealth Medical Consultation',
    services: ['Dementia Management'],
  },
  {
    key: 'allied-health',
    label: 'Allied Health',
    group: 'Telehealth Medical Consultation',
    services: ['Allied Health Referral'],
  },
  {
    key: 'prescription',
    label: 'Prescription',
    group: 'Prescription',
    services: ['Single Prescription', 'Multiple Prescription'],
  },
  {
    key: 'medical-certificate',
    label: 'Medical Certificate',
    group: 'Medical Certificates',
    services: [
      'Single-Day Certificate for Work',
      'Single-Day Certificate for School or University',
      "Single Day Certificate for Carer's Leave",
      'Multiple-Day Certificate',
    ],
  },
  {
    key: 'popular-blood-tests',
    label: 'Popular Blood Tests',
    group: 'Pathology Requests',
    services: ['General Health Blood Test', 'STI Blood Test', 'Vegan Blood Test'],
  },
  {
    key: 'recall-consultation-pathology',
    label: 'Recall Consultation - (Pathology)',
    group: 'Pathology Requests',
    services: ['Recall Consultation - (Pathology)'],
  },
  {
    key: 'mens-tests',
    label: "Men's Tests",
    group: 'Pathology Requests',
    services: ['Fertility Test (For Men)', 'Erectile Dysfunction Blood Test'],
  },
  {
    key: 'womens-tests',
    label: "Women's Tests",
    group: 'Pathology Requests',
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
    group: 'Pathology Requests',
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
  {
    key: 'radiology',
    label: 'Radiology',
    group: 'Radiology Requests',
    services: ['CT Scan', 'X-Ray', 'MRI'],
  },
  {
    key: 'recall-consultation-radiology',
    label: 'Recall Consultation - (Radiology)',
    group: 'Radiology Requests',
    services: ['Recall Consultation - (Radiology)'],
  },
  {
    key: 'specialist-referral',
    label: 'Specialist Referral',
    group: 'Specialist Referral',
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
];

const categoryCopyOverrides = {
  'general-consultation': {
    heroTitle: 'General Medical Consultation',
    heroDescription:
      'Consult with licensed doctors for everyday health concerns, advice, and treatment online and hassle-free.',
    whyHeading: 'Why Choose Our General Consultation Service',
    benefitsHeading: 'Benefits of Online General Consultation',
    ctaTitle: 'Talk to a Doctor Online Today',
    ctaSubtitle: 'Get fast, secure medical advice from licensed doctors - without visiting a clinic.',
    ctaAction: 'View Telehealth Services',
  },
  'other-consultation': {
    heroTitle: 'Other Medical Consultation',
    heroDescription:
      'Manage ongoing and specific health conditions with trusted online consultations and follow-up care.',
    whyHeading: 'Why Choose Our Other Consultation Service',
    benefitsHeading: 'Benefits of Online Other Consultation',
    ctaTitle: 'Start Your Consultation Today',
    ctaSubtitle: 'Access expert medical support for condition-focused care from anywhere.',
    ctaAction: 'View Other Consultations',
  },
};

const categoryHeroImages = {
  'general-consultation':
    'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'other-consultation':
    'https://images.pexels.com/photos/7088485/pexels-photo-7088485.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'specialist-consultation':
    'https://images.pexels.com/photos/5722164/pexels-photo-5722164.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'mental-health':
    'https://images.pexels.com/photos/7088530/pexels-photo-7088530.jpeg?auto=compress&cs=tinysrgb&w=1400',
};

const processStepImages = [
  'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/7088530/pexels-photo-7088530.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/7089624/pexels-photo-7089624.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/5214958/pexels-photo-5214958.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

const fallbackFaqItems = [
  'What services are included in this category?',
  'How quickly can I get a consultation?',
  'Are prescriptions, referrals, and certificates supported?',
];

const makeHeadline = (label) =>
  label
    .replace(/\s*-\s*\(.+\)\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const defaultCopy = (label) => {
  const cleanLabel = makeHeadline(label);
  return {
    heroTitle: cleanLabel,
    heroDescription: `Book ${cleanLabel.toLowerCase()} online with licensed doctors and get secure, convenient care from anywhere in Australia.`,
    whyHeading: `Why Choose Our ${cleanLabel} Service`,
    benefitsHeading: `Benefits of Online ${cleanLabel}`,
    ctaTitle: `Need ${cleanLabel.toLowerCase()} today?`,
    ctaSubtitle: 'Connect with doctors quickly and get trusted care, documents, and guidance online.',
    ctaAction: 'Book Consultation',
  };
};

const buildServiceCards = (services) =>
  services.map((service, index) => {
    const basePrice = 39 + (index % 3) * 10;
    return {
      id: `${service}-${index}`,
      name: service,
      description: `Online consultation for ${service.toLowerCase()} with licensed practitioners.`,
      price: `$${basePrice}`,
      oldPrice: `$${Math.max(49, basePrice + 16)}`,
    };
  });

const buildCategoryContent = (category) => {
  const override = categoryCopyOverrides[category.key] ?? {};
  const copy = { ...defaultCopy(category.label), ...override };
  return {
    key: category.key,
    label: category.label,
    group: category.group,
    heroTitle: copy.heroTitle,
    heroDescription: copy.heroDescription,
    heroImage:
      categoryHeroImages[category.key] ??
      'https://images.pexels.com/photos/7089629/pexels-photo-7089629.jpeg?auto=compress&cs=tinysrgb&w=1400',
    whyHeading: copy.whyHeading,
    whySubtitle:
      'Get reliable medical care online with experienced doctors, secure consultations, and quick support.',
    whyCards: [
      {
        title: 'Licensed & Experienced Doctors',
        text: 'Consult with qualified medical professionals who are verified and experienced in patient care.',
      },
      {
        title: 'Safe & Confidential Consultation',
        text: 'Your health data and conversations stay protected with secure and encrypted platforms.',
      },
      {
        title: 'Fast & Convenient Access',
        text: 'Book an appointment and speak with a doctor quickly, without long waiting times.',
      },
    ],
    servicesHeading: `Our ${category.group} Services`,
    servicesSubtitle: 'Easy, secure, and convenient online consultations with experienced doctors.',
    services: buildServiceCards(category.services),
    benefitsHeading: copy.benefitsHeading,
    benefitsSubtitle: 'Experience convenient, secure, and professional healthcare without visiting a clinic.',
    benefits: [
      {
        title: 'Consult From Home',
        text: 'Get medical advice from the comfort of your home without travel or waiting rooms.',
      },
      {
        title: 'Save Time & Effort',
        text: 'Avoid long queues and complete your consultation online in minutes.',
      },
      {
        title: 'Expert Medical Advice',
        text: 'Consult licensed and experienced doctors for accurate diagnosis and treatment guidance.',
      },
    ],
    processHeading: 'How Our Consultation Process Works',
    processSubtitle: 'Follow these simple steps to book, connect, and get expert medical care anytime, anywhere.',
    processModes: ['Telephone & Televideo Consultation', 'In-Person Doctor Visit', 'Waiting Room'],
    processStepsByMode: {
      'Telephone & Televideo Consultation': [
        {
          title: 'Select Your Consultation Service',
          text: 'Choose Video or Telephone consultation based on your preference.',
          points: ['Simple service selection', 'Choose online consultation mode', 'Quick and easy process'],
          image: processStepImages[0],
        },
        {
          title: 'Choose Your Doctor',
          text: 'Browse available doctors and pick the one best suited for your health concern.',
          points: ['View doctor profiles', 'Select expertise and experience', 'See available slots'],
          image: processStepImages[1],
        },
        {
          title: 'Book Your Appointment',
          text: 'Select date and time, provide basic details, and confirm your booking instantly.',
          points: ['Instant confirmation', 'Secure booking', 'Share basic medical details'],
          image: processStepImages[2],
        },
        {
          title: 'Connect & Receive Medical Documents',
          text: 'Join the video or audio call and receive prescription, medical certificate, referral letter, radiology/pathology orders, and more, as required.',
          points: ['Secure video/audio call', 'Doctor recommendations', 'All required medical documents'],
          image: processStepImages[3],
        },
      ],
      'In-Person Doctor Visit': [
        {
          title: 'Select In-Person Service',
          text: 'Choose the option to visit the doctor physically at the clinic.',
          points: ['Select consultation type', 'Clinic visit option', 'Clear service choices'],
          image: processStepImages[0],
        },
        {
          title: 'Choose Doctor & Clinic',
          text: 'Pick the doctor and clinic location convenient for you.',
          points: ['Nearby clinic selection', 'View timings', 'See doctor availability'],
          image: processStepImages[1],
        },
        {
          title: 'Book Appointment',
          text: 'Confirm date and time and receive appointment confirmation instantly.',
          points: ['Instant booking', 'Secure confirmation', 'Easy rescheduling if needed'],
          image: processStepImages[2],
        },
        {
          title: 'Visit The Clinic & Meet Doctor',
          text: 'Arrive at the clinic and get your consultation directly with the doctor.',
          points: ['Face-to-face consultation', 'Full examination', 'Prescription and advice'],
          image: processStepImages[3],
        },
      ],
      'Waiting Room': [
        {
          title: 'Select Waiting Room Service',
          text: 'Choose consultation through the clinic waiting room system.',
          points: ['Easy service choice', 'Clear guidance', 'Smooth flow'],
          image: processStepImages[0],
        },
        {
          title: 'Book Appointment',
          text: 'Pick time, confirm booking, and get your token number.',
          points: ['Quick booking', 'Token based system', 'Minimal waiting'],
          image: processStepImages[1],
        },
        {
          title: 'Wait In Virtual Waiting Room',
          text: "Relax while you wait - you'll be notified when it's your turn.",
          points: ['Queue updates', 'Comfortable seating', 'Supportive staff'],
          image: processStepImages[2],
        },
        {
          title: 'Consult & Receive Medical Documents',
          text: 'Meet the doctor and receive prescription, medical certificate, referral, and diagnostic orders if required.',
          points: ['Doctor consultation', 'All necessary documents', 'Clear follow-up plan'],
          image: processStepImages[3],
        },
      ],
    },
    processSteps: [
      {
        title: 'Select Your Consultation Service',
        text: 'Choose Video or Telephone consultation based on your preference.',
        points: ['Simple service selection', 'Choose online consultation mode', 'Quick and easy process'],
        image: processStepImages[0],
      },
      {
        title: 'Choose Your Doctor',
        text: 'Browse available doctors and pick the one best suited for your health concern.',
        points: ['View doctor profiles', 'Select expertise and experience', 'See available slots'],
        image: processStepImages[1],
      },
      {
        title: 'Book Your Appointment',
        text: 'Select date and time, provide basic details, and confirm your booking instantly.',
        points: ['Instant confirmation', 'Secure booking', 'Share basic medical details'],
        image: processStepImages[2],
      },
      {
        title: 'Connect & Receive Medical Documents',
        text: 'Join the video or audio call and receive prescription, medical certificate, referral letter, radiology/pathology orders, and more, as required.',
        points: ['Secure video/audio call', 'Doctor recommendations', 'All required medical documents'],
        image: processStepImages[3],
      },
    ],
    ctaTitle: copy.ctaTitle,
    ctaSubtitle: copy.ctaSubtitle,
    ctaAction: copy.ctaAction,
    faqHeading: 'Frequently Asked Questions',
    faqItems: fallbackFaqItems,
  };
};

export const patientCategoryContentList = categoryDefinitions.map(buildCategoryContent);

export const patientCategoryContentMap = patientCategoryContentList.reduce((accumulator, item) => {
  accumulator[item.key] = item;
  return accumulator;
}, {});

export const getPatientCategoryContent = (categoryKey) => patientCategoryContentMap[categoryKey] ?? null;
