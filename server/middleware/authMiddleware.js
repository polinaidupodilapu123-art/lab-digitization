const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Validate JWT_SECRET is set at startup
if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set. This is required for secure token generation and verification.');
}

exports.protect = async (req, res, next) => {
  let token;
  
  try {
    // Try to extract token from httpOnly cookie first (recommended)
    token = req.cookies.token;
    
    // Fallback to Authorization header for API clients (backward compatibility)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // Verify token (no fallback to 'secret123')
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Single concurrent session logic: only one valid token allowed per user at a time
    // Exception: PRINCIPAL role can have multiple concurrent sessions for shared lecturer access
    if (req.user.role !== 'PRINCIPAL' && req.user.currentSessionId && req.user.currentSessionId !== decoded.sessionId) {
      return res.status(401).json({ message: 'Your session has expired because your account was logged in from another device.' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: error.message || 'Not authorized, token failed' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SYSTEM_ADMIN')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

exports.systemAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'SYSTEM_ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a system admin' });
  }
};

exports.evaluatorOnly = (req, res, next) => {
  if (req.user && req.user.role === 'EVALUATOR') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an evaluator' });
  }
};

exports.principalOnly = (req, res, next) => {
  if (req.user && req.user.role === 'PRINCIPAL') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a principal' });
  }
};
