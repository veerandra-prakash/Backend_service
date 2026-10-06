const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const mlService = require('./services/mlService');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Server] UNCAUGHT EXCEPTION! Shutting down...', err.name, err.message);
  process.exit(1);
});

// Connect to MongoDB
connectDB();

// Start Server
const server = app.listen(env.PORT, () => {
  console.log(`========================================================================`);
  console.log(`  InsureWise Node.js Backend Server running on port ${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  ML Service Proxy Target: ${env.ML_SERVICE_URL}`);
  console.log(`========================================================================`);

  // Trigger non-blocking background warm-up request to ML service
  mlService.warmup();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Server] UNHANDLED REJECTION! Shutting down...', err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
