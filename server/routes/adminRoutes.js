const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Middleware for all admin routes
router.use(protect, adminOnly);

router.post('/bulk-upload/:type', upload.single('file'), adminController.uploadMasterData);

// Generic Single Record CRUD
router.post('/record/:type', adminController.createRecord);
router.put('/record/:type/:id', adminController.updateRecord);
router.delete('/record/:type/:id', adminController.deleteRecord);

// Data fetching
router.get('/students', adminController.getStudents);
router.get('/subjects', adminController.getSubjects);
router.get('/evaluators', adminController.getEvaluators);
router.get('/colleges', adminController.getColleges);
router.get('/groups', adminController.getGroups);
router.get('/subjectmaps', adminController.getSubjectMaps);
router.get('/courses', adminController.getCourses);
router.get('/papers', adminController.getPapers);
router.get('/semesters', adminController.getSemesters);

// Assignment specific data
router.get('/assignment-filters', adminController.getAssignmentFilters);
router.get('/assignment-data', adminController.getAssignmentData);

// Actions
router.get('/assignments', adminController.getAssignments);
router.post('/evaluators', adminController.createEvaluator);
router.post('/assign-subjects', adminController.assignSubjects);
router.post('/assign-evaluator', adminController.assignToEvaluator);

module.exports = router;
