const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      'CREATE_MASTER_DATA',
      'UPDATE_MASTER_DATA',
      'DELETE_MASTER_DATA',
      'CREATE_ASSIGNMENT',
      'UPDATE_ASSIGNMENT',
      'CREATE_EVALUATOR',
      'ASSIGN_SUBJECT',
      'EXTEND_DEADLINE',
      'ALLOCATE_EVALUATOR',
      'REALLOCATE_EVALUATOR',
      'EVALUATE_MARKS',
      'SUGGEST_MARKS',
      'UPLOAD_RECORD',
      'DOWNLOAD_RECORD',
      'EXPORT_EXCEL',
      'OTHER'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  entityType: {
    type: String,
    required: false,
    enum: ['Assignment', 'MasterData', 'User', 'Paper', 'Subject']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
