require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const doctorsRoutes = require('./routes/doctors');
const paymentsRoutes = require('./routes/payments');
const agoraRoutes = require('./routes/agora');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');
const { ensureDefaultAdmin } = require('./utils/ensureDefaultAdmin');

const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.set('io', io); // Allow routes to access io via req.app.get('io')

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/family-members', require('./routes/familyMembers'));
app.use('/api/patient-profile', require('./routes/patientProfile'));
app.use('/api/doctors', doctorsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

// Socket.io
require('./socket')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  try {
    await ensureDefaultAdmin();
  } catch (error) {
    console.error('[bootstrap] Failed to ensure default admin user:', error.message);
  }
  console.log(`Server running on port ${PORT}`);
});
