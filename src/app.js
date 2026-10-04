const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const { setSecurityHeaders, authRateLimiter } = require('./middleware/securityMiddleware');
const AppError = require('./utils/appError');
const mlService = require('./services/mlService');

const app = express();

// Configure CORS for local development & Vercel deployment origins
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, mobile)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Security & Global Middleware
app.use(setSecurityHeaders);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', async (req, res) => {
  const mlHealth = await mlService.checkHealth();
  res.status(200).json({
    status: 'ok',
    service: 'InsureWise Node.js/Express Backend',
    timestamp: new Date().toISOString(),
    ml_service: mlHealth
  });
});

// API Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/predictions', predictionRoutes);

// Handle 404 Unhandled Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Centralized Error Middleware
app.use(errorHandler);

module.exports = app;
