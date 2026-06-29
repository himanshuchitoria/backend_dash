const mongoose = require('mongoose');
require('dotenv').config();

const DoctorModel = require('./Models/Doctor.model');

const createTestDoctor = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/doctors');
    console.log('Connected to MongoDB');

    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('doctor123', saltRounds);

    const testDoctor = new DoctorModel({
      firstName: 'Test',
      lastName: 'Doctor',
      email: 'doctor@test.com',
      password: hashedPassword,
      specialty: 'General Medicine',
      clinicLocation: 'Hospital',
      contactNumber: '1234567890',
      role: 'doctor',
      profile: 'https://randomuser.me/api/portraits/men/32.jpg'
    });

    await testDoctor.save();
    console.log('Test doctor created successfully!');
    console.log('Email: doctor@test.com');
    console.log('Password: doctor123');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createTestDoctor();