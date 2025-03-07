import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import reportRoutes from './routes/report.js';
import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import Report from './model/Report.js';
import Chat from './model/Chat.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:5173'],
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ตั้งค่าโฟลเดอร์สำหรับไฟล์แชท
const chatUploadDir = './uploads/chat';
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const port = process.env.PORT || 5000;

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api-test', (req, res) => {
  res.send('Hello World2');
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  // console.log('A user connected:', socket.id, 'User ID:', socket.user.id)*********;

  socket.on('joinIssueChat', async (issueId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(issueId)) {
        socket.emit('error', { message: 'Invalid issue ID' });
        return;
      }

      const report = await Report.findById(issueId);
      if (!report) {
        socket.emit('error', { message: 'Report not found' });
        return;
      }

      const userId = socket.user.id;
      if (
        report.userId.toString() !== userId &&
        (!report.assignedAdmin || report.assignedAdmin.toString() !== userId)
      ) {
        socket.emit('error', { message: 'You are not authorized to join this chat' });
        return;
      }

      socket.join(issueId);
      console.log(`User ${socket.id} (ID: ${userId}) joined issue chat: ${issueId}`);
      socket.emit('joinedChat', { issueId, message: 'Successfully joined chat' });

      const chats = await Chat.find({ issueId }).sort({ createdAt: 1 }).populate('senderId', 'firstName lastName');
      socket.emit('initialMessages', chats);
    } catch (error) {
      socket.emit('error', { message: 'Error joining chat', error: error.message });
    }
  });

  socket.on('sendMessage', async ({ issueId, message, file }) => {
    try {
      const userId = socket.user.id;

      const report = await Report.findById(issueId);
      if (
        !report ||
        (report.userId.toString() !== userId && (!report.assignedAdmin || report.assignedAdmin.toString() !== userId))
      ) {
        socket.emit('error', { message: 'You are not authorized to send messages in this chat' });
        return;
      }

      let fileUrl = '';
      if (file) {
        // จำลองการอัปโหลดไฟล์ (ในทางปฏิบัติ frontend จะต้องส่งไฟล์ผ่าน API หรือ WebSocket binary data)
        // ที่นี่เราจะสมมติว่า frontend ส่ง URL ไฟล์ที่อัปโหลดแล้วผ่าน API อื่น
        fileUrl = file.url || '';
      }

      const newMessage = await Chat.create({
        issueId,
        senderId: userId,
        message: message || '',
        file: fileUrl,
      });

      const populatedMessage = await Chat.findById(newMessage._id).populate('senderId', 'firstName lastName');
      io.to(issueId).emit('newMessage', {
        id: populatedMessage._id,
        issueId: populatedMessage.issueId,
        senderId: {
          id: populatedMessage.senderId._id,
          firstName: populatedMessage.senderId.firstName,
          lastName: populatedMessage.senderId.lastName,
        },
        message: populatedMessage.message,
        file: populatedMessage.file,
        createdAt: populatedMessage.createdAt,
      });
    } catch (error) {
      socket.emit('error', { message: 'Error sending message', error: error.message });
    }
  });

  socket.on('leaveIssueChat', (issueId) => {
    socket.leave(issueId);
    console.log(`User ${socket.id} left issue chat: ${issueId}`);
  });

  socket.on('disconnect', () => {
    // console.log('User disconnected:', socket.id);*********
  });
});

app.locals.io = io;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});