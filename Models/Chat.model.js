const mongoose = require('mongoose');

// ─── ChatRoom (Conversation between a patient and doctor) ──────────────────
const ChatRoomSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patients',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctors',
      required: true,
    },
    lastMessage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Ensure one room per patient-doctor pair
ChatRoomSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

// ─── Message ───────────────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['patient', 'doctor'],
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'none'],
      default: 'none',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);
const Message  = mongoose.model('Message',  MessageSchema);

module.exports = { ChatRoom, Message };
