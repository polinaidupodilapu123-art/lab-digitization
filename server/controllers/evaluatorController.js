const evaluatorService = require('../services/evaluatorService');
const activityLogService = require('../services/admin/activityLogService');

exports.getAssignedSubjects = async (req, res) => {
  try {
    const list = await evaluatorService.getAssignedSubjects(req.user._id);
    res.json(list);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getAssignedRecords = async (req, res) => {
  try {
    const records = await evaluatorService.getAssignedRecords(req.user._id);
    res.json(records);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.gradeRecord = async (req, res) => {
  try {
    const result = await evaluatorService.gradeRecord({
      assignmentId: req.params.assignmentId,
      score: req.body.score,
      feedback: req.body.feedback,
      evaluatorId: req.user._id
    });

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'EVALUATE_MARKS',
      entityId: req.params.assignmentId,
      entityType: 'Assignment',
      details: { score: req.body.score, feedback: req.body.feedback, description: `Evaluated Assignment ${req.params.assignmentId} - ${result.diffString}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
