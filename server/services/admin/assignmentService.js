const Assignment = require('../../models/Assignment');
const User = require('../../models/User');
const { College, Course, Subject, Group } = require('../../models/MasterData');
const Paper = require('../../models/Paper');
const emailService = require('../emailService');
const AppError = require('../../utils/AppError');

exports.getAssignmentFilters = async () => {
  const colleges = await College.find().select('collegeCode collegeName');
  const courses = await Course.find().select('courseCode courseName');
  const semesters = await Subject.distinct('semester');
  const groups = await Group.find().select('groupCode groupName');
  
  return { colleges, courses, semesters: semesters.filter(Boolean), groups };
};

exports.getAssignmentData = async ({ collegeCode, courseCode, semester, groupCode }) => {
  let students = [];
  let subjects = [];

  const studentQuery = { role: 'STUDENT' };
  let shouldFetchStudents = false;

  if (collegeCode) {
    const college = await College.findOne({ collegeCode });
    if (college) studentQuery.collegeId = college._id;
    shouldFetchStudents = true;
  }

  if (courseCode || groupCode) {
    const groupQuery = {};
    if (groupCode) groupQuery.groupCode = groupCode;
    if (courseCode) {
      const course = await Course.findOne({ courseCode });
      if (course) groupQuery.courseId = course._id;
    }
    const groups = await Group.find(groupQuery);
    if (groups.length > 0) {
      studentQuery.groupId = { $in: groups.map(g => g._id) };
    } else {
      studentQuery.groupId = null;
    }
    shouldFetchStudents = true;
  }

  if (semester) {
    studentQuery.currentSemester = semester;
    shouldFetchStudents = true;
  }

  if (shouldFetchStudents) {
    students = await User.find(studentQuery).select('fullName regdNo _id groupId currentSemester').populate('groupId');
  }

  if (semester) {
    subjects = await Subject.find({ semester }).sort({ createdAt: -1 }).lean();
  } else {
    subjects = [];
  }
  
  const uniqueGroups = new Map();
  students.forEach(s => {
    if (s.groupId) {
      uniqueGroups.set(s.groupId._id.toString(), s.groupId);
    }
  });

  const displaySubjects = [];
  
  const regularSubjects = subjects.filter(s => s.studentChoice !== 'C' && s.studentChoice !== 'c');
  const choiceSubjects = subjects.filter(s => s.studentChoice === 'C' || s.studentChoice === 'c');
  choiceSubjects.sort((a, b) => a.subCode.localeCompare(b.subCode));
  
  for (const sub of regularSubjects) {
    displaySubjects.push({ ...sub, isGroupSubject: false });
  }
  
  for (let i = 0; i < choiceSubjects.length; i++) {
    const sub = choiceSubjects[i];
    const pedField = i === 0 ? 'pedagogy1Name' : 'pedagogy2Name';
    
    if (groupCode && uniqueGroups.size > 0) {
      let pedagogyNames = [];
      for (const [id, group] of uniqueGroups) {
        if (group[pedField]) pedagogyNames.push(group[pedField]);
      }
      pedagogyNames = [...new Set(pedagogyNames)];
      
      displaySubjects.push({
        ...sub,
        subName: pedagogyNames.length > 0 ? pedagogyNames.join(' / ') : sub.subName,
        isGroupSubject: true
      });
    } else {
      displaySubjects.push({
        ...sub,
        isGroupSubject: true
      });
    }
  }

  return { students, subjects: displaySubjects };
};

exports.getAssignments = async () => {
  return await Assignment.find()
    .populate({
      path: 'studentId',
      select: 'fullName regdNo currentSemester collegeId courseId',
      populate: [
        { path: 'collegeId', select: 'collegeName' },
        { path: 'courseId', select: 'courseName' }
      ]
    })
    .populate('subjectId', 'subName subCode type semester maxMarks subPassMarks')
    .populate('evaluatorId', 'fullName')
    .sort({ createdAt: -1 });
};

exports.getPaperGrades = async (studentId) => {
  if (!studentId) {
    throw new AppError('Student ID is required.', 400);
  }

  const papers = await Paper.find().populate('subjectIds').lean();
  const assignments = await Assignment.find({ studentId }).lean();

  const assignmentMap = new Map(
    assignments.map(a => [a.subjectId.toString(), a])
  );

  const paperGrades = papers.map(paper => {
    let obtainedScore = 0;
    let paperMaxMarks = 0;
    let evaluatedCount = 0;
    let totalSubjectsCount = paper.subjectIds?.length || 0;
    const subjectsList = [];

    (paper.subjectIds || []).forEach(sub => {
      const assignment = assignmentMap.get(sub._id.toString());
      paperMaxMarks += sub.maxMarks || 0;

      if (assignment && assignment.status === 'Evaluated') {
        obtainedScore += assignment.score || 0;
        evaluatedCount++;
        subjectsList.push({
          subCode: sub.subCode,
          subName: sub.subName,
          score: assignment.score,
          maxMarks: sub.maxMarks,
          status: 'Evaluated'
        });
      } else {
        subjectsList.push({
          subCode: sub.subCode,
          subName: sub.subName,
          score: null,
          maxMarks: sub.maxMarks,
          status: assignment ? assignment.status : 'Not Assigned'
        });
      }
    });

    let paperStatus = 'Pending';
    if (totalSubjectsCount > 0) {
      if (evaluatedCount === totalSubjectsCount) paperStatus = 'Evaluated';
      else if (evaluatedCount > 0) paperStatus = 'Partially Evaluated';
    }

    return {
      paperCode: paper.paperCode,
      paperName: paper.paperName,
      semester: paper.semester,
      passMarks: paper.passMarks || 0,
      maxMarks: paperMaxMarks,
      obtainedScore: evaluatedCount > 0 ? obtainedScore : null,
      status: paperStatus,
      subjects: subjectsList
    };
  });

  return paperGrades;
};

exports.getBacklogCandidates = async () => {
  const students = await User.find({ role: 'STUDENT' }).lean();
  const subjects = await Subject.find().lean();
  const candidates = [];

  for (const student of students) {
    const currentSem = student.currentSemester;
    if (!currentSem) continue;
    const semMatch = currentSem.match(/(\d+)/);
    if (!semMatch) continue;
    const currentNum = parseInt(semMatch[1], 10);
    const priorSemesters = [];
    for (let i = 1; i < currentNum; i++) priorSemesters.push(`Semester ${i}`);
    
    const priorSubjects = subjects.filter(s => priorSemesters.includes(s.semester));
    for (const sub of priorSubjects) {
      const assignment = await Assignment.findOne({ studentId: student._id, subjectId: sub._id }).lean();
      if (!assignment) {
        candidates.push({ studentId: student, subjectId: sub, reason: 'Missed', score: null });
      } else if (assignment.status === 'Evaluated') {
        const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
        if (assignment.score < passMark) {
          candidates.push({ studentId: student, subjectId: sub, reason: 'Failed', score: assignment.score });
        }
      }
    }
  }
  return candidates;
};

exports.bulkAssignBacklogs = async ({ candidates, pagesRequired, academicYear, deadline, createdBy }) => {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new AppError('No candidates provided', 400);
  }

  const uniqueStudentIds = [...new Set(candidates.map(c => c.studentId))];
  const uniqueSubjectIds = [...new Set(candidates.map(c => c.subjectId))];

  const students = await User.find({ _id: { $in: uniqueStudentIds } }).lean();
  const subjects = await Subject.find({ _id: { $in: uniqueSubjectIds } }).lean();

  const studentMap = {};
  students.forEach(s => { studentMap[s._id.toString()] = s; });

  const subjectMap = {};
  subjects.forEach(s => { subjectMap[s._id.toString()] = s; });

  const studentAllocations = {}; 

  for (const c of candidates) {
    const { studentId, subjectId } = c;
    await Assignment.findOneAndUpdate(
      { studentId, subjectId },
      {
        pagesRequired,
        academicYear: academicYear || '',
        deadline,
        createdBy,
        status: 'Pending',
        mode: 'Supply',
        evaluatorId: null,
        score: null,
        feedback: null
      },
      { upsert: true, new: true }
    );

    const sIdStr = studentId.toString();
    const subIdStr = subjectId.toString();
    const student = studentMap[sIdStr];
    const subject = subjectMap[subIdStr];
    if (student && subject) {
      if (!studentAllocations[sIdStr]) {
        studentAllocations[sIdStr] = [];
      }
      studentAllocations[sIdStr].push(subject.subName);
    }
  }

  (async () => {
    try {
      for (const [studentId, subjectNames] of Object.entries(studentAllocations)) {
        if (subjectNames.length === 0) continue;
        const student = studentMap[studentId];
        if (student && student.email && student.email.trim() !== '') {
          await emailService.sendStudentAssignmentNotificationEmail({
            to: student.email.trim(),
            studentName: student.fullName,
            subjectNames,
            deadline
          });
        }
      }
    } catch (emailErr) {
      console.error('Failed to send student backlog assignment notification emails:', emailErr.message);
    }
  })();

  return { message: 'Backlog assignments created/updated successfully' };
};
