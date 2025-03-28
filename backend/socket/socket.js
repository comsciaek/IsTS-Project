import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import models from '../model/index.js'; // ใช้ models/index.js เพื่อรวม models
import axios from 'axios';

const { User, Report, Chat, Notification } = models; // ลบ UserLink ออก

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
if (!CHANNEL_ACCESS_TOKEN) {
  throw new Error('CHANNEL_ACCESS_TOKEN is not defined in the environment variables');
}

// ฟังก์ชันส่งข้อความผ่าน LINE Messaging API
const sendMessage = async (lineUserId, message, type = 'text', flexMessage = null) => {
  try {
    const payload = {
      to: lineUserId,
      messages: type === 'flex' ? [{ type: 'flex', altText: message, contents: flexMessage }] : [{ type: 'text', text: message }],
    };

    const response = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );
    console.log('Message sent successfully to:', lineUserId);
    return response;
  } catch (error) {
    console.error('Error sending message to', lineUserId, ':', error.response?.data || error.message);
    throw error;
  }
};

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://172.18.43.39:5000', 'http://localhost:5173', 'http://127.0.0.1:5500'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.userId = decoded.userId || decoded.id;
      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return next(new Error(`Authentication error: Invalid token (${error.message})`));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.userId);

    socket.on('userConnected', async ({ userId, role }) => {
      socket.userId = userId;
      socket.role = role;
      socket.join(userId);

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

        const chatHistory = await Chat.find({ issueId: roomId })
          .populate('senderId', 'firstName lastName role profileImage')
          .sort({ createdAt: -1 })
          .limit(50);

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

    socket.on('leaveIssueChat', (issueId) => {
      socket.leave(issueId);
      console.log(`User ${socket.id} left issue chat: ${issueId}`);
    });

    socket.on('sendMessage', async ({ issueId, message, fileUrl, receiverId }, callback) => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const userId = socket.userId;

        const report = await Report.findById(issueId).session(session);
        if (
          !report ||
          (report.userId?.toString() !== userId && (!report.assignedAdmin || report.assignedAdmin?.toString() !== userId))
        ) {
          await session.abortTransaction();
          session.endSession();
          socket.emit('error', { message: 'Unauthorized' });
          if (callback) callback({ error: 'Unauthorized' });
          return;
        }

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

        const populatedMessage = await Chat.findById(newMessage[0]._id)
          .populate('senderId', 'firstName lastName role profileImage')
          .session(session);

        const chatData = {
          id: populatedMessage._id,
          issueId: populatedMessage.issueId,
          senderId: {
            id: populatedMessage.senderId._id,
            firstName: populatedMessage.senderId.firstName,
            lastName: populatedMessage.senderId.lastName,
            role: populatedMessage.senderId.role,
            profileImage: populatedMessage.senderId.profileImage,
          },
          message: populatedMessage.message,
          file: populatedMessage.file,
          createdAt: populatedMessage.createdAt,
        };

        io.to(issueId).emit('messageReceived', {
          ...chatData,
          fileMetadata: {
            name: fileUrl ? fileUrl.split('/').pop() : null,
            type: fileUrl
              ? fileUrl.endsWith('.pdf')
                ? 'application/pdf'
                : fileUrl.endsWith('.png')
                ? 'image/png'
                : fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg')
                ? 'image/jpeg'
                : 'application/octet-stream'
              : null,
          },
        });

        if (receiverId && receiverId !== userId) {
          io.to(receiverId).emit('messageReceived', chatData);
        }

        const receiverNotification = new Notification({
          userId: report.userId?.toString() !== userId ? report.userId : report.assignedAdmin,
          issueId,
          message: `New message from ${populatedMessage.senderId.firstName} ${populatedMessage.senderId.lastName} in ${report.topic}`,
          type: 'info',
          isRead: false,
          oldStatus: report.status,
          newStatus: report.status,
          createdAt: new Date(),
        });
        await receiverNotification.save({ session });

        io.to(receiverNotification.userId.toString()).emit('newMessageNotification', {
          id: receiverNotification._id,
          issueId,
          message: receiverNotification.message,
          isRead: receiverNotification.isRead,
          createdAt: receiverNotification.createdAt,
        });

        await session.commitTransaction();
        session.endSession();

        if (callback) callback({ message: 'Message sent successfully' });
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message', error: error.message });
        if (callback) callback({ error: 'Error sending message', details: error.message });
      }
    });

    socket.on('reportStatusUpdate', async ({ issueId, status }, callback) => {
      try {
        console.log(`Received request to update status for issueId: ${issueId} to status: ${status}`);
    
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
          console.log(`Invalid issue ID: ${issueId}`);
          socket.emit('error', { message: 'Invalid issue ID' });
          if (typeof callback === 'function') callback({ error: 'Invalid issue ID' });
          return;
        }
    
        if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
          console.log(`Invalid status value: ${status}`);
          socket.emit('error', { message: 'Invalid status value' });
          if (typeof callback === 'function') callback({ error: 'Invalid status value' });
          return;
        }
    
        const report = await Report.findById(issueId);
        if (!report) {
          console.log(`Report not found for issueId: ${issueId}`);
          socket.emit('error', { message: 'Report not found' });
          if (typeof callback === 'function') callback({ error: 'Report not found' });
          return;
        }
    
        const userRole = socket.user.role || socket.role;
        console.log(`User role: ${userRole}`);
        if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
          console.log(`Unauthorized role: ${userRole}`);
          socket.emit('error', { message: 'Only Admin or SuperAdmin can update status' });
          if (typeof callback === 'function') callback({ error: 'Only Admin or SuperAdmin can update status' });
          return;
        }
    
        const oldStatus = report.status;
        report.status = status;
        await report.save();
        console.log(`Status updated for issueId: ${issueId} from ${oldStatus} to ${status}`);
    
        const employeeId = report.userId?.toString();
        const assignedAdminId = report.assignedAdmin?.toString();
        const userId = socket.userId;
    
        const topic = report.topic || `คำร้อง ${issueId}`;
        console.log(`Topic: ${topic}, EmployeeId: ${employeeId}, AssignedAdminId: ${assignedAdminId}, UserId: ${userId}`);
    
        const user = employeeId ? await User.findOne({ _id: employeeId }) : null;
        const admin = userId ? await User.findOne({ _id: userId }) : null;
        const assignedAdmin = assignedAdminId ? await User.findOne({ _id: assignedAdminId }) : null;
    
        const userFullName = user ? `${user.firstName} ${user.lastName}` : 'ผู้ใช้';
        const adminFullName = admin ? `${admin.firstName} ${admin.lastName}` : 'ผู้ดูแล';
        const assignedAdminFullName = assignedAdmin ? `${assignedAdmin.firstName} ${assignedAdmin.lastName}` : 'ผู้ดูแลที่รับผิดชอบ';
    
        console.log(`User: ${userFullName}, Admin: ${adminFullName}, AssignedAdmin: ${assignedAdminFullName}`);
    
        const notificationData = {
          issueId,
          oldStatus,
          newStatus: status,
          createdAt: new Date(),
        };
    
        // ส่งการแจ้งเตือนไปยัง User
        if (employeeId) {
          console.log(`Sending notification to employeeId: ${employeeId}`);
          const userMessage = `สวัสดี ${userFullName}, รายงาน ${topic} ได้รับการเปลี่ยนสถานะเป็น ${status} โดย ${adminFullName}`;
          const userNotification = new Notification({
            userId: employeeId,
            ...notificationData,
            message: userMessage,
            isRead: false,
          });
          await userNotification.save();
          console.log(`Notification saved for employeeId: ${employeeId}`);
    
          io.to(employeeId).emit('statusUpdate', {
            id: userNotification._id,
            issueId,
            userId: employeeId,
            oldStatus,
            status,
            message: userNotification.message,
            isRead: userNotification.isRead,
            createdAt: userNotification.createdAt,
          });
    
          try {
            if (user && user.lineUserId) {
              console.log(`Sending LINE notification to lineUserId: ${user.lineUserId}`);
              const flexMessage = {
                type: 'bubble',
                body: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: 'การแจ้งเตือนสถานะรายงาน',
                      weight: 'bold',
                      size: 'lg',
                      color: '#1DB446',
                    },
                    {
                      type: 'text',
                      text: `รายงาน: ${topic}`,
                      size: 'md',
                      margin: 'md',
                    },
                    {
                      type: 'text',
                      text: `สถานะ: ${status}`,
                      size: 'md',
                      color: status === 'approved' ? '#00C853' : '#FF6D00',
                    },
                    {
                      type: 'text',
                      text: `โดย: ${adminFullName}`,
                      size: 'sm',
                      color: '#666666',
                      margin: 'sm',
                    },
                  ],
                },
              };
    
              const truncatedUserMessage = userMessage.length > 400 ? userMessage.substring(0, 397) + '...' : userMessage;
              await sendMessage(user.lineUserId, truncatedUserMessage, 'flex', flexMessage);
              console.log(`LINE notification sent to employeeId: ${employeeId}`);
            } else {
              console.log(`No LINE user link found for employeeId: ${employeeId}`);
            }
          } catch (error) {
            console.error(`Failed to send LINE notification to employeeId: ${employeeId}`, error.message);
          }
        }
    
        // ส่งการแจ้งเตือนไปยัง Admin ที่เปลี่ยนสถานะ
        if (userId) {
          console.log(`Sending notification to userId: ${userId}`);
          const adminMessage = `สวัสดี ${adminFullName}, คุณได้เปลี่ยนสถานะรายงาน ${topic} เป็น ${status}`;
          const adminNotification = new Notification({
            userId,
            ...notificationData,
            message: adminMessage,
            isRead: false,
          });
          await adminNotification.save();
          console.log(`Notification saved for userId: ${userId}`);
    
          io.to(userId).emit('statusUpdate', {
            id: adminNotification._id,
            issueId,
            userId,
            oldStatus,
            status,
            message: adminNotification.message,
            isRead: adminNotification.isRead,
            createdAt: adminNotification.createdAt,
          });
    
          try {
            if (admin && admin.lineUserId) {
              console.log(`Sending LINE notification to lineUserId: ${admin.lineUserId}`);
              const flexMessage = {
                type: 'bubble',
                body: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: 'การแจ้งเตือนสถานะรายงาน',
                      weight: 'bold',
                      size: 'lg',
                      color: '#1DB446',
                    },
                    {
                      type: 'text',
                      text: `รายงาน: ${topic}`,
                      size: 'md',
                      margin: 'md',
                    },
                    {
                      type: 'text',
                      text: `สถานะ: ${status}`,
                      size: 'md',
                      color: status === 'approved' ? '#00C853' : '#FF6D00',
                    },
                    {
                      type: 'text',
                      text: 'โดย: คุณ',
                      size: 'sm',
                      color: '#666666',
                      margin: 'sm',
                    },
                  ],
                },
              };
    
              const truncatedAdminMessage = adminMessage.length > 400 ? adminMessage.substring(0, 397) + '...' : adminMessage;
              await sendMessage(admin.lineUserId, truncatedAdminMessage, 'flex', flexMessage);
              console.log(`LINE notification sent to userId: ${userId}`);
            } else {
              console.log(`No LINE user link found for userId: ${userId}`);
            }
          } catch (error) {
            console.error(`Failed to send LINE notification to userId: ${userId}`, error.message);
          }
        }
    
        // ส่งการแจ้งเตือนไปยัง Admin ผู้รับผิดชอบ
        if (assignedAdminId && assignedAdminId !== userId) {
          console.log(`Sending notification to assignedAdminId: ${assignedAdminId}`);
          const assignedAdminMessage = `สวัสดี ${assignedAdminFullName}, รายงาน ${topic} ที่คุณรับผิดชอบได้รับการเปลี่ยนสถานะเป็น ${status} โดย ${adminFullName}`;
          const assignedAdminNotification = new Notification({
            userId: assignedAdminId,
            ...notificationData,
            message: assignedAdminMessage,
            isRead: false,
          });
          await assignedAdminNotification.save();
          console.log(`Notification saved for assignedAdminId: ${assignedAdminId}`);
    
          io.to(assignedAdminId).emit('statusUpdate', {
            id: assignedAdminNotification._id,
            issueId,
            userId: assignedAdminId,
            oldStatus,
            status,
            message: assignedAdminNotification.message,
            isRead: assignedAdminNotification.isRead,
            createdAt: assignedAdminNotification.createdAt,
          });
    
          try {
            if (assignedAdmin && assignedAdmin.lineUserId) {
              console.log(`Sending LINE notification to lineUserId: ${assignedAdmin.lineUserId}`);
              const flexMessage = {
                type: 'bubble',
                body: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: 'การแจ้งเตือนสถานะรายงาน',
                      weight: 'bold',
                      size: 'lg',
                      color: '#1DB446',
                    },
                    {
                      type: 'text',
                      text: `รายงาน: ${topic}`,
                      size: 'md',
                      margin: 'md',
                    },
                    {
                      type: 'text',
                      text: `สถานะ: ${status}`,
                      size: 'md',
                      color: status === 'approved' ? '#00C853' : '#FF6D00',
                    },
                    {
                      type: 'text',
                      text: `โดย: ${adminFullName}`,
                      size: 'sm',
                      color: '#666666',
                      margin: 'sm',
                    },
                  ],
                },
              };
    
              const truncatedAssignedAdminMessage = assignedAdminMessage.length > 400 ? assignedAdminMessage.substring(0, 397) + '...' : assignedAdminMessage;
              await sendMessage(assignedAdmin.lineUserId, truncatedAssignedAdminMessage, 'flex', flexMessage);
              console.log(`LINE notification sent to assignedAdminId: ${assignedAdminId}`);
            } else {
              console.log(`No LINE user link found for assignedAdminId: ${assignedAdminId}`);
            }
          } catch (error) {
            console.error(`Failed to send LINE notification to assignedAdminId: ${assignedAdminId}`, error.message);
          }
        }
    
        io.to(issueId).emit('reportStatusUpdate', {
          issueId,
          oldStatus,
          newStatus: status,
          message: `Report status updated to ${status}`,
        });
    
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

    socket.on('markMessageAsRead', async ({ issueId }) => {
      try {
        const userId = socket.userId;
        await Chat.updateMany(
          { issueId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
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