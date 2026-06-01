const User = require('../models/User');
const SessionLog = require('../models/SessionLog');
const { College } = require('../models/MasterData');
const emailService = require('./emailService');
const AppError = require('../utils/AppError');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (id, role, sessionId) => {
  return jwt.sign({ id, role, sessionId }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '45m'
  });
};

exports.login = async ({ regdNo, password, email }, ipAddress = 'Unknown') => {
  let user;
  if (regdNo) {
    user = await User.findOne({ regdNo: new RegExp(`^${regdNo.trim()}$`, 'i') });
  } else if (email) {
    user = await User.findOne({ regdNo: new RegExp(`^${email.trim()}$`, 'i') });
  }

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.role === 'STUDENT' && !user.isSetupComplete) {
    throw new AppError('Please create your account before login', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const sessionId = crypto.randomUUID();
  user.currentSessionId = sessionId;
  await user.save();

  // Determine Location if possible (mocked based on IP or simple lookup could go here, for now save IP)
  let location = 'Local/Unknown';
  if (ipAddress && ipAddress !== '::1' && ipAddress !== '127.0.0.1' && ipAddress !== 'Unknown') {
    location = 'Remote Network';
  }

  // Record Session
  await SessionLog.create({
    userId: user._id,
    userName: user.fullName || user.regdNo,
    role: user.role,
    loginTime: new Date(),
    ipAddress,
    location
  });

  return {
    _id: user._id,
    regdNo: user.regdNo,
    fullName: user.fullName,
    role: user.role,
    token: generateToken(user._id, user.role, sessionId)
  };
};

exports.logout = async (user) => {
  if (user && user.currentSessionId) {
    const sessionLog = await SessionLog.findOne({ userId: user._id }).sort({ loginTime: -1 });
    if (sessionLog && !sessionLog.logoutTime) {
      sessionLog.logoutTime = new Date();
      sessionLog.durationSeconds = Math.round((sessionLog.logoutTime - sessionLog.loginTime) / 1000);
      await sessionLog.save();
    }
    user.currentSessionId = null;
    await user.save();
  }
  return { message: 'Logged out successfully' };
};

exports.sendOtp = async ({ regdNo, email, role, collegeId }) => {
  let user;
  if (role === 'PRINCIPAL') {
    if (!email || !collegeId) {
      throw new AppError('College and email address are required.', 400);
    }
    user = await User.findOne({ regdNo: email, collegeId, role: 'PRINCIPAL' });
  } else {
    if (!regdNo || !email) {
      throw new AppError('Registration number and email address are required.', 400);
    }
    user = await User.findOne({ regdNo, role: 'STUDENT' });
  }

  if (!user) {
    throw new AppError('User record not found.', 404);
  }

  if (user.isSetupComplete) {
    throw new AppError('Account is already set up. Please log in.', 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  if (user.email && user.email.trim() !== '' && user.email.trim().toLowerCase() !== cleanEmail) {
    throw new AppError('The email provided does not match our records.', 400);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.tempOtp = otp;
  user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  if (!user.email) {
    user.email = cleanEmail;
  }
  
  await user.save();

  const emailResult = await emailService.sendStudentOtpEmail({ 
    to: cleanEmail, 
    studentName: user.fullName || 'User', 
    otp 
  });

  const isMock = emailResult && emailResult.mock;
  return {
    message: isMock 
      ? `OTP sent successfully. (Testing/Development Mode OTP: ${otp})`
      : `OTP verification email has been successfully sent to ${cleanEmail}.`,
    otp: isMock ? otp : undefined
  };
};

exports.setupAccount = async ({ regdNo, email, otp, password, role, collegeId }) => {
  let user;
  if (role === 'PRINCIPAL') {
    if (!email || !collegeId || !otp || !password) {
      throw new AppError('All fields are required.', 400);
    }
    user = await User.findOne({ regdNo: email, collegeId, role: 'PRINCIPAL' });
  } else {
    if (!regdNo || !email || !otp || !password) {
      throw new AppError('All fields are required.', 400);
    }
    user = await User.findOne({ regdNo, role: 'STUDENT' });
  }

  if (!user) {
    throw new AppError('User record not found.', 404);
  }
  
  if (user.isSetupComplete) {
    throw new AppError('Account is already set up. Please log in.', 400);
  }

  if (!user.tempOtp || user.tempOtp !== otp) {
    throw new AppError('Invalid OTP code.', 400);
  }

  if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  user.password = password;
  user.isSetupComplete = true;
  user.tempOtp = undefined;
  user.otpExpiresAt = undefined;
  user.email = email.trim().toLowerCase();
  
  const sessionId = crypto.randomUUID();
  user.currentSessionId = sessionId;
  
  await user.save();

  return {
    message: 'Account setup successful. You can now log in.',
    _id: user._id,
    regdNo: user.regdNo,
    fullName: user.fullName,
    role: user.role,
    token: generateToken(user._id, user.role, sessionId)
  };
};

exports.fixAdmin = async () => {
  let admin = await User.findOne({ regdNo: 'admin@aknu.edu' });
  if (!admin) {
    admin = new User({ regdNo: 'admin@aknu.edu' });
  }
  admin.role = 'ADMIN';
  admin.password = 'Admin@1234';
  admin.fullName = 'System Administrator';
  admin.isSetupComplete = true;
  await admin.save();
  return { message: 'Admin account has been reset. You can now login with email: admin@aknu.edu and password: Admin@1234' };
};

exports.createSysAdmin = async () => {
  let admin = await User.findOne({ regdNo: 'systemadmin@aknu.edu.in' });
  if (!admin) {
    admin = new User({ regdNo: 'systemadmin@aknu.edu.in' });
  }
  admin.role = 'SYSTEM_ADMIN';
  admin.password = 'SystemAdmin@2026';
  admin.fullName = 'System Administrator';
  admin.isSetupComplete = true;
  await admin.save();
  return { message: 'System Admin account has been created/reset. You can now login with email: systemadmin@aknu.edu.in and password: SystemAdmin@2026' };
};

exports.getCollegesList = async () => {
  const colleges = await College.find({}, 'collegeCode collegeName').lean();
  
  colleges.sort((a, b) => {
    const numA = parseInt(a.collegeCode, 10);
    const numB = parseInt(b.collegeCode, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return String(a.collegeCode).localeCompare(String(b.collegeCode));
  });

  return colleges;
};

exports.me = async (userId) => {
  const user = await User.findById(userId)
    .populate('collegeId', 'collegeName collegeCode')
    .populate('courseId', 'courseName courseCode')
    .select('-password -plainPassword -tempOtp -otpExpiresAt');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};
