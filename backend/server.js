const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const turfRoutes = require('./routes/turfRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const managerRoutes = require('./routes/managerRoutes');
const dbmsRoutes = require('./routes/dbmsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for development
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'turf_mgmt_super_secret_session_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Serve frontend static assets
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Health & Database status endpoint
app.get('/api/health', (req, res) => {
  const status = db.getStatus();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: status
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/turfs', turfRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/dbms', dbmsRoutes);

// Friendly URL fallbacks
app.get('/login', (req, res) => res.sendFile(path.join(frontendPath, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(frontendPath, 'register.html')));
app.get('/turfs', (req, res) => res.sendFile(path.join(frontendPath, 'turfs.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(frontendPath, 'booking.html')));
app.get('/customer-dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'customer-dashboard.html')));
app.get('/booking-history', (req, res) => res.sendFile(path.join(frontendPath, 'booking-history.html')));
app.get('/manager-dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'manager-dashboard.html')));
app.get('/database-overview', (req, res) => res.sendFile(path.join(frontendPath, 'database-overview.html')));

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error: ' + (err.message || 'Unknown error')
  });
});

// Start Express server and test DB connection
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 Football Turf Management Server started on port ${PORT}`);
  console.log(`🌐 Website URL: http://localhost:${PORT}`);
  console.log('====================================================');
  
  const status = db.getStatus();
  console.log(`📦 Database: ${status.engine} (${status.database})`);
  console.log(`⚡ Zero-setup: Ready to run on any PC without external DB servers`);
});

module.exports = app;
