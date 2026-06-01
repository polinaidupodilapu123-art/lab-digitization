const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Middleware for all admin routes
router.use(protect, adminOnly);

router.post('/bulk-upload/:type', upload.single('file'), adminController.uploadMasterData);
router.post('/students/promote', adminController.promoteStudents);
router.post('/record/:type', adminController.createRecord);
router.put('/record/:type/:id', adminController.updateRecord);
router.delete('/record/:type/:id', adminController.deleteRecord);
router.post('/reallocate-evaluator', adminController.reallocateEvaluator);

// Data fetching
router.get('/students', adminController.getStudents);
router.get('/subjects', adminController.getSubjects);
router.get('/evaluators', adminController.getEvaluators);
router.get('/principals', adminController.getPrincipals);
router.get('/colleges', adminController.getColleges);
router.get('/groups', adminController.getGroups);
router.get('/subjectmaps', adminController.getSubjectMaps);
router.get('/courses', adminController.getCourses);
router.get('/papers', adminController.getPapers);
router.get('/semesters', adminController.getSemesters);
router.get('/group-subjects', adminController.getUniqueGroupSubjects);

// Assignment specific data
router.get('/assignment-filters', adminController.getAssignmentFilters);
router.get('/assignment-data', adminController.getAssignmentData);

// Actions
router.get('/assignments', adminController.getAssignments);
router.post('/evaluators', adminController.createEvaluator);
router.post('/evaluators/:id/subjects', adminController.assignSubjectsToEvaluator);
router.post('/assign-subjects', adminController.assignSubjects);
router.post('/assign-evaluator', adminController.assignToEvaluator);

router.get('/subject-allocation-stats', adminController.getSubjectAllocationStats);
router.get('/subjects-with-submissions', adminController.getSubjectsWithSubmissions);
router.post('/allocate-subject-bulk', adminController.allocateSubjectBulk);

router.get('/backlog-candidates', adminController.getBacklogCandidates);
router.post('/bulk-assign-backlogs', adminController.bulkAssignBacklogs);
router.get('/session-logs/summary', adminController.getSessionLogSummary);
router.get('/session-logs', adminController.getSessionLogs);
module.exports = router;
