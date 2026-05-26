const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');

// 1. Get all active notifications (Public / All users)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ date: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Create a notification circular (Admin only)
exports.createNotification = async (req, res) => {
  try {
    const { title, date, notes } = req.body;
    let pdfPath = '';

    if (req.file) {
      pdfPath = `/uploads/${req.file.filename}`;
    }

    if (!title) {
      return res.status(400).json({ message: 'Notification title is required.' });
    }

    const notification = new Notification({
      title,
      date: date ? new Date(date) : new Date(),
      pdfPath,
      notes
    });

    await notification.save();
    res.status(201).json({ message: 'Notification created successfully', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Delete a notification circular (Admin only)
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // Optional: Delete physical file associated if it exists
    if (notification.pdfPath) {
      const fullPath = path.join(__dirname, '..', notification.pdfPath);
      fs.unlink(fullPath, (err) => {
        if (err) console.error('Failed to delete physical PDF:', err.message);
      });
    }

    await Notification.findByIdAndDelete(id);
    res.json({ message: 'Notification circular deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
