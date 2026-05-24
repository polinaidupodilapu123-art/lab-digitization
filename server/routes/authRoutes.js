const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/student-setup', authController.studentSetup);
router.get('/fix-admin', authController.fixAdmin);

module.exports = router;
