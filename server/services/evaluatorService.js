const Assignment = require('../models/Assignment');
const User = require('../models/User');
const AppError = require('../utils/AppError');

exports.getAssignedSubjects = async (evaluatorId) => {
  const evaluator = await User.findById(evaluatorId).populate('subjects').lean();
  if (!evaluator) throw new AppError('Evaluator not found', 404);
  
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
  
  return list;
};

exports.getAssignedRecords = async (evaluatorId) => {
  const evaluator = await User.findById(evaluatorId);
  if (!evaluator) throw new AppError('Evaluator not found', 404);

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
      select: 'fullName regdNo collegeId courseId academicYear',
      populate: [
        { path: 'collegeId', select: 'collegeName collegeCode' },
        { path: 'courseId', select: 'courseName courseCode' }
      ]
    })
    .populate('subjectId')
    .lean();

  return records;
};

exports.gradeRecord = async ({ assignmentId, score, feedback, evaluatorId }) => {
  const evaluator = await User.findById(evaluatorId);
  if (!evaluator) throw new AppError('Evaluator not found', 404);

  const assignment = await Assignment.findById(assignmentId).populate('subjectId');
  if (!assignment) throw new AppError('Assignment not found', 404);

  const assignmentSubjectId = assignment.subjectId?._id ? assignment.subjectId._id.toString() : (assignment.subjectId ? assignment.subjectId.toString() : '');
  const isAuthorized = evaluator.subjects.some(
    subId => subId.toString() === assignmentSubjectId
  ) || (assignment.groupSubjectName && (evaluator.groupSubjects || []).includes(assignment.groupSubjectName));

  if (!isAuthorized) {
    throw new AppError('You are not authorized to grade this assignment', 403);
  }

  const maxMarks = assignment.maxMarks ?? assignment.subjectId?.maxMarks ?? 100;

  if (score === undefined || score === null || isNaN(Number(score))) {
    throw new AppError('A valid score is required.', 400);
  }

  if (Number(score) > maxMarks) {
    throw new AppError(`Score cannot exceed the maximum marks of ${maxMarks}.`, 400);
  }

  if (Number(score) < 0) {
    throw new AppError('Score cannot be negative.', 400);
  }

  assignment.score = score;
  assignment.feedback = feedback;
  assignment.status = 'Evaluated';
  assignment.evaluatorId = evaluatorId;
  await assignment.save();

  return { message: 'Record graded successfully', assignment };
};
