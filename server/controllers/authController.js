const authService = require('../services/authService');

/**
 * Token cookie utility functions for secure httpOnly cookie handling
 */

const setTokenCookie = (res, token) => {
  // Set secure httpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,      // Cannot be accessed via JavaScript (prevents XSS)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',  // CSRF protection
    maxAge: 2 * 60 * 60 * 1000, // 2 hours (matches JWT expiry)
    path: '/'
  });
};

const clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body, req.ip);
    
    // If login was successful and token is provided, set httpOnly cookie
    if (result.token && result.setCookie) {
      setTokenCookie(res, result.token);
      // Don't send token in response body for security
      delete result.token;
      delete result.setCookie;
    }
    
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const result = await authService.logout(req.user);
    
    // Clear the httpOnly cookie
    clearTokenCookie(res);
    
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const result = await authService.sendOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.setupAccount = async (req, res) => {
  try {
    const result = await authService.setupAccount(req.body);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.checkDuplicateFace = async (req, res) => {
  try {
    const result = await authService.checkDuplicateFace(req.body);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.createSysAdmin = async (req, res) => {
  try {
    const result = await authService.createSysAdmin();
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.fixAdmin = async (req, res) => {
  try {
    const result = await authService.fixAdmin();
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getCollegesList = async (req, res) => {
  try {
    const result = await authService.getCollegesList();
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const result = await authService.me(req.user._id);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
