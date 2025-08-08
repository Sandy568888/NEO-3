const rateLimit = require('express-rate-limit');

// Rate limiter configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  // Remove the skip option as it's not needed with the current version
});

// Development middleware that bypasses rate limiting
const devRateLimiter = (req, res, next) => {
  console.log('Rate limiting disabled in development');
  next();
};

// Export appropriate middleware based on environment
module.exports = process.env.NODE_ENV === 'development' 
  ? devRateLimiter 
  : apiLimiter;
