import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import reportRoutes from './routes/report.js';
import uploadRoutes from './routes/upload.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import initializeSocket from './socket/socket.js';
import notificationRoutes from './routes/notification.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:5500'],
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
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// API สำหรับทดสอบ
app.get('/api-test', (req, res) => {
  res.send('Hello World2');
});

// API สำหรับอัปเดตสถานะ (เก็บไว้ถ้าต้องการใช้ HTTP)
app.put('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const oldStatus = report.status;
    report.status = status;
    await report.save();

    // ส่งการแจ้งเตือนผ่าน Socket.IO
    const userId = report.userId?.toString();
    const adminId = report.assignedAdmin?.toString();
    if (userId) {
      io.to(userId).emit('reportStatusUpdate', {
        issueId: id,
        oldStatus,
        newStatus: status,
        message: `Report status updated to ${status}`,
      });
    }
    if (adminId) {
      io.to(adminId).emit('reportStatusUpdate', {
        issueId: id,
        oldStatus,
        newStatus: status,
        message: `Report status updated to ${status}`,
      });
    }

    res.status(200).json({ message: 'Report status updated', status });
  } catch (error) {
    console.error('Error updating report status:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.locals.io = io;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export { io }; // Export the io instance