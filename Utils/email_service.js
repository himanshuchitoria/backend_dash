// Utils/email_service.js
// Email service using Resend API for transactional emails

const fs = require('fs');
const path = require('path');

// Initialize Resend
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@reformmehealthcare.me';
const FROM_NAME = process.env.FROM_NAME || 'ReformMe Healthcare';

// Initialize Resend client if API key is available
let resendClient = null;
if (RESEND_API_KEY && RESEND_API_KEY.startsWith('re_')) {
  resendClient = new Resend(RESEND_API_KEY);
  console.log('Resend API initialized successfully');
} else {
  console.warn('RESEND_API_KEY not set or invalid format');
}

/**
 * Load HTML template and replace placeholders
 * @param {string} templateName - Name of the template file
 * @param {object} data - Data to replace placeholders
 * @returns {string} Processed HTML
 */
function loadTemplate(templateName, data) {
  const templatePath = path.join(__dirname, '..', 'email_templates', templateName);
  let html = fs.readFileSync(templatePath, 'utf8');

  // Replace all placeholders with actual data
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    html = html.split(placeholder).join(data[key] || '');
  });

  return html;
}

/**
 * Send email using Resend API
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<object>} Resend response
 */
async function sendEmail(to, subject, html) {
  if (!resendClient) {
    console.warn('Resend API not configured. Email will not be sent.');
    console.warn('Please set RESEND_API_KEY in .env file');
    return { success: false, error: 'Resend not configured' };
  }

  try {
    const response = await resendClient.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html
    });

    console.log(`Email sent successfully to ${to}:`, response.data?.id);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email to patient
 * @param {string} to - Patient's email
 * @param {string} patientName - Patient's name
 * @param {string} resetLink - Password reset URL
 * @returns {Promise<object>}
 */
async function sendPasswordResetEmail(to, patientName, resetLink) {
  const html = loadTemplate('forgot_password_patient.html', {
    patient_name: patientName,
    reset_link: resetLink
  });

  return await sendEmail(
    to,
    'Reset Your Password - ReformMe Healthcare',
    html
  );
}

/**
 * Send appointment confirmation to patient
 * @param {string} to - Patient's email
 * @param {object} data - Appointment details
 * @returns {Promise<object>}
 */
async function sendAppointmentConfirmationToPatient(to, data) {
  const html = loadTemplate('appointment_scheduled_patient.html', {
    patient_name: data.patientName,
    appointment_date: data.appointmentDate,
    appointment_time: data.appointmentTime,
    doctor_name: data.doctorName,
    doctor_specialty: data.doctorSpecialty || '',
    consultation_type: data.consultationType,
    dashboard_link: data.dashboardLink || 'https://reformmehealthcare.me/patient-dashboard'
  });

  return await sendEmail(
    to,
    'Appointment Confirmed - ReformMe Healthcare',
    html
  );
}

/**
 * Send new appointment notification to doctor
 * @param {string} to - Doctor's email
 * @param {object} data - Appointment details
 * @returns {Promise<object>}
 */
async function sendAppointmentNotificationToDoctor(to, data) {
  const html = loadTemplate('appointment_scheduled_doctor.html', {
    doctor_name: data.doctorName,
    appointment_date: data.appointmentDate,
    appointment_time: data.appointmentTime,
    patient_name: data.patientName,
    patient_email: data.patientEmail,
    consultation_type: data.consultationType,
    dashboard_link: data.dashboardLink || 'https://reformmehealthcare.me/doctor-dashboard'
  });

  return await sendEmail(
    to,
    'New Appointment Booking - ReformMe Healthcare',
    html
  );
}

/**
 * Send appointment notifications to both patient and doctor
 * @param {object} patientData - Patient email and details
 * @param {object} doctorData - Doctor email and details
 * @returns {Promise<object>} Combined result
 */
async function sendAppointmentNotifications(patientData, doctorData) {
  const results = {
    patient: await sendAppointmentConfirmationToPatient(patientData.email, patientData),
    doctor: await sendAppointmentNotificationToDoctor(doctorData.email, doctorData)
  };

  return {
    success: results.patient.success && results.doctor.success,
    patient: results.patient,
    doctor: results.doctor
  };
}

/**
 * Send appointment cancellation email to patient
 */
async function sendCancellationEmailToPatient(to, data) {
  const html = loadTemplate('appointment_cancelled_patient.html', {
    patient_name: data.patientName,
    appointment_date: data.appointmentDate,
    appointment_time: data.appointmentTime,
    doctor_name: data.doctorName,
    consultation_type: data.consultationType,
    dashboard_link: data.dashboardLink || 'https://reformmehealthcare.me/patient-dashboard'
  });

  return await sendEmail(
    to,
    'Appointment Cancelled - ReformMe Healthcare',
    html
  );
}

/**
 * Send appointment cancellation email to doctor
 */
async function sendCancellationEmailToDoctor(to, data) {
  const html = loadTemplate('appointment_cancelled_doctor.html', {
    doctor_name: data.doctorName,
    appointment_date: data.appointmentDate,
    appointment_time: data.appointmentTime,
    patient_name: data.patientName,
    patient_email: data.patientEmail,
    consultation_type: data.consultationType,
    dashboard_link: data.dashboardLink || 'https://reformmehealthcare.me/doctor-dashboard'
  });

  return await sendEmail(
    to,
    'Appointment Cancelled - ReformMe Healthcare',
    html
  );
}

/**
 * Send appointment update notification email to patient
 */
async function sendUpdateEmailToPatient(to, data) {
  const html = loadTemplate('appointment_updated_patient.html', {
    patient_name: data.patientName,
    appointment_date: data.appointmentDate,
    appointment_time: data.appointmentTime,
    doctor_name: data.doctorName,
    consultation_type: data.consultationType,
    status: data.status,
    dashboard_link: data.dashboardLink || 'https://reformmehealthcare.me/patient-dashboard'
  });

  return await sendEmail(
    to,
    'Appointment Updated - ReformMe Healthcare',
    html
  );
}

/**
 * Send appointment update notification email to doctor
 */
async function sendUpdateEmailToDoctor(to, data) {
  const html = loadTemplate('appointment_updated_doctor.html', {
    doctor_name: data.doctorName,
    appointment_date: data.appointmentDate,
    appointment_time: data.appointmentTime,
    patient_name: data.patientName,
    patient_email: data.patientEmail,
    consultation_type: data.consultationType,
    status: data.status,
    dashboard_link: data.dashboardLink || 'https://reformmehealthcare.me/doctor-dashboard'
  });

  return await sendEmail(
    to,
    'Appointment Updated - ReformMe Healthcare',
    html
  );
}

/**
 * Send order confirmation email with receipt details to patient
 */
async function sendOrderConfirmationEmail(to, data) {
  const html = loadTemplate('order_success_patient.html', {
    patient_name: data.patientName || 'Valued Patient',
    order_id: data.orderId,
    transaction_id: data.transactionId || 'N/A',
    payment_method: data.paymentMethod || 'Online Payment',
    payment_status: data.paymentStatus || 'Paid',
    total_amount: data.totalAmount,
    items_summary: data.itemsSummary || 'Wellness Products',
    shipping_address: data.shippingAddress || 'Your Address',
    dashboard_link: data.dashboardLink || 'http://localhost:3000/patient-dashboard'
  });

  return await sendEmail(
    to,
    `Order Receipt #${data.orderId} - ReformMe Healthcare`,
    html
  );
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendAppointmentConfirmationToPatient,
  sendAppointmentNotificationToDoctor,
  sendAppointmentNotifications,
  sendCancellationEmailToPatient,
  sendCancellationEmailToDoctor,
  sendUpdateEmailToPatient,
  sendUpdateEmailToDoctor,
  sendOrderConfirmationEmail
};