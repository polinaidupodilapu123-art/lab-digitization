const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { College } = require('../models/MasterData');
const AppError = require('../utils/AppError');
const RejectionLog = require('../models/RejectionLog');
const emailService = require('./emailService');

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

  const students = await User.find(studentQuery).select('_id currentSemester');
  const studentIds = students.map(s => s._id);
  const studentMap = {};
  students.forEach(s => {
    studentMap[s._id.toString()] = s.currentSemester;
  });

  const assignmentQuery = { studentId: { $in: studentIds } };

  const totalStudents = students.length;

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
    .populate('subjectId', 'subCode subName createdAt semester')
    .lean();

  const filteredAssignments = assignments.filter(asg => {
    if (asg.mode === 'Supply') return true;
    const sId = asg.studentId.toString();
    const currSem = studentMap[sId];
    return asg.subjectId && String(asg.subjectId.semester) === String(currSem);
  });

  const subjectProgressMap = {};
  let totalSubmitted = 0, totalEvaluated = 0, totalPending = 0;
  const uniquePendingStudentIds = new Set();

  filteredAssignments.forEach(asg => {
    let label = '';
    let sortVal = 0;
    
    if (asg.groupSubjectName) {
      label = asg.groupSubjectName;
      sortVal = asg.subjectId ? new Date(asg.subjectId.createdAt || 0).getTime() : 0;
    } else if (asg.subjectId) {
      label = asg.subjectId.subName || asg.subjectId.subCode;
      sortVal = new Date(asg.subjectId.createdAt || 0).getTime();
    } else {
      label = 'Other';
    }

    if (!subjectProgressMap[label]) {
      subjectProgressMap[label] = {
        subjectLabel: label,
        sortVal: sortVal,
        submitted: 0,
        evaluated: 0,
        pending: 0
      };
    }

    if (asg.status === 'Submitted') {
      subjectProgressMap[label].submitted++;
      totalSubmitted++;
    } else if (asg.status === 'Evaluated') {
      subjectProgressMap[label].evaluated++;
      totalEvaluated++;
    } else if (asg.status === 'Pending') {
      subjectProgressMap[label].pending++;
      totalPending++;
      uniquePendingStudentIds.add(asg.studentId.toString());
    }
  });

  const totalPendingStudents = uniquePendingStudentIds.size;

  const subjectProgressData = Object.values(subjectProgressMap).sort((a, b) => {
    if (a.sortVal !== b.sortVal) return b.sortVal - a.sortVal;
    return a.subjectLabel.localeCompare(b.subjectLabel);
  });

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
    .populate('subjectId', 'subCode subName aliasName createdAt semester')
    .lean();

  const studentPendingMap = {};
  
  pendingAssignments.forEach(asg => {
    const sId = asg.studentId.toString();
    const student = students.find(s => s._id.toString() === sId);
    if (!student) return;

    if (asg.mode !== 'Supply') {
      if (!asg.subjectId || String(asg.subjectId.semester) !== String(student.currentSemester)) {
        return;
      }
    }

    if (!studentPendingMap[sId]) {
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

    if (studentPendingMap[sId]) {
      const subjectObj = {
        shortName: asg.groupSubjectName || (asg.subjectId ? (asg.subjectId.aliasName || asg.subjectId.subName || asg.subjectId.subCode) : 'Unknown'),
        fullName: asg.groupSubjectName || (asg.subjectId ? asg.subjectId.subName : 'Unknown Subject'),
        sortVal: asg.subjectId ? new Date(asg.subjectId.createdAt || 0).getTime() : 0
      };
      studentPendingMap[sId].pendingSubjects.push(subjectObj);
    }
  });

  // Sort each student's pending subjects
  Object.values(studentPendingMap).forEach(student => {
    student.pendingSubjects.sort((a, b) => {
      if (a.sortVal !== b.sortVal) return b.sortVal - a.sortVal;
      return a.fullName.localeCompare(b.fullName);
    });
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
    .populate('subjectId', 'subCode subName maxMarks semester')
    .sort({ submittedAt: -1 })
    .lean();

  const filteredAssignments = assignments.filter(asg => {
    if (asg.mode === 'Supply') return true;
    if (!asg.studentId || !asg.subjectId) return false;
    return String(asg.subjectId.semester) === String(asg.studentId.currentSemester);
  });

  return filteredAssignments;
};

exports.suggestMarks = async (collegeId, assignmentId, suggestedMarks) => {
  const assignment = await Assignment.findById(assignmentId).populate('studentId');
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  if (assignment.studentId.collegeId.toString() !== collegeId.toString()) {
    throw new AppError('Not authorized to modify this assignment', 403);
  }

  if (assignment.suggestedMarksDeadline) {
    const deadlineDate = new Date(assignment.suggestedMarksDeadline);
    // Extend deadline to the very end of the selected day (23:59:59.999)
    deadlineDate.setHours(23, 59, 59, 999);
    if (new Date() > deadlineDate) {
      throw new AppError('The deadline to suggest marks has passed.', 400);
    }
  }

  assignment.suggestedMarks = suggestedMarks;
  await assignment.save();

  return assignment;
};

exports.getPendingApprovals = async (collegeId) => {
  if (!collegeId) {
    throw new AppError('No college associated with this Principal account.', 400);
  }
  const students = await User.find({
    role: 'STUDENT',
    collegeId,
    $or: [
      { isSetupComplete: true },
      { approvalStatus: { $in: ['APPROVED', 'REJECTED'] } }
    ]
  })
  .populate('courseId', 'courseCode courseName')
  .select('regdNo fullName email profileImage currentSemester academicYear courseId approvalStatus isApproved createdAt updatedAt')
  .lean();

  return students;
};

exports.approveStudent = async (collegeId, studentId, note) => {
  const student = await User.findById(studentId);
  if (!student) {
    throw new AppError('Student not found.', 404);
  }
  if (student.collegeId.toString() !== collegeId.toString()) {
    throw new AppError('Not authorized. Student belongs to another college.', 403);
  }
  
  student.isApproved = true;
  student.approvalStatus = 'APPROVED';
  await student.save();

  // Send status email
  if (student.email) {
    emailService.sendStudentRegistrationStatusEmail({
      to: student.email,
      studentName: student.fullName,
      status: 'APPROVED',
      note: note
    }).catch(err => console.error('Failed to send student approval email:', err));
  }

  return student;
};

exports.rejectStudent = async (collegeId, studentId, rejectedByUserId, note) => {
  const student = await User.findById(studentId);
  if (!student) {
    throw new AppError('Student not found.', 404);
  }
  if (student.collegeId.toString() !== collegeId.toString()) {
    throw new AppError('Not authorized. Student belongs to another college.', 403);
  }

  // Store the rejected data in RejectionLog
  await RejectionLog.create({
    userId: student._id,
    regdNo: student.regdNo,
    fullName: student.fullName,
    role: student.role,
    collegeId: student.collegeId,
    profileImage: student.profileImage,
    rejectedBy: rejectedByUserId,
    reason: note || 'Please register with your own face.'
  });

  // Reset student registration/setup so they can register again
  student.isSetupComplete = false;
  student.faceDescriptor = [];
  student.profileImage = null;
  student.isApproved = false;
  student.approvalStatus = 'REJECTED';
  student.password = undefined; // clear password
  await student.save();

  // Send status email
  if (student.email) {
    emailService.sendStudentRegistrationStatusEmail({
      to: student.email,
      studentName: student.fullName,
      status: 'REJECTED',
      note: note
    }).catch(err => console.error('Failed to send student rejection email:', err));
  }

  return { message: 'Student registration rejected and reset successfully.' };
};
