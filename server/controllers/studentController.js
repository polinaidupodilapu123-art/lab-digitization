const Assignment = require('../models/Assignment');
const { Group, Subject } = require('../models/MasterData');

exports.getMyAssignments = async (req, res) => {
  try {
    const studentId = req.user._id;
    const groupCode = req.user.groupCode;

    // Fetch explicitly assigned assignments
    const assignments = await Assignment.find({ studentId })
      .populate({
        path: 'studentId',
        select: 'fullName regdNo currentSemester',
        populate: [
          { path: 'collegeId', select: 'collegeName' },
          { path: 'courseId', select: 'courseName' },
          { path: 'groupId', select: 'groupName' }
        ]
      })
      .populate('subjectId')
      .lean();

    const activeSemester = req.user.currentSemester || '';
    const filtered = assignments.filter(assignment => {
      const subSemester = assignment.subjectId?.semester || '';
      
      // 1. Show currently active semester subjects
      if (subSemester === activeSemester) {
        return true;
      }
      
      // 2. Show backlog/Supply papers that are not yet evaluated
      if (assignment.mode === 'Supply' && assignment.status !== 'Evaluated') {
        return true;
      }
      
      return false;
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // In production, save req.file to AWS S3, Cloudinary, or local disk 
    // and store the URL. Here we simulate the file upload.
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename || req.file.originalname}`;

    const assignment = await Assignment.findOne({ _id: assignmentId, studentId: req.user._id });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status === 'Evaluated') {
      return res.status(400).json({ message: 'Evaluation has already completed. You cannot change this record.' });
    }

    if (assignment.deadline) {
      const deadlineDate = new Date(assignment.deadline);
      deadlineDate.setHours(23, 59, 59, 999);
      if (new Date() > deadlineDate) {
        return res.status(400).json({ message: 'The submission deadline has passed. You can no longer upload records.' });
      }
    }

    assignment.status = 'Submitted';
    assignment.filePath = fileUrl;
    assignment.submittedAt = new Date();
    await assignment.save();

    res.json({ message: 'Record submitted successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
