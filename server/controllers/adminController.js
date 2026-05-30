const masterDataService = require('../services/admin/masterDataService');
const assignmentService = require('../services/admin/assignmentService');
const evaluatorAdminService = require('../services/admin/evaluatorAdminService');

// ── Master Data ────────────────────────────────────────────────────────────

exports.uploadMasterData = async (req, res) => {
  try {
    const result = await masterDataService.uploadMasterData({
      type: req.params.type,
      semester: req.body.semester,
      academicYear: req.body.academicYear,
      file: req.file
    });
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.createRecord = async (req, res) => {
  try {
    const result = await masterDataService.createRecord(req.params.type, req.body);
    res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.promoteStudents = async (req, res) => {
  try {
    const result = await masterDataService.promoteStudents(req.body);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const result = await masterDataService.updateRecord(req.params.type, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const result = await masterDataService.deleteRecord(req.params.type, req.params.id);
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
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.assignToEvaluator = async (req, res) => {
  try {
    const result = await evaluatorAdminService.assignToEvaluator(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.assignSubjectsToEvaluator = async (req, res) => {
  try {
    const result = await evaluatorAdminService.assignSubjectsToEvaluator(req.params.id, req.body);
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
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
