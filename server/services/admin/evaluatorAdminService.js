const User = require('../../models/User');
const Assignment = require('../../models/Assignment');
const { Subject } = require('../../models/MasterData');
const emailService = require('../emailService');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');

exports.createEvaluator = async ({ fullName, email, password }) => {
  const existing = await User.findOne({ regdNo: email });
  if (existing) throw new AppError('Evaluator already exists', 400);

  const evaluator = await User.create({
    fullName, 
    regdNo: email, 
    password,
    plainPassword: password,
    role: 'EVALUATOR', 
    isSetupComplete: true
  });
  return { message: 'Evaluator created successfully', evaluator };
};

exports.assignSubjects = async ({ studentIds, subjectIds, pagesRequired, academicYear, deadline, mode, createdBy }) => {
  const students = await User.find({ _id: { $in: studentIds } }).populate('groupId');
  const subjects = await Subject.find({ _id: { $in: subjectIds } });

  const semesters = [...new Set(subjects.map(s => s.semester).filter(Boolean))];
  const allChoiceSubjects = await Subject.find({ 
    semester: { $in: semesters }, 
    studentChoice: { $in: ['C', 'c'] } 
  }).lean();
  allChoiceSubjects.sort((a, b) => a.subCode.localeCompare(b.subCode));
  
  const choiceFieldMap = {};
  allChoiceSubjects.forEach((sub, index) => {
    choiceFieldMap[sub._id.toString()] = index === 0 ? 'pedagogy1Name' : 'pedagogy2Name';
  });

  const evaluators = await User.find({
    role: 'EVALUATOR',
    subjects: { $in: subjectIds }
  }).lean();

  const subjectEvaluatorMap = {};
  evaluators.forEach(ev => {
    if (ev.subjects && Array.isArray(ev.subjects)) {
      ev.subjects.forEach(subId => {
        subjectEvaluatorMap[subId.toString()] = ev._id;
      });
    }
  });

  const studentAllocations = {}; 
  for (const student of students) {
    for (const subject of subjects) {
      let belongsToMe = true;
      let assignedGroupName = '';

      if (subject.studentChoice === 'C' || subject.studentChoice === 'c') { 
        const pedField = choiceFieldMap[subject._id.toString()];
        const pedName = student.groupId && pedField ? student.groupId[pedField] : null;
        if (!pedName || String(pedName).trim() === '') {
          belongsToMe = false;
        } else {
          assignedGroupName = String(pedName).trim();
        }
      }

      if (belongsToMe) {
        const evaluatorId = subjectEvaluatorMap[subject._id.toString()] || null;

        await Assignment.findOneAndUpdate(
          { studentId: student._id, subjectId: subject._id },
          { 
            pagesRequired, 
            academicYear: academicYear || '', 
            deadline, 
            createdBy, 
            status: 'Pending',
            groupSubjectName: assignedGroupName,
            maxMarks: subject.maxMarks || 0,
            evaluatorId,
            mode: mode || 'Regular'
          },
          { upsert: true, new: true }
        );

        const sIdStr = student._id.toString();
        if (!studentAllocations[sIdStr]) {
          studentAllocations[sIdStr] = [];
        }
        const displayName = assignedGroupName 
          ? `${subject.subName} (${assignedGroupName})` 
          : subject.subName;
        studentAllocations[sIdStr].push(displayName);
      }
    }
  }

  (async () => {
    try {
      for (const [studentId, subjectNames] of Object.entries(studentAllocations)) {
        if (subjectNames.length === 0) continue;
        const student = students.find(s => s._id.toString() === studentId);
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
      console.error('Failed to send student assignment notification emails:', emailErr.message);
    }
  })();
  
  return { message: 'Subjects assigned to students successfully with smart group filtering applied.' };
};

exports.assignToEvaluator = async ({ assignmentIds, evaluatorId }) => {
  await Assignment.updateMany(
    { _id: { $in: assignmentIds } },
    { $set: { evaluatorId } }
  );
  return { message: 'Assignments delegated to evaluator successfully' };
};

exports.assignSubjectsToEvaluator = async (id, { allocations, subjectIds, groupSubjects }) => {
  const evaluator = await User.findById(id);
  if (!evaluator) throw new AppError('Evaluator not found', 404);

  let finalSubjectIds = (evaluator.subjects || []).map(sid => sid.toString());
  let finalGroupSubjects = evaluator.groupSubjects || [];

  if (allocations && Array.isArray(allocations) && allocations.length > 0) {
    for (const allocation of allocations) {
      const { subjectId, groupSubjectName, splitMethod, collegeIds, rollStart, rollEnd, valuationDeadline } = allocation;
      
      if (subjectId) {
        finalSubjectIds.push(subjectId.toString());
      }
      if (groupSubjectName && groupSubjectName.trim() !== '') {
        finalGroupSubjects.push(groupSubjectName.trim());
      }

      const updateFields = {
        evaluatorId: id
      };
      if (valuationDeadline) {
        updateFields.valuationDeadline = new Date(valuationDeadline);
      } else {
        updateFields.valuationDeadline = null;
      }

      const assignmentQuery = {};
      if (subjectId) {
        assignmentQuery.subjectId = subjectId;
      } else if (groupSubjectName) {
        assignmentQuery.groupSubjectName = groupSubjectName;
      } else {
        continue;
      }

      if (splitMethod === 'COLLEGE' && collegeIds && collegeIds.length > 0) {
        const students = await User.find({ role: 'STUDENT', collegeId: { $in: collegeIds } }).select('_id');
        const studentIds = students.map(s => s._id);
        assignmentQuery.studentId = { $in: studentIds };
      } else if (splitMethod === 'RANGE') {
        const studentQuery = { role: 'STUDENT' };
        studentQuery.regdNo = {};
        if (rollStart) studentQuery.regdNo.$gte = rollStart.trim();
        if (rollEnd) studentQuery.regdNo.$lte = rollEnd.trim();

        const students = await User.find(studentQuery).select('_id');
        const studentIds = students.map(s => s._id);
        assignmentQuery.studentId = { $in: studentIds };
      }

      await Assignment.updateMany(
        assignmentQuery,
        { $set: updateFields }
      );
    }
  } else {
    if (subjectIds && subjectIds.length > 0) {
      finalSubjectIds = [...finalSubjectIds, ...subjectIds];
      await Assignment.updateMany(
        { subjectId: { $in: subjectIds } },
        { $set: { evaluatorId: id } }
      );
    }
    if (groupSubjects && groupSubjects.length > 0) {
      finalGroupSubjects = [...finalGroupSubjects, ...groupSubjects];
      await Assignment.updateMany(
        { groupSubjectName: { $in: groupSubjects } },
        { $set: { evaluatorId: id } }
      );
    }
  }

  evaluator.subjects = [...new Set(finalSubjectIds)];
  evaluator.groupSubjects = [...new Set(finalGroupSubjects)];
  
  await evaluator.save();
  await evaluator.populate('subjects');

  try {
    const allocatedRegularSubjects = await Subject.find({ _id: { $in: evaluator.subjects } }).lean();
    await emailService.sendEvaluatorAllocationEmail({
      to: evaluator.regdNo,
      evaluatorName: evaluator.fullName,
      password: evaluator.plainPassword || null,
      subjectList: allocatedRegularSubjects,
      groupSubjectList: evaluator.groupSubjects
    });
  } catch (emailErr) {
    console.error('Evaluator email notification failed:', emailErr.message);
  }

  return { message: 'Subjects assigned successfully', evaluator };
};
