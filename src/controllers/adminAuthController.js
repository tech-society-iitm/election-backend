const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

// Generate JWT token
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Only allow admin email from .env
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials'
      });
    }

    // Find admin user
    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user) {
      console.log(`Admin user not found for email: ${email}`);
      return res.status(401).json({
        status: 'fail',
        message: 'Admin user not found'
      });
    }

    // Check password
    const correct = await bcrypt.compare(password, user.password);
    if (!correct) {
        console.log(password)
        console.log(correct)
        console.log('Hashed password in DB:', user.password);
        console.log(await bcrypt.hash(password, 12))
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid password'
      });
    }

    // Generate token
    const token = signToken(user._id);

    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
