const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

exports.studentSetup = async (req, res) => {
  try {
    const { regdNo, password } = req.body;
    
    // Find the student created by admin bulk upload
    const student = await User.findOne({ regdNo, role: 'STUDENT' });
    
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }
    
    if (student.isSetupComplete) {
      return res.status(400).json({ message: 'Account is already set up. Please log in.' });
    }

    // Set password and mark setup as complete
    student.password = password;
    student.isSetupComplete = true;
    await student.save();

    res.status(200).json({
      message: 'Account setup successful. You can now log in.',
      _id: student._id,
      regdNo: student.regdNo,
      fullName: student.fullName,
      role: student.role,
      token: generateToken(student._id, student.role)
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
