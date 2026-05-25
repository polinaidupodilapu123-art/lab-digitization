const Assignment = require('../models/Assignment');
const User = require('../models/User');

exports.getAssignedSubjects = async (req, res) => {
  try {
    const evaluator = await User.findById(req.user._id).populate('subjects').lean();
    if (!evaluator) return res.status(404).json({ message: 'Evaluator not found' });
    
    // Construct a unified list of subjects for dashboard tabs
    const list = [];
    (evaluator.subjects || []).forEach(sub => {
      list.push({ 
        _id: sub._id, 
        subCode: sub.subCode, 
        subName: sub.subName, 
        isGroupSubject: false,
        createdAt: sub.createdAt
      });
    });
    (evaluator.groupSubjects || []).forEach((gSub, idx) => {
      list.push({ 
        _id: `group-${gSub.replace(/\s+/g, '-')}`, 
        subCode: 'PEDAGOGY', 
        subName: gSub, 
        isGroupSubject: true 
      });
    });
    
    res.json(list);
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
      $or: [
        { evaluatorId },
        { subjectId: { $in: evaluator.subjects || [] } },
        { groupSubjectName: { $in: evaluator.groupSubjects || [] } }
      ],
      status: { $ne: 'Pending' } 
    })
      .populate({
        path: 'studentId',
        select: 'fullName regdNo collegeId courseId',
        populate: [
          { path: 'collegeId', select: 'collegeName collegeCode' },
          { path: 'courseId', select: 'courseName courseCode' }
        ]
      })
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

    const assignment = await Assignment.findById(assignmentId).populate('subjectId');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    // Validate that the evaluator is assigned to either the regular subject or the specific group pedagogy subject
    const assignmentSubjectId = assignment.subjectId?._id ? assignment.subjectId._id.toString() : (assignment.subjectId ? assignment.subjectId.toString() : '');
    const isAuthorized = evaluator.subjects.some(
      subId => subId.toString() === assignmentSubjectId
    ) || (assignment.groupSubjectName && (evaluator.groupSubjects || []).includes(assignment.groupSubjectName));

    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to grade this assignment' });
    }

    // Resolve maximum marks of that subject
    const maxMarks = assignment.maxMarks ?? assignment.subjectId?.maxMarks ?? 100;

    if (score === undefined || score === null || isNaN(Number(score))) {
      return res.status(400).json({ message: 'A valid score is required.' });
    }

    if (Number(score) > maxMarks) {
      return res.status(400).json({ message: `Score cannot exceed the maximum marks of ${maxMarks}.` });
    }

    if (Number(score) < 0) {
      return res.status(400).json({ message: 'Score cannot be negative.' });
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
