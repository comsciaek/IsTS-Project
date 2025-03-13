// filepath: c:\DEV TEST YOK\Project\IsTS-Project\backend\socket.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Report from '../model/Report.js'; // Corrected import path
import Chat from '../model/Chat.js'; // Corrected import path

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5000', 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PUT'],
    },
  });

  // Authentication middleware for Socket.IO
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

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id, 'User ID:', socket.user?.id);

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
          report.userId?.toString() !== userId &&
          (!report.assignedAdmin || report.assignedAdmin.toString() !== userId)
        ) {
          socket.emit('error', { message: 'You are not authorized to join this chat' });
          return;
        }

        socket.join(issueId);
        console.log(`User ${socket.id} (ID: ${userId}) joined issue chat: ${issueId}`);
        socket.emit('joinedChat', { issueId, message: 'Successfully joined chat', status: report.status });

        const chats = await Chat.find({ issueId }).sort({ createdAt: 1 }).populate('senderId', 'firstName lastName');
        socket.emit('initialMessages', chats);
      } catch (error) {
        socket.emit('error', { message: 'Error joining chat', error: error.message });
      }
    });

    socket.on('sendMessage', async ({ issueId, message, fileUrl }, callback) => {
      try {
        const userId = socket.user.id;

        const report = await Report.findById(issueId);
        if (
          !report ||
          (report.userId?.toString() !== userId && (!report.assignedAdmin || report.assignedAdmin?.toString() !== userId))
        ) {
          socket.emit('error', { message: 'You are not authorized to send messages in this chat' });
          if (typeof callback === 'function') callback({ error: 'Unauthorized' });
          return;
        }

        const newMessage = await Chat.create({
          issueId,
          senderId: userId,
          message: message || '',
          file: fileUrl || '',
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

        if (typeof callback === 'function') callback({ message: 'Message sent successfully' });
      } catch (error) {
        socket.emit('error', { message: 'Error sending message', error: error.message });
        if (typeof callback === 'function') callback({ error: 'Error sending message', details: error.message });
      }
    });

    socket.on('reportStatusUpdate', async ({ issueId, status }, callback) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
          socket.emit('error', { message: 'Invalid issue ID' });
          if (typeof callback === 'function') callback({ error: 'Invalid issue ID' });
          return;
        }

        if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
          socket.emit('error', { message: 'Invalid status value' });
          if (typeof callback === 'function') callback({ error: 'Invalid status value' });
          return;
        }

        const report = await Report.findById(issueId);
        if (!report) {
          socket.emit('error', { message: 'Report not found' });
          if (typeof callback === 'function') callback({ error: 'Report not found' });
          return;
        }

        // ตรวจสอบสิทธิ์ (เช่น เฉพาะ Admin หรือ SuperAdmin)
        const userRole = socket.user.role;
        if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
          socket.emit('error', { message: 'Only Admin or SuperAdmin can update status' });
          if (typeof callback === 'function') callback({ error: 'Only Admin or SuperAdmin can update status' });
          return;
        }

        const oldStatus = report.status;
        report.status = status;
        await report.save();

        // ส่งการแจ้งเตือนไปยังผู้ใช้ที่เกี่ยวข้อง
        const userId = report.userId?.toString();
        const adminId = report.assignedAdmin?.toString();
        if (userId) {
          io.to(userId).emit('reportStatusUpdate', {
            issueId,
            oldStatus,
            newStatus: status,
            message: `Report status updated to ${status}`,
          });
        }
        if (adminId) {
          io.to(adminId).emit('reportStatusUpdate', {
            issueId,
            oldStatus,
            newStatus: status,
            message: `Report status updated to ${status}`,
          });
        }

        // ส่งการแจ้งเตือนไปยังทุกคนในห้องแชท
        io.to(issueId).emit('reportStatusUpdate', {
          issueId,
          oldStatus,
          newStatus: status,
          message: `Report status updated to ${status}`,
        });

        console.log(`Report status updated for issue ${issueId} to ${status} by User ${socket.user.id}`);
        if (typeof callback === 'function') {
          callback({ message: 'Report status updated successfully' });
        }
      } catch (error) {
        console.error(`Error in reportStatusUpdate for socket ${socket.id}:`, error.message);
        socket.emit('error', { message: 'Error updating report status', error: error.message });
        if (typeof callback === 'function') {
          callback({ error: 'Error updating report status', details: error.message });
        }
      }
    });

    socket.on('leaveIssueChat', (issueId) => {
      socket.leave(issueId);
      console.log(`User ${socket.id} left issue chat: ${issueId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

export default initializeSocket;