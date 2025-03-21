import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Report from '../model/Report.js';
import Chat from '../model/Chat.js';
import Notification from '../model/Notification.js';

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://172.18.43.39:5000', 'http://localhost:5173', 'http://127.0.0.1:5500'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
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
      socket.userId = decoded.userId || decoded.id; // รองรับทั้ง userId และ id
      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return next(new Error(`Authentication error: Invalid token (${error.message})`));
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id, 'User ID:', socket.userId);
  
    // ผู้ใช้เข้าร่วมห้องตาม userId
    socket.join(socket.userId);
  
    // รับข้อมูลผู้ใช้เมื่อเชื่อมต่อ
    socket.on('userConnected', async ({ userId, role }) => {
      console.log(`User ${userId} (Role: ${role}) connected and joined room: ${userId}`);
      socket.userId = userId;
      socket.role = role;
      socket.join(userId);
  
      // ดึงการแจ้งเตือนที่ยังไม่ได้อ่าน
      try {
        const notifications = await Notification.find({
          userId: userId,
          isRead: false,
        }).sort({ createdAt: -1 });
  
        if (notifications.length > 0) {
          const notificationsResponse = notifications.map(notification => ({
            id: notification._id,
            userId: notification.userId,
            issueId: notification.issueId,
            message: notification.message,
            oldStatus: notification.oldStatus,
            newStatus: notification.newStatus,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
          }));
          socket.emit('unreadNotifications', notificationsResponse);
        }
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
        socket.emit('error', { message: 'Error fetching unread notifications', error: error.message });
      }
    });

    socket.on('joinUserRoom', async (roomId) => {
      try {
        const report = await Report.findById(roomId);
        if (!report) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        if (
          report.userId?.toString() !== socket.userId &&
          (!report.assignedAdmin || report.assignedAdmin?.toString() !== socket.userId)
        ) {
          socket.emit('error', { message: 'Unauthorized to join this room' });
          return;
        }
    
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room: ${roomId}`);
    
        // ส่งประวัติแชทล่าสุด (เช่น 50 ข้อความ)
        const chatHistory = await Chat.find({ issueId: roomId })
          .populate('senderId', 'firstName lastName role profileImage')
          .sort({ createdAt: -1 })
          .limit(50);
    
        // นับข้อความที่ยังไม่ได้อ่าน
        const unreadChats = await Chat.find({
          issueId: roomId,
          readBy: { $ne: socket.userId },
        });
    
        const chatHistoryResponse = chatHistory.reverse().map(chat => ({
          id: chat._id,
          issueId: chat.issueId,
          senderId: {
            id: chat.senderId._id,
            firstName: chat.senderId.firstName,
            lastName: chat.senderId.lastName,
            role: chat.senderId.role,
            profileImage: chat.senderId.profileImage,
          },
          message: chat.message,
          file: chat.file,
          createdAt: chat.createdAt,
          readBy: chat.readBy,
        }));
    
        socket.emit('chatHistory', {
          history: chatHistoryResponse,
          unreadCount: unreadChats.length,
        });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Error joining room', error: error.message });
      }
    });

    // ออกจากห้องแชท
    socket.on('leaveIssueChat', (issueId) => {
      socket.leave(issueId);
      console.log(`User ${socket.id} left issue chat: ${issueId}`);
    });

    // ส่งข้อความ
    socket.on('sendMessage', async ({ issueId, message, fileUrl, receiverId }, callback) => {
      const session = await mongoose.startSession(); // Start a new session
      session.startTransaction(); // Begin a transaction
    
      try {
        const userId = socket.userId;
    
        // Find the report within the transaction
        const report = await Report.findById(issueId).session(session);
        if (
          !report ||
          (report.userId?.toString() !== userId && (!report.assignedAdmin || report.assignedAdmin?.toString() !== userId))
        ) {
          await session.abortTransaction(); // Abort the transaction
          session.endSession(); // End the session
          socket.emit('error', { message: 'Unauthorized' });
          if (callback) callback({ error: 'Unauthorized' });
          return;
        }
    
        // Create a new message within the transaction
        const newMessage = await Chat.create(
          [
            {
              issueId,
              senderId: userId,
              message: message || '',
              file: fileUrl || '',
            },
          ],
          { session }
        );
    
        // Populate the message within the transaction
        const populatedMessage = await Chat.findById(newMessage[0]._id)
          .populate('senderId', 'firstName lastName')
          .session(session);
    
        const chatData = {
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
        };
    
        // ส่งข้อความไปยังห้อง issueId พร้อมข้อมูล fileMetadata
        io.to(issueId).emit('messageReceived', {
          ...chatData,
          fileMetadata: {
            name: fileUrl ? fileUrl.split('/').pop() : null,
            type: fileUrl
              ? fileUrl.endsWith('.pdf')
                ? 'application/pdf'
                : 'image/jpeg' // Adjust based on actual MIME type
              : null,
          },
        });
    
        // ถ้ามี receiverId (สำหรับแชท 1:1)
        if (receiverId && receiverId !== userId) {
          io.to(receiverId).emit('messageReceived', chatData);
        }
    
        // สร้างการแจ้งเตือนสำหรับผู้รับที่ออฟไลน์
        const receiverNotification = new Notification({
          userId: report.userId?.toString() !== userId ? report.userId : report.assignedAdmin,
          issueId,
          message: `New message from ${populatedMessage.senderId.firstName} ${populatedMessage.senderId.lastName} in ${report.topic}`,
          type: 'info',
          isRead: false,
          oldStatus: report.status, // Ensure oldStatus is included
          newStatus: report.status, // Ensure newStatus is included
          createdAt: new Date(),
        });
        await receiverNotification.save({ session });
    
        // ส่งการแจ้งเตือนไปยังผู้รับ
        io.to(receiverNotification.userId).emit('newMessageNotification', {
          id: receiverNotification._id,
          issueId,
          message: receiverNotification.message,
          isRead: receiverNotification.isRead,
          createdAt: receiverNotification.createdAt,
        });
    
        await session.commitTransaction(); // Commit the transaction
        session.endSession(); // End the session
    
        if (callback) callback({ message: 'Message sent successfully' });
      } catch (error) {
        await session.abortTransaction(); // Abort the transaction in case of an error
        session.endSession(); // End the session
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message', error: error.message });
        if (callback) callback({ error: 'Error sending message', details: error.message });
      }
    });

    // อัปเดตสถานะคำร้อง (คงไว้เหมือนเดิม)
    socket.on('reportStatusUpdate', async ({ issueId, status }, callback) => {
      try {
        console.log(`Updating status for issue ${issueId} to ${status}`);
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
    
        const userRole = socket.user.role || socket.role;
        if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
          socket.emit('error', { message: 'Only Admin or SuperAdmin can update status' });
          if (typeof callback === 'function') callback({ error: 'Only Admin or SuperAdmin can update status' });
          return;
        }
    
        const oldStatus = report.status;
        report.status = status;
        await report.save();
    
        const userId = report.userId?.toString();
        const adminId = report.assignedAdmin?.toString() || socket.userId;
    
        const topic = report.topic || `คำร้อง ${issueId}`;
        const statusChangeData = {
          issueId,
          userId,
          status,
          topic,
          oldStatus,
        };
    
        // io.to(userId).emit('issue_status_changed', statusChangeData);
        // io.to(adminId).emit('issue_status_changed', {
        //   ...statusChangeData,
        //   message: `(by you)`,
        // });
    
        const notificationData = {
          issueId,
          oldStatus,
          newStatus: status,
          message: `Report ${topic} status updated to ${status} by Admin`,
          createdAt: new Date(),
        };
    
        if (userId) {
          const userNotification = new Notification({
            userId,
            ...notificationData,
            isRead: false,
          });
          await userNotification.save();
          io.to(userId).emit('statusUpdate', {
            id: userNotification._id,
            issueId,
            userId,
            oldStatus,
            status,
            message: userNotification.message,
            isRead: userNotification.isRead,
            createdAt: userNotification.createdAt,
          });
        }
    
        if (adminId) {
          const adminNotification = new Notification({
            userId: adminId,
            ...notificationData,
            message: `Report ${topic} status updated to ${status} (by you)`,
            isRead: false,
          });
          await adminNotification.save();
          io.to(adminId).emit('statusUpdate', {
            id: adminNotification._id,
            issueId,
            userId: adminId,
            oldStatus,
            status,
            message: adminNotification.message,
            isRead: adminNotification.isRead,
            createdAt: adminNotification.createdAt,
          });
        }
    
        io.to(issueId).emit('reportStatusUpdate', {
          issueId,
          oldStatus,
          newStatus: status,
          message: `Report status updated to ${status}`,
        });
    
        // console.log(`Report status updated for issue ${issueId} to ${status} by User ${socket.userId}`);
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

    // Mark messages as read
    socket.on('markMessageAsRead', async ({ issueId }) => {
      try {
        const userId = socket.userId;
        await Chat.updateMany(
          { issueId, readBy: { $ne: userId } }, // Find messages in the issue that haven't been read by the user
          { $addToSet: { readBy: userId } } // Add the userId to the `readBy` array
        );
        io.to(issueId).emit('messageRead', { issueId, userId, message: 'Message marked as read' });
      } catch (error) {
        console.error('Error marking message as read:', error);
        socket.emit('error', { message: 'Error marking message as read', error: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

export default initializeSocket;