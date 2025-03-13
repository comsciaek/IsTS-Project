import express from 'express';
import Report from '../model/Report.js';
import User from '../model/User.js';
import Chat from '../model/Chat.js';
import { protect, authorizeAdminOrSuperAdmin } from '../auth/middleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { io } from '../index.js';

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
    cb(null, `report_${req.user.id}_${uniqueSuffix}${ext}`); // ชื่อไฟล์: report_<userId>_<timestamp>_<random>.<ext>
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
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
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
    ).populate('assignedAdmin', 'firstName lastName role profileImage');

    if (reportStatus === 'completed') {
      const chats = await Chat.find({ issueId });
      const deletedChats = await Chat.deleteMany({ issueId });
      console.log(`Deleted ${deletedChats.deletedCount} chat messages for report ${issueId}`);

      // ลบไฟล์ที่เกี่ยวข้องกับรายงาน
      if (updatedReport.file) {
        const reportFileName = updatedReport.file.split('/').pop();
        const reportFilePath = path.join(reportsUploadDir, reportFileName);
        if (fs.existsSync(reportFilePath)) {
          fs.unlinkSync(reportFilePath);
        }
      }

      // ลบไฟล์ที่แนบในแชท
      for (const chat of chats) {
        if (chat.file) {
          const chatFileName = chat.file.split('/').pop();
          const chatFilePath = path.join(chatUploadDir, chatFileName);
          if (fs.existsSync(chatFilePath)) {
            fs.unlinkSync(chatFilePath);
          }
        }
      }

      req.app.locals.io.to(issueId).emit('chatClosed', {
        issueId,
        message: 'This report chat has been closed and messages have been deleted.',
      });
    }

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
      message: 'Report updated successfully',
      data: reportResponse,
    });
  } catch (error) {
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
        fileName = chat.file.split('/').pop(); // ดึงชื่อไฟล์จาก URL
        // สมมติว่าเรามีข้อมูล MIME type จากการอัปโหลด (ต้องปรับในส่วน upload หากต้องการแบบแม่นยำ)
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

    // ตรวจสอบว่า issueId ถูกต้อง
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    // ตรวจสอบคะแนน
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // ค้นหารายงาน
    const report = await Report.findById(issueId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // ตรวจสอบสถานะของรายงาน
    if (report.status !== 'completed') {
      return res.status(400).json({ message: 'Report must be completed before rating' });
    }

    // ตรวจสอบว่าให้คะแนนไปแล้วหรือไม่
    if (report.rating !== null) {
      return res.status(400).json({ message: 'This report has already been rated' });
    }

    // ดึง userId จาก token
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // ตรวจสอบว่าเป็นผู้สร้างรายงานหรือไม่
    if (report.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the report creator can rate this report' });
    }

    // บันทึกคะแนน
    report.rating = rating;
    await report.save();

    // ส่งการแจ้งเตือนไปยัง admin (ถ้ามี)
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

    // ดึงข้อความทั้งหมดใน issueId และเรียงตาม createdAt
    const chats = await Chat.find({ issueId }).sort({ createdAt: -1 }).populate('senderId', 'firstName lastName');

    // นับข้อความที่ยังไม่ได้อ่าน (readBy ไม่มี userId ของผู้ใช้ปัจจุบัน)
    const unreadCount = chats.filter(chat => !chat.readBy.includes(userId)).length;

    // ดึงข้อความล่าสุด
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

    // อัปเดตทุกข้อความใน issueId โดยเพิ่ม userId เข้าไปใน readBy
    await Chat.updateMany(
      { issueId, readBy: { $ne: userId } }, // เฉพาะข้อความที่ยังไม่ได้อ่านโดยผู้ใช้
      { $addToSet: { readBy: userId } } // เพิ่ม userId เข้าไปใน readBy
    );

    return res.status(200).json({
      message: 'Messages marked as read successfully',
    });
  } catch (error) {
    console.error(`Error marking messages as read for issue ${req.params.issueId}:`, error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

export default router;