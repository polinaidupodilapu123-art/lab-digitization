const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');
const AppError = require('../utils/AppError');

exports.getNotifications = async () => {
  return await Notification.find().sort({ date: -1 });
};

exports.createNotification = async ({ title, date, notes, file }) => {
  if (!title) {
    throw new AppError('Notification title is required.', 400);
  }

  let pdfPath = '';
  if (file) {
    pdfPath = `/uploads/${file.filename}`;
  }

  const notification = new Notification({
    title,
    date: date ? new Date(date) : new Date(),
    pdfPath,
    notes
  });

  await notification.save();
  return { message: 'Notification created successfully', notification };
};

exports.deleteNotification = async (id) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    throw new AppError('Notification not found.', 404);
  }

  if (notification.pdfPath) {
    const fullPath = path.join(__dirname, '..', notification.pdfPath);
    fs.unlink(fullPath, (err) => {
      if (err) console.error('Failed to delete physical PDF:', err.message);
    });
  }

  await Notification.findByIdAndDelete(id);
  return { message: 'Notification circular deleted successfully.' };
};

exports.editNotification = async (id, { title, date, notes, file }) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    throw new AppError('Notification not found.', 404);
  }

  if (title) notification.title = title;
  if (date) notification.date = new Date(date);
  if (notes !== undefined) notification.notes = notes;

  if (file) {
    if (notification.pdfPath) {
      const fullPath = path.join(__dirname, '..', notification.pdfPath);
      fs.unlink(fullPath, (err) => {
        if (err) console.error('Failed to delete old physical PDF:', err.message);
      });
    }
    notification.pdfPath = `/uploads/${file.filename}`;
  }

  await notification.save();
  return { message: 'Notification updated successfully', notification };
};
