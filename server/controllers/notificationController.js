const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    const result = await notificationService.getNotifications();
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const result = await notificationService.createNotification({
      ...req.body,
      file: req.file
    });
    res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.editNotification = async (req, res) => {
  try {
    const result = await notificationService.editNotification(req.params.id, {
      ...req.body,
      file: req.file
    });
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
