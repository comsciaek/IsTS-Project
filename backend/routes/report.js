import express from 'express';
import Report from '../model/Report.js';
import User from '../model/User.js';
import Chat from '../model/Chat.js';
import Notification from '../model/Notification.js'; // เพิ่ม import Notification
import { protect, authorizeAdminOrSuperAdmin } from '../auth/middleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const router = express.Router();

// ตั้งค่าโฟลเดอร์สำหรับเก็บไฟล์แนบ (เช่น reports)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/reports';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `report_${req.user.id}_${uniqueSuffix}${ext}`);
  },
});

// ตั้งค่าโฟลเดอร์สำหรับเก็บไฟล์แชท
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/chat';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `chat_${req.user.id}_${uniqueSuffix}${ext}`);
  },
});

// ตรวจสอบว่าไฟล์เป็นไฟล์ที่อนุญาต (เช่น JPEG, PNG, PDF, DOC, DOCX)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image (JPEG/PNG), PDF, or Word (DOC/DOCX) files are allowed'), false);
  }
};

const upload = multer({ storage: storage, fileFilter });
const chatUpload = multer({ storage: chatStorage, fileFilter });

const reportsUploadDir = './uploads/reports';
const chatUploadDir = './uploads/chat';
if (!fs.existsSync(reportsUploadDir)) {
  fs.mkdirSync(reportsUploadDir, { recursive: true });
}
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

// Export router as a function that accepts io
export default (io) => {
  // Route สำหรับสร้างรายงานใหม่
  router.post('/create/me', protect, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user.id;
      const { topic, description, date } = req.body;

      if (!topic || !description || !date) {
        return res.status(400).json({ message: 'Topic, description, and date are required' });
      }

      const reportDate = new Date(date);
      if (isNaN(reportDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      let fileUrl = '';
      if (req.file) {
        fileUrl = `http://172.18.43.39:5000/uploads/reports/${req.file.filename}`;
      }

      const report = await Report.create({
        userId,
        topic,
        description,
        date: reportDate,
        file: fileUrl,
      });

      const reportResponse = {
        issueId: report._id,
        userId: report.userId,
        topic: report.topic,
        description: report.description,
        date: report.date,
        file: report.file,
        status: report.status,
        assignedAdmin: report.assignedAdmin,
        createdAt: report.createdAt,
      };

      return res.status(201).json({
        message: 'Report created successfully',
        data: reportResponse,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับดึงรายงานของผู้ใช้ปัจจุบัน
  router.get('/user/me', protect, async (req, res) => {
    try {
      const userId = req.user.id;

      const reports = await Report.find({ userId }).sort({ createdAt: -1 }).populate('assignedAdmin', 'firstName lastName role profileImage');
      if (!reports.length) {
        return res.status(404).json({ message: 'No reports found for this user' });
      }

      const reportsResponse = reports.map(report => ({
        issueId: report._id,
        userId: report.userId,
        topic: report.topic,
        description: report.description,
        date: report.date,
        file: report.file,
        status: report.status,
        assignedAdmin: report.assignedAdmin ? {
          id: report.assignedAdmin._id,
          firstName: report.assignedAdmin.firstName,
          lastName: report.assignedAdmin.lastName,
          role: report.assignedAdmin.role,
          profileImage: report.assignedAdmin.profileImage,
        } : null,
        createdAt: report.createdAt,
        rating: report.rating,
      }));

      return res.status(200).json({
        message: 'Reports retrieved successfully',
        data: reportsResponse,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับดึงรายงานทั้งหมด (เฉพาะ SuperAdmin และ Admin)
  router.get('/admin/all', protect, authorizeAdminOrSuperAdmin, async (req, res) => {
    try {
      const reports = await Report.find().sort({ createdAt: -1 }).populate('userId', 'firstName lastName department profileImage').populate('assignedAdmin', 'firstName lastName role profileImage');
      if (!reports.length) {
        return res.status(404).json({ message: 'No reports found' });
      }

      const reportsResponse = reports.map(report => ({
        issueId: report._id,
        userId: report.userId ? {
          id: report.userId._id,
          firstName: report.userId.firstName,
          lastName: report.userId.lastName,
          department: report.userId.department,
          profileImage: report.userId.profileImage,
        } : null,
        topic: report.topic,
        description: report.description,
        date: report.date,
        file: report.file,
        status: report.status,
        assignedAdmin: report.assignedAdmin ? {
          id: report.assignedAdmin._id,
          firstName: report.assignedAdmin.firstName,
          lastName: report.assignedAdmin.lastName,
          role: report.assignedAdmin.role,
          profileImage: report.assignedAdmin.profileImage,
        } : null,
        rating: report.rating,
        createdAt: report.createdAt,
      }));

      return res.status(200).json({
        message: 'All reports retrieved successfully',
        data: reportsResponse,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับดึงรายงานที่ถูกกำหนดให้ Admin ปัจจุบัน
  router.get('/admin/assigned/:id', protect, authorizeAdminOrSuperAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;

      const reports = await Report.find({ assignedAdmin: adminId }).sort({ createdAt: -1 })
        .populate('userId', 'firstName lastName department profileImage phoneNumber email')
        .populate('assignedAdmin', 'firstName lastName role profileImage');

      if (!reports.length) {
        return res.status(404).json({ message: 'No assigned reports found for this admin' });
      }

      const reportsResponse = reports.map(report => ({
        issueId: report._id,
        userId: report.userId ? {
          id: report.userId._id,
          firstName: report.userId.firstName,
          lastName: report.userId.lastName,
          department: report.userId.department,
          profileImage: report.userId.profileImage,
          phoneNumber: report.userId.phoneNumber,
          email: report.userId.email,
        } : null,
        topic: report.topic,
        description: report.description,
        date: report.date,
        file: report.file,
        status: report.status,
        assignedAdmin: report.assignedAdmin ? {
          id: report.assignedAdmin._id,
          firstName: report.assignedAdmin.firstName,
          lastName: report.assignedAdmin.lastName,
          role: report.assignedAdmin.role,
          profileImage: report.assignedAdmin.profileImage,
        } : null,
        createdAt: report.createdAt,
      }));

      return res.status(200).json({
        message: 'Assigned reports retrieved successfully',
        data: reportsResponse,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับแก้ไขรายงาน
  router.put('/edit/:issueId', protect, upload.single('file'), async (req, res) => {
    try {
      const issueId = req.params.issueId;
      const userId = req.user.id;
  
      if (!mongoose.Types.ObjectId.isValid(issueId)) {
        return res.status(400).json({ message: 'Invalid issue ID' });
      }
  
      const report = await Report.findById(issueId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
  
      if (report.userId.toString() !== userId && req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'You are not authorized to edit this report' });
      }
  
      const { topic, description, date, status, assignedAdmin } = req.body;
  
      if (!topic && !description && !date && !status && !assignedAdmin && !req.file) {
        return res.status(400).json({ message: 'At least one field (topic, description, date, status, assignedAdmin, or file) is required' });
      }
  
      let reportDate = report.date;
      if (date) {
        reportDate = new Date(date);
        if (isNaN(reportDate.getTime())) {
          return res.status(400).json({ message: 'Invalid date format' });
        }
      }
  
      let reportStatus = report.status;
      const oldStatus = report.status;
      if (status) {
        if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
          return res.status(403).json({ message: 'Only SuperAdmin or Admin can update the status' });
        }
        if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
          return res.status(400).json({ message: 'Status must be one of: pending, approved, rejected, or completed' });
        }
        reportStatus = status;
      }
  
      let reportAssignedAdmin = report.assignedAdmin;
      const oldAssignedAdmin = report.assignedAdmin?.toString();
      if (assignedAdmin) {
        if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
          return res.status(403).json({ message: 'Only SuperAdmin or Admin can assign an admin' });
        }
        if (!mongoose.Types.ObjectId.isValid(assignedAdmin)) {
          return res.status(400).json({ message: 'Invalid admin ID' });
        }
        const admin = await User.findById(assignedAdmin);
        if (!admin || (admin.role !== 'Admin' && admin.role !== 'SuperAdmin')) {
          return res.status(400).json({ message: 'Assigned user must be an Admin or SuperAdmin' });
        }
        reportAssignedAdmin = assignedAdmin;
      }
  
      let fileUrl = report.file;
      if (req.file) {
        if (report.file) {
          const oldFileName = report.file.split('/').pop();
          const oldFilePath = path.join(reportsUploadDir, oldFileName);
          try {
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          } catch (error) {
            console.error('Error deleting old report file:', error.message);
          }
        }
        fileUrl = `http://172.18.43.39:5000/uploads/reports/${req.file.filename}`;
      }
  
      const updatedReport = await Report.findByIdAndUpdate(
        issueId,
        {
          topic: topic || report.topic,
          description: description || report.description,
          date: reportDate,
          file: fileUrl,
          status: reportStatus,
          assignedAdmin: reportAssignedAdmin,
        },
        { new: true, runValidators: true }
      ).populate('userId assignedAdmin', 'firstName lastName role profileImage');
  
      const io = req.app.locals.io;
  
      // เพิ่มการแจ้งเตือนเมื่อ assignedAdmin เปลี่ยน
      if (assignedAdmin && oldAssignedAdmin !== assignedAdmin) {
        const userId = updatedReport.userId?._id?.toString();
        const newAdminId = updatedReport.assignedAdmin?._id?.toString();
        const topic = updatedReport.topic || `คำร้อง ${issueId}`;
  
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          try {
            const userNotification = new Notification({
              userId: new mongoose.Types.ObjectId(userId),
              issueId,
              message: `Admin for report ${topic} has been changed`,
              type: 'info',
              isRead: false,
              createdAt: new Date(),
            });
            await userNotification.save();
            io.to(userId).emit('statusUpdate', {
              id: userNotification._id,
              issueId,
              userId,
              message: userNotification.message,
              type: userNotification.type,
              isRead: userNotification.isRead,
              createdAt: userNotification.createdAt,
            });
          } catch (error) {
            console.error('Error creating user notification for admin change:', error.message);
          }
        }
  
        if (newAdminId && mongoose.Types.ObjectId.isValid(newAdminId)) {
          try {
            const adminNotification = new Notification({
              userId: new mongoose.Types.ObjectId(newAdminId),
              issueId,
              message: `You have been assigned to report ${topic}`,
              type: 'info',
              isRead: false,
              createdAt: new Date(),
            });
            await adminNotification.save();
            io.to(newAdminId).emit('statusUpdate', {
              id: adminNotification._id,
              issueId,
              userId: newAdminId,
              message: adminNotification.message,
              type: adminNotification.type,
              isRead: adminNotification.isRead,
              createdAt: adminNotification.createdAt,
            });
          } catch (error) {
            console.error('Error creating admin notification for admin change:', error.message);
          }
        }
      }
  
      if (status && status !== oldStatus) {
        const userId = updatedReport.userId?._id?.toString();
        const adminId = updatedReport.assignedAdmin?._id?.toString() || req.user.id;
        const topic = updatedReport.topic || `คำร้อง ${issueId}`;
  
        const notificationData = {
          issueId,
          oldStatus,
          newStatus: status,
          message: `Report ${topic} status updated to ${status} by Admin`,
          createdAt: new Date(),
        };
  
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          try {
            const userNotification = new Notification({
              userId: new mongoose.Types.ObjectId(userId),
              ...notificationData,
              isRead: false,
            });
            await userNotification.save();
            console.log('User notification created:', userNotification);
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
          } catch (error) {
            console.error('Error saving user notification:', error.message);
          }
        } else {
          console.warn('Invalid or missing userId for notification:', userId);
        }
  
        if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
          try {
            const adminNotification = new Notification({
              userId: new mongoose.Types.ObjectId(adminId),
              ...notificationData,
              message: `Report ${topic} status updated to ${status} (by you)`,
              isRead: false,
            });
            await adminNotification.save();
            console.log('Admin notification created:', adminNotification);
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
          } catch (error) {
            console.error('Error saving admin notification:', error.message);
          }
        } else {
          console.warn('Invalid or missing adminId for notification:', adminId);
        }
  
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
      }
  
      if (reportStatus === 'completed') {
        try {
          const chats = await Chat.find({ issueId });
          const deletedChats = await Chat.deleteMany({ issueId });
          console.log(`Deleted ${deletedChats.deletedCount} chat messages for report ${issueId}`);
  
          if (updatedReport.file) {
            const reportFileName = updatedReport.file.split('/').pop();
            const reportFilePath = path.join(reportsUploadDir, reportFileName);
            try {
              if (fs.existsSync(reportFilePath)) {
                fs.unlinkSync(reportFilePath);
              }
            } catch (error) {
              console.error('Error deleting report file:', error.message);
            }
          }
  
          for (const chat of chats) {
            if (chat.file) {
              const chatFileName = chat.file.split('/').pop();
              const chatFilePath = path.join(chatUploadDir, chatFileName);
              try {
                if (fs.existsSync(chatFilePath)) {
                  fs.unlinkSync(chatFilePath);
                }
              } catch (error) {
                console.error('Error deleting chat file:', error.message);
              }
            }
          }
  
          io.to(issueId).emit('chatClosed', {
            issueId,
            message: 'This report chat has been closed and messages have been deleted.',
          });
        } catch (error) {
          console.error('Error handling completed status:', error.message);
        }
      }
  
      const reportResponse = {
        issueId: updatedReport._id,
        userId: updatedReport.userId?._id,
        topic: updatedReport.topic,
        description: updatedReport.description,
        date: updatedReport.date,
        file: updatedReport.file,
        status: updatedReport.status,
        assignedAdmin: updatedReport.assignedAdmin
          ? {
              id: updatedReport.assignedAdmin._id,
              firstName: updatedReport.assignedAdmin.firstName,
              lastName: updatedReport.assignedAdmin.lastName,
              role: updatedReport.assignedAdmin.role,
              profileImage: updatedReport.assignedAdmin.profileImage,
            }
          : null,
        createdAt: updatedReport.createdAt,
      };
  
      return res.status(200).json({
        message: 'Report updated successfully',
        data: reportResponse,
      });
    } catch (error) {
      console.error('Error updating report:', error.message);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });
  
  // Route สำหรับดึงประวัติแชท
  router.get('/chat/:issueId', protect, async (req, res) => {
    try {
      const issueId = req.params.issueId;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(issueId)) {
        return res.status(400).json({ message: 'Invalid issue ID' });
      }

      const report = await Report.findById(issueId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      if (report.userId.toString() !== userId && report.assignedAdmin?.toString() !== userId) {
        return res.status(403).json({ message: 'You are not authorized to view this chat' });
      }

      const chats = await Chat.find({ issueId }).sort({ createdAt: 1 }).populate('senderId', 'firstName lastName role profileImage');

      const chatsResponse = chats.map(chat => {
        let fileName = '';
        let fileType = '';
        if (chat.file) {
          fileName = chat.file.split('/').pop();
          fileType = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' :
                    fileName.endsWith('.png') ? 'image/png' :
                    fileName.endsWith('.pdf') ? 'application/pdf' :
                    fileName.endsWith('.doc') ? 'application/msword' :
                    fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : '';
        }

        return {
          id: chat._id,
          issueId: chat.issueId,
          senderId: {
            _id: chat.senderId._id,
            firstName: chat.senderId.firstName,
            lastName: chat.senderId.lastName || '',
            role: chat.senderId.role,
            profileImage: chat.senderId.profileImage,
          },
          message: chat.message || '',
          fileUrl: chat.file || '',
          fileName: fileName,
          fileType: fileType,
          createdAt: chat.createdAt,
        };
      });

      return res.status(200).json({
        message: 'Chat history retrieved successfully',
        data: chatsResponse,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับลบรายงาน
  router.delete('/delete/:issueId', protect, async (req, res) => {
    try {
      const reportIssueId = req.params.issueId;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(reportIssueId)) {
        return res.status(400).json({ message: 'Invalid report ID' });
      }

      const report = await Report.findById(reportIssueId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      if (report.userId.toString() !== userId && req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'You are not authorized to delete this report' });
      }

      if (report.file) {
        const fileName = report.file.split('/').pop();
        const filePath = path.join(reportsUploadDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await Report.findByIdAndDelete(reportIssueId);

      return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับกำหนดผู้รับผิดชอบ
  router.put('/assign/:issueId', protect, authorizeAdminOrSuperAdmin, async (req, res) => {
    try {
      const reportIssueId = req.params.issueId;
      const { adminId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(reportIssueId)) {
        return res.status(400).json({ message: 'Invalid report ID' });
      }

      const report = await Report.findById(reportIssueId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({ message: 'Invalid admin ID' });
      }

      const admin = await User.findById(adminId);
      if (!admin || (admin.role !== 'Admin' && admin.role !== 'SuperAdmin')) {
        return res.status(400).json({ message: 'Assigned user must be an Admin or SuperAdmin' });
      }

      const updatedReport = await Report.findByIdAndUpdate(
        reportIssueId,
        { assignedAdmin: adminId },
        { new: true, runValidators: true }
      ).populate('assignedAdmin', 'firstName lastName role profileImage');

      const reportResponse = {
        issueId: updatedReport._id,
        userId: updatedReport.userId,
        topic: updatedReport.topic,
        description: updatedReport.description,
        date: updatedReport.date,
        file: updatedReport.file,
        status: updatedReport.status,
        assignedAdmin: updatedReport.assignedAdmin ? {
          id: updatedReport.assignedAdmin._id,
          firstName: updatedReport.assignedAdmin.firstName,
          lastName: updatedReport.assignedAdmin.lastName,
          role: updatedReport.assignedAdmin.role,
          profileImage: updatedReport.assignedAdmin.profileImage,
        } : null,
        createdAt: updatedReport.createdAt,
      };

      return res.status(200).json({
        message: 'Admin assigned to report successfully',
        data: reportResponse,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับให้คะแนน
  router.put('/rate/:issueId', protect, async (req, res) => {
    try {
      const { issueId } = req.params;
      const { rating } = req.body;

      if (!mongoose.Types.ObjectId.isValid(issueId)) {
        return res.status(400).json({ message: 'Invalid issue ID' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const report = await Report.findById(issueId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      if (report.status !== 'completed') {
        return res.status(400).json({ message: 'Report must be completed before rating' });
      }

      if (report.rating !== null) {
        return res.status(400).json({ message: 'This report has already been rated' });
      }

      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (report.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Only the report creator can rate this report' });
      }

      report.rating = rating;
      await report.save();

      const adminId = report.assignedAdmin?.toString();
      if (adminId) {
        io.to(adminId).emit('reportRated', {
          issueId,
          rating,
          message: `Report ${issueId} has been rated with ${rating} stars`,
        });
      }

      res.status(200).json({ message: 'Rating submitted successfully', rating });
    } catch (error) {
      console.error('Error submitting rating:', error.message);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับดึงจำนวนข้อความที่ยังไม่ได้อ่าน
  router.get('/chat/:issueId/unread-count', protect, async (req, res) => {
    try {
      const issueId = req.params.issueId;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(issueId)) {
        return res.status(400).json({ message: 'Invalid issue ID' });
      }

      const report = await Report.findById(issueId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      if (report.userId.toString() !== userId && report.assignedAdmin?.toString() !== userId) {
        return res.status(403).json({ message: 'You are not authorized to view this chat' });
      }

      const chats = await Chat.find({ issueId }).sort({ createdAt: -1 }).populate('senderId', 'firstName lastName');

      const unreadCount = chats.filter(chat => !chat.readBy.includes(userId)).length;

      const lastMessage = chats.length > 0 ? {
        message: chats[0].message,
        createdAt: chats[0].createdAt,
      } : null;

      return res.status(200).json({
        message: 'Unread count and last message retrieved successfully',
        data: {
          unreadCount,
          lastMessage,
        },
      });
    } catch (error) {
      console.error(`Error fetching unread count for issue ${req.params.issueId}:`, error);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // Route สำหรับทำเครื่องหมายว่าอ่านข้อความทั้งหมด
  router.post('/chat/:issueId/mark-read', protect, async (req, res) => {
    try {
      const issueId = req.params.issueId;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(issueId)) {
        return res.status(400).json({ message: 'Invalid issue ID' });
      }

      const report = await Report.findById(issueId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      if (report.userId.toString() !== userId && report.assignedAdmin?.toString() !== userId) {
        return res.status(403).json({ message: 'You are not authorized to view this chat' });
      }

      await Chat.updateMany(
        { issueId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );

      return res.status(200).json({
        message: 'Messages marked as read successfully',
      });
    } catch (error) {
      console.error(`Error marking messages as read for issue ${req.params.issueId}:`, error);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  return router;
};