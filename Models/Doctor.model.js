const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  headTitle: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  image: {
    type: String, // URL or image path; optional
  },
  createdAt: {
    type: Date,
    default: Date.now, // automatically set creation date
  }
});

const DoctorSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  profile: {
    type: String,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  specialty: {
    type: String,
    default: "General Physician",
  },
  clinicLocation: {
    type: String,
    default: "Main Clinic",
  },
  contactNumber: {
    type: String,
  },
  mobileNumber: {
    type: String,
  },
  workingHours: {
    type: String,
  },
  about: {
    type: String,
  },
  appointments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointments',
  }],
  role: {
    type: String,
    default: "doctor",
    required: true,
  },

  blogs: [BlogSchema]  // Embedded blogs array added here
});

const DoctorModel = mongoose.model("Doctors", DoctorSchema);

module.exports = DoctorModel;
