const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createSysAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const adminExists = await User.findOne({ regdNo: 'systemadmin@aknu.edu.in' });
    if (adminExists) {
      console.log('System admin already exists.');
      
      const salt = await bcrypt.genSalt(10);
      adminExists.password = await bcrypt.hash('SystemAdmin@2026', salt);
      await adminExists.save();
      console.log('Password reset to SystemAdmin@2026');
      process.exit(0);
    }
    
    const admin = new User({
      regdNo: 'systemadmin@aknu.edu.in',
      password: 'SystemAdmin@2026',
      role: 'SYSTEM_ADMIN',
      fullName: 'System Administrator',
      isSetupComplete: true
    });
    
    await admin.save();
    console.log('System admin created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create system admin:', err);
    process.exit(1);
  }
};

createSysAdmin();
