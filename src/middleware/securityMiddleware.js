/**
 * Security headers and rate limiting middleware
 */

// Custom security headers middleware
const setSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

// In-memory rate limiting for auth endpoints (prevents brute-force attacks)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_REQUESTS = 100; // max 100 requests per 15 min per IP

const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  const record = requestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count += 1;
  }

  requestCounts.set(ip, record);

  if (record.count > MAX_AUTH_REQUESTS) {
    return res.status(429).json({
      status: 'fail',
      message: 'Too many authentication requests from this IP. Please try again after 15 minutes.'
    });
  }

  next();
};

module.exports = {
  setSecurityHeaders,
  authRateLimiter
};
