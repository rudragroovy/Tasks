const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock'); // Using a mock/dummy key if none provided
const { authenticate } = require('../middlewares/authMiddleware');
const prisma = require('../models/prismaClient');

const router = express.Router();

router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { doctorId, appointmentId, type } = req.body;
    
    const doctor = await prisma.doctor.findUnique({
      where: { userId: doctorId },
      include: { user: true }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Consultation with Dr. ${doctor.user.name}`,
            },
            unit_amount: Math.round((parseFloat(doctor.fee) || 150) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}&type=${type}`,
      cancel_url: `http://localhost:5173/dashboard`,
      client_reference_id: appointmentId,
    });

    // Update appointment with stripe session ID
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { stripeSessionId: session.id, paymentStatus: 'PENDING_PAYMENT' }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    // For demo purposes, if Stripe key is invalid, we will return a mock success URL
    if (error.message.includes('Invalid API Key') || error.message.includes('sk_test_mock')) {
      console.log('Using mock payment success due to missing Stripe key');
      const { appointmentId, type } = req.body;
      const mockSessionId = 'cs_test_mock_' + Math.random().toString(36).substring(7);
      
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { stripeSessionId: mockSessionId, paymentStatus: 'PENDING_PAYMENT' }
      });

      return res.json({ 
        url: `http://localhost:5173/mock-checkout?session_id=${mockSessionId}&appointmentId=${appointmentId}&type=${type}&fee=${parseFloat(doctor.fee) || 150}` 
      });
    }
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

router.post('/confirm', authenticate, async (req, res) => {
  try {
    const { appointmentId, sessionId } = req.body;
    
    // In a real app, verify sessionId with Stripe
    
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: 'PAID', status: 'PENDING' } // Move to PENDING so doctor sees it
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
