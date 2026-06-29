const mongoose = require('mongoose');
require('dotenv').config();

const PatientModel = require('./Models/Patient.model');

const createTestPatient = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/doctors');
    console.log('Connected to MongoDB');

    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('patient123', saltRounds);

    const testPatient = new PatientModel({
      firstName: 'Test',
      lastName: 'Patient',
      email: 'patient@test.com',
      password: hashedPassword,
      contactNumber: '1234567890',
      gender: 'male',
      role: 'patient'
    });

    await testPatient.save();
    console.log('Test patient created successfully!');
    console.log('Email: patient@test.com');
    console.log('Password: patient123');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createTestPatient();