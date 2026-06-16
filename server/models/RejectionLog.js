const mongoose = require('mongoose');

const rejectionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  regdNo: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College'
  },
  profileImage: {
    type: String
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rejectedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: 'Please register with your own face.'
  }
}, { timestamps: true });

module.exports = mongoose.model('RejectionLog', rejectionLogSchema);
