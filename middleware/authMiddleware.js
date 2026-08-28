import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aiet_verse_secret_key_2026_super_secure';

/**
 * Protect routes - Verifies JWT Token from Header or Cookie
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: User account is inactive or no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Token invalid or expired.',
    });
  }
};

/**
 * Role-Based Access Control Middleware
 * Restricts access to specific roles: 'Super Admin', 'Principal', 'AO', 'Admission Staff'
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: User unauthenticated.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

export { JWT_SECRET };
