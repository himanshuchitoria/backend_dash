// Controllers/Patient.authController.js

const crypto = require('crypto');
const PatientModel = require("../Models/Patient.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendPasswordResetEmail } = require("../Utils/email_service");

const resetTokenStore = new Map();

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Request password reset - send reset link email
const requestPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const patient = await PatientModel.findOne({ email });
    if (!patient) {
      return res.status(404).json({ message: "Email not found", status: false });
    }

    const resetToken = generateResetToken();
    const expires = Date.now() + 30 * 60 * 1000; // 30 minutes

    resetTokenStore.set(email, { resetToken, expires });

    const resetLink = `http://reformmehealthcare.me/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const patientName = patient.firstName || patient.name || 'Patient';

    const result = await sendPasswordResetEmail(email, patientName, resetLink);

    if (!result.success) {
      console.error('Failed to send email:', result.error);
      return res.status(500).json({ message: "Failed to send reset email. Please try again.", status: false });
    }

    console.log(`Password reset email sent to ${email}`);
    res.status(200).json({ message: "Password reset link sent to your email", status: true });
  } catch (error) {
    console.error("Error in requestPasswordResetOTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify token and reset password
const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    const record = resetTokenStore.get(email);

    if (!record) {
      return res.status(400).json({ message: "No password reset request found for this email", status: false });
    }

    if (record.expires < Date.now()) {
      resetTokenStore.delete(email);
      return res.status(400).json({ message: "Reset link expired", status: false });
    }

    if (record.resetToken !== token) {
      return res.status(400).json({ message: "Invalid reset token", status: false });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await PatientModel.findOneAndUpdate({ email }, { password: hashedPassword });

    resetTokenStore.delete(email);

    res.status(200).json({ message: "Password reset successful", status: true });
  } catch (error) {
    console.error("Error in verifyOTPAndResetPassword:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  requestPasswordResetOTP,
  verifyOTPAndResetPassword
};