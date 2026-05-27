const evaluatorService = require('../services/evaluatorService');

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
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
