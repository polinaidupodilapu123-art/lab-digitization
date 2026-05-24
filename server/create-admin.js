require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected.');

    const adminExists = await User.findOne({ regdNo: 'admin' });
    if (adminExists) {
      console.log('Admin already exists. Password might be admin123');
      process.exit(0);
    }

    const admin = new User({
      regdNo: 'admin',
      password: 'password123',
      role: 'ADMIN',
      fullName: 'System Administrator',
      isSetupComplete: true
    });

    await admin.save();
    console.log('Admin created successfully! regdNo: admin, password: password123');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
};

createAdmin();
