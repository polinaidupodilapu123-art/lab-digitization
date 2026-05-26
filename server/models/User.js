const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  regdNo: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
  },
  plainPassword: {
    type: String,
  },
  mobileNumber: {
    type: String
  },
  email: {
    type: String
  },
  tempOtp: {
    type: String
  },
  otpExpiresAt: {
    type: Date
  },
  role: {
    type: String,
    enum: ['ADMIN', 'STUDENT', 'EVALUATOR', 'PRINCIPAL'],
    default: 'STUDENT'
  },
  fullName: {
    type: String
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College'
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  currentSemester: {
    type: String
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  groupSubjects: [{
    type: String
  }],
  // To track if a student has completed their first-time setup
  isSetupComplete: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Hash password before saving (Mongoose 9 style — no next() needed)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
