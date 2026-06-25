const prisma = require('../models/prismaClient');

const DEFAULT_PROFILE = {
  profilePictureUrl: null,
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

function asString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function asBoolean(value, fallback = false) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function splitName(fullName) {
  const name = asString(fullName);
  if (!name) return { givenName: '', familyName: '' };
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    givenName: parts[0] || '',
    familyName: parts.slice(1).join(' '),
  };
}

function composeUserName(profile) {
  const parts = [
    asString(profile.givenName),
    asString(profile.secondaryName),
    profile.noFamilyName ? '' : asString(profile.familyName),
  ].filter(Boolean);
  return parts.join(' ').trim();
}

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        patientProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fallbackName = splitName(user.name);
    const profile = user.patientProfile || {};

    return res.json({
      ...DEFAULT_PROFILE,
      ...profile,
      givenName: asString(profile.givenName, fallbackName.givenName),
      familyName: asString(profile.familyName, fallbackName.familyName),
      email: asString(profile.email, user.email || ''),
      phoneCode: asString(profile.phoneCode, '+61'),
      healthIdentifierType: asString(profile.healthIdentifierType, 'Medicare Number'),
      noFamilyName: asBoolean(profile.noFamilyName, false),
      noCurrentGpDetails: asBoolean(profile.noCurrentGpDetails, false),
      saveHealthIdentifier: asBoolean(profile.saveHealthIdentifier, false),
      onBehalfOfFamilyMember: asBoolean(profile.onBehalfOfFamilyMember, false),
      patientConsentGiven: asBoolean(profile.patientConsentGiven, false),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch patient profile' });
  }
};

exports.upsertMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = req.body || {};

    const updateData = {
      profilePictureUrl: asString(payload.profilePictureUrl) || null,
      givenName: asString(payload.givenName),
      secondaryName: asString(payload.secondaryName),
      familyName: asString(payload.familyName),
      noFamilyName: asBoolean(payload.noFamilyName, false),
      relation: asString(payload.relation),
      gender: asString(payload.gender),
      dateOfBirth: asString(payload.dateOfBirth),
      phoneCode: asString(payload.phoneCode, '+61'),
      phone: asString(payload.phone),
      email: asString(payload.email),
      address: asString(payload.address),
      ctgIslandOrigin: asString(payload.ctgIslandOrigin),
      allergies: asString(payload.allergies),
      medicareCardNumber: asString(payload.medicareCardNumber),
      medicareIrn: asString(payload.medicareIrn),
      dvaCardNumber: asString(payload.dvaCardNumber),
      dvaCardColor: asString(payload.dvaCardColor),
      currentGpName: asString(payload.currentGpName),
      currentGpEmail: asString(payload.currentGpEmail),
      partnerCode: asString(payload.partnerCode),
      noCurrentGpDetails: asBoolean(payload.noCurrentGpDetails, false),
      healthIdentifierType: asString(payload.healthIdentifierType, 'Medicare Number'),
      saveHealthIdentifier: asBoolean(payload.saveHealthIdentifier, false),
      onBehalfOfFamilyMember: asBoolean(payload.onBehalfOfFamilyMember, false),
      patientConsentGiven: asBoolean(payload.patientConsentGiven, false),
    };

    if (!updateData.givenName) {
      return res.status(400).json({ error: 'Given name is required' });
    }
    if (!updateData.noFamilyName && !updateData.familyName) {
      return res.status(400).json({ error: 'Family name is required unless no-family-name is selected' });
    }

    const profile = await prisma.patientProfile.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData,
    });

    const nextUserName = composeUserName(updateData);
    if (nextUserName) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: nextUserName },
      });
    }

    return res.json(profile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save patient profile' });
  }
};
