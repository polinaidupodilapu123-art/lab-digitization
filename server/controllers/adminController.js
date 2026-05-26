const { College, Subject, Group, Course } = require('../models/MasterData');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Paper = require('../models/Paper');
const xlsx = require('xlsx');
const emailService = require('../services/emailService');

// Helper for robust group subject matching
const cleanCode = (str) => String(str || '').trim().toUpperCase().replace(/[\s-]/g, '');
const isMatchingSubject = (subject, groupCode) => {
  const fullCode = cleanCode(subject.subCode);
  const fullName = cleanCode(subject.subName);
  const suffix = cleanCode(groupCode);
  if (!suffix) return false;
  if (fullCode === suffix) return true;
  if (fullCode.endsWith('0' + suffix)) return true;
  if (fullCode.endsWith(suffix)) {
    const prefix = fullCode.slice(0, -suffix.length);
    if (!/\d$/.test(prefix)) return true;
  }
  if (fullName === suffix) return true;
  if (fullName.includes(suffix) && suffix.length > 4) return true;
  return false;
};

// ── Bulk Upload with resilient row validation ────────────────────────────────
exports.uploadMasterData = async (req, res) => {
  try {
    const { type } = req.params;
    const { semester } = req.body; // extracted from form data
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or could not be read.' });
    }

    // Normalise keys: lowercase, trim, replace underscores and ALL whitespace (including newlines) with a single space
    const normalizeKey = (k) => (k || '').toString().toLowerCase().replace(/[\s_]+/g, ' ').trim();
    
    const data = rawData.map(row => {
      const normalizedRow = {};
      for (const [key, val] of Object.entries(row)) {
        normalizedRow[normalizeKey(key)] = val;
      }
      return normalizedRow;
    });

    const rowErrors = [];
    let successCount = 0;
    const principalsToEmail = [];

    // ── Validate required columns exist in first row ──
    const firstRow = data[0];
    const REQUIRED_COLS = {
      students: ['registration number', 'student name', 'college code', 'group code'],
      colleges: ['college code', 'college name'],
      courses:  ['course code', 'course name'],
      groups:   ['group code', 'course code', 'group name', 'pedagogy1 name', 'pedagogy2 name'],
      subjects: [], // Handled dynamically below due to varied header names
      evaluators: ['full name'],
      principals: ['full name', 'college code'],
    };

    if (type !== 'subjects' && REQUIRED_COLS[type]) {
      const missing = REQUIRED_COLS[type].filter(col => !(col in firstRow));
      
      // Enforce email field column exists for evaluators and principals
      if (type === 'evaluators' || type === 'principals') {
        const hasEmail = Object.keys(firstRow).some(k => ['email', 'email address', 'username', 'registration number', 'regdno'].includes(k));
        if (!hasEmail) {
          missing.push('email');
        }
      }

      if (missing.length > 0) {
        // Map back to display friendly names
        const displayNames = missing.map(m => m.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        return res.status(400).json({
          message: `Missing required columns: ${displayNames.join(', ')}`,
          missingColumns: displayNames,
        });
      }
    } else if (type === 'subjects') {
      const hasCode = 'subject code' in firstRow || 'sub code' in firstRow;
      const hasName = 'subject name' in firstRow || 'sub name' in firstRow;
      const missing = [];
      if (!hasCode) missing.push('Subject Code');
      if (!hasName) missing.push('Subject Name');
      if (missing.length > 0) {
        return res.status(400).json({
          message: `Missing required columns: ${missing.join(', ')}`,
          missingColumns: missing,
        });
      }
    }

    // ── Pre-fetch data for optimizations ──
    const normalizeCode = (code) => {
      if (code == null) return '';
      const str = code.toString().trim().toUpperCase();
      return /^\d+$/.test(str) ? parseInt(str, 10).toString() : str;
    };

    const collegeMap = {};
    const groupMap = {};
    const courseMap = {};
    const subjectMap = {};

    if (type === 'students' || type === 'principals') {
      const colleges = await College.find().lean();
      colleges.forEach(c => { collegeMap[normalizeCode(c.collegeCode)] = { _id: c._id, name: c.collegeName }; });
      if (type === 'students') {
        const groups = await Group.find().lean();
        groups.forEach(g => { groupMap[normalizeCode(g.groupCode)] = { _id: g._id, courseId: g.courseId }; });
      }
    } else if (type === 'groups') {
      const courses = await Course.find().lean();
      courses.forEach(c => { courseMap[normalizeCode(c.courseCode)] = c._id; });
    } else if (type === 'papers') {
      const subjects = await Subject.find().lean();
      subjects.forEach(s => { 
        subjectMap[normalizeCode(s.subCode)] = { 
          _id: s._id, 
          maxMarks: s.maxMarks, 
          subPassMarks: s.subPassMarks 
        }; 
      });
    }

    const operations = [];

    // ── Process each row ──
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (1=header)
      try {
        if (type === 'students') {
          const regdNo = row['registration number']?.toString()?.trim();
          if (!regdNo) { rowErrors.push({ row: rowNum, message: 'Registration Number is empty.' }); continue; }
          
          const collegeCode = row['college code']?.toString()?.trim();
          const groupCode = row['group code']?.toString()?.trim();
          
          const collegeId = collegeMap[normalizeCode(collegeCode)]?._id || null;
          const groupData = groupMap[normalizeCode(groupCode)];
          const groupId = groupData ? groupData._id : null;
          const courseId = groupData ? groupData.courseId : null;
          
          const mobileNumber = (row['mobile number'] || row['phone number'] || row['mobile'] || row['phone'])?.toString()?.trim() || '';
          const email = (row['email'] || row['email address'] || row['student email'] || row['email id'])?.toString()?.trim() || '';

          if (collegeCode && !collegeId) {
            rowErrors.push({ row: rowNum, message: `College Code "${collegeCode}" not found. Upload Colleges first.` });
            continue;
          }
          if (groupCode && !groupId) {
            rowErrors.push({ row: rowNum, message: `Group Code "${groupCode}" not found. Upload Groups first.` });
            continue;
          }

          operations.push({
            updateOne: {
              filter: { regdNo },
              update: { 
                $set: {
                  fullName: row['student name']?.trim(), 
                  collegeId,
                  groupId,
                  courseId,
                  currentSemester: semester || '',
                  mobileNumber,
                  email,
                  role: 'STUDENT' 
                }
              },
              upsert: true
            }
          });

        } else if (type === 'colleges') {
          const collegeCode = row['college code']?.toString()?.trim();
          if (!collegeCode) { rowErrors.push({ row: rowNum, message: 'College Code is empty.' }); continue; }
          
          operations.push({
            updateOne: {
              filter: { collegeCode },
              update: { 
                $set: {
                  collegeName: row['college name']?.trim(), 
                  location: row['location']?.trim(), 
                  district: row['district']?.trim() 
                }
              },
              upsert: true
            }
          });

        } else if (type === 'courses') {
          const courseCode = row['course code']?.toString()?.trim();
          if (!courseCode) { rowErrors.push({ row: rowNum, message: 'Course Code is empty.' }); continue; }
          
          operations.push({
            updateOne: {
              filter: { courseCode },
              update: { $set: { courseName: row['course name']?.trim() } },
              upsert: true
            }
          });

        } else if (type === 'groups') {
          const groupCode = row['group code']?.toString()?.trim();
          if (!groupCode) { rowErrors.push({ row: rowNum, message: 'Group Code is empty.' }); continue; }
          
          const courseCode = row['course code']?.toString()?.trim();

          const courseId = courseMap[courseCode] || null;

          if (courseCode && !courseId) {
            rowErrors.push({ row: rowNum, message: `Course Code "${courseCode}" not found. Upload Courses first.` });
            continue;
          }

          operations.push({
            updateOne: {
              filter: { groupCode },
              update: { 
                $set: {
                  courseId,
                  groupName: row['group name']?.trim(), 
                  pedagogy1Name: row['pedagogy1 name']?.trim(), 
                  pedagogy2Name: row['pedagogy2 name']?.trim() 
                }
              },
              upsert: true
            }
          });

        } else if (type === 'subjects') {
          const subCode = (row['sub code'] || row['subject code'])?.toString()?.trim();
          if (!subCode) { rowErrors.push({ row: rowNum, message: 'Subject Code is empty.' }); continue; }
          if (subCode.toLowerCase() === 'sub code' || subCode.toLowerCase() === 'subject code') continue; 

          operations.push({
            updateOne: {
              filter: { subCode },
              update: { 
                $set: {
                  subName: (row['sub name'] || row['subject name'])?.trim(), 
                  studentChoice: row['student choice']?.trim(), 
                  type: row['type']?.trim(), 
                  aliasName: row['alias name']?.trim(), 
                  maxMarks: Number(row['max marks']) || 0, 
                  subPassMarks: Number(row['sub pass marks'] || row['subject pass marks'] || row['pass marks']) || 0, 
                  semester: semester || row['semester']?.toString()?.trim() || ''
                }
              },
              upsert: true
            }
          });

        } else if (type === 'papers') {
          const paperCode = row['paper code']?.toString()?.trim();
          if (!paperCode) { rowErrors.push({ row: rowNum, message: 'Paper Code is empty.' }); continue; }
          
          const rawSubjects = (row['subject code'] || row['subject codes'])?.toString() || '';
          const subjectCodesList = rawSubjects.split(',').map(s => normalizeCode(s)).filter(Boolean);
          
          const resolvedIds = [];
          const missingCodes = [];
          
          let calculatedMaxMarks = 0;
          let calculatedPassMarks = 0;
          
          subjectCodesList.forEach(code => {
            const subjData = subjectMap[code];
            if (subjData) {
              resolvedIds.push(subjData._id);
              calculatedMaxMarks += (Number(subjData.maxMarks) || 0);
              calculatedPassMarks += (Number(subjData.subPassMarks) || 0);
            } else {
              missingCodes.push(code);
            }
          });
          
          if (missingCodes.length > 0) {
            rowErrors.push({ row: rowNum, message: `Subject Code(s) [${missingCodes.join(', ')}] not found. Upload Subjects first.` });
            continue;
          }
          
          operations.push({
            updateOne: {
              filter: { paperCode },
              update: { 
                $set: {
                  paperName: row['paper name']?.trim() || 'Untitled Paper', 
                  semester: row['semester']?.toString()?.trim() || '',
                  maxMarks: calculatedMaxMarks,
                  passMarks: calculatedPassMarks,
                  subjectIds: resolvedIds
                }
              },
              upsert: true
            }
          });
        } else if (type === 'subjectmaps') {
          const subCode = (row['subject code'] || row['sub code'])?.toString()?.trim();
          if (!subCode) { rowErrors.push({ row: rowNum, message: 'Subject Code is empty.' }); continue; }
          const mappedPedagogy = row['mapped pedagogy']?.toString()?.trim() || row['mapped to']?.toString()?.trim() || '';

          operations.push({
            updateOne: {
              filter: { subCode },
              update: { $set: { mappedPedagogy } },
              upsert: false
            }
          });
        } else if (type === 'evaluators') {
          const emailCol = Object.keys(row).find(k => ['email', 'email address', 'username', 'registration number', 'regdno'].includes(k));
          const regdNo = row[emailCol]?.toString()?.trim();
          if (!regdNo) { rowErrors.push({ row: rowNum, message: 'Email/Username is empty.' }); continue; }
          
          const fullName = row['full name']?.toString()?.trim() || row['name']?.toString()?.trim() || 'Evaluator';
          const rawPassword = row['password']?.toString()?.trim() || 'Password@123';
          
          const bcrypt = require('bcryptjs');
          const salt = await bcrypt.genSalt(10);
          const password = await bcrypt.hash(rawPassword, salt);

          operations.push({
            updateOne: {
              filter: { regdNo },
              update: { 
                $set: {
                  fullName,
                  password,
                  plainPassword: rawPassword, // Store plain password
                  role: 'EVALUATOR',
                  isSetupComplete: true
                }
              },
              upsert: true
            }
          });
        } else if (type === 'principals') {
          const emailCol = Object.keys(row).find(k => ['email', 'email address', 'username', 'registration number', 'regdno'].includes(k));
          const regdNo = row[emailCol]?.toString()?.trim();
          if (!regdNo) { rowErrors.push({ row: rowNum, message: 'Email/Username is empty.' }); continue; }
          
          const collegeCode = row['college code']?.toString()?.trim();
          const collegeData = collegeMap[normalizeCode(collegeCode)];
          const collegeId = collegeData?._id || null;

          if (collegeCode && !collegeId) {
            rowErrors.push({ row: rowNum, message: `College Code "${collegeCode}" not found. Upload Colleges first.` });
            continue;
          }
          if (!collegeId) {
            rowErrors.push({ row: rowNum, message: 'College Code is required for mapping a Principal to their college.' });
            continue;
          }

          const fullName = row['full name']?.toString()?.trim() || row['name']?.toString()?.trim() || 'Principal';
          const rawPassword = Math.random().toString(36).slice(-10) + 'A1!'; 

          const bcrypt = require('bcryptjs');
          const salt = await bcrypt.genSalt(10);
          const password = await bcrypt.hash(rawPassword, salt);

          operations.push({
            updateOne: {
              filter: { regdNo },
              update: { 
                $set: {
                  fullName,
                  email: regdNo,
                  password,
                  collegeId,
                  role: 'PRINCIPAL',
                  isSetupComplete: false
                }
              },
              upsert: true
            }
          });
          
          principalsToEmail.push({
            to: regdNo,
            principalName: fullName,
            collegeName: collegeData?.name || collegeCode
          });
        }
      } catch (rowErr) {
        rowErrors.push({ row: rowNum, message: rowErr.message });
      }
    }

    // ── Execute Bulk Write in Batches ──
    if (operations.length > 0) {
      let Model;
      if (type === 'students' || type === 'evaluators' || type === 'principals') Model = User;
      else if (type === 'colleges') Model = College;
      else if (type === 'courses') Model = Course;
      else if (type === 'groups') Model = Group;
      else if (type === 'subjects' || type === 'subjectmaps') Model = Subject;
      else if (type === 'papers') Model = Paper;

      if (Model) {
        const BATCH_SIZE = 1000;
        let successfulWrites = 0;
        for (let i = 0; i < operations.length; i += BATCH_SIZE) {
          const batch = operations.slice(i, i + BATCH_SIZE);
          try {
            const result = await Model.bulkWrite(batch, { ordered: false });
            successfulWrites += (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.matchedCount || 0) + (result.insertedCount || 0);
          } catch (batchErr) {
            console.error('Batch error:', batchErr.message);
            successfulWrites += (batchErr.result?.upsertedCount || 0) + (batchErr.result?.modifiedCount || 0) + (batchErr.result?.matchedCount || 0) + (batchErr.result?.insertedCount || 0);
            if (batchErr.writeErrors) {
              batchErr.writeErrors.forEach(err => {
                rowErrors.push({ row: 'DB Insert', message: err.errmsg });
              });
            } else {
              rowErrors.push({ row: 'System', message: batchErr.message });
            }
          }
        }
        successCount = successfulWrites;
      }
    }

    // ── Response ──
    if (successCount === 0 && rowErrors.length > 0) {
      return res.status(400).json({ message: `Upload failed. All ${rowErrors.length} rows had errors.`, errors: rowErrors });
    }

    if (type === 'principals' && successCount > 0 && principalsToEmail.length > 0) {
      // Fire and forget emails to avoid blocking the response
      Promise.all(principalsToEmail.map(p => emailService.sendPrincipalOnboardingEmail(p)))
        .catch(err => console.error('Error sending principal onboarding emails:', err));
    }

    return res.status(200).json({
      message: `${successCount} row(s) uploaded successfully${rowErrors.length > 0 ? `, ${rowErrors.length} row(s) had errors.` : '.'} Total parsed: ${data.length}`,
      successCount,
      parsedCount: data.length,
      errors: rowErrors,
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// ── Generic Single Record CRUD ───────────────────────────────────────────────
const getModelForType = (type) => {
  switch (type) {
    case 'students': return User;
    case 'evaluators': return User;
    case 'principals': return User;
    case 'colleges': return College;
    case 'courses':  return Course;
    case 'groups':   return Group;
    case 'subjects': return Subject;
    case 'subjectmaps': return Subject;
    case 'papers':   return Paper;
    default: return null;
  }
};

exports.createRecord = async (req, res) => {
  try {
    const { type } = req.params;
    const Model = getModelForType(type);
    if (!Model) return res.status(400).json({ message: 'Invalid record type' });

    if (type === 'evaluators') {
      const existing = await User.findOne({ regdNo: req.body.regdNo });
      if (existing) return res.status(400).json({ message: 'An evaluator with this email already exists.' });
      
      req.body.role = 'EVALUATOR';
      req.body.isSetupComplete = true;
      req.body.plainPassword = req.body.password; // Store plain password
      
      const newRecord = new User(req.body);
      await newRecord.save();
      const populated = await User.findById(newRecord._id).populate('subjects').select('-password');
      return res.status(201).json({ message: 'Evaluator created successfully', record: populated });
    }

    if (type === 'principals') {
      const existing = await User.findOne({ regdNo: req.body.regdNo });
      if (existing) return res.status(400).json({ message: 'A principal user with this email already exists.' });
      
      req.body.role = 'PRINCIPAL';
      req.body.isSetupComplete = false;
      
      const rawPassword = Math.random().toString(36).slice(-10) + 'A1!'; 
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(rawPassword, salt);
      req.body.email = req.body.regdNo;
      
      if (req.body.collegeCode) {
        const college = await College.findOne({ collegeCode: req.body.collegeCode });
        if (college) req.body.collegeId = college._id;
      }
      
      const newRecord = new User(req.body);
      await newRecord.save();
      const populated = await User.findById(newRecord._id).populate('collegeId').select('-password');
      
      const mapped = populated.toObject();
      mapped.collegeCode = populated.collegeId?.collegeCode || '';
      
      const emailService = require('../services/emailService');
      emailService.sendPrincipalOnboardingEmail({
        to: req.body.regdNo,
        principalName: req.body.fullName || 'Principal',
        collegeName: populated.collegeId?.collegeName || mapped.collegeCode || 'your college'
      }).catch(err => console.error('Error sending onboarding email for manually created principal:', err));

      return res.status(201).json({ message: 'Principal created successfully and email sent', record: mapped });
    }

    if (type === 'papers' && req.body.subjectIds && Array.isArray(req.body.subjectIds)) {
      const subjects = await Subject.find({ subCode: { $in: req.body.subjectIds } });
      req.body.subjectIds = subjects.map(s => s._id);
      
      let calculatedMaxMarks = 0;
      let calculatedPassMarks = 0;
      subjects.forEach(s => {
        calculatedMaxMarks += (Number(s.maxMarks) || 0);
        calculatedPassMarks += (Number(s.subPassMarks) || 0);
      });
      req.body.maxMarks = calculatedMaxMarks;
      req.body.passMarks = calculatedPassMarks;
    }

    if (type === 'students') {
      if (req.body.collegeCode) {
        const college = await College.findOne({ collegeCode: req.body.collegeCode });
        if (college) req.body.collegeId = college._id;
      }
      if (req.body.groupCode) {
        const group = await Group.findOne({ groupCode: req.body.groupCode });
        if (group) {
          req.body.groupId = group._id;
          req.body.courseId = group.courseId;
        }
      }
    }

    if (type === 'groups') {
      if (req.body.courseCode) {
        const course = await Course.findOne({ courseCode: req.body.courseCode });
        if (course) req.body.courseId = course._id;
      }
    }

    const newRecord = new Model(req.body);
    await newRecord.save();
    res.status(201).json({ message: 'Record created successfully', record: newRecord });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A record with this unique code/ID already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = getModelForType(type);
    if (!Model) return res.status(400).json({ message: 'Invalid record type' });

    if (type === 'evaluators') {
      const evaluator = await User.findById(id);
      if (!evaluator) return res.status(404).json({ message: 'Evaluator not found' });
      
      evaluator.fullName = req.body.fullName || evaluator.fullName;
      evaluator.regdNo = req.body.regdNo || evaluator.regdNo;
      
      if (req.body.password && req.body.password.trim() !== '') {
        evaluator.password = req.body.password;
        evaluator.plainPassword = req.body.password; // Update plain password
      }
      
      if (req.body.subjects) {
        evaluator.subjects = req.body.subjects;
      }
      
      await evaluator.save();
      const updated = await User.findById(id).populate('subjects').select('-password');
      return res.json({ message: 'Evaluator updated successfully', record: updated });
    }

    if (type === 'principals') {
      const principal = await User.findById(id);
      if (!principal) return res.status(404).json({ message: 'Principal not found' });
      
      principal.fullName = req.body.fullName || principal.fullName;
      principal.regdNo = req.body.regdNo || principal.regdNo;
      
      if (req.body.password && req.body.password.trim() !== '') {
        principal.password = req.body.password;
      }
      
      if (req.body.collegeCode) {
        const college = await College.findOne({ collegeCode: req.body.collegeCode });
        if (college) principal.collegeId = college._id;
      }
      
      await principal.save();
      const updated = await User.findById(id).populate('collegeId').select('-password');
      
      const mapped = updated.toObject();
      mapped.collegeCode = updated.collegeId?.collegeCode || '';
      return res.json({ message: 'Principal updated successfully', record: mapped });
    }

    if (type === 'papers' && req.body.subjectIds && Array.isArray(req.body.subjectIds)) {
      const subjects = await Subject.find({ subCode: { $in: req.body.subjectIds } });
      req.body.subjectIds = subjects.map(s => s._id);
      
      let calculatedMaxMarks = 0;
      let calculatedPassMarks = 0;
      subjects.forEach(s => {
        calculatedMaxMarks += (Number(s.maxMarks) || 0);
        calculatedPassMarks += (Number(s.subPassMarks) || 0);
      });
      req.body.maxMarks = calculatedMaxMarks;
      req.body.passMarks = calculatedPassMarks;
    }

    if (type === 'students') {
      if (req.body.collegeCode) {
        const college = await College.findOne({ collegeCode: req.body.collegeCode });
        if (college) req.body.collegeId = college._id;
      }
      if (req.body.groupCode) {
        const group = await Group.findOne({ groupCode: req.body.groupCode });
        if (group) {
          req.body.groupId = group._id;
          req.body.courseId = group.courseId;
        }
      }
    }

    if (type === 'groups') {
      if (req.body.courseCode) {
        const course = await Course.findOne({ courseCode: req.body.courseCode });
        if (course) req.body.courseId = course._id;
      }
    }

    const updated = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record updated successfully', record: updated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = getModelForType(type);
    if (!Model) return res.status(400).json({ message: 'Invalid record type' });

    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ── GET endpoints ────────────────────────────────────────────────────────────
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'STUDENT' })
      .populate('collegeId', 'collegeCode')
      .populate('groupId', 'groupCode')
      .populate('courseId', 'courseCode')
      .select('-password')
      .lean();
    
    const mapped = students.map(s => ({
      ...s,
      collegeCode: s.collegeId?.collegeCode || '',
      groupCode: s.groupId?.groupCode || '',
      courseCode: s.courseId?.courseCode || ''
    }));
    res.json(mapped);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getSubjectMaps = async (req, res) => {
  try {
    const subjects = await Subject.find({ studentChoice: 'C' });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    res.json(subjects);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getEvaluators = async (req, res) => {
  try {
    const evaluators = await User.find({ role: 'EVALUATOR' })
      .populate('subjects')
      .select('-password')
      .lean();
    res.json(evaluators);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getPrincipals = async (req, res) => {
  try {
    const principals = await User.find({ role: 'PRINCIPAL' })
      .populate('collegeId', 'collegeCode collegeName')
      .select('-password')
      .lean();
    
    const mapped = principals.map(p => ({
      ...p,
      collegeCode: p.collegeId?.collegeCode || '',
      collegeName: p.collegeId?.collegeName || ''
    }));
    res.json(mapped);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getColleges = async (req, res) => {
  try {
    const colleges = await College.find();
    res.json(colleges);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('courseId', 'courseCode')
      .lean();

    const mapped = groups.map(g => ({
      ...g,
      courseCode: g.courseId?.courseCode || ''
    }));
    res.json(mapped);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getPapers = async (req, res) => {
  try {
    const papers = await Paper.find().populate('subjectIds', 'subName subCode maxMarks subPassMarks');
    res.json(papers);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getSemesters = async (req, res) => {
  try {
    const semesters = await User.distinct('currentSemester', { role: 'STUDENT' });
    res.json(semesters.filter(Boolean).sort((a, b) => a.localeCompare(b)));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ── Evaluator CRUD ───────────────────────────────────────────────────────────
exports.createEvaluator = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const existing = await User.findOne({ regdNo: email });
    if (existing) return res.status(400).json({ message: 'Evaluator already exists' });
    const evaluator = await User.create({
      fullName, regdNo: email, password,
      plainPassword: password, // Store plain password
      role: 'EVALUATOR', isSetupComplete: true
    });
    res.status(201).json({ message: 'Evaluator created successfully', evaluator });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ── Assignments ──────────────────────────────────────────────────────────────
exports.assignSubjects = async (req, res) => {
  try {
    const { studentIds, subjectIds, pagesRequired, academicYear, deadline, mode } = req.body;
    const createdBy = req.user._id;
    
    // Fetch students with their groups and subjects
    const students = await User.find({ _id: { $in: studentIds } }).populate('groupId');
    const subjects = await Subject.find({ _id: { $in: subjectIds } });

    // Fetch all Choice C subjects to determine their relative order (Pedagogy 1 vs 2)
    const semesters = [...new Set(subjects.map(s => s.semester).filter(Boolean))];
    const allChoiceSubjects = await Subject.find({ 
      semester: { $in: semesters }, 
      studentChoice: { $in: ['C', 'c'] } 
    }).lean();
    allChoiceSubjects.sort((a, b) => a.subCode.localeCompare(b.subCode));
    
    const choiceFieldMap = {};
    allChoiceSubjects.forEach((sub, index) => {
      choiceFieldMap[sub._id.toString()] = index === 0 ? 'pedagogy1Name' : 'pedagogy2Name';
    });

    // Fetch all evaluators who are assigned to these subjects to optimize lookup
    const evaluators = await User.find({
      role: 'EVALUATOR',
      subjects: { $in: subjectIds }
    }).lean();

    // Map subjectId string to evaluator user _id
    const subjectEvaluatorMap = {};
    evaluators.forEach(ev => {
      if (ev.subjects && Array.isArray(ev.subjects)) {
        ev.subjects.forEach(subId => {
          subjectEvaluatorMap[subId.toString()] = ev._id;
        });
      }
    });

    const studentAllocations = {}; // studentId string -> list of subject names
    for (const student of students) {
      for (const subject of subjects) {
        let belongsToMe = true;
        let assignedGroupName = '';

        if (subject.studentChoice === 'C' || subject.studentChoice === 'c') { 
          const pedField = choiceFieldMap[subject._id.toString()];
          const pedName = student.groupId && pedField ? student.groupId[pedField] : null;
          if (!pedName || String(pedName).trim() === '') {
            belongsToMe = false;
          } else {
            assignedGroupName = String(pedName).trim();
          }
        }

        if (belongsToMe) {
          const evaluatorId = subjectEvaluatorMap[subject._id.toString()] || null;

          await Assignment.findOneAndUpdate(
            { studentId: student._id, subjectId: subject._id },
            { 
              pagesRequired, 
              academicYear: academicYear || '', 
              deadline, 
              createdBy, 
              status: 'Pending',
              groupSubjectName: assignedGroupName,
              maxMarks: subject.maxMarks || 0,
              evaluatorId,
              mode: mode || 'Regular'
            },
            { upsert: true, new: true }
          );

          // Track successfully allocated subjects
          const sIdStr = student._id.toString();
          if (!studentAllocations[sIdStr]) {
            studentAllocations[sIdStr] = [];
          }
          const displayName = assignedGroupName 
            ? `${subject.subName} (${assignedGroupName})` 
            : subject.subName;
          studentAllocations[sIdStr].push(displayName);
        }
      }
    }

    // Dispatch emails asynchronously in the background
    (async () => {
      try {
        for (const [studentId, subjectNames] of Object.entries(studentAllocations)) {
          if (subjectNames.length === 0) continue;
          const student = students.find(s => s._id.toString() === studentId);
          if (student && student.email && student.email.trim() !== '') {
            await emailService.sendStudentAssignmentNotificationEmail({
              to: student.email.trim(),
              studentName: student.fullName,
              subjectNames,
              deadline
            });
          }
        }
      } catch (emailErr) {
        console.error('Failed to send student assignment notification emails:', emailErr.message);
      }
    })();
    
    res.status(200).json({ message: 'Subjects assigned to students successfully with smart group filtering applied.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ── Assignment Flow Helpers ──────────────────────────────────────────────────
exports.getAssignmentFilters = async (req, res) => {
  try {
    const colleges = await College.find().select('collegeCode collegeName');
    const courses = await Course.find().select('courseCode courseName');
    const semesters = await Subject.distinct('semester');
    const groups = await Group.find().select('groupCode groupName');
    
    res.json({ colleges, courses, semesters: semesters.filter(Boolean), groups });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getAssignmentData = async (req, res) => {
  try {
    const { collegeCode, courseCode, semester, groupCode } = req.query;
    
    let students = [];
    let subjects = [];

    // 1. Fetch Students (Filtered by College, Course, Semester, Group)
    const studentQuery = { role: 'STUDENT' };
    let shouldFetchStudents = false;

    if (collegeCode) {
      const college = await College.findOne({ collegeCode });
      if (college) studentQuery.collegeId = college._id;
      shouldFetchStudents = true;
    }

    if (courseCode || groupCode) {
      const groupQuery = {};
      if (groupCode) groupQuery.groupCode = groupCode;
      if (courseCode) {
        const course = await Course.findOne({ courseCode });
        if (course) groupQuery.courseId = course._id;
      }
      const groups = await Group.find(groupQuery);
      if (groups.length > 0) {
        studentQuery.groupId = { $in: groups.map(g => g._id) };
      } else {
        studentQuery.groupId = null;
      }
      shouldFetchStudents = true;
    }

    if (semester) {
      studentQuery.currentSemester = semester;
      shouldFetchStudents = true;
    }

    if (shouldFetchStudents) {
      students = await User.find(studentQuery).select('fullName regdNo _id groupId currentSemester').populate('groupId');
    }

    // 2. Fetch Subjects
    if (semester) {
      subjects = await Subject.find({ semester }).sort({ createdAt: -1 }).lean();
    } else {
      subjects = [];
    }
    
    const uniqueGroups = new Map();
    students.forEach(s => {
      if (s.groupId) {
        uniqueGroups.set(s.groupId._id.toString(), s.groupId);
      }
    });

    const displaySubjects = [];
    
    const regularSubjects = subjects.filter(s => s.studentChoice !== 'C' && s.studentChoice !== 'c');
    const choiceSubjects = subjects.filter(s => s.studentChoice === 'C' || s.studentChoice === 'c');
    choiceSubjects.sort((a, b) => a.subCode.localeCompare(b.subCode));
    
    for (const sub of regularSubjects) {
      displaySubjects.push({ ...sub, isGroupSubject: false });
    }
    
    for (let i = 0; i < choiceSubjects.length; i++) {
      const sub = choiceSubjects[i];
      const pedField = i === 0 ? 'pedagogy1Name' : 'pedagogy2Name';
      
      if (groupCode && uniqueGroups.size > 0) {
        let pedagogyNames = [];
        for (const [id, group] of uniqueGroups) {
          if (group[pedField]) pedagogyNames.push(group[pedField]);
        }
        pedagogyNames = [...new Set(pedagogyNames)];
        
        displaySubjects.push({
          ...sub,
          subName: pedagogyNames.length > 0 ? pedagogyNames.join(' / ') : sub.subName,
          isGroupSubject: true
        });
      } else {
        displaySubjects.push({
          ...sub,
          isGroupSubject: true
        });
      }
    }

    res.json({ students, subjects: displaySubjects });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ message: error.message }); 
  }
};

exports.assignToEvaluator = async (req, res) => {
  try {
    const { assignmentIds, evaluatorId } = req.body;
    await Assignment.updateMany(
      { _id: { $in: assignmentIds } },
      { $set: { evaluatorId } }
    );
    res.status(200).json({ message: 'Assignments delegated to evaluator successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate({
        path: 'studentId',
        select: 'fullName regdNo currentSemester collegeId courseId',
        populate: [
          { path: 'collegeId', select: 'collegeName' },
          { path: 'courseId', select: 'courseName' }
        ]
      })
      .populate('subjectId', 'subName subCode type semester maxMarks subPassMarks')
      .populate('evaluatorId', 'fullName')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getPaperGrades = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user?._id;
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required.' });
    }

    // 1. Fetch all Papers and their mapped subjects
    const papers = await Paper.find().populate('subjectIds').lean();

    // 2. Fetch all student assignments
    const assignments = await Assignment.find({ studentId }).lean();

    const assignmentMap = new Map(
      assignments.map(a => [a.subjectId.toString(), a])
    );

    const paperGrades = papers.map(paper => {
      let obtainedScore = 0;
      let paperMaxMarks = 0;
      let evaluatedCount = 0;
      let totalSubjectsCount = paper.subjectIds?.length || 0;
      const subjectsList = [];

      (paper.subjectIds || []).forEach(sub => {
        const assignment = assignmentMap.get(sub._id.toString());
        paperMaxMarks += sub.maxMarks || 0;

        if (assignment && assignment.status === 'Evaluated') {
          obtainedScore += assignment.score || 0;
          evaluatedCount++;
          subjectsList.push({
            subCode: sub.subCode,
            subName: sub.subName,
            score: assignment.score,
            maxMarks: sub.maxMarks,
            status: 'Evaluated'
          });
        } else {
          subjectsList.push({
            subCode: sub.subCode,
            subName: sub.subName,
            score: null,
            maxMarks: sub.maxMarks,
            status: assignment ? assignment.status : 'Not Assigned'
          });
        }
      });

      let paperStatus = 'Pending';
      if (totalSubjectsCount > 0) {
        if (evaluatedCount === totalSubjectsCount) paperStatus = 'Evaluated';
        else if (evaluatedCount > 0) paperStatus = 'Partially Evaluated';
      }

      return {
        paperCode: paper.paperCode,
        paperName: paper.paperName,
        semester: paper.semester,
        passMarks: paper.passMarks || 0,
        maxMarks: paperMaxMarks,
        obtainedScore: evaluatedCount > 0 ? obtainedScore : null,
        status: paperStatus,
        subjects: subjectsList
      };
    });

    res.json(paperGrades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignSubjectsToEvaluator = async (req, res) => {
  try {
    const { id } = req.params;
    const { allocations, subjectIds, groupSubjects } = req.body;
    
    // 1. Fetch evaluator to get existing subjects
    const evaluator = await User.findById(id);
    if (!evaluator) return res.status(404).json({ message: 'Evaluator not found' });

    let finalSubjectIds = (evaluator.subjects || []).map(sid => sid.toString());
    let finalGroupSubjects = evaluator.groupSubjects || [];

    if (allocations && Array.isArray(allocations) && allocations.length > 0) {
      // Modern allocations flow
      for (const allocation of allocations) {
        const { subjectId, groupSubjectName, splitMethod, collegeIds, rollStart, rollEnd, valuationDeadline } = allocation;
        
        // Accumulate subjects & group subjects in evaluator
        if (subjectId) {
          finalSubjectIds.push(subjectId.toString());
        }
        if (groupSubjectName && groupSubjectName.trim() !== '') {
          finalGroupSubjects.push(groupSubjectName.trim());
        }

        // Build the update payload
        const updateFields = {
          evaluatorId: id
        };
        if (valuationDeadline) {
          updateFields.valuationDeadline = new Date(valuationDeadline);
        } else {
          updateFields.valuationDeadline = null;
        }

        // Build Assignment query
        const assignmentQuery = {};
        if (subjectId) {
          assignmentQuery.subjectId = subjectId;
        } else if (groupSubjectName) {
          assignmentQuery.groupSubjectName = groupSubjectName;
        } else {
          continue; // skip if neither
        }

        // Apply filters based on splitMethod
        if (splitMethod === 'COLLEGE' && collegeIds && collegeIds.length > 0) {
          const students = await User.find({ role: 'STUDENT', collegeId: { $in: collegeIds } }).select('_id');
          const studentIds = students.map(s => s._id);
          assignmentQuery.studentId = { $in: studentIds };
        } else if (splitMethod === 'RANGE') {
          const studentQuery = { role: 'STUDENT' };
          studentQuery.regdNo = {};
          if (rollStart) studentQuery.regdNo.$gte = rollStart.trim();
          if (rollEnd) studentQuery.regdNo.$lte = rollEnd.trim();

          const students = await User.find(studentQuery).select('_id');
          const studentIds = students.map(s => s._id);
          assignmentQuery.studentId = { $in: studentIds };
        }

        // Bulk update matching Assignments
        await Assignment.updateMany(
          assignmentQuery,
          { $set: updateFields }
        );
      }
    } else {
      // Legacy flow
      if (subjectIds && subjectIds.length > 0) {
        finalSubjectIds = [...finalSubjectIds, ...subjectIds];
        await Assignment.updateMany(
          { subjectId: { $in: subjectIds } },
          { $set: { evaluatorId: id } }
        );
      }
      if (groupSubjects && groupSubjects.length > 0) {
        finalGroupSubjects = [...finalGroupSubjects, ...groupSubjects];
        await Assignment.updateMany(
          { groupSubjectName: { $in: groupSubjects } },
          { $set: { evaluatorId: id } }
        );
      }
    }

    // Unique arrays
    evaluator.subjects = [...new Set(finalSubjectIds)];
    evaluator.groupSubjects = [...new Set(finalGroupSubjects)];
    
    await evaluator.save();
    await evaluator.populate('subjects');

    // Trigger Email Notification in the background
    try {
      const allocatedRegularSubjects = await Subject.find({ _id: { $in: evaluator.subjects } }).lean();
      await emailService.sendEvaluatorAllocationEmail({
        to: evaluator.regdNo,
        evaluatorName: evaluator.fullName,
        password: evaluator.plainPassword || null,
        subjectList: allocatedRegularSubjects,
        groupSubjectList: evaluator.groupSubjects
      });
    } catch (emailErr) {
      console.error('Evaluator email notification failed:', emailErr.message);
    }

    res.json({ message: 'Subjects assigned successfully', evaluator });
  } catch (error) {
    console.error('assignSubjectsToEvaluator error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getUniqueGroupSubjects = async (req, res) => {
  try {
    const groups = await Group.find().lean();
    const subSet = new Set();
    groups.forEach(g => {
      if (g.pedagogy1Name && g.pedagogy1Name.trim() !== '') subSet.add(g.pedagogy1Name.trim());
      if (g.pedagogy2Name && g.pedagogy2Name.trim() !== '') subSet.add(g.pedagogy2Name.trim());
    });
    res.json([...subSet].sort());
  } catch (error) { res.status(500).json({ message: error.message }); }
};
exports.getBacklogCandidates = async (req, res) => {
  try {
    const students = await User.find({ role: 'STUDENT' }).lean();
    const subjects = await Subject.find().lean();
    const candidates = [];
    for (const student of students) {
      const currentSem = student.currentSemester;
      if (!currentSem) continue;
      const semMatch = currentSem.match(/(\d+)/);
      if (!semMatch) continue;
      const currentNum = parseInt(semMatch[1], 10);
      const priorSemesters = [];
      for (let i = 1; i < currentNum; i++) priorSemesters.push(`Semester ${i}`);
      const priorSubjects = subjects.filter(s => priorSemesters.includes(s.semester));
      for (const sub of priorSubjects) {
        const assignment = await Assignment.findOne({ studentId: student._id, subjectId: sub._id }).lean();
        if (!assignment) {
          candidates.push({ studentId: student, subjectId: sub, reason: 'Missed', score: null });
        } else if (assignment.status === 'Evaluated') {
          const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
          if (assignment.score < passMark) {
            candidates.push({ studentId: student, subjectId: sub, reason: 'Failed', score: assignment.score });
          }
        }
      }
    }
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.bulkAssignBacklogs = async (req, res) => {
  try {
    const { candidates, pagesRequired, academicYear, deadline } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ message: 'No candidates provided' });
    }
    const createdBy = req.user ? req.user._id : null;

    // Fetch unique studentIds and subjectIds from candidates to map detailed data
    const uniqueStudentIds = [...new Set(candidates.map(c => c.studentId))];
    const uniqueSubjectIds = [...new Set(candidates.map(c => c.subjectId))];

    const students = await User.find({ _id: { $in: uniqueStudentIds } }).lean();
    const subjects = await Subject.find({ _id: { $in: uniqueSubjectIds } }).lean();

    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });

    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s._id.toString()] = s; });

    const studentAllocations = {}; // studentId string -> list of subject names

    for (const c of candidates) {
      const { studentId, subjectId } = c;
      await Assignment.findOneAndUpdate(
        { studentId, subjectId },
        {
          pagesRequired,
          academicYear: academicYear || '',
          deadline,
          createdBy,
          status: 'Pending',
          mode: 'Supply',
          evaluatorId: null,
          score: null,
          feedback: null
        },
        { upsert: true, new: true }
      );

      // Track the allocated backlog subject
      const sIdStr = studentId.toString();
      const subIdStr = subjectId.toString();
      const student = studentMap[sIdStr];
      const subject = subjectMap[subIdStr];
      if (student && subject) {
        if (!studentAllocations[sIdStr]) {
          studentAllocations[sIdStr] = [];
        }
        studentAllocations[sIdStr].push(subject.subName);
      }
    }

    // Dispatch background email notifications for supply backlog subjects
    (async () => {
      try {
        for (const [studentId, subjectNames] of Object.entries(studentAllocations)) {
          if (subjectNames.length === 0) continue;
          const student = studentMap[studentId];
          if (student && student.email && student.email.trim() !== '') {
            await emailService.sendStudentAssignmentNotificationEmail({
              to: student.email.trim(),
              studentName: student.fullName,
              subjectNames,
              deadline
            });
          }
        }
      } catch (emailErr) {
        console.error('Failed to send student backlog assignment notification emails:', emailErr.message);
      }
    })();

    res.json({ message: 'Backlog assignments created/updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
