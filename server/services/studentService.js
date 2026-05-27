const Assignment = require('../models/Assignment');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const AppError = require('../utils/AppError');

exports.getMyAssignments = async (user) => {
  const studentId = user._id;

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

  const activeSemester = user.currentSemester || '';
  const filtered = assignments.filter(assignment => {
    const subSemester = assignment.subjectId?.semester || '';
    
    if (subSemester === activeSemester) {
      return true;
    }
    
    if (assignment.mode === 'Supply' && assignment.status !== 'Evaluated') {
      return true;
    }
    
    return false;
  });

  return filtered;
};

exports.submitAssignment = async ({ assignmentId, file, user }) => {
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/${file.filename || file.originalname}`;

  const assignment = await Assignment.findOne({ _id: assignmentId, studentId: user._id }).populate('subjectId');
  if (!assignment) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Assignment not found', 404);
  }

  if (assignment.status === 'Evaluated') {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Evaluation has already completed. You cannot change this record.', 400);
  }

  if (assignment.deadline) {
    const deadlineDate = new Date(assignment.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    if (new Date() > deadlineDate) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError('The submission deadline has passed. You can no longer upload records.', 400);
    }
  }

  try {
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);
    
    const extractedText = pdfData.text.replace(/\s+/g, ' ').toUpperCase(); 
    const regdNo = String(user.regdNo).toUpperCase();
    const studentName = String(user.fullName).toUpperCase();
    const subjectCode = assignment.subjectId?.subCode?.toUpperCase() || assignment.groupSubjectName?.toUpperCase();

    const hasRegNo = extractedText.includes(regdNo);
    const hasStudentName = extractedText.includes(studentName);
    const hasSubjectCode = subjectCode ? extractedText.includes(subjectCode) : true;

    if (!hasRegNo || !hasSubjectCode || !hasStudentName) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      
      if (extractedText.trim() === '') {
        throw new AppError('Document Verification Failed: This PDF appears to be an image-only scan without readable text. Please ensure your cover page has digitally typed text, or use an OCR scanner app to create your PDF.', 400);
      }

      let errorMsg = '';
      if (!hasRegNo && !hasSubjectCode && !hasStudentName) {
        errorMsg = 'We could not find the student name, reg no, and subject code in the uploading document. Please ensure you have uploaded the correct lab record.';
      } else {
        errorMsg = 'The student name, reg no, or subject code in the uploading document are wrong or do not match your details.';
      }

      throw new AppError(errorMsg, 400);
    }
  } catch (parseError) {
    if (parseError.statusCode) throw parseError;
    console.error('PDF Parse Error:', parseError);
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Document Verification Failed: We could not process this file. Please ensure you are uploading a valid, standard PDF file and not a corrupted document.', 400);
  }

  assignment.status = 'Submitted';
  assignment.filePath = fileUrl;
  assignment.submittedAt = new Date();
  await assignment.save();

  return { message: 'Record verified and submitted successfully', assignment };
};
