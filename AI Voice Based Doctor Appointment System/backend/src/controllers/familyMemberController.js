const bcrypt = require('bcryptjs');
const prisma = require('../models/prismaClient');

const DEFAULT_PHONE_CODE = '+61';
const DEFAULT_HEALTH_IDENTIFIER_TYPE = 'Medicare Number';
const DEFAULT_FAMILY_MEMBER_PASSWORD = 'password123';

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

function normalizeEmail(value) {
  return asString(value).toLowerCase();
}

function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age >= 0 ? age : null;
}

function composeDisplayName({ givenName, secondaryName, familyName, noFamilyName }, fallback = '') {
  const segments = [
    asString(givenName),
    asString(secondaryName),
    noFamilyName ? '' : asString(familyName),
  ].filter(Boolean);

  const nextName = segments.join(' ').trim();
  return nextName || asString(fallback, 'Family Member');
}

function buildProfilePayload(payload) {
  return {
    profilePictureUrl: asString(payload?.profilePictureUrl) || null,
    givenName: asString(payload?.givenName),
    secondaryName: asString(payload?.secondaryName),
    familyName: asString(payload?.familyName),
    noFamilyName: asBoolean(payload?.noFamilyName, false),
    relation: asString(payload?.relation),
    gender: asString(payload?.gender),
    dateOfBirth: asString(payload?.dateOfBirth),
    phoneCode: asString(payload?.phoneCode, DEFAULT_PHONE_CODE),
    phone: asString(payload?.phone),
    email: normalizeEmail(payload?.email),
    address: asString(payload?.address),
    ctgIslandOrigin: asString(payload?.ctgIslandOrigin),
    allergies: asString(payload?.allergies),
    medicareCardNumber: asString(payload?.medicareCardNumber),
    medicareIrn: asString(payload?.medicareIrn),
    dvaCardNumber: asString(payload?.dvaCardNumber),
    dvaCardColor: asString(payload?.dvaCardColor),
    currentGpName: asString(payload?.currentGpName),
    currentGpEmail: asString(payload?.currentGpEmail),
    partnerCode: asString(payload?.partnerCode),
    noCurrentGpDetails: asBoolean(payload?.noCurrentGpDetails, false),
    healthIdentifierType: asString(payload?.healthIdentifierType, DEFAULT_HEALTH_IDENTIFIER_TYPE),
    saveHealthIdentifier: asBoolean(payload?.saveHealthIdentifier, false),
    onBehalfOfFamilyMember: asBoolean(payload?.onBehalfOfFamilyMember, false),
    patientConsentGiven: asBoolean(payload?.patientConsentGiven, false),
  };
}

function toFamilyMemberResponse(member) {
  const linkedUser = member?.linkedUser || null;
  const linkedProfile = linkedUser?.patientProfile || null;
  const isPlaceholderProfile = linkedUser?.email ? linkedUser.email.endsWith('@carebridge.local') : false;
  const resolvedName = asString(member?.name) || composeDisplayName(
    {
      givenName: linkedProfile?.givenName,
      secondaryName: linkedProfile?.secondaryName,
      familyName: linkedProfile?.familyName,
      noFamilyName: linkedProfile?.noFamilyName,
    },
    linkedUser?.name || 'Family Member'
  );
  const rawPhone = [asString(linkedProfile?.phoneCode), asString(linkedProfile?.phone)].filter(Boolean).join(' ');

  return {
    id: member.id,
    patientId: member.patientId,
    linkedUserId: member.linkedUserId || null,
    name: resolvedName,
    relation: asString(member.relation, linkedProfile?.relation || ''),
    age: Number.isFinite(Number(member.age)) ? Number(member.age) : null,
    gender: asString(member.gender, linkedProfile?.gender || ''),
    createdAt: member.createdAt,
    email: asString(linkedUser?.email),
    dateOfBirth: asString(linkedProfile?.dateOfBirth),
    phone: rawPhone,
    medicareId: asString(linkedProfile?.medicareCardNumber),
    status: isPlaceholderProfile ? 'Pending Activation' : 'Active',
    profile: linkedProfile
      ? {
          profilePictureUrl: linkedProfile.profilePictureUrl,
          givenName: linkedProfile.givenName,
          secondaryName: linkedProfile.secondaryName,
          familyName: linkedProfile.familyName,
          noFamilyName: linkedProfile.noFamilyName,
          relation: linkedProfile.relation,
          gender: linkedProfile.gender,
          dateOfBirth: linkedProfile.dateOfBirth,
          phoneCode: linkedProfile.phoneCode,
          phone: linkedProfile.phone,
          email: linkedProfile.email,
          address: linkedProfile.address,
          ctgIslandOrigin: linkedProfile.ctgIslandOrigin,
          allergies: linkedProfile.allergies,
          medicareCardNumber: linkedProfile.medicareCardNumber,
          medicareIrn: linkedProfile.medicareIrn,
          dvaCardNumber: linkedProfile.dvaCardNumber,
          dvaCardColor: linkedProfile.dvaCardColor,
          currentGpName: linkedProfile.currentGpName,
          currentGpEmail: linkedProfile.currentGpEmail,
          partnerCode: linkedProfile.partnerCode,
          noCurrentGpDetails: linkedProfile.noCurrentGpDetails,
          healthIdentifierType: linkedProfile.healthIdentifierType,
          saveHealthIdentifier: linkedProfile.saveHealthIdentifier,
          onBehalfOfFamilyMember: linkedProfile.onBehalfOfFamilyMember,
          patientConsentGiven: linkedProfile.patientConsentGiven,
        }
      : null,
  };
}

async function fetchFamilyMembersWithProfiles(patientId) {
  const members = await prisma.familyMember.findMany({
    where: { patientId },
    include: {
      linkedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          patientProfile: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return members.map(toFamilyMemberResponse);
}

exports.getFamilyMembers = async (req, res) => {
  try {
    const patientId = req.user.id;
    const members = await fetchFamilyMembersWithProfiles(patientId);
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
};

exports.addFamilyMember = async (req, res) => {
  try {
    const patientId = req.user.id;
    const profilePayload = buildProfilePayload(req.body);

    if (!profilePayload.givenName) {
      return res.status(400).json({ error: 'Given name is required' });
    }
    if (!profilePayload.relation) {
      return res.status(400).json({ error: 'Relation is required' });
    }
    if (!profilePayload.email) {
      return res.status(400).json({ error: 'Email is required to create and link family profile' });
    }
    if (!profilePayload.noFamilyName && !profilePayload.familyName) {
      return res.status(400).json({ error: 'Family name is required unless no-family-name is selected' });
    }
    if (!profilePayload.onBehalfOfFamilyMember) {
      return res.status(400).json({
        error: 'Approval on behalf of family member is required to create the account',
      });
    }

    const displayName = composeDisplayName(profilePayload, profilePayload.givenName);
    const calculatedAge = calculateAge(profilePayload.dateOfBirth);
    const age = Number.isFinite(Number(calculatedAge))
      ? Number(calculatedAge)
      : Number.isFinite(Number(req.body?.age))
        ? Number(req.body.age)
        : 0;

    const member = await prisma.$transaction(async (tx) => {
      let linkedUser = await tx.user.findUnique({
        where: { email: profilePayload.email },
        include: { patientProfile: true },
      });

      if (linkedUser && linkedUser.role !== 'PATIENT') {
        const roleError = new Error('This email is already linked to a non-patient account');
        roleError.statusCode = 400;
        throw roleError;
      }

      if (linkedUser) {
        const duplicateError = new Error('An account with this email already exists. Please use a different email.');
        duplicateError.statusCode = 400;
        throw duplicateError;
      }

      const hashedPassword = await bcrypt.hash(DEFAULT_FAMILY_MEMBER_PASSWORD, 10);
      linkedUser = await tx.user.create({
        data: {
          name: displayName,
          email: profilePayload.email,
          password: hashedPassword,
          role: 'PATIENT',
        },
        include: { patientProfile: true },
      });

      await tx.patientProfile.upsert({
        where: { userId: linkedUser.id },
        create: {
          userId: linkedUser.id,
          ...profilePayload,
          email: profilePayload.email,
        },
        update: {
          ...profilePayload,
          email: profilePayload.email,
        },
      });

      await tx.user.update({
        where: { id: linkedUser.id },
        data: { name: displayName },
      });

      const existingMember = await tx.familyMember.findFirst({
        where: {
          patientId,
          linkedUserId: linkedUser.id,
        },
      });

      if (existingMember) {
        return tx.familyMember.update({
          where: { id: existingMember.id },
          data: {
            name: displayName,
            relation: profilePayload.relation,
            age,
            gender: profilePayload.gender || null,
          },
        });
      }

      return tx.familyMember.create({
        data: {
          patientId,
          linkedUserId: linkedUser.id,
          name: displayName,
          relation: profilePayload.relation,
          age,
          gender: profilePayload.gender || null,
        },
      });
    });

    const enriched = await prisma.familyMember.findUnique({
      where: { id: member.id },
      include: {
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            patientProfile: true,
          },
        },
      },
    });

    res.status(201).json(toFamilyMemberResponse(enriched));
  } catch (error) {
    console.error(error);
    res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to add family member' });
  }
};

exports.deleteFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    const member = await prisma.familyMember.findUnique({ where: { id } });
    if (!member || member.patientId !== patientId) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    await prisma.familyMember.delete({ where: { id } });
    res.json({ message: 'Family member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
};
