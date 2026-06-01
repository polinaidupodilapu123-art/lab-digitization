const Assignment = require('../models/Assignment');
const User = require('../models/User');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const stringSimilarity = require('string-similarity');
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

exports.submitAssignment = async ({ assignmentId, file, user, note, extractedText: clientExtractedText }) => {
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/${file.filename || file.originalname}`;

  const assignment = await Assignment.findOne({ _id: assignmentId, studentId: user._id }).populate('subjectId');
  if (!assignment) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError('Assignment not found', 404);
  }

  const isGroupSubject = !!assignment.groupSubjectName;
  const semester = String(assignment.subjectId?.semester);
  const isEligibleFor5MB = isGroupSubject && (semester === '3' || semester === '4');
  
  const MAX_SIZE = isEligibleFor5MB ? 5 * 1024 * 1024 : 1 * 1024 * 1024;
  
  if (file.size > MAX_SIZE) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError(`File size exceeds the limit. ${isEligibleFor5MB ? 'Max 5MB allowed for this group subject.' : 'Max 1MB allowed for this subject.'}`, 400);
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

  let serverExtractedText = '';
  try {
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);
    
    serverExtractedText = pdfData.text.replace(/\s+/g, ' ').toUpperCase(); 
    const regdNo = String(user.regdNo).toUpperCase();
    const studentName = String(user.fullName).toUpperCase();
    const subjectCode = assignment.subjectId?.subCode?.toUpperCase() || assignment.groupSubjectName?.toUpperCase();

    const hasRegNo = serverExtractedText.includes(regdNo) || (clientExtractedText && clientExtractedText.toUpperCase().includes(regdNo));
    const hasStudentName = serverExtractedText.includes(studentName) || (clientExtractedText && clientExtractedText.toUpperCase().includes(studentName));
    const hasSubjectCode = subjectCode ? (serverExtractedText.includes(subjectCode) || (clientExtractedText && clientExtractedText.toUpperCase().includes(subjectCode))) : true;

    if (!hasRegNo || !hasSubjectCode || !hasStudentName) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      
      if (serverExtractedText.trim() === '' && (!clientExtractedText || clientExtractedText.trim() === '')) {
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
  if (note) assignment.studentNote = note;
  
  // We ONLY use the clientExtractedText for similarity because the frontend 
  // intentionally skipped Page 1 (the certificate). We absolutely MUST NOT fall back 
  // to serverExtractedText, because serverExtractedText includes the Certificate page.
  let finalExtractedText = (clientExtractedText !== undefined && clientExtractedText !== null) 
    ? clientExtractedText.trim() 
    : '';

  // Strip out student-specific and subject-specific details before comparison
  // This prevents false similarity matches based on identical cover pages or subject headers
  const regdNo = String(user.regdNo).toUpperCase();
  const studentName = String(user.fullName).toUpperCase();
  const subjectCode = assignment.subjectId?.subCode?.toUpperCase() || assignment.groupSubjectName?.toUpperCase() || '';
  const subjectName = assignment.subjectId?.subName?.toUpperCase() || '';

  let comparisonText = finalExtractedText;
  const tokensToStrip = [regdNo, studentName, subjectCode, subjectName].filter(Boolean);
  
  for (const token of tokensToStrip) {
    // Escape regex chars
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    comparisonText = comparisonText.replace(new RegExp(escapedToken, 'gi'), '');
  }

  // Also strip any dates (e.g. 12/04/2026, 12-4-26, Date: 12.04.2024)
  comparisonText = comparisonText.replace(/\b(?:DATE|DT)?:?\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/gi, '');
  
  // Strip page numbers (e.g., "2 / 11", "2/11", "Page 2 of 11")
  comparisonText = comparisonText.replace(/\b(?:page\s*)?\d+\s*(?:\/|of)\s*\d+\b/gi, '');

  // Strip generic headers like "Activity Record" or stray symbols
  comparisonText = comparisonText.replace(/ACTIVITY RECORD/gi, '');
  
  // Clean up the text: remove all punctuation and non-alphanumeric noise (which Tesseract often produces for handwriting)
  comparisonText = comparisonText.replace(/[^\w\s]/g, ' ');
  // Remove extra whitespace
  comparisonText = comparisonText.replace(/\s+/g, ' ').trim();

  // Calculate unique words to determine if this is just repeating boilerplate/noise from blank pages.
  // We filter out words < 3 chars, words without vowels, and words with numbers to strictly ignore OCR barcode hallucinations and noise.
  const validWords = comparisonText.toLowerCase().split(/\s+/).filter(w => {
    return w.length > 2 && /[aeiouy]/.test(w) && !/\d/.test(w);
  });
  const uniqueWords = new Set(validWords);

  // A real record will have many unique valid words. A blank document with repeating headers/noise will have very few.
  // We require at least 20 unique valid words to trigger the plagiarism scanner.
  if (comparisonText && comparisonText.length > 50 && uniqueWords.size > 20) {
    // Check similarity before saving
    let query = { status: { $in: ['Submitted', 'Evaluated'] }, _id: { $ne: assignment._id } };
    if (assignment.groupSubjectName) {
      query.groupSubjectName = assignment.groupSubjectName;
    } else {
      query.subjectId = assignment.subjectId._id || assignment.subjectId;
    }
    
    const otherAssignments = await Assignment.find(query).select('extractedText');
    for (const other of otherAssignments) {
      if (other.extractedText && other.extractedText.trim().length > 50) {
        let otherComparisonText = other.extractedText;
        // Optionally strip from the other text too, though usually it's already stored without issues,
        // but for exact safety we compare the stripped version with the stored version.
        // Actually, the stored version has its own regNo. 
        // A simpler way: we just compare comparisonText.
        const similarity = stringSimilarity.compareTwoStrings(
          comparisonText.toLowerCase(), 
          otherComparisonText.toLowerCase()
        );
        if (similarity > 0.45) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          throw new AppError(`Upload rejected: Content similarity exceeds 45% limit. (Match: ${(similarity * 100).toFixed(1)}%)`, 400);
        }
      }
    }
    assignment.extractedText = comparisonText; // Save the stripped version so future checks compare stripped vs stripped
  } else if (!comparisonText && finalExtractedText) {
    // If stripping everything leaves nothing (e.g. only cover page uploaded)
    assignment.extractedText = finalExtractedText;
  }

  // Auto-routing to assigned evaluators
  if (!assignment.evaluatorId) {
    let evalQuery = { role: 'EVALUATOR' };
    if (assignment.groupSubjectName) {
      evalQuery.groupSubjects = assignment.groupSubjectName;
    } else if (assignment.subjectId) {
      evalQuery.subjects = assignment.subjectId._id || assignment.subjectId;
    }
    
    const assignedEvaluators = await User.find(evalQuery).select('_id');
    if (assignedEvaluators.length > 0) {
      // Pick random evaluator for basic load balancing
      const randomIdx = Math.floor(Math.random() * assignedEvaluators.length);
      assignment.evaluatorId = assignedEvaluators[randomIdx]._id;
    }
  }

  await assignment.save();

  return { message: 'Record verified and submitted successfully', assignment };
};
