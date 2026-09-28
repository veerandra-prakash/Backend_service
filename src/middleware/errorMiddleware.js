const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific Mongoose errors
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error.message = `Resource not found. Invalid ${err.path}: ${err.value}`;
    error.statusCode = 400;
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error.message = `Duplicate field value entered for ${field}. Please use another value.`;
    error.statusCode = 400;
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((el) => el.message);
    error.message = `Invalid input data: ${messages.join('. ')}`;
    error.statusCode = 400;
  }

  // Send Error Response
  res.status(error.statusCode || 500).json({
    status: error.status || 'error',
    message: error.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
