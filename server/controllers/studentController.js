const Assignment = require('../models/Assignment');
const { Group, Subject } = require('../models/MasterData');

exports.getMyAssignments = async (req, res) => {
  try {
    const studentId = req.user._id;
    const groupCode = req.user.groupCode;

    // Fetch explicitly assigned assignments
    const assignments = await Assignment.find({ studentId })
      .populate('subjectId')
      .lean();

    // In a real scenario, you could also automatically inject assignments 
    // based on groupCode if they are not explicitly assigned yet.

    res.json(assignments);
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

    const assignment = await Assignment.findOneAndUpdate(
      { _id: assignmentId, studentId: req.user._id },
      { 
        status: 'Submitted',
        filePath: fileUrl,
        submittedAt: new Date()
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({ message: 'Record submitted successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
