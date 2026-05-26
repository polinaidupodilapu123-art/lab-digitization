const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { College } = require('../models/MasterData');
const emailService = require('../services/emailService');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d'
  });
};

exports.login = async (req, res) => {
  try {
    const { regdNo, password, email } = req.body;
    
    // Determine login type (Admin/Evaluator use email or some ID, student uses regdNo)
    let user;
    if (regdNo) {
      user = await User.findOne({ regdNo });
    } else if (email) {
      // In this setup, we can use regdNo as the unified login field for all, 
      // or map email to regdNo for admins. Let's assume regdNo acts as username.
      user = await User.findOne({ regdNo: email });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'STUDENT' && !user.isSetupComplete) {
      return res.status(403).json({ message: 'Please create your account before login' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      regdNo: user.regdNo,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user._id, user.role)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { regdNo, email, role, collegeId } = req.body;
    
    let user;
    if (role === 'PRINCIPAL') {
      if (!email || !collegeId) {
        return res.status(400).json({ message: 'College and email address are required.' });
      }
      user = await User.findOne({ regdNo: email, collegeId, role: 'PRINCIPAL' });
    } else {
      if (!regdNo || !email) {
        return res.status(400).json({ message: 'Registration number and email address are required.' });
      }
      user = await User.findOne({ regdNo, role: 'STUDENT' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User record not found.' });
    }

    if (user.isSetupComplete) {
      return res.status(400).json({ message: 'Account is already set up. Please log in.' });
    }

    // Clean and validate email format
    const cleanEmail = email.trim().toLowerCase();
    
    // If user has a registered email, enforce that it matches the input
    if (user.email && user.email.trim() !== '' && user.email.trim().toLowerCase() !== cleanEmail) {
      return res.status(400).json({ message: 'The email provided does not match our records.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.tempOtp = otp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
    
    // Save user email if not already present
    if (!user.email) {
      user.email = cleanEmail;
    }
    
    await user.save();

    console.log(`[EMAIL OTP] OTP for user ${user.fullName || regdNo}: ${otp} to email: ${cleanEmail}`);

    // Call the email service to send the OTP
    const emailResult = await emailService.sendStudentOtpEmail({ 
      to: cleanEmail, 
      studentName: user.fullName || 'User', 
      otp 
    });

    const isMock = emailResult && emailResult.mock;

    res.status(200).json({
      message: isMock 
        ? `OTP sent successfully. (Testing/Development Mode OTP: ${otp})`
        : `OTP verification email has been successfully sent to ${cleanEmail}.`,
      otp: isMock ? otp : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.setupAccount = async (req, res) => {
  try {
    const { regdNo, email, otp, password, role, collegeId } = req.body;

    let user;
    if (role === 'PRINCIPAL') {
      if (!email || !collegeId || !otp || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
      }
      user = await User.findOne({ regdNo: email, collegeId, role: 'PRINCIPAL' });
    } else {
      if (!regdNo || !email || !otp || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
      }
      user = await User.findOne({ regdNo, role: 'STUDENT' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User record not found.' });
    }
    
    if (user.isSetupComplete) {
      return res.status(400).json({ message: 'Account is already set up. Please log in.' });
    }

    // Verify OTP
    if (!user.tempOtp || user.tempOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Clear OTP fields, set password and complete setup
    user.password = password;
    user.isSetupComplete = true;
    user.tempOtp = undefined;
    user.otpExpiresAt = undefined;
    
    // Save email
    user.email = email.trim().toLowerCase();
    
    await user.save();

    res.status(200).json({
      message: 'Account setup successful. You can now log in.',
      _id: user._id,
      regdNo: user.regdNo,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.fixAdmin = async (req, res) => {
  try {
    let admin = await User.findOne({ regdNo: 'admin@aknu.edu' });
    if (!admin) {
      admin = new User({ regdNo: 'admin@aknu.edu' });
    }
    admin.role = 'ADMIN';
    admin.password = 'Admin@1234';
    admin.fullName = 'System Administrator';
    admin.isSetupComplete = true;
    await admin.save();
    res.json({ message: 'Admin account has been reset. You can now login with email: admin@aknu.edu and password: Admin@1234' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCollegesList = async (req, res) => {
  try {
    const colleges = await College.find({}, 'collegeCode collegeName').lean();
    
    // Sort logically by numeric values inside collegeCode if possible, otherwise string sort
    colleges.sort((a, b) => {
      const numA = parseInt(a.collegeCode, 10);
      const numB = parseInt(b.collegeCode, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a.collegeCode).localeCompare(String(b.collegeCode));
    });

    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
