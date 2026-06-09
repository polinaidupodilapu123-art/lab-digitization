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
      note: req.body.note,
      extractedText: req.body.extractedText
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

exports.logDownload = async (req, res) => {
  try {
    const Assignment = require('../models/Assignment');
    const assignment = await Assignment.findById(req.params.assignmentId).populate('subjectId');
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const subjectName = assignment.groupSubjectName || assignment.subjectId?.subName || '';

    await activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'DOWNLOAD_RECORD',
      entityId: req.params.assignmentId,
      entityType: 'Assignment',
      details: { subjectName, description: `Downloaded lab record for ${subjectName}` }
    });

    res.json({ message: 'Download logged successfully' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
