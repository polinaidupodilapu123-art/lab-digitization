const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  collegeCode: { type: String, required: true, unique: true },
  collegeName: { type: String, required: true },
  location:    { type: String },
  district:    { type: String },
  courses:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  latitude:    { type: Number },
  longitude:   { type: Number },
  radiusMeter: { type: Number, default: 200 } // Geofence radius limit in meters
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  subCode:      { type: String, required: true, unique: true },
  subName:      { type: String, required: true },
  studentChoice:{ type: String },
  type:         { type: String },
  aliasName:    { type: String },
  maxMarks:     { type: Number },
  subPassMarks: { type: Number },
  semester:     { type: String },
  mappedPedagogy: { type: String } // e.g., 'pedagogy1Name' or 'pedagogy2Name'
}, { timestamps: true });

// Updated Group schema — matches the Excel layout shown in the image
const groupSchema = new mongoose.Schema({
  groupCode:     { type: String, required: true, unique: true },
  courseId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  groupName:     { type: String },
  subjects:      [{ type: String }]
}, { timestamps: true });

// New: Courses master
const courseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, unique: true },
  courseName: { type: String, required: true },
  subjects:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }]
}, { timestamps: true });

module.exports = {
  College: mongoose.model('College', collegeSchema),
  Subject: mongoose.model('Subject', subjectSchema),
  Group:   mongoose.model('Group',   groupSchema),
  Course:  mongoose.model('Course',  courseSchema)
};
