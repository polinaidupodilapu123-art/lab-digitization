const express = require('express');
const router = express.Router();
const evaluatorController = require('../controllers/evaluatorController');
const { protect } = require('../middleware/authMiddleware');

// Middleware for evaluator routes
router.use(protect);

router.get('/records', evaluatorController.getAssignedRecords);
router.post('/records/:assignmentId/grade', evaluatorController.gradeRecord);

module.exports = router;
