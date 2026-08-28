import rateLimit from 'express-rate-limit';

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Stricter rate limiting for contact form specifically
export const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 2, // Limit each IP to 2 requests per minute to prevent rapid spam
  message: {
    success: false,
    message: 'Too many contact requests. Please wait a minute.'
  }
});
