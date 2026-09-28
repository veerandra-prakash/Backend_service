const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/appError');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please provide a valid authentication token.', 401));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    // If MongoDB is connected, find user in database
    if (mongoose.connection.readyState === 1) {
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
      }

      req.user = currentUser;
    } else {
      // Fallback user object when database is operating in offline mode
      req.user = {
        _id: decoded.id || new mongoose.Types.ObjectId('60d5ec49f1b2c81234567890'),
        name: 'Authenticated User',
        email: decoded.email || 'user@example.com',
        role: 'user'
      };
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    next(error);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};
