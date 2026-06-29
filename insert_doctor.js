/**
 * insert_doctor.js — Standalone script to insert a Doctor into MongoDB
 * Usage: node insert_doctor.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('./Config/server');
const DoctorModel = require('./Models/Doctor.model');
const getRandomDoctorImage = require('./Utils/StaticData');

async function createDoctor() {
  try {
    // 1. Connect to MongoDB
    console.log("Connecting to database...");
    await connectDB();

    // 2. Define Doctor Details (Customize these parameters as needed)
    const doctorData = {
      name: "Dr. Rajesh Sharma",
      firstName: "Rajesh",
      lastName: "Sharma",
      email: "doctor@reformme.com", // Change email if desired
      password: "password123",       // Change password if desired
      specialty: "Senior Physiotherapist & Orthopedic Specialist",
      clinicLocation: "ReformMe Healthcare Clinic, Gurugram",
      contactNumber: "+91 9024989935",
      mobileNumber: "+91 9024989935",
      workingHours: "Mon - Sat: 09:00 AM - 08:00 PM",
      about: "Over 15 years of clinical experience in orthopedic rehabilitation, sports injury recovery, and holistic pain management in Gurugram.",
      role: "doctor"
    };

    console.log(`Checking if doctor with email '${doctorData.email}' already exists...`);
    const existingDoctor = await DoctorModel.findOne({ email: doctorData.email });

    if (existingDoctor) {
      console.log(`\n⚠️ Doctor with email '${doctorData.email}' already exists in database!`);
      console.log(`Doctor ID: ${existingDoctor._id}`);
      process.exit(0);
    }

    // 3. Hash password securely
    console.log("Hashing password...");
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(doctorData.password, saltRounds);

    // 4. Create and save new doctor
    console.log("Creating new doctor record...");
    const newDoctor = new DoctorModel({
      ...doctorData,
      password: hashedPassword,
      profile: typeof getRandomDoctorImage === 'function' ? getRandomDoctorImage() : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80"
    });

    const savedDoctor = await newDoctor.save();

    console.log("\n🎉 Doctor inserted successfully!");
    console.log("-----------------------------------------");
    console.log(`ID:        ${savedDoctor._id}`);
    console.log(`Name:      ${savedDoctor.name}`);
    console.log(`Email:     ${savedDoctor.email}`);
    console.log(`Password:  ${doctorData.password}`);
    console.log(`Specialty: ${savedDoctor.specialty}`);
    console.log("-----------------------------------------");
    console.log("You can now log in at http://localhost:3000/login choosing the 'Doctor' tab!");

  } catch (error) {
    console.error("❌ Error inserting doctor:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

createDoctor();
