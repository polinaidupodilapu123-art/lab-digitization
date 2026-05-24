const Assignment = require('../models/Assignment');
const User = require('../models/User');

exports.getAssignedSubjects = async (req, res) => {
  try {
    const evaluator = await User.findById(req.user._id).populate('subjects');
    if (!evaluator) return res.status(404).json({ message: 'Evaluator not found' });
    res.json(evaluator.subjects || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignedRecords = async (req, res) => {
  try {
    const evaluatorId = req.user._id;
    const evaluator = await User.findById(evaluatorId);
    if (!evaluator) return res.status(404).json({ message: 'Evaluator not found' });

    const records = await Assignment.find({ 
      subjectId: { $in: evaluator.subjects || [] },
      status: { $ne: 'Pending' } 
    })
      .populate('studentId', 'regdNo fullName')
      .populate('subjectId')
      .lean();

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.gradeRecord = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { score, feedback } = req.body;
    const evaluatorId = req.user._id;

    const evaluator = await User.findById(evaluatorId);
    if (!evaluator) return res.status(404).json({ message: 'Evaluator not found' });

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    // Validate that the evaluator is assigned to the subject of this assignment
    const isAuthorized = evaluator.subjects.some(
      subId => subId.toString() === assignment.subjectId.toString()
    );

    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to grade this assignment' });
    }

    assignment.score = score;
    assignment.feedback = feedback;
    assignment.status = 'Evaluated';
    assignment.evaluatorId = evaluatorId; // Track who graded the assignment
    await assignment.save();

    res.json({ message: 'Record graded successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
