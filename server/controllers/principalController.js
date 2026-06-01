const principalService = require('../services/principalService');
const activityLogService = require('../services/admin/activityLogService');

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

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'SUGGEST_MARKS',
      entityId: id,
      entityType: 'Assignment',
      details: { suggestedMarks, description: `Suggested marks ${suggestedMarks} for assignment ${id}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json({ message: 'Suggested marks updated', data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
