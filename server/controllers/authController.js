const authService = require('../services/authService');

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body, req.ip);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const result = await authService.logout(req.user);
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
