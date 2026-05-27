const principalService = require('../services/principalService');

exports.getPrincipalDashboardStats = async (req, res) => {
  try {
    const result = await principalService.getPrincipalDashboardStats(req.user.collegeId, req.query);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getPendingStudents = async (req, res) => {
  try {
    const result = await principalService.getPendingStudents(req.user.collegeId, req.query);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
