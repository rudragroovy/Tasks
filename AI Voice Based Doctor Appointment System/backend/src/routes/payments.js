const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock'); // Using a mock/dummy key if none provided
const { authenticate } = require('../middlewares/authMiddleware');
const prisma = require('../models/prismaClient');
const { formatDoctorName } = require('../utils/doctorName');
const {
  getDefaultConsultationFeeFromServicesSelection,
  getServiceRateFromMap,
  parseDoctorServicesSelection,
} = require('../utils/doctorCatalog');

const router = express.Router();

function parseAiSummary(value) {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(value || '{}');
  } catch (error) {
    return {};
  }
}

function resolveRequestedServiceName(aiSummary, body) {
  const direct = typeof body?.serviceName === 'string' ? body.serviceName.trim() : '';
  if (direct) return direct;

  const candidates = [
    aiSummary?.serviceName,
    aiSummary?.service,
    aiSummary?.selected_service,
    aiSummary?.suggested_service,
  ];

  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (!text) continue;
    return text;
  }

  return '';
}

router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { doctorId, appointmentId, type } = req.body;
    
    const [doctor, appointment] = await Promise.all([
      prisma.doctor.findUnique({
        where: { userId: doctorId },
        include: { user: true }
      }),
      prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, aiSummary: true },
      }),
    ]);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const aiSummary = parseAiSummary(appointment.aiSummary);
    const servicesSelection = parseDoctorServicesSelection(doctor.services);
    const requestedServiceName = resolveRequestedServiceName(aiSummary, req.body);
    const requestedServiceRate = getServiceRateFromMap(
      servicesSelection.selectedServiceRates,
      requestedServiceName
    );
    const fallbackRate = getDefaultConsultationFeeFromServicesSelection(servicesSelection);
    const consultationFee = Number.isFinite(Number(requestedServiceRate)) && Number(requestedServiceRate) > 0
      ? Number(requestedServiceRate)
      : fallbackRate;

    const normalizedFee = Number(consultationFee.toFixed(2));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: requestedServiceName
                ? `${requestedServiceName} with ${formatDoctorName(doctor.user.name, doctor.user.name)}`
                : `Consultation with ${formatDoctorName(doctor.user.name, doctor.user.name)}`,
            },
            unit_amount: Math.round(normalizedFee * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}&type=${type}`,
      cancel_url: `http://localhost:5173/dashboard`,
      client_reference_id: appointmentId,
    });

    const nextAiSummary = {
      ...aiSummary,
      consultationFee: normalizedFee,
    };
    if (requestedServiceName) nextAiSummary.serviceName = requestedServiceName;

    // Update appointment with stripe session ID
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        stripeSessionId: session.id,
        paymentStatus: 'PENDING_PAYMENT',
        aiSummary: nextAiSummary,
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    // For demo purposes, if Stripe key is invalid, we will return a mock success URL
    if (error.message.includes('Invalid API Key') || error.message.includes('sk_test_mock')) {
      console.log('Using mock payment success due to missing Stripe key');
      const { appointmentId, doctorId, type } = req.body;
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { aiSummary: true, doctorId: true },
      });
      const parsedAiSummary = parseAiSummary(appointment?.aiSummary);
      const requestedServiceName = resolveRequestedServiceName(parsedAiSummary, req.body);
      const resolvedDoctorId = doctorId || appointment?.doctorId;
      const doctor = resolvedDoctorId
        ? await prisma.doctor.findUnique({
          where: { userId: resolvedDoctorId },
          select: { services: true },
        })
        : null;
      const servicesSelection = parseDoctorServicesSelection(doctor?.services);
      const requestedServiceRate = requestedServiceName
        ? getServiceRateFromMap(servicesSelection.selectedServiceRates, requestedServiceName)
        : null;
      const fallbackRate = getDefaultConsultationFeeFromServicesSelection(servicesSelection);
      const summaryFee = Number(parsedAiSummary?.consultationFee);
      const consultationFee = Number.isFinite(summaryFee) && summaryFee > 0
        ? summaryFee
        : Number.isFinite(Number(requestedServiceRate)) && Number(requestedServiceRate) > 0
          ? Number(requestedServiceRate)
          : fallbackRate;
      const normalizedFee = Number(consultationFee.toFixed(2));
      const mockSessionId = 'cs_test_mock_' + Math.random().toString(36).substring(7);
      const nextAiSummary = {
        ...parsedAiSummary,
        consultationFee: normalizedFee,
      };
      if (requestedServiceName) nextAiSummary.serviceName = requestedServiceName;
      
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          stripeSessionId: mockSessionId,
          paymentStatus: 'PENDING_PAYMENT',
          aiSummary: nextAiSummary,
        }
      });

      return res.json({ 
        url: `http://localhost:5173/mock-checkout?session_id=${mockSessionId}&appointmentId=${appointmentId}&type=${type}&consultationFee=${normalizedFee}` 
      });
    }
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

router.post('/confirm', authenticate, async (req, res) => {
  try {
    const { appointmentId, sessionId } = req.body;
    
    // In a real app, verify sessionId with Stripe

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, doctorId: true, type: true }
    });

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Flow rule:
    // - ON_DEMAND: doctor must accept (PENDING after payment)
    // - SCHEDULED: auto-confirm directly in doctor's schedule (ACCEPTED after payment)
    const nextStatus = existingAppointment.type === 'SCHEDULED' ? 'ACCEPTED' : 'PENDING';

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: 'PAID', status: nextStatus }
    });

    // Notify doctor
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${appointment.doctorId}`).emit('appointment:new', appointment);
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

module.exports = router;
