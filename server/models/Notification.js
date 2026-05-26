const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  pdfPath: {
    type: String // Optional circular document attachment
  },
  notes: {
    type: String // Optional remarks or text summary
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
