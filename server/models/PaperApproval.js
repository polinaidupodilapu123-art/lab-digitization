const mongoose = require('mongoose');

const paperApprovalSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true
  },
  mode: {
    type: String,
    enum: ['Regular', 'Supply'],
    default: 'Regular'
  },
  isApprovedByBOS: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED'],
    default: 'APPROVED'
  }
}, { timestamps: true });

paperApprovalSchema.index({ studentId: 1, paperId: 1, mode: 1 }, { unique: true });

module.exports = mongoose.model('PaperApproval', paperApprovalSchema);
