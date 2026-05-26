const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const notificationController = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, 'circular-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Public endpoint to get all active notifications
router.get('/', notificationController.getNotifications);

// Admin-only endpoints to manage notifications
router.post('/', protect, adminOnly, upload.single('file'), notificationController.createNotification);
router.delete('/:id', protect, adminOnly, notificationController.deleteNotification);

module.exports = router;
