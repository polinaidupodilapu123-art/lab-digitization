const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  paperCode: { 
    type: String, 
    required: true, 
    unique: true 
  },
  paperName: { 
    type: String, 
    required: true 
  },
  subjectIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject',
    required: true
  }],
  semester: { 
    type: String,
    required: true
  },
  maxMarks: { type: Number },
  passMarks: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);
