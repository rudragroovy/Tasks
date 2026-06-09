// server.js — Express application entry point
// Wires together middleware, routes, and starts the HTTP server
const express        = require('express');
const cors           = require('cors');
const studentRoutes  = require('./routes/studentRoutes');
const courseRoutes   = require('./routes/courseRoutes');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ──────────────────────────────────────────────────────────
// CORS — allow requests from the React dev server (Vite runs on 5173)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Body parser — parse incoming JSON request bodies
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
// Mount all student routes under /api/students
app.use('/api/students', studentRoutes);
// Mount all course routes under /api/courses
app.use('/api/courses', courseRoutes);

// Health check — useful to confirm the server is alive
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── 404 Fallback ──────────────────────────────────────────────────────────────
// Catches any request that doesn't match a defined route
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// Catches any unhandled errors thrown in async controllers
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📋 API Docs: http://localhost:${PORT}/api/students`);
});
