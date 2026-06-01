const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);
router.post('/send-otp', authController.sendOtp);
router.post('/setup', authController.setupAccount);
router.get('/fix-admin', authController.fixAdmin);
router.get('/create-sysadmin', authController.createSysAdmin);
router.get('/colleges', authController.getCollegesList);
router.get('/me', protect, authController.me);

module.exports = router;
