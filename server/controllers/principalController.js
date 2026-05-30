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

exports.getCollegeRecords = async (req, res) => {
  try {
    const records = await principalService.getCollegeRecords(req.user.collegeId);
    res.json(records);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.suggestMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestedMarks } = req.body;
    const result = await principalService.suggestMarks(req.user.collegeId, id, suggestedMarks);
    res.json({ message: 'Suggested marks updated', data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
