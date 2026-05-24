const express = require('express');
const router = express.Router();
const multer = require('multer');
const studentController = require('../controllers/studentController');
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

// Middleware for student routes
router.use(protect);

router.get('/assignments', studentController.getMyAssignments);
router.post('/assignments/:assignmentId/submit', upload.single('file'), studentController.submitAssignment);
router.get('/paper-grades', adminController.getPaperGrades);

module.exports = router;
