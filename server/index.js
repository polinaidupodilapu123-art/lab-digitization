const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require('dns');
const path = require('path');

// Force Node.js to use Google DNS (8.8.8.8) to bypass ISP DNS blocks on SRV records
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const evaluatorRoutes = require('./routes/evaluatorRoutes');
const studentRoutes = require('./routes/studentRoutes');

const PORT = process.env.PORT || 5000;

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/evaluator', evaluatorRoutes);
app.use('/api/student', studentRoutes);

app.get('/', (req, res) => {
  res.send('API Running');
});

// Connect to MongoDB then start server
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    // Auto-seed default ADMIN account if none exists
    const User = require('./models/User');
    const existing = await User.findOne({ role: 'ADMIN' });
    if (!existing) {
      await User.create({
        regdNo: 'admin@aknu.edu',
        fullName: 'System Administrator',
        role: 'ADMIN',
        password: 'Admin@1234',
        isSetupComplete: true
      });
      console.log('🌱 Default admin created → regdNo: admin@aknu.edu  password: Admin@1234');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
