const masterDataService = require('../services/admin/masterDataService');
const assignmentService = require('../services/admin/assignmentService');
const evaluatorAdminService = require('../services/admin/evaluatorAdminService');
const activityLogService = require('../services/admin/activityLogService');

// ── Master Data ────────────────────────────────────────────────────────────

exports.uploadMasterData = async (req, res) => {
  try {
    const result = await masterDataService.uploadMasterData({
      type: req.params.type,
      semester: req.body.semester,
      academicYear: req.body.academicYear,
      file: req.file
    });

    // We do fire-and-forget logging here to not block the request
    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'CREATE_MASTER_DATA',
      entityType: 'MasterData',
      details: { type: req.params.type, description: `Uploaded multiple ${req.params.type}s via Excel` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.createRecord = async (req, res) => {
  try {
    const result = await masterDataService.createRecord(req.params.type, req.body);
    
    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'CREATE_MASTER_DATA',
      entityId: result.record?._id,
      entityType: 'MasterData',
      details: { type: req.params.type, ...req.body }
    });

    res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.promoteStudents = async (req, res) => {
  try {
    const result = await masterDataService.promoteStudents(req.body);
    
    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'UPDATE_MASTER_DATA',
      entityType: 'MasterData',
      details: { type: 'students', description: `Promoted students from Semester ${req.body.currentSemester} to Semester ${req.body.promoteToSemester}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const result = await masterDataService.updateRecord(req.params.type, req.params.id, req.body);
    
    const recordName = result.fullName || result.collegeName || result.subName || result.paperName || result.courseName || result.groupName || 'record';

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'UPDATE_MASTER_DATA',
      entityId: req.params.id,
      entityType: 'MasterData',
      details: { type: req.params.type, description: `Updated ${req.params.type} ${recordName} - ${result.diffString}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const result = await masterDataService.deleteRecord(req.params.type, req.params.id);
    
    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'DELETE_MASTER_DATA',
      entityId: req.params.id,
      entityType: 'MasterData',
      details: { type: req.params.type, description: `Deleted ${req.params.type} record` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const result = await masterDataService.getStudents();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getSubjectMaps = async (req, res) => {
  try {
    const result = await masterDataService.getSubjectMaps();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const result = await masterDataService.getSubjects();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getEvaluators = async (req, res) => {
  try {
    const result = await masterDataService.getEvaluators();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getPrincipals = async (req, res) => {
  try {
    const result = await masterDataService.getPrincipals();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getColleges = async (req, res) => {
  try {
    const result = await masterDataService.getColleges();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const result = await masterDataService.getGroups();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const result = await masterDataService.getCourses();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getPapers = async (req, res) => {
  try {
    const result = await masterDataService.getPapers();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getSemesters = async (req, res) => {
  try {
    const result = await masterDataService.getSemesters();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getUniqueGroupSubjects = async (req, res) => {
  try {
    const result = await masterDataService.getUniqueGroupSubjects();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// ── Evaluator Admin ─────────────────────────────────────────────────────────

exports.createEvaluator = async (req, res) => {
  try {
    const result = await evaluatorAdminService.createEvaluator(req.body);
    
    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'CREATE_MASTER_DATA',
      entityType: 'MasterData',
      details: { type: 'evaluators', description: `Created evaluator: ${req.body.fullName}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.assignSubjects = async (req, res) => {
  try {
    const result = await evaluatorAdminService.assignSubjects({
      ...req.body,
      createdBy: req.user._id
    });

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'CREATE_ASSIGNMENT',
      entityType: 'Assignment',
      details: { description: `Assigned ${req.body.subjectIds?.length || 0} subjects to ${req.body.studentIds?.length || 0} students.` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.assignToEvaluator = async (req, res) => {
  try {
    const result = await evaluatorAdminService.assignToEvaluator(req.body);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'ALLOCATE_EVALUATOR',
      entityType: 'Assignment',
      details: { description: `Allocated assignments to evaluator: ${req.body.evaluatorId}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.assignSubjectsToEvaluator = async (req, res) => {
  try {
    const result = await evaluatorAdminService.assignSubjectsToEvaluator(req.params.id, req.body);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'ALLOCATE_EVALUATOR',
      details: { description: `Assigned subjects to evaluator: ${req.params.id} - ${result.diffString}` }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.reallocateEvaluator = async (req, res) => {
  try {
    const result = await evaluatorAdminService.reallocateEvaluator(req.body);

    const assignment = result.assignment || {};
    const subjectName = assignment.groupSubjectName || assignment.subjectId?.subName || req.body.assignmentId;

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: req.body.newEvaluatorId ? 'REALLOCATE_EVALUATOR' : 'EXTEND_DEADLINE',
      entityId: req.body.assignmentId,
      entityType: 'Assignment',
      details: { 
        ...req.body, 
        description: req.body.newEvaluatorId 
          ? `Reallocated assignment (${subjectName}) - ${result.diffString}` 
          : `Extended deadline for assignment (${subjectName}) - ${result.diffString}` 
      }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getSubjectAllocationStats = async (req, res) => {
  try {
    const result = await evaluatorAdminService.getSubjectAllocationStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getSubjectsWithSubmissions = async (req, res) => {
  try {
    const result = await evaluatorAdminService.getSubjectsWithSubmissions(req.query.mode);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.allocateSubjectBulk = async (req, res) => {
  try {
    const result = await evaluatorAdminService.allocateSubjectBulk(req.body);

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'ALLOCATE_EVALUATOR',
      details: { ...req.body, countAllocated: result.count, description: result.diffString }
    }).catch(err => console.error("Activity logging failed:", err));

    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// ── Assignments ──────────────────────────────────────────────────────────────

exports.getAssignmentFilters = async (req, res) => {
  try {
    const result = await assignmentService.getAssignmentFilters();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getAssignmentData = async (req, res) => {
  try {
    const result = await assignmentService.getAssignmentData(req.query);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const result = await assignmentService.getAssignments();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getPaperGrades = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user?._id;
    const result = await assignmentService.getPaperGrades(studentId);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getBacklogCandidates = async (req, res) => {
  try {
    const result = await assignmentService.getBacklogCandidates();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.bulkAssignBacklogs = async (req, res) => {
  try {
    const result = await assignmentService.bulkAssignBacklogs({
      ...req.body,
      createdBy: req.user ? req.user._id : null
    });

    if (req.user) {
      activityLogService.logActivity({
        userId: req.user._id,
        userRole: req.user.role,
        actionType: 'CREATE_ASSIGNMENT',
        entityType: 'Assignment',
        details: { description: `Assigned backlogs to students` }
      }).catch(err => console.error("Activity logging failed:", err));
    }

    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getSessionLogs = async (req, res) => {
  try {
    const SessionLog = require('../models/SessionLog');
    const logs = await SessionLog.find()
      .populate({
        path: 'userId',
        select: 'fullName role email regdNo collegeId',
        populate: { path: 'collegeId', select: 'collegeName collegeCode' }
      })
      .sort({ loginTime: -1 })
      .lean();
    res.json(logs);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getSessionLogSummary = async (req, res) => {
  try {
    const SessionLog = require('../models/SessionLog');
    
    const summary = await SessionLog.aggregate([
      {
        $group: {
          _id: "$userId",
          totalLogins: { $sum: 1 },
          totalDurationSeconds: { $sum: { $ifNull: ["$durationSeconds", 0] } },
          lastLoginTime: { $max: "$loginTime" }
        }
      }
    ]);

    const User = require('../models/User');
    const populatedSummary = await User.populate(summary, {
      path: '_id',
      select: 'fullName role email regdNo collegeId',
      populate: { path: 'collegeId', select: 'collegeName collegeCode' }
    });

    res.json(populatedSummary);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.updateCollegePasswords = async (req, res) => {
  try {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    // Default logic: set to 'password123' if no password is provided in body, or what's in req.body.password
    const newPassword = req.body.password || 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const result = await User.updateMany(
      { role: 'PRINCIPAL' },
      { 
        $set: { 
          password: hashedPassword,
          isSetupComplete: false
        } 
      }
    );

    activityLogService.logActivity({
      userId: req.user._id,
      userRole: req.user.role,
      actionType: 'UPDATE_MASTER_DATA',
      entityType: 'User',
      details: { description: `Reset all college passwords to a default.` }
    }).catch(err => console.error("Activity logging failed:", err));
    
    res.json({ message: `Successfully updated passwords for ${result.modifiedCount} colleges.` });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
