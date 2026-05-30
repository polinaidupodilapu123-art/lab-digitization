const express = require('express');
const router = express.Router();
const principalController = require('../controllers/principalController');
const { protect } = require('../middleware/authMiddleware');

// Middleware to restrict access strictly to PRINCIPAL or ADMIN roles
const principalOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'PRINCIPAL' || req.user.role === 'ADMIN')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Access restricted to College Principals.' });
  }
};

router.use(protect, principalOrAdmin);

router.get('/stats', principalController.getPrincipalDashboardStats);
router.get('/pending-students', principalController.getPendingStudents);
router.get('/records', principalController.getCollegeRecords);
router.put('/records/:id/suggest-marks', principalController.suggestMarks);

module.exports = router;
