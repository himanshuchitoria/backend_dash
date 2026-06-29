// ─── Imports ──────────────────────────────────────────────────────────────
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./Config/server');
const DoctorRouter = require('./Routes/Doctor.route');
const PatientRouter = require('./Routes/Patient.route');
const AppointmentRouter = require('./Routes/Appointment.route');
const AdminRouter = require('./Routes/Admin.route');
const PatientAuthRouter = require('./Routes/Patientauth.route');
const ChatRouter  = require('./Routes/Chat.route');
const ShopRouter  = require('./Routes/Shop.route');
const seedShopData = require('./Utils/shopSeeder');
const { ChatRoom, Message } = require('./Models/Chat.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────
const cors = require('cors');
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
);

// ─── Socket.io with JWT auth handshake ────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware: validate JWT before accepting socket connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: No token provided'));

  jwt.verify(token, process.env.secretKey, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.user = decoded; // attach decoded payload to socket
    next();
  });
});

// ─── Socket.io Event Handlers ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket.io] User connected: ${socket.id} (userId: ${socket.user?.userId})`);

  // Join a specific chat room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket.io] Socket ${socket.id} joined room ${roomId}`);
  });

  // Handle incoming message — save to DB then broadcast
  socket.on('send_message', async (data) => {
    try {
      const { roomId, senderId, senderRole, content, mediaUrl, mediaType } = data;

      // Persist message
      const message = await Message.create({
        roomId,
        senderId,
        senderRole,
        content: content || '',
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || 'none',
      });

      // Update room's lastMessage & updatedAt timestamp
      await ChatRoom.findByIdAndUpdate(roomId, {
        lastMessage: content || (mediaType !== 'none' ? `📎 ${mediaType}` : ''),
        updatedAt: new Date(),
      });

      // Broadcast to all sockets in the room (including sender)
      io.to(roomId).emit('receive_message', message);
    } catch (err) {
      console.error('[Socket.io] Error saving message:', err);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('mark_read', async ({ roomId, userId }) => {
    try {
      await Message.updateMany(
        { roomId, senderId: { $ne: userId }, isRead: false },
        { isRead: true }
      );
    } catch (err) {
      console.error('[Socket.io] Error marking read:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] User disconnected: ${socket.id}`);
  });
});

// ─── Ensure upload directories exist ──────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
const chatUploadDir = path.join(uploadDir, 'chat');
[uploadDir, chatUploadDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── Multer setup (general uploads) ───────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Static file serving ──────────────────────────────────────────────────
app.use('/uploads', express.static(uploadDir));

// ─── Middleware ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('ReformMe Healthcare Backend — Socket.io enabled');
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  const fileType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  res.json({ url: fileUrl, type: fileType, filename: req.file.filename });
});

app.use('/api/doctor', DoctorRouter);
app.use('/api/patient', PatientRouter);
app.use('/api/patientauth', PatientAuthRouter);
app.use('/api/appointment', AppointmentRouter);
app.use('/api/admin', AdminRouter);
app.use('/api/chat', ChatRouter);
app.use('/api/shop', ShopRouter);

// ─── Start server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
    await seedShopData();
  } catch (error) {
    console.log('Unable to connect to database');
  }
  console.log(`Server running on port ${PORT} — Socket.io active`);
});
