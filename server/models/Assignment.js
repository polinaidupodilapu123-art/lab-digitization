const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  groupSubjectName: {
    type: String
  },
  maxMarks: {
    type: Number
  },
  evaluatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Role EVALUATOR
  },
  pagesRequired: {
    type: Number,
    required: true
  },
  academicYear: {
    type: String
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Submitted', 'Evaluated'],
    default: 'Pending'
  },
  mode: {
    type: String,
    enum: ['Regular', 'Supply'],
    default: 'Regular'
  },
  score: {
    type: Number
  },
  feedback: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  filePath: {
    type: String
  },
  submittedAt: {
    type: Date
  },
  valuationDeadline: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
