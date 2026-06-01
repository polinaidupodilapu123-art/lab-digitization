const studentService = require('../services/studentService');
const activityLogService = require('../services/admin/activityLogService');

exports.getMyAssignments = async (req, res) => {
  try {
    const result = await studentService.getMyAssignments(req.user);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    const result = await studentService.submitAssignment({
      assignmentId: req.params.assignmentId,
      file: req.file,
      user: req.user,
      note: req.body.note
    });

    const assignment = result.assignment || {};
    const subjectName = assignment.groupSubjectName || assignment.subjectId?.subName || '';

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'UPLOAD_RECORD',
      entityId: req.params.assignmentId,
      entityType: 'Assignment',
      details: { note: req.body.note, subjectName }
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
