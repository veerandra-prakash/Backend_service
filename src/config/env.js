const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insurewise_db',
  JWT_SECRET: process.env.JWT_SECRET || 'insurewise_default_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL
};

