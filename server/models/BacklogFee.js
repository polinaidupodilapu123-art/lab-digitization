const mongoose = require('mongoose');

const BacklogFeeSchema = new mongoose.Schema({
  regdNo: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  collegeCode: {
    type: String,
  },
  courseCode: {
    type: String,
  },
  semester: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('BacklogFee', BacklogFeeSchema);
