const { College, Subject, Group, Course } = require('../../models/MasterData');
const User = require('../../models/User');
const Assignment = require('../../models/Assignment');
const Paper = require('../../models/Paper');
const BacklogFee = require('../../models/BacklogFee');
const xlsx = require('xlsx');
const emailService = require('../emailService');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');

const normalizeCode = (code) => {
  if (code == null) return '';
  const str = code.toString().trim().toUpperCase();
  return /^\d+$/.test(str) ? parseInt(str, 10).toString() : str;
};

exports.uploadMasterData = async ({ type, semester, academicYear, file }) => {
  if (!file) throw new AppError('No file uploaded.', 400);

  const workbook = xlsx.read(file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  if (!rawData || rawData.length === 0) {
    throw new AppError('Excel file is empty or could not be read.', 400);
  }

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

  const firstRow = data[0];
  const REQUIRED_COLS = {
    students: ['registration number', 'student name', 'college code', 'group code'],
    colleges: ['college code', 'college name'],
    courses:  ['course code', 'course name'],
    groups:   ['group code', 'course code', 'group name', 'pedagogy1 name', 'pedagogy2 name'],
    subjects: [], 
    evaluators: ['full name'],
    principals: ['full name', 'college code'],
    backlogfees: ['registration number']
  };

  if (type !== 'subjects' && REQUIRED_COLS[type]) {
    const missing = REQUIRED_COLS[type].filter(col => !(col in firstRow));
    
    if (type === 'evaluators' || type === 'principals') {
      const hasEmail = Object.keys(firstRow).some(k => ['email', 'email address', 'username', 'registration number', 'regdno'].includes(k));
      if (!hasEmail) {
        missing.push('email');
      }
    }

    if (missing.length > 0) {
      const displayNames = missing.map(m => m.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      throw new AppError(`Missing required columns: ${displayNames.join(', ')}`, 400);
    }
  } else if (type === 'subjects') {
    const hasCode = 'subject code' in firstRow || 'sub code' in firstRow;
    const hasName = 'subject name' in firstRow || 'sub name' in firstRow;
    const missing = [];
    if (!hasCode) missing.push('Subject Code');
    if (!hasName) missing.push('Subject Name');
    if (missing.length > 0) {
      throw new AppError(`Missing required columns: ${missing.join(', ')}`, 400);
    }
  }

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

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; 
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
        const emailCol = (row['email'] || row['email address'] || row['student email'] || row['email id'])?.toString()?.trim() || '';

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
                academicYear: academicYear || '',
                mobileNumber,
                email: emailCol,
                role: 'STUDENT' 
              }
            },
            upsert: true
          }
        });

      } else if (type === 'colleges') {
        const collegeCode = row['college code']?.toString()?.trim();
        if (!collegeCode) { rowErrors.push({ row: rowNum, message: 'College Code is empty.' }); continue; }
        
        const updateData = {
          collegeName: row['college name']?.trim(), 
          location: row['location']?.trim(), 
          district: row['district']?.trim()
        };

        if (row['latitude'] !== undefined) {
          const latVal = Number(row['latitude']);
          if (!isNaN(latVal)) updateData.latitude = latVal;
        }
        if (row['longitude'] !== undefined) {
          const lonVal = Number(row['longitude']);
          if (!isNaN(lonVal)) updateData.longitude = lonVal;
        }

        const radiusKey = Object.keys(row).find(k => 
          k === 'radius meter' || 
          k === 'radiusmeter' || 
          k === 'radius' || 
          k === 'radius_meter' ||
          k === 'geofence radius (m)' ||
          k === 'geofence radius' ||
          k.includes('radius')
        );
        if (radiusKey && row[radiusKey] !== undefined) {
          const radVal = Number(row[radiusKey]);
          if (!isNaN(radVal)) updateData.radiusMeter = radVal;
        }

        operations.push({
          updateOne: {
            filter: { collegeCode },
            update: { $set: updateData },
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

        const subjects = [];
        for (const [key, value] of Object.entries(row)) {
          if (key.toLowerCase().startsWith('pedagogy') && key.toLowerCase().endsWith('name') && value?.toString().trim()) {
            subjects.push(value.toString().trim());
          }
        }

        operations.push({
          updateOne: {
            filter: { groupCode },
            update: { 
              $set: {
                courseId,
                groupName: row['group name']?.trim(), 
                subjects
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
        
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(rawPassword, salt);

        operations.push({
          updateOne: {
            filter: { regdNo },
            update: { 
              $set: {
                fullName,
                password,
                plainPassword: rawPassword, 
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
      } else if (type === 'backlogfees') {
        const regdNo = row['registration number']?.toString()?.trim();
        if (!regdNo) { rowErrors.push({ row: rowNum, message: 'Registration Number is empty.' }); continue; }
        const feeSemester = row['semester']?.toString()?.trim() || semester;
        if (!feeSemester) { rowErrors.push({ row: rowNum, message: 'Semester is empty.' }); continue; }
        
        operations.push({
          updateOne: {
            filter: { regdNo, semester: feeSemester },
            update: { 
              $set: {
                name: row['student name']?.trim(),
                collegeCode: row['college code']?.trim(),
                courseCode: row['course code']?.trim()
              }
            },
            upsert: true
          }
        });
      }
    } catch (rowErr) {
      rowErrors.push({ row: rowNum, message: rowErr.message });
    }
  }

  if (operations.length > 0) {
    let Model;
    if (type === 'students' || type === 'evaluators' || type === 'principals') Model = User;
    else if (type === 'colleges') Model = College;
    else if (type === 'courses') Model = Course;
    else if (type === 'groups') Model = Group;
    else if (type === 'subjects' || type === 'subjectmaps') Model = Subject;
    else if (type === 'papers') Model = Paper;
    else if (type === 'backlogfees') Model = BacklogFee;

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

  if (successCount === 0 && rowErrors.length > 0) {
    throw new AppError(`Upload failed. All ${rowErrors.length} rows had errors.`, 400);
  }

  if (type === 'principals' && successCount > 0 && principalsToEmail.length > 0) {
    Promise.all(principalsToEmail.map(p => emailService.sendPrincipalOnboardingEmail(p)))
      .catch(err => console.error('Error sending principal onboarding emails:', err));
  }

  return {
    message: `${successCount} row(s) uploaded successfully${rowErrors.length > 0 ? `, ${rowErrors.length} row(s) had errors.` : '.'} Total parsed: ${data.length}`,
    successCount,
    parsedCount: data.length,
    errors: rowErrors,
  };
};

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
    case 'assignments': return Assignment;
    default: return null;
  }
};

exports.createRecord = async (type, body) => {
  const Model = getModelForType(type);
  if (!Model) throw new AppError('Invalid record type', 400);

  if (type === 'evaluators') {
    if (!body.fullName) throw new AppError('Full Name is required.', 400);
    if (!body.regdNo) throw new AppError('Email is required.', 400);
    if (!body.password) throw new AppError('Password is required.', 400);

    const existing = await User.findOne({ regdNo: body.regdNo });
    if (existing) throw new AppError('An evaluator with this email already exists.', 400);
    
    body.role = 'EVALUATOR';
    body.isSetupComplete = true;
    body.plainPassword = body.password; 
    
    const newRecord = new User(body);
    await newRecord.save();
    const populated = await User.findById(newRecord._id).populate('subjects').select('-password');
    return { message: 'Evaluator created successfully', record: populated };
  }

  if (type === 'principals') {
    const existing = await User.findOne({ regdNo: body.regdNo });
    if (existing) throw new AppError('A principal user with this email already exists.', 400);
    
    body.role = 'PRINCIPAL';
    body.isSetupComplete = false;
    
    const rawPassword = Math.random().toString(36).slice(-10) + 'A1!'; 
    const salt = await bcrypt.genSalt(10);
    body.password = await bcrypt.hash(rawPassword, salt);
    body.email = body.regdNo;
    
    if (body.collegeCode) {
      const college = await College.findOne({ collegeCode: body.collegeCode });
      if (college) body.collegeId = college._id;
    }
    
    const newRecord = new User(body);
    await newRecord.save();
    const populated = await User.findById(newRecord._id).populate('collegeId').select('-password');
    
    const mapped = populated.toObject();
    mapped.collegeCode = populated.collegeId?.collegeCode || '';
    
    emailService.sendPrincipalOnboardingEmail({
      to: body.regdNo,
      principalName: body.fullName || 'Principal',
      collegeName: populated.collegeId?.collegeName || mapped.collegeCode || 'your college'
    }).catch(err => console.error('Error sending onboarding email for manually created principal:', err));

    return { message: 'Principal created successfully and email sent', record: mapped };
  }

  if (type === 'papers' && body.subjectIds && Array.isArray(body.subjectIds)) {
    const subjects = await Subject.find({ subCode: { $in: body.subjectIds } });
    body.subjectIds = subjects.map(s => s._id);
    
    let calculatedMaxMarks = 0;
    let calculatedPassMarks = 0;
    subjects.forEach(s => {
      calculatedMaxMarks += (Number(s.maxMarks) || 0);
      calculatedPassMarks += (Number(s.subPassMarks) || 0);
    });
    body.maxMarks = calculatedMaxMarks;
    body.passMarks = calculatedPassMarks;
  }

  if (type === 'students') {
    if (body.collegeCode) {
      const college = await College.findOne({ collegeCode: body.collegeCode });
      if (college) body.collegeId = college._id;
    }
    if (body.groupCode) {
      const group = await Group.findOne({ groupCode: body.groupCode });
      if (group) {
        body.groupId = group._id;
        body.courseId = group.courseId;
      }
    }
  }

  if (type === 'groups') {
    if (body.courseCode) {
      const course = await Course.findOne({ courseCode: body.courseCode });
      if (course) body.courseId = course._id;
    }
  }

  if (type === 'colleges') {
    if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
      body.latitude = Number(body.latitude);
    } else {
      body.latitude = null;
    }
    if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
      body.longitude = Number(body.longitude);
    } else {
      body.longitude = null;
    }
    if (body.radiusMeter !== undefined && body.radiusMeter !== null && body.radiusMeter !== '') {
      body.radiusMeter = Number(body.radiusMeter);
    } else {
      body.radiusMeter = 200;
    }
  }

  try {
    const newRecord = new Model(body);
    await newRecord.save();
    return { message: 'Record created successfully', record: newRecord };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('A record with this unique code/ID already exists.', 400);
    }
    throw error;
  }
};

exports.updateRecord = async (type, id, body) => {
  const Model = getModelForType(type);
  if (!Model) throw new AppError('Invalid record type', 400);

  if (type === 'evaluators') {
    if (body.fullName !== undefined && !body.fullName.trim()) throw new AppError('Full Name is required.', 400);
    if (body.regdNo !== undefined && !body.regdNo.trim()) throw new AppError('Email is required.', 400);

    const evaluator = await User.findById(id);
    if (!evaluator) throw new AppError('Evaluator not found', 404);
    
    if (body.regdNo && body.regdNo !== evaluator.regdNo) {
      const existing = await User.findOne({ regdNo: body.regdNo });
      if (existing) throw new AppError('An evaluator with this email already exists.', 400);
    }
    
    let diffMessages = [];
    if (body.fullName && body.fullName !== evaluator.fullName) diffMessages.push(`fullName changed from '${evaluator.fullName}' to '${body.fullName}'`);
    if (body.regdNo && body.regdNo !== evaluator.regdNo) diffMessages.push(`email changed from '${evaluator.regdNo}' to '${body.regdNo}'`);
    const diffString = diffMessages.length > 0 ? diffMessages.join(', ') : 'No visible fields changed';

    evaluator.fullName = body.fullName || evaluator.fullName;
    evaluator.regdNo = body.regdNo || evaluator.regdNo;
    
    if (body.password && body.password.trim() !== '') {
      evaluator.password = body.password;
      evaluator.plainPassword = body.password;
    }
    
    if (body.subjects) {
      evaluator.subjects = body.subjects;
    }
    
    await evaluator.save();
    const updated = await User.findById(id).populate('subjects').select('-password');
    return { message: 'Evaluator updated successfully', record: updated, diffString };
  }

  if (type === 'principals') {
    const principal = await User.findById(id);
    if (!principal) throw new AppError('Principal not found', 404);
    
    let diffMessages = [];
    if (body.fullName && body.fullName !== principal.fullName) diffMessages.push(`fullName changed from '${principal.fullName}' to '${body.fullName}'`);
    if (body.regdNo && body.regdNo !== principal.regdNo) diffMessages.push(`email changed from '${principal.regdNo}' to '${body.regdNo}'`);
    const diffString = diffMessages.length > 0 ? diffMessages.join(', ') : 'No visible fields changed';

    principal.fullName = body.fullName || principal.fullName;
    principal.regdNo = body.regdNo || principal.regdNo;
    
    if (body.password && body.password.trim() !== '') {
      principal.password = body.password;
    }
    
    if (body.collegeCode) {
      const college = await College.findOne({ collegeCode: body.collegeCode });
      if (college) principal.collegeId = college._id;
    }
    
    await principal.save();
    const updated = await User.findById(id).populate('collegeId').select('-password');
    
    const mapped = updated.toObject();
    mapped.collegeCode = updated.collegeId?.collegeCode || '';
    return { message: 'Principal updated successfully', record: mapped, diffString };
  }

  if (type === 'papers' && body.subjectIds && Array.isArray(body.subjectIds)) {
    const subjects = await Subject.find({ subCode: { $in: body.subjectIds } });
    body.subjectIds = subjects.map(s => s._id);
    
    let calculatedMaxMarks = 0;
    let calculatedPassMarks = 0;
    subjects.forEach(s => {
      calculatedMaxMarks += (Number(s.maxMarks) || 0);
      calculatedPassMarks += (Number(s.subPassMarks) || 0);
    });
    body.maxMarks = calculatedMaxMarks;
    body.passMarks = calculatedPassMarks;
  }

  if (type === 'students') {
    if (body.collegeCode) {
      const college = await College.findOne({ collegeCode: body.collegeCode });
      if (college) body.collegeId = college._id;
    }
    if (body.groupCode) {
      const group = await Group.findOne({ groupCode: body.groupCode });
      if (group) {
        body.groupId = group._id;
        body.courseId = group.courseId;
      }
    }
  }

  if (type === 'groups') {
    if (body.courseCode) {
      const course = await Course.findOne({ courseCode: body.courseCode });
      if (course) body.courseId = course._id;
    }
  }

  if (type === 'colleges') {
    if (body.latitude !== undefined) {
      body.latitude = (body.latitude === null || body.latitude === '') ? null : Number(body.latitude);
    }
    if (body.longitude !== undefined) {
      body.longitude = (body.longitude === null || body.longitude === '') ? null : Number(body.longitude);
    }
    if (body.radiusMeter !== undefined) {
      body.radiusMeter = (body.radiusMeter === null || body.radiusMeter === '') ? 200 : Number(body.radiusMeter);
    }
  }

  if (type === 'assignments') {
    if (body.suggestedMarksDeadline !== undefined && (body.suggestedMarksDeadline === null || body.suggestedMarksDeadline === '')) {
      throw new AppError('Suggested Marks Deadline is required.', 400);
    }
  }

  const oldRecord = await Model.findById(id).lean();
  if (!oldRecord) throw new AppError('Record not found', 404);

  let diffMessages = [];
  for (const key of Object.keys(body)) {
    if (['password', 'plainPassword', '_id', '__v', 'createdAt', 'updatedAt'].includes(key)) continue;
    
    const oldVal = oldRecord[key] !== undefined ? String(oldRecord[key]) : '';
    const newVal = body[key] !== undefined ? String(body[key]) : '';
    
    if (oldVal !== newVal) {
      diffMessages.push(`${key} changed from '${oldVal}' to '${newVal}'`);
    }
  }
  const diffString = diffMessages.length > 0 ? diffMessages.join(', ') : 'No visible fields changed';

  const updated = await Model.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  return { message: 'Record updated successfully', record: updated, diffString };
};

exports.deleteRecord = async (type, id) => {
  const Model = getModelForType(type);
  if (!Model) throw new AppError('Invalid record type', 400);

  const deleted = await Model.findByIdAndDelete(id);
  if (!deleted) throw new AppError('Record not found', 404);
  return { message: 'Record deleted successfully' };
};

exports.getStudents = async () => {
  const students = await User.find({ role: 'STUDENT' })
    .populate('collegeId', 'collegeCode')
    .populate('groupId', 'groupCode')
    .populate('courseId', 'courseCode')
    .select('-password')
    .lean();
  
  return students.map(s => ({
    ...s,
    collegeCode: s.collegeId?.collegeCode || '',
    groupCode: s.groupId?.groupCode || '',
    courseCode: s.courseId?.courseCode || ''
  }));
};

exports.getSubjectMaps = async () => {
  return await Subject.find({ studentChoice: 'C' });
};

exports.getSubjects = async () => {
  return await Subject.find().sort({ createdAt: -1 });
};

exports.getEvaluators = async () => {
  return await User.find({ role: 'EVALUATOR' })
    .populate('subjects')
    .select('-password')
    .lean();
};

exports.getPrincipals = async () => {
  const principals = await User.find({ role: 'PRINCIPAL' })
    .populate('collegeId', 'collegeCode collegeName')
    .select('-password')
    .lean();
  
  return principals.map(p => ({
    ...p,
    collegeCode: p.collegeId?.collegeCode || '',
    collegeName: p.collegeId?.collegeName || ''
  }));
};

exports.getColleges = async () => {
  return await College.find().sort({ collegeCode: 1 });
};

exports.getGroups = async () => {
  const groups = await Group.find()
    .populate('courseId', 'courseCode')
    .lean();

  return groups.map(g => ({
    ...g,
    courseCode: g.courseId?.courseCode || ''
  }));
};

exports.getCourses = async () => {
  return await Course.find();
};

exports.getPapers = async () => {
  return await Paper.find().populate('subjectIds', 'subName subCode maxMarks subPassMarks');
};

exports.getSemesters = async () => {
  const standardSemesters = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
  const dbSemesters = await User.distinct('currentSemester', { role: 'STUDENT' });
  const allSemesters = [...new Set([...standardSemesters, ...dbSemesters.filter(Boolean)])];
  return allSemesters.sort((a, b) => a.localeCompare(b));
};

exports.getUniqueGroupSubjects = async () => {
  const groups = await Group.find().lean();
  const subSet = new Set();
  groups.forEach(g => {
    if (g.subjects && Array.isArray(g.subjects)) {
      g.subjects.forEach(sub => {
        if (sub && sub.trim() !== '') subSet.add(sub.trim());
      });
    }
  });
  return [...subSet].sort();
};

exports.promoteStudents = async ({ studentIds, toSemester }) => {
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    throw new AppError('No students selected.', 400);
  }
  if (!toSemester) {
    throw new AppError('Target semester is required.', 400);
  }

  const result = await User.updateMany(
    { _id: { $in: studentIds }, role: 'STUDENT' },
    { $set: { currentSemester: toSemester } }
  );

  return { message: `${result.modifiedCount} student(s) promoted to ${toSemester} successfully.` };
};
