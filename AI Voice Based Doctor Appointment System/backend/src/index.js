require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const appointmentRoutes = require('./routes/appointments');
const doctorsRoutes = require('./routes/doctors');
const paymentsRoutes = require('./routes/payments');
const agoraRoutes = require('./routes/agora');

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
app.use('/api/ai', aiRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/agora', agoraRoutes);

// Socket.io
require('./socket')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
