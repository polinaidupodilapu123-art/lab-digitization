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

exports.assignSubjects = async ({ studentIds, subjectIds, pagesRequired, academicYear, deadline, suggestedMarksDeadline, mode, createdBy }) => {
  if (!suggestedMarksDeadline) {
    throw new AppError('Suggested Marks Deadline is required.', 400);
  }
  const students = await User.find({ _id: { $in: studentIds } }).populate('groupId');
  const subjects = await Subject.find({ _id: { $in: subjectIds } });

  const semesters = [...new Set(subjects.map(s => s.semester).filter(Boolean))];
  const allChoiceSubjects = await Subject.find({ 
    semester: { $in: semesters }, 
    studentChoice: { $in: ['C', 'c'] } 
  }).lean();
  allChoiceSubjects.sort((a, b) => a.subCode.localeCompare(b.subCode));
  
  const choiceIndexMap = {};
  allChoiceSubjects.forEach((sub, index) => {
    choiceIndexMap[sub._id.toString()] = index;
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
        const pedIndex = choiceIndexMap[subject._id.toString()];
        const pedName = student.groupId && student.groupId.subjects && student.groupId.subjects[pedIndex] 
                        ? student.groupId.subjects[pedIndex] 
                        : null;
        if (!pedName || String(pedName).trim() === '') {
          belongsToMe = false;
        } else {
          assignedGroupName = String(pedName).trim();
        }
      }

      if (belongsToMe) {
        const evaluatorId = subjectEvaluatorMap[subject._id.toString()] || null;

        await Assignment.findOneAndUpdate(
          { studentId: student._id, subjectId: subject._id, mode: mode || 'Regular' },
          { 
            $set: {
              pagesRequired, 
              academicYear: academicYear || '', 
              deadline, 
              createdBy, 
              status: 'Pending',
              groupSubjectName: assignedGroupName,
              maxMarks: subject.maxMarks || 0,
              evaluatorId,
              mode: mode || 'Regular',
              suggestedMarksDeadline: suggestedMarksDeadline ? new Date(suggestedMarksDeadline) : null
            },
            $unset: {
              filePath: 1,
              score: 1,
              feedback: 1,
              submittedAt: 1,
              studentNote: 1
            }
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

  const oldSubjectIds = (evaluator.subjects || []).map(sid => sid.toString());
  const oldGroupSubjects = [...(evaluator.groupSubjects || [])];

  let finalSubjectIds = [...oldSubjectIds];
  let finalGroupSubjects = [...oldGroupSubjects];

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

  const addedSubjects = finalSubjectIds.filter(id => !oldSubjectIds.includes(id));
  const addedGroupSubjects = finalGroupSubjects.filter(name => !oldGroupSubjects.includes(name));
  
  let diffMessages = [];
  if (addedSubjects.length > 0) diffMessages.push(`Added ${addedSubjects.length} regular subjects`);
  if (addedGroupSubjects.length > 0) diffMessages.push(`Added ${addedGroupSubjects.length} group subjects`);
  const diffString = diffMessages.length > 0 ? diffMessages.join(', ') : 'No subjects added';

  return { message: 'Subjects assigned successfully', evaluator, diffString };
};

exports.getSubjectsWithSubmissions = async (mode = 'Regular') => {
  const query = { status: { $ne: 'Pending' } };
  
  if (mode === 'Supply') {
    query.mode = 'Supply';
  } else {
    query.$or = [{ mode: 'Regular' }, { mode: { $exists: false } }, { mode: null }];
  }

  const assignments = await Assignment.find(query).select('subjectId groupSubjectName evaluatorId').lean();
  
  const subjectsSet = new Set();
  const groupSubjectsSet = new Set();
  
  const unallocatedSubjectsSet = new Set();
  const unallocatedGroupSubjectsSet = new Set();

  assignments.forEach(a => {
    if (a.subjectId) {
      subjectsSet.add(a.subjectId.toString());
      if (!a.evaluatorId) unallocatedSubjectsSet.add(a.subjectId.toString());
    }
    if (a.groupSubjectName) {
      groupSubjectsSet.add(a.groupSubjectName);
      if (!a.evaluatorId) unallocatedGroupSubjectsSet.add(a.groupSubjectName);
    }
  });

  const fullyAllocatedSubjectIds = Array.from(subjectsSet).filter(id => !unallocatedSubjectsSet.has(id));
  const fullyAllocatedGroupNames = Array.from(groupSubjectsSet).filter(name => !unallocatedGroupSubjectsSet.has(name));

  return {
    subjectIds: Array.from(subjectsSet),
    groupSubjectNames: Array.from(groupSubjectsSet),
    fullyAllocatedSubjectIds,
    fullyAllocatedGroupNames
  };
};

exports.getSubjectAllocationStats = async ({ subjectId, groupSubjectName, subjects, mode = 'Regular' }) => {
  let query = {};
  
  if (subjects) {
    let parsedSubjects = [];
    try {
      parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
    } catch(e) {}
    
    if (parsedSubjects.length > 0) {
      const orClauses = parsedSubjects.map(s => {
        if (s.subjectId) return { subjectId: s.subjectId };
        if (s.groupSubjectName) return { groupSubjectName: s.groupSubjectName };
        return null;
      }).filter(Boolean);
      if (orClauses.length > 0) query = { $or: orClauses };
    }
  } else if (subjectId) {
    query.subjectId = subjectId;
  } else if (groupSubjectName) {
    query.groupSubjectName = groupSubjectName;
  } else {
    throw new AppError('Subject is required', 400);
  }

  const submittedQuery = { ...query, status: { $ne: 'Pending' } };
  if (mode === 'Supply') {
    submittedQuery.mode = 'Supply';
  } else {
    submittedQuery.$or = [{ mode: 'Regular' }, { mode: { $exists: false } }, { mode: null }];
  }
  
  const total = await Assignment.countDocuments(submittedQuery);
  const unallocatedAssignments = await Assignment.find({ ...submittedQuery, evaluatorId: null })
    .populate('studentId', 'collegeId')
    .lean();
    
  const unallocated = unallocatedAssignments.length;
  const allocated = total - unallocated;

  const collegeCounts = {};
  unallocatedAssignments.forEach(a => {
    const colId = a.studentId?.collegeId?.toString();
    if (colId) {
      collegeCounts[colId] = (collegeCounts[colId] || 0) + 1;
    }
  });

  const allocatedAssignments = await Assignment.find({ ...submittedQuery, evaluatorId: { $ne: null } })
    .populate('evaluatorId', 'fullName regdNo _id')
    .lean();

  const evaluatorStatsMap = {};
  allocatedAssignments.forEach(a => {
    if (!a.evaluatorId) return;
    const evId = a.evaluatorId._id.toString();
    if (!evaluatorStatsMap[evId]) {
      evaluatorStatsMap[evId] = {
        _id: a.evaluatorId._id,
        fullName: a.evaluatorId.fullName,
        regdNo: a.evaluatorId.regdNo,
        count: 0
      };
    }
    evaluatorStatsMap[evId].count += 1;
  });

  return {
    total,
    allocated,
    unallocated,
    collegeCounts,
    evaluators: Object.values(evaluatorStatsMap)
  };
};

exports.allocateSubjectBulk = async ({ subjectId, groupSubjectName, subjects, evaluatorId, splitMethod, count, collegeIds, rollStart, rollEnd, valuationDeadline, mode = 'Regular' }) => {
  const evaluator = await User.findById(evaluatorId);
  if (!evaluator) throw new AppError('Evaluator not found', 404);

  let parsedSubjects = [];
  if (subjects) {
    parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
  } else if (subjectId) {
    parsedSubjects.push({ subjectId });
  } else if (groupSubjectName) {
    parsedSubjects.push({ groupSubjectName });
  } else {
    throw new AppError('Subject is required', 400);
  }

  let totalAllocated = 0;

  for (const s of parsedSubjects) {
    const query = { evaluatorId: null, status: { $ne: 'Pending' } };
    if (mode === 'Supply') {
      query.mode = 'Supply';
    } else {
      query.$or = [{ mode: 'Regular' }, { mode: { $exists: false } }, { mode: null }];
    }
    if (s.subjectId) query.subjectId = s.subjectId;
    else if (s.groupSubjectName) query.groupSubjectName = s.groupSubjectName;
    else continue;

    let assignmentsToUpdate = [];

    if (splitMethod === 'COUNT' && count > 0) {
      assignmentsToUpdate = await Assignment.find(query).limit(Number(count)).select('_id');
    } else if (splitMethod === 'COLLEGE' && collegeIds && collegeIds.length > 0) {
      const students = await User.find({ role: 'STUDENT', collegeId: { $in: collegeIds } }).select('_id');
      query.studentId = { $in: students.map(st => st._id) };
      assignmentsToUpdate = await Assignment.find(query).select('_id');
    } else if (splitMethod === 'RANGE') {
      const studentQuery = { role: 'STUDENT', regdNo: {} };
      if (rollStart) studentQuery.regdNo.$gte = rollStart.trim();
      if (rollEnd) studentQuery.regdNo.$lte = rollEnd.trim();
      const students = await User.find(studentQuery).select('_id');
      query.studentId = { $in: students.map(st => st._id) };
      assignmentsToUpdate = await Assignment.find(query).select('_id');
    } else if (splitMethod === 'ALL') {
      assignmentsToUpdate = await Assignment.find(query).select('_id');
    }

    if (assignmentsToUpdate.length > 0) {
      const ids = assignmentsToUpdate.map(a => a._id);
      const updateFields = { evaluatorId };
      if (valuationDeadline) updateFields.valuationDeadline = new Date(valuationDeadline);

      await Assignment.updateMany({ _id: { $in: ids } }, { $set: updateFields });
      totalAllocated += ids.length;

      if (s.subjectId && !(evaluator.subjects || []).includes(s.subjectId.toString())) {
        evaluator.subjects = [...(evaluator.subjects || []), s.subjectId];
      }
      if (s.groupSubjectName && !(evaluator.groupSubjects || []).includes(s.groupSubjectName)) {
        evaluator.groupSubjects = [...(evaluator.groupSubjects || []), s.groupSubjectName];
      }
    }
  }

  if (totalAllocated === 0) {
    throw new AppError('No unallocated assignments found matching the criteria for the selected subjects.', 400);
  }

  await evaluator.save();

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

  const diffString = `Allocated ${totalAllocated} assignments to ${evaluator.fullName}`;
  return { message: `Successfully allocated ${totalAllocated} assignments to evaluator.`, count: totalAllocated, diffString };
};

exports.reallocateEvaluator = async ({ assignmentId, newEvaluatorId, valuationDeadline }) => {
  if (!assignmentId) {
    throw new AppError('Assignment ID is required', 400);
  }

  if (!newEvaluatorId && !valuationDeadline) {
    throw new AppError('Must provide either a new evaluator or a new deadline', 400);
  }

  const assignment = await Assignment.findById(assignmentId).populate('subjectId evaluatorId');
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  if (assignment.status === 'Evaluated') {
    throw new AppError('Cannot re-allocate an assignment that is already evaluated', 400);
  }

  let diffMessages = [];
  
  let subjectsUpdated = false;
  let newEvaluator = null;

  if (newEvaluatorId) {
    newEvaluator = await User.findById(newEvaluatorId);
    
    if (!newEvaluator || newEvaluator.role !== 'EVALUATOR') {
      throw new AppError('Invalid new evaluator selected', 400);
    }
    
    if (String(assignment.evaluatorId?._id) !== String(newEvaluatorId)) {
      const oldEvName = assignment.evaluatorId ? assignment.evaluatorId.fullName : 'None';
      diffMessages.push(`Evaluator changed from '${oldEvName}' to '${newEvaluator.fullName}'`);
    }

    assignment.evaluatorId = newEvaluatorId;

    // Add subject to evaluator's profile if not present
    if (assignment.subjectId) {
      const subId = assignment.subjectId._id || assignment.subjectId;
      if (!(newEvaluator.subjects || []).includes(subId.toString())) {
        newEvaluator.subjects = [...(newEvaluator.subjects || []), subId];
        subjectsUpdated = true;
      }
    } else if (assignment.groupSubjectName) {
      if (!(newEvaluator.groupSubjects || []).includes(assignment.groupSubjectName)) {
        newEvaluator.groupSubjects = [...(newEvaluator.groupSubjects || []), assignment.groupSubjectName];
        subjectsUpdated = true;
      }
    }
  }

  if (valuationDeadline) {
    const oldDate = assignment.valuationDeadline ? new Date(assignment.valuationDeadline).toISOString().split('T')[0] : 'None';
    const newDate = new Date(valuationDeadline).toISOString().split('T')[0];
    if (oldDate !== newDate) {
      diffMessages.push(`Deadline changed from '${oldDate}' to '${newDate}'`);
    }
    assignment.valuationDeadline = new Date(valuationDeadline);
  }
  
  const diffString = diffMessages.length > 0 ? diffMessages.join(', ') : 'No visible fields changed';
  
  await assignment.save();
  if (subjectsUpdated && newEvaluator) {
    await newEvaluator.save();
  }

  try {
    if (newEvaluator) {
      let allocatedRegularSubjects = [];
      if (newEvaluator.subjects && newEvaluator.subjects.length > 0) {
        allocatedRegularSubjects = await Subject.find({ _id: { $in: newEvaluator.subjects } }).lean();
      }
      
      await emailService.sendEvaluatorAllocationEmail({
        to: newEvaluator.regdNo, // Using regdNo as email for evaluators in this system
        evaluatorName: newEvaluator.fullName,
        password: null, // Don't send password for reallocation
        subjectList: allocatedRegularSubjects,
        groupSubjectList: newEvaluator.groupSubjects || []
      });
    }
  } catch (emailErr) {
    console.error('Evaluator email notification failed:', emailErr.message);
  }

  return { message: 'Re-allocation successful', assignment, diffString };
};
