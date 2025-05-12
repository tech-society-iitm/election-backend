const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./src/models/userModel');

dotenv.config(); // Ensure this is loading the correct .env file

// Debug log to verify MONGODB_URI
console.log('MONGODB_URI:', process.env.MONGODB_URI);

const DB = process.env.MONGODB_URI;
console.log('Connecting to MongoDB:', DB);
console.log('Environment Variables:', process.env);

async function addAdmin() {
  await mongoose.connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const email = 'admin@iitm.ac.in';
  const password = 'admin1234';

  // Check if admin already exists
  let admin = await User.findOne({ email });
  if (admin) {
    console.log('Admin already exists.');
    process.exit(0);
  }

  admin = await User.create({
    name: 'Admin',
    email,
    password, // plain password: hashed once by your pre-save hook
    studentId: 'ADMIN001',
    role: 'admin'
  });

  console.log('Admin user created:', admin.email);
  process.exit(0);
}

addAdmin().catch(err => {
  console.error('Error creating admin:', err);
  process.exit(1);
});
