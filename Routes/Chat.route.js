const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ChatRoom, Message } = require('../Models/Chat.model');
const Auth = require('../Middlewares/JWT.authentication');

// ─── Multer setup for chat media ──────────────────────────────────────────
const chatUploadsDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const chatUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images and videos are allowed'));
  },
});

// ─── POST /api/chat/room  — get or create a chat room ──────────────────────
router.post('/room', Auth, async (req, res) => {
  try {
    const { patientId, doctorId } = req.body;
    if (!patientId || !doctorId) {
      return res.status(400).json({ message: 'patientId and doctorId are required' });
    }

    let room = await ChatRoom.findOne({ patientId, doctorId });
    if (!room) {
      room = await ChatRoom.create({ patientId, doctorId });
    }
    res.json({ room });
  } catch (err) {
    console.error('Error creating chat room:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/chat/history/:roomId — fetch paginated message history ────────
router.get('/history/:roomId', Auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(200);
    res.json({ messages });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/chat/upload — media upload ────────────────────────────────────
router.post('/upload', Auth, chatUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const mediaUrl = `/uploads/chat/${req.file.filename}`;
  const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  res.json({ mediaUrl, mediaType });
});

// ─── GET /api/chat/rooms/:userId — list all rooms for a user (patient or doc)
router.get('/rooms/:userId', Auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const rooms = await ChatRoom.find({
      $or: [{ patientId: userId }, { doctorId: userId }],
    })
      .sort({ updatedAt: -1 })
      .populate('patientId', 'firstName lastName name email')
      .populate('doctorId', 'firstName lastName specialty');
    res.json({ rooms });
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
