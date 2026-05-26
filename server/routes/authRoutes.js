const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/send-otp', authController.sendOtp);
router.post('/setup', authController.setupAccount);
router.get('/fix-admin', authController.fixAdmin);
router.get('/colleges', authController.getCollegesList);

module.exports = router;
