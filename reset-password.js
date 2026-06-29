const mongoose = require('mongoose');
require('dotenv').config();

const PatientModel = require('./Models/Patient.model');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/doctors');
    console.log('Connected to MongoDB');

    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('Bolder@123', saltRounds);

    const result = await PatientModel.updateOne(
      { email: 'thebolderdesignstudio@gmail.com' },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount > 0) {
      console.log('Password updated successfully!');
      console.log('Email: thebolderdesignstudio@gmail.com');
      console.log('New Password: Bolder@123');
    } else {
      console.log('No user found with this email');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

resetPassword();