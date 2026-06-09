const express = require('express');
const router = express.Router();
const evaluatorController = require('../controllers/evaluatorController');
const activityController = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

// Middleware for evaluator routes
router.use(protect);

router.get('/subjects', evaluatorController.getAssignedSubjects);
router.get('/records', evaluatorController.getAssignedRecords);
router.post('/records/:assignmentId/grade', evaluatorController.gradeRecord);

// Activity Logs
router.get('/activities', activityController.getLogs);
router.post('/activities', activityController.logFrontendActivity);

module.exports = router;
