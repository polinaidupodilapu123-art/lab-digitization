const Assignment = require('../models/Assignment');

exports.getAssignedRecords = async (req, res) => {
  try {
    const evaluatorId = req.user._id;

    const records = await Assignment.find({ evaluatorId, status: { $ne: 'Pending' } })
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

    const assignment = await Assignment.findOneAndUpdate(
      { _id: assignmentId, evaluatorId },
      { 
        score,
        feedback,
        status: 'Evaluated'
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found or not assigned to you' });
    }

    res.json({ message: 'Record graded successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
