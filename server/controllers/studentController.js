const Assignment = require('../models/Assignment');
const { Group, Subject } = require('../models/MasterData');
const fs = require('fs');
const pdfParse = require('pdf-parse');

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
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename || req.file.originalname}`;

    const assignment = await Assignment.findOne({ _id: assignmentId, studentId: req.user._id }).populate('subjectId');
    if (!assignment) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status === 'Evaluated') {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Evaluation has already completed. You cannot change this record.' });
    }

    if (assignment.deadline) {
      const deadlineDate = new Date(assignment.deadline);
      deadlineDate.setHours(23, 59, 59, 999);
      if (new Date() > deadlineDate) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'The submission deadline has passed. You can no longer upload records.' });
      }
    }

    // AI-Assisted Document Verification (OCR / Text Extraction)
    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      
      // Normalize spacing and uppercase to make finding matches robust
      const extractedText = pdfData.text.replace(/\s+/g, ' ').toUpperCase(); 
      const regdNo = String(req.user.regdNo).toUpperCase();
      const studentName = String(req.user.fullName).toUpperCase();
      const subjectCode = assignment.subjectId?.subCode?.toUpperCase() || assignment.groupSubjectName?.toUpperCase();

      const hasRegNo = extractedText.includes(regdNo);
      const hasStudentName = extractedText.includes(studentName);
      const hasSubjectCode = subjectCode ? extractedText.includes(subjectCode) : true;

      if (!hasRegNo || !hasSubjectCode || !hasStudentName) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        if (extractedText.trim() === '') {
          return res.status(400).json({ message: 'Document Verification Failed: This PDF appears to be an image-only scan without readable text. Please ensure your cover page has digitally typed text, or use an OCR scanner app to create your PDF.' });
        }

        let errorMsg = '';
        if (!hasRegNo && !hasSubjectCode && !hasStudentName) {
          errorMsg = 'We could not find the student name, reg no, and subject code in the uploading document. Please ensure you have uploaded the correct lab record.';
        } else {
          errorMsg = 'The student name, reg no, or subject code in the uploading document are wrong or do not match your details.';
        }

        return res.status(400).json({ message: errorMsg });
      }
    } catch (parseError) {
      console.error('PDF Parse Error:', parseError);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Document Verification Failed: We could not process this file. Please ensure you are uploading a valid, standard PDF file and not a corrupted document.' });
    }

    assignment.status = 'Submitted';
    assignment.filePath = fileUrl;
    assignment.submittedAt = new Date();
    await assignment.save();

    res.json({ message: 'Record verified and submitted successfully', assignment });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};
