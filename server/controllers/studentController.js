const studentService = require('../services/studentService');

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
      user: req.user
    });
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
