// controllers/Appointment.controller.js

const AppointmentModel = require("../Models/Appoinment.model");
const SlotModel = require("../Models/slot");
const PatientModel = require("../Models/Patient.model");
const DoctorModel = require("../Models/Doctor.model");
const { 
  sendAppointmentNotifications, 
  sendCancellationEmailToPatient, 
  sendCancellationEmailToDoctor, 
  sendUpdateEmailToPatient, 
  sendUpdateEmailToDoctor 
} = require("../Utils/email_service");

// ------------ Slot-based Appointment Controller ------------

// Get all available slots for booking (patient view)
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const slots = await SlotModel.find({
      doctor: doctorId,
      date,
      isAvailable: true
    }).sort('startTime');
    res.json({ slots });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch slots' });
  }
};

// Book an appointment (patient books a slot)
const bookAppointment = async (req, res) => {
  try {
    const { patient, doctor, slotId, disease } = req.body;
    const slot = await SlotModel.findOne({ _id: slotId, isAvailable: true });
    if (!slot) {
      return res.status(400).json({ message: 'Slot not available or already booked' });
    }
    const newAppointment = new AppointmentModel({
      patient,
      doctor,
      appointmentDate: slot.date,
      slot: slot._id,
      disease
    });

    await newAppointment.save();

    slot.isAvailable = false;
    await slot.save();

    // Send email notifications to patient and doctor
    try {
      const patientData = await PatientModel.findById(patient);
      const doctorData = await DoctorModel.findById(doctor);
      
      if (patientData && doctorData) {
        const appointmentDate = new Date(slot.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const patientEmailData = {
          patientName: patientData.firstName || patientData.name || 'Patient',
          appointmentDate: appointmentDate,
          appointmentTime: slot.startTime,
          doctorName: `Dr. ${doctorData.firstName} ${doctorData.lastName}`,
          doctorSpecialty: doctorData.specialty || '',
          consultationType: disease || 'General Consultation',
          dashboardLink: 'https://reformmehealthcare.me/patient-dashboard'
        };

        const doctorEmailData = {
          doctorName: doctorData.firstName || 'Doctor',
          appointmentDate: appointmentDate,
          appointmentTime: slot.startTime,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          patientEmail: patientData.email,
          consultationType: disease || 'General Consultation',
          dashboardLink: 'https://reformmehealthcare.me/doctor-dashboard'
        };

        await sendAppointmentNotifications(
          { email: patientData.email, ...patientEmailData },
          { email: doctorData.email, ...doctorEmailData }
        );
        
        console.log('Appointment emails sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending appointment emails:', emailError.message);
    }

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all slots for a particular doctor & date (doctor view)
const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const slots = await SlotModel.find({ doctor: doctorId, date }).sort('startTime');
    res.json({ slots });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch slots' });
  }
};

// Doctor sets slot as available/unavailable
const setSlotAvailability = async (req, res) => {
  try {
    const { available } = req.body;
    const slot = await SlotModel.findByIdAndUpdate(
      req.params.id,
      { isAvailable: available },
      { new: true }
    );
    res.json({ slot });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update slot availability' });
  }
};

// Doctor edits slot time (only if slot is still available)
const editSlotTimings = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    const slot = await SlotModel.findOne({ _id: req.params.id, isAvailable: true });
    if (!slot) return res.status(400).json({ message: "Cannot edit a booked/unavailable slot!" });

    slot.startTime = startTime;
    slot.endTime = endTime;
    await slot.save();
    res.json({ slot });
  } catch (error) {
    res.status(500).json({ message: "Failed to update slot timings" });
  }
};

// Get all appointments for a doctor (populates slot, patient)
const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const appointments = await AppointmentModel.find({ doctor: doctorId })
      .populate('patient', 'firstName lastName contactNumber')
      .populate('slot');
    res.json({ appointment: appointments });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all appointments for a patient (populates slot, doctor)
const getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const appointments = await AppointmentModel.find({ patient: patientId })
      .populate('doctor', 'firstName lastName clinicLocation specialty')
      .populate('slot');
    res.json({ appointment: appointments });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update an appointment (typically just status)
const updateAppointmentById = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const existingAppointment = await AppointmentModel.findById(appointmentId)
      .populate('patient')
      .populate('doctor')
      .populate('slot');
    
    if (!existingAppointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    const updatableFields = {};
    if (req.body.status) updatableFields.status = req.body.status;
    if (req.body.disease) updatableFields.disease = req.body.disease;

    const oldStatus = existingAppointment.status;
    const newStatus = req.body.status;

    // If appointment is being cancelled, free the slot as available again
    if (req.body.status === "canceled") {
      const slotDoc = await SlotModel.findById(existingAppointment.slot);
      if (slotDoc) {
        slotDoc.isAvailable = true;
        await slotDoc.save();
      }
      
      // Send cancellation emails
      try {
        const patientData = existingAppointment.patient;
        const doctorData = existingAppointment.doctor;
        const slotData = existingAppointment.slot;
        
        if (patientData && doctorData && slotData) {
          const appointmentDate = new Date(slotData.date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          });
          
          const patientEmailData = {
            patientName: patientData.firstName || patientData.name || 'Patient',
            appointmentDate: appointmentDate,
            appointmentTime: slotData.startTime,
            doctorName: `Dr. ${doctorData.firstName} ${doctorData.lastName}`,
            consultationType: existingAppointment.disease || 'General Consultation',
            dashboardLink: 'https://reformmehealthcare.me/patient-dashboard'
          };
          
          const doctorEmailData = {
            doctorName: doctorData.firstName || 'Doctor',
            appointmentDate: appointmentDate,
            appointmentTime: slotData.startTime,
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            patientEmail: patientData.email,
            consultationType: existingAppointment.disease || 'General Consultation',
            dashboardLink: 'https://reformmehealthcare.me/doctor-dashboard'
          };
          
          await sendCancellationEmailToPatient(patientData.email, patientEmailData);
          await sendCancellationEmailToDoctor(doctorData.email, doctorEmailData);
          console.log('Cancellation emails sent');
        }
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError.message);
      }
    }
    // If status is being updated (not cancelled), send update emails
    else if (newStatus && newStatus !== oldStatus) {
      try {
        const patientData = existingAppointment.patient;
        const doctorData = existingAppointment.doctor;
        const slotData = existingAppointment.slot;
        
        if (patientData && doctorData && slotData) {
          const appointmentDate = new Date(slotData.date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          });
          
          const patientEmailData = {
            patientName: patientData.firstName || patientData.name || 'Patient',
            appointmentDate: appointmentDate,
            appointmentTime: slotData.startTime,
            doctorName: `Dr. ${doctorData.firstName} ${doctorData.lastName}`,
            consultationType: existingAppointment.disease || 'General Consultation',
            status: newStatus,
            dashboardLink: 'https://reformmehealthcare.me/patient-dashboard'
          };
          
          const doctorEmailData = {
            doctorName: doctorData.firstName || 'Doctor',
            appointmentDate: appointmentDate,
            appointmentTime: slotData.startTime,
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            patientEmail: patientData.email,
            consultationType: existingAppointment.disease || 'General Consultation',
            status: newStatus,
            dashboardLink: 'https://reformmehealthcare.me/doctor-dashboard'
          };
          
          await sendUpdateEmailToPatient(patientData.email, patientEmailData);
          await sendUpdateEmailToDoctor(doctorData.email, doctorEmailData);
          console.log('Update emails sent');
        }
      } catch (emailError) {
        console.error('Error sending update emails:', emailError.message);
      }
    }

    const updatedAppointment = await AppointmentModel.findByIdAndUpdate(
      appointmentId,
      updatableFields,
      { new: true }
    );
    res.status(200).json(updatedAppointment);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete an appointment by ID
const deleteAppointmentById = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    // Free up slot
    const slotDoc = await SlotModel.findById(appointment.slot);
    if (slotDoc) {
      slotDoc.isAvailable = true;
      await slotDoc.save();
    }
    await AppointmentModel.findByIdAndDelete(appointmentId);
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Auto-generate slots for a doctor for a given date (utility)
const generateSlotsForDay = async (req, res) => {
  try {
    const { date, from = "09:00", to = "17:00" } = req.body;
    const doctorId = req.params.doctorId;
    await SlotModel.deleteMany({ doctor: doctorId, date });
    let slots = [];
    let [curH, curM] = from.split(':').map(Number);
    const [endH, endM] = to.split(':').map(Number);
    while (curH < endH || (curH === endH && curM < endM)) {
      let sH = curH.toString().padStart(2, "0");
      let sM = curM.toString().padStart(2, "0");
      let startTime = `${sH}:${sM}`;
      curM += 30;
      if (curM >= 60) {
        curM = curM - 60;
        curH += 1;
      }
      let eH = curH.toString().padStart(2, "0");
      let eM = curM.toString().padStart(2, "0");
      let endTime = `${eH}:${eM}`;
      if ((curH > endH) || (curH === endH && curM > endM)) break;
      slots.push({
        doctor: doctorId,
        date,
        startTime,
        endTime
      });
    }
    const savedSlots = await SlotModel.insertMany(slots);
    res.json({ slots: savedSlots });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate slots" });
  }
};

module.exports = {
  getAvailableSlots,
  bookAppointment,
  getDoctorSlots,
  setSlotAvailability,
  editSlotTimings,
  getDoctorAppointments,
  getPatientAppointments,
  updateAppointmentById,
  deleteAppointmentById,
  generateSlotsForDay
};