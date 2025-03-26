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
import jwt from 'jsonwebtoken';
import Report from './model/Report.js';
import Notification from './model/Notification.js';
import User from './model/User.js'; // เพิ่มการ import User
import Chat from './model/Chat.js'; // เพิ่มการ import Chat
import cron from 'node-cron'; // เพิ่ม node-cron

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
app.use('/api/reports', reportRoutes(io));
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// API สำหรับทดสอบ
app.get('/api-test', (req, res) => {
  res.send('Hello World2');
});

// API สำหรับอัปเดตสถานะของรายงาน
app.put('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRole = decoded.role;
    if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only Admin or SuperAdmin can update status' });
    }

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

    const userId = report.userId?.toString();
    const adminId = report.assignedAdmin?.toString() || decoded.id;
    const topic = report.topic || `คำร้อง ${id}`;

    const notificationData = {
      issueId: id,
      oldStatus,
      newStatus: status,
      message: `Report ${topic} status updated to ${status} by Admin`,
      createdAt: new Date(),
    };

    console.log('Creating notification for userId:', userId);
    if (userId) {
      try {
        const userNotification = new Notification({
          userId,
          ...notificationData,
          isRead: false,
        });
        await userNotification.save();
        console.log('User notification created:', userNotification);
        io.to(userId).emit('statusUpdate', {
          id: userNotification._id,
          issueId: id,
          userId,
          oldStatus,
          status,
          message: userNotification.message,
          isRead: userNotification.isRead,
          createdAt: userNotification.createdAt,
        });
      } catch (error) {
        console.error('Error saving user notification:', error.message);
      }
    }

    console.log('Creating notification for adminId:', adminId);
    if (adminId) {
      try {
        const adminNotification = new Notification({
          userId: adminId,
          ...notificationData,
          message: `Report ${topic} status updated to ${status} (by you)`,
          isRead: false,
        });
        await adminNotification.save();
        console.log('Admin notification created:', adminNotification);
        io.to(adminId).emit('statusUpdate', {
          id: adminNotification._id,
          issueId: id,
          userId: adminId,
          oldStatus,
          status,
          message: adminNotification.message,
          isRead: adminNotification.isRead,
          createdAt: adminNotification.createdAt,
        });
      } catch (error) {
        console.error('Error saving admin notification:', error.message);
      }
    }

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

// Cron Job สำหรับลบผู้ใช้ที่ลาออกหลังจาก 90 วัน
cron.schedule('0 0 * * *', async () => { // รันทุกวันตอนเที่ยงคืน
  console.log('Running cron job to delete inactive users...');

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90); // คำนวณวันที่ย้อนหลัง 90 วัน

    const inactiveUsers = await User.find({
      status: 'inactive',
      inactiveAt: { $lte: ninetyDaysAgo },
    });

    for (const user of inactiveUsers) {
      const userId = user._id;

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // ลบไฟล์โปรไฟล์ (ถ้ามี)
        if (user.profileImage) {
          const fileName = user.profileImage.split('/').pop();
          const filePath = path.join(__dirname, 'uploads', 'profiles', fileName);
          try {
            if (fs.existsSync(filePath)) {
              await fs.promises.unlink(filePath);
            }
          } catch (fileError) {
            console.error(`Error deleting profile image for user ${userId}:`, fileError);
          }
        }

        // ลบไฟล์ในแชท (ถ้ามี)
        const chats = await Chat.find({ senderId: userId });
        for (const chat of chats) {
          if (chat.file) {
            const fileName = chat.file.split('/').pop();
            const filePath = path.join(__dirname, 'uploads', 'chat', fileName);
            try {
              if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
              }
            } catch (fileError) {
              console.error(`Error deleting chat file for user ${userId}:`, fileError);
            }
          }
        }

        // ลบข้อมูลที่เกี่ยวข้อง
        await Report.deleteMany({ userId }, { session });
        await Notification.deleteMany({ userId }, { session });
        await Chat.deleteMany({ senderId: userId }, { session });

        // ลบผู้ใช้
        await User.deleteOne({ _id: userId }, { session });

        await session.commitTransaction();
        console.log(`Deleted inactive user: ${user.firstName} ${user.lastName} (${userId})`);
      } catch (error) {
        await session.abortTransaction();
        console.error(`Error deleting inactive user ${userId}:`, error);
      } finally {
        session.endSession();
      }
    }

    console.log(`Cron job completed. Deleted ${inactiveUsers.length} inactive users.`);
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

app.locals.io = io;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export { io };