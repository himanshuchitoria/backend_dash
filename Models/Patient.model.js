const mongoose = require('mongoose');

const patientSchema = mongoose.Schema({
    name: {
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
    dateOfBirth: {
        type: String,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
    },
    contactNumber: {
        type: String,
    },
    mobileNumber: {
        type: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'other'],
    },
    // Appointments associated with this patient
    appointments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointments',
    }],
    // Add this field for role-based auth!
    role: {
        type: String,
        default: "patient",
        required: true,
    },
}, { timestamps: true });

const PatientModel = mongoose.model('Patients', patientSchema);

module.exports = PatientModel;
