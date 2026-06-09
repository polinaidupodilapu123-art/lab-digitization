/**
 * Token cookie utility functions for secure httpOnly cookie handling
 */

exports.setTokenCookie = (res, token) => {
  // Set secure httpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,      // Cannot be accessed via JavaScript (prevents XSS)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',  // CSRF protection
    maxAge: 2 * 60 * 60 * 1000, // 2 hours (matches JWT expiry)
    path: '/'
  });
};

exports.clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

exports.extractTokenFromCookie = (req) => {
  // Extract token from httpOnly cookie
  return req.cookies.token || null;
};

exports.verifyTokenFromCookie = (req) => {
  const jwt = require('jsonwebtoken');
  const token = exports.extractTokenFromCookie(req);
  
  if (!token) {
    throw new Error('No token found');
  }

  // Verify with JWT_SECRET (no fallback)
  return jwt.verify(token, process.env.JWT_SECRET);
};
