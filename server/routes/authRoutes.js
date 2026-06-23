const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);
router.post('/send-otp', authController.sendOtp);
router.post('/setup', authController.setupAccount);
router.post('/check-duplicate-face', authController.checkDuplicateFace);
router.get('/fix-admin', authController.fixAdmin);
router.get('/create-sysadmin', authController.createSysAdmin);
router.get('/create-bos', authController.createBos);
router.get('/colleges', authController.getCollegesList);
router.get('/me', protect, authController.me);

router.post('/forgot-password/send-otp', authController.forgotPasswordSendOtp);
router.post('/forgot-password/reset', authController.forgotPasswordReset);

module.exports = router;
