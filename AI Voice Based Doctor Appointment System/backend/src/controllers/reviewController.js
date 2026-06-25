const prisma = require('../models/prismaClient');
const { recalculateDoctorReviewStats, roundToSingleDecimal } = require('../services/reviewService');

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 10;
const MAX_MESSAGE_LENGTH = 1000;

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

function normalizePageSize(rawValue) {
  return Math.min(parsePositiveInt(rawValue, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
}

function normalizeRatingFilter(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return null;
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}

function normalizeSort(rawSort) {
  const sort = String(rawSort || 'newest').toLowerCase();
  if (['newest', 'oldest', 'highest', 'lowest'].includes(sort)) return sort;
  return 'newest';
}

function getOrderBy(sort) {
  if (sort === 'oldest') return [{ createdAt: 'asc' }];
  if (sort === 'highest') return [{ rating: 'desc' }, { createdAt: 'desc' }];
  if (sort === 'lowest') return [{ rating: 'asc' }, { createdAt: 'desc' }];
  return [{ createdAt: 'desc' }];
}

async function getRatingBreakdown(where) {
  const grouped = await prisma.review.groupBy({
    by: ['rating'],
    where,
    _count: { rating: true },
  });

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const entry of grouped) {
    const rating = Number(entry?.rating);
    if (rating >= 1 && rating <= 5) {
      breakdown[rating] = entry?._count?.rating || 0;
    }
  }
  return breakdown;
}

exports.createReview = async (req, res) => {
  try {
    if (req.user?.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can submit reviews' });
    }

    const appointmentId = String(req.body?.appointmentId || '').trim();
    const rating = Number(req.body?.rating);
    const rawMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }
    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        status: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (appointment.patientId !== req.user.id) {
      return res.status(403).json({ error: 'You can only review your own appointments' });
    }
    if (appointment.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Review can only be submitted for completed appointments' });
    }

    const existing = await prisma.review.findUnique({
      where: { appointmentId },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'Review already exists for this appointment' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          appointmentId,
          patientId: req.user.id,
          doctorId: appointment.doctorId,
          rating,
          message: rawMessage || null,
        },
        include: {
          patient: { select: { id: true, name: true } },
          appointment: { select: { id: true, scheduledFor: true } },
        },
      });

      const doctorStats = await recalculateDoctorReviewStats(tx, appointment.doctorId);
      return { review, doctorStats };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Review already exists for this appointment' });
    }
    return res.status(500).json({ error: 'Failed to submit review' });
  }
};

exports.getDoctorMyReviews = async (req, res) => {
  try {
    if (req.user?.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can access received reviews' });
    }

    const page = parsePositiveInt(req.query?.page, 1);
    const pageSize = normalizePageSize(req.query?.pageSize);
    const rating = normalizeRatingFilter(req.query?.rating);
    const sort = normalizeSort(req.query?.sort);
    const query = String(req.query?.q || '').trim();

    const where = {
      doctorId: req.user.id,
      isVisible: true,
    };
    if (rating) where.rating = rating;
    if (query) {
      where.OR = [
        { message: { contains: query, mode: 'insensitive' } },
        { patient: { name: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const [total, reviews, ratingBreakdown, doctorStats] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true } },
          appointment: { select: { id: true, scheduledFor: true, createdAt: true } },
        },
        orderBy: getOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getRatingBreakdown({ doctorId: req.user.id, isVisible: true }),
      prisma.doctor.findUnique({
        where: { userId: req.user.id },
        select: { averageRating: true, reviewCount: true },
      }),
    ]);

    res.json({
      summary: {
        averageRating: roundToSingleDecimal(doctorStats?.averageRating || 0),
        reviewCount: doctorStats?.reviewCount || 0,
        ratingBreakdown,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch doctor reviews' });
  }
};

exports.getDoctorPublicReviews = async (req, res) => {
  try {
    const doctorId = String(req.params?.doctorId || '').trim();
    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId is required' });
    }

    const page = parsePositiveInt(req.query?.page, 1);
    const pageSize = normalizePageSize(req.query?.pageSize);
    const rating = normalizeRatingFilter(req.query?.rating);
    const sort = normalizeSort(req.query?.sort);

    const where = {
      doctorId,
      isVisible: true,
    };
    if (rating) where.rating = rating;

    const [doctorStats, total, reviews, ratingBreakdown] = await Promise.all([
      prisma.doctor.findUnique({
        where: { userId: doctorId },
        select: {
          userId: true,
          averageRating: true,
          reviewCount: true,
          user: { select: { name: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true } },
        },
        orderBy: getOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getRatingBreakdown({ doctorId, isVisible: true }),
    ]);

    if (!doctorStats) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const publicReviews = reviews.map((review) => ({
      ...review,
      patient: {
        id: review.patient?.id,
        name: review.patient?.name || 'Anonymous',
      },
    }));

    res.json({
      doctor: {
        id: doctorStats.userId,
        name: doctorStats.user?.name || '',
      },
      summary: {
        averageRating: roundToSingleDecimal(doctorStats.averageRating || 0),
        reviewCount: doctorStats.reviewCount || 0,
        ratingBreakdown,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      reviews: publicReviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch public doctor reviews' });
  }
};

exports.getPatientMyReviews = async (req, res) => {
  try {
    if (req.user?.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can access submitted reviews' });
    }

    const page = parsePositiveInt(req.query?.page, 1);
    const pageSize = normalizePageSize(req.query?.pageSize);
    const sort = normalizeSort(req.query?.sort);

    const where = { patientId: req.user.id };
    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: {
          doctor: {
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
          appointment: { select: { id: true, scheduledFor: true, createdAt: true } },
        },
        orderBy: getOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient reviews' });
  }
};
