const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { College } = require('../models/MasterData');
const AppError = require('../utils/AppError');

exports.getPrincipalDashboardStats = async (collegeId, { courseId, semester }) => {
  if (!collegeId) {
    throw new AppError('No college associated with this Principal account.', 400);
  }

  const college = await College.findById(collegeId);
  if (!college) {
    throw new AppError('Associated college not found.', 404);
  }

  const studentQuery = { role: 'STUDENT', collegeId };
  if (courseId) studentQuery.courseId = courseId;
  if (semester) studentQuery.currentSemester = semester;

  const students = await User.find(studentQuery).select('_id');
  const studentIds = students.map(s => s._id);

  const assignmentQuery = { studentId: { $in: studentIds } };

  const totalStudents = students.length;
  const totalSubmitted = await Assignment.countDocuments({ ...assignmentQuery, status: 'Submitted' });
  const totalEvaluated = await Assignment.countDocuments({ ...assignmentQuery, status: 'Evaluated' });
  const totalPending = await Assignment.countDocuments({ ...assignmentQuery, status: 'Pending' });
  
  const uniquePendingStudentIds = await Assignment.distinct('studentId', { ...assignmentQuery, status: 'Pending' });
  const totalPendingStudents = uniquePendingStudentIds.length;

  const collegeStudentFilters = await User.find({ role: 'STUDENT', collegeId })
    .populate('courseId', 'courseCode courseName')
    .lean();

  const uniqueCourses = [];
  const courseIdsSeen = new Set();
  const uniqueSemesters = new Set();

  collegeStudentFilters.forEach(stud => {
    if (stud.courseId) {
      const cId = stud.courseId._id.toString();
      if (!courseIdsSeen.has(cId)) {
        courseIdsSeen.add(cId);
        uniqueCourses.push({
          _id: stud.courseId._id,
          courseCode: stud.courseId.courseCode,
          courseName: stud.courseId.courseName
        });
      }
    }
    if (stud.currentSemester) {
      uniqueSemesters.add(stud.currentSemester);
    }
  });

  const assignments = await Assignment.find(assignmentQuery)
    .populate('subjectId', 'subCode subName')
    .lean();

  const subjectProgressMap = {};

  assignments.forEach(asg => {
    let label = '';
    if (asg.subjectId) {
      label = asg.subjectId.subCode;
    } else if (asg.groupSubjectName) {
      label = asg.groupSubjectName;
    } else {
      label = 'Other';
    }

    if (!subjectProgressMap[label]) {
      subjectProgressMap[label] = {
        subjectLabel: label,
        submitted: 0,
        evaluated: 0,
        pending: 0
      };
    }

    if (asg.status === 'Submitted') subjectProgressMap[label].submitted++;
    else if (asg.status === 'Evaluated') subjectProgressMap[label].evaluated++;
    else if (asg.status === 'Pending') subjectProgressMap[label].pending++;
  });

  const subjectProgressData = Object.values(subjectProgressMap).sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel));

  return {
    college: {
      collegeCode: college.collegeCode,
      collegeName: college.collegeName
    },
    counts: {
      totalStudents,
      totalSubmitted,
      totalEvaluated,
      totalPending,
      totalPendingStudents,
      totalSheets: totalSubmitted + totalEvaluated + totalPending
    },
    filters: {
      courses: uniqueCourses.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
      semesters: Array.from(uniqueSemesters).sort((a, b) => a.localeCompare(b))
    },
    chartData: subjectProgressData
  };
};

exports.getPendingStudents = async (collegeId, { courseId, semester }) => {
  if (!collegeId) {
    throw new AppError('No college associated with this Principal account.', 400);
  }

  const studentQuery = { role: 'STUDENT', collegeId };
  if (courseId) studentQuery.courseId = courseId;
  if (semester) studentQuery.currentSemester = semester;

  const students = await User.find(studentQuery)
    .populate('courseId', 'courseCode courseName')
    .lean();

  const studentIds = students.map(s => s._id);

  const pendingAssignments = await Assignment.find({
    studentId: { $in: studentIds },
    status: 'Pending'
  })
    .populate('subjectId', 'subCode subName aliasName')
    .lean();

  const studentPendingMap = {};
  
  pendingAssignments.forEach(asg => {
    const sId = asg.studentId.toString();
    if (!studentPendingMap[sId]) {
      const student = students.find(s => s._id.toString() === sId);
      if (student) {
        studentPendingMap[sId] = {
          _id: student._id,
          fullName: student.fullName,
          regdNo: student.regdNo,
          courseId: student.courseId ? student.courseId._id : null,
          courseCode: student.courseId ? student.courseId.courseCode : 'N/A',
          courseName: student.courseId ? student.courseId.courseName : 'N/A',
          semester: student.currentSemester || 'N/A',
          pendingSubjects: []
        };
      }
    }
    
    if (studentPendingMap[sId]) {
      const subjectObj = {
        shortName: asg.subjectId ? (asg.subjectId.aliasName || asg.subjectId.subCode || asg.subjectId.subName) : (asg.groupSubjectName || 'Unknown'),
        fullName: asg.subjectId ? asg.subjectId.subName : (asg.groupSubjectName || 'Unknown Subject')
      };
      studentPendingMap[sId].pendingSubjects.push(subjectObj);
    }
  });

  const pendingStudentsList = Object.values(studentPendingMap).sort((a, b) => 
    (a.regdNo || '').localeCompare(b.regdNo || '')
  );

  return {
    success: true,
    data: pendingStudentsList
  };
};

exports.getCollegeRecords = async (collegeId) => {
  const students = await User.find({ role: 'STUDENT', collegeId }).select('_id');
  const studentIds = students.map(s => s._id);

  const assignments = await Assignment.find({
    studentId: { $in: studentIds },
    status: { $in: ['Submitted', 'Evaluated'] }
  })
    .populate('studentId', 'fullName regdNo currentSemester')
    .populate('subjectId', 'subCode subName maxMarks')
    .sort({ submittedAt: -1 })
    .lean();

  return assignments;
};

exports.suggestMarks = async (collegeId, assignmentId, suggestedMarks) => {
  const assignment = await Assignment.findById(assignmentId).populate('studentId');
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  if (assignment.studentId.collegeId.toString() !== collegeId.toString()) {
    throw new AppError('Not authorized to modify this assignment', 403);
  }

  assignment.suggestedMarks = suggestedMarks;
  await assignment.save();

  return assignment;
};
