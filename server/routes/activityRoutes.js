const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', activityController.getLogs);
router.post('/', activityController.logFrontendActivity);

module.exports = router;
