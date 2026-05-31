const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: { type: String },
  role: { type: String },
  loginTime: { type: Date, required: true },
  logoutTime: { type: Date },
  durationSeconds: { type: Number },
  ipAddress: { type: String },
  location: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SessionLog', sessionLogSchema);
