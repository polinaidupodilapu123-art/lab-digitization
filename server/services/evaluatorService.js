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
      select: 'fullName regdNo collegeId courseId academicYear currentSemester',
      populate: [
        { path: 'collegeId', select: 'collegeName collegeCode' },
        { path: 'courseId', select: 'courseName courseCode' }
      ]
    })
    .populate('subjectId')
    .lean();

  const filteredRecords = records.filter(record => {
    if (record.mode === 'Supply') return true;
    if (!record.studentId || !record.subjectId) return false;
    return String(record.subjectId.semester) === String(record.studentId.currentSemester);
  });

  return filteredRecords;
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

  let diffMessages = [];
  if (assignment.status === 'Evaluated' && assignment.score !== score) {
    diffMessages.push(`score changed from '${assignment.score}' to '${score}'`);
  } else if (assignment.status !== 'Evaluated') {
    diffMessages.push(`Evaluated assignment with score '${score}'`);
  }
  
  if (assignment.feedback !== feedback) {
    diffMessages.push(`feedback changed`);
  }

  const diffString = diffMessages.length > 0 ? diffMessages.join(', ') : 'No visible fields changed';

  assignment.score = score;
  assignment.feedback = feedback;
  assignment.status = 'Evaluated';
  assignment.evaluatorId = evaluatorId;
  await assignment.save();

  return { message: 'Record graded successfully', assignment, diffString };
};
