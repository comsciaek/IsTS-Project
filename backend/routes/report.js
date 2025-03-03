import express from 'express';
import Report from '../model/Report.js';
import { protect, authorizeAdminOrSuperAdmin } from '../auth/middleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose'; // เพิ่ม import นี้ที่ด้านบนของไฟล์

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

const upload = multer({ storage: storage });

// ตรวจสอบว่าไฟล์เป็นไฟล์ที่อนุญาต (เช่น PDF, DOC, ฯลฯ)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/doc', 'application/docx'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image (JPEG/PNG), PDF, or Word (DOC/DOCX) files are allowed'), false);
  }
};

const reportsUploadDir = './uploads/reports';
if (!fs.existsSync(reportsUploadDir)) {
  fs.mkdirSync(reportsUploadDir, { recursive: true });
}

// Route สำหรับสร้างรายงานใหม่ (ต้องล็อกอินก่อน)
router.post('/create/me', protect, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id; // ได้จาก middleware protect
    const { topic, description, date } = req.body;

    // ตรวจสอบว่ามี topic, description, date หรือไม่
    if (!topic || !description || !date) {
      return res.status(400).json({
        message: 'Topic, description, and date are required',
      });
    }

    // แปลง date เป็น Date object (ถ้าเป็น string)
    const reportDate = new Date(date);
    if (isNaN(reportDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid date format',
      });
    }

    let fileUrl = '';
    if (req.file) {
      fileUrl = `http://172.18.43.39:5000/uploads/reports/${req.file.filename}`; // สร้าง URL สำหรับไฟล์
    }

    const report = await Report.create({
      userId,
      topic,
      description,
      date: reportDate,
      file: fileUrl,
    });

    const reportResponse = {
      issueId: report._id, // เปลี่ยน id เป็น issueId
      userId: report.userId,
      topic: report.topic,
      description: report.description,
      date: report.date,
      file: report.file,
      status: report.status,
      createdAt: report.createdAt,
    };

    return res.status(201).json({
      message: 'Report created successfully',
      data: reportResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับดึงรายงานทั้งหมดของผู้ใช้ปัจจุบัน (ต้องล็อกอินก่อน)
router.get('/user/me', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const reports = await Report.find({ userId }).sort({ createdAt: -1 }); // เรียงลำดับจากใหม่ไปเก่า
    if (!reports.length) {
      return res.status(404).json({ message: 'No reports found for this user' });
    }

    const reportsResponse = reports.map(report => ({
      issueId: report._id, // เปลี่ยน id เป็น issueId
      userId: report.userId,
      topic: report.topic,
      description: report.description,
      date: report.date,
      file: report.file,
      status: report.status,
      createdAt: report.createdAt,
    }));

    return res.status(200).json({
      message: 'Reports retrieved successfully',
      data: reportsResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับดึงรายงานทั้งหมด (เฉพาะ SuperAdmin และ Admin)
router.get('/admin/all', protect, authorizeAdminOrSuperAdmin, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }); // ดึงทั้งหมดและเรียงจากใหม่ไปเก่า
    if (!reports.length) {
      return res.status(404).json({ message: 'No reports found' });
    }

    const reportsResponse = reports.map(report => ({
      issueId: report._id, // เปลี่ยน id เป็น issueId
      userId: report.userId,
      topic: report.topic,
      description: report.description,
      date: report.date,
      file: report.file,
      status: report.status,
      createdAt: report.createdAt,
    }));

    return res.status(200).json({
      message: 'All reports retrieved successfully',
      data: reportsResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับแก้ไขรายงาน (ต้องล็อกอินก่อน, ผู้ใช้เอง, SuperAdmin, หรือ Admin)
router.put('/edit/:issueId', protect, upload.single('file'), async (req, res) => { // เปลี่ยน id เป็น issueId
  try {
    const reportIssueId = req.params.issueId; // เปลี่ยน id เป็น issueId
    const userId = req.user.id;

    // ตรวจสอบว่า reportIssueId เป็น ObjectId ที่ถูกต้อง
    if (!mongoose.Types.ObjectId.isValid(reportIssueId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    // หารายงานจาก reportIssueId
    const report = await Report.findById(reportIssueId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // ตรวจสอบสิทธิ์: ผู้ใช้เอง, SuperAdmin, หรือ Admin
    if (report.userId.toString() !== userId && req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        message: 'You are not authorized to edit this report',
      });
    }

    const { topic, description, date } = req.body;

    // ตรวจสอบว่ามีการอัปเดตข้อมูลหรือไม่
    if (!topic && !description && !date && !req.file) {
      return res.status(400).json({
        message: 'At least one field (topic, description, date, or file) is required',
      });
    }

    // แปลง date เป็น Date object (ถ้าเป็น string)
    let reportDate = report.date;
    if (date) {
      reportDate = new Date(date);
      if (isNaN(reportDate.getTime())) {
        return res.status(400).json({
          message: 'Invalid date format',
        });
      }
    }

    let fileUrl = report.file; // เก็บค่าไฟล์เดิมไว้ก่อน
    if (req.file) {
      // ลบไฟล์เก่าจากโฟลเดอร์ ./uploads/reports ถ้ามี
      if (report.file) {
        const oldFileName = report.file.split('/').pop(); // ดึงชื่อไฟล์เก่าจจาก URL
        const oldFilePath = path.join(reportsUploadDir, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath); // ลบไฟล์เก่า
        }
      }

      fileUrl = `http://172.18.43.39:5000/uploads/reports/${req.file.filename}`; // สร้าง URL สำหรับไฟล์ใหม่
    }

    // อัปเดตข้อมูลใน MongoDB
    const updatedReport = await Report.findByIdAndUpdate(
      reportIssueId, // เปลี่ยน id เป็น issueId
      {
        topic: topic || report.topic,
        description: description || report.description,
        date: reportDate,
        file: fileUrl,
      },
      { new: true, runValidators: true }
    );

    const reportResponse = {
      issueId: updatedReport._id, // เปลี่ยน id เป็น issueId
      userId: updatedReport.userId,
      topic: updatedReport.topic,
      description: updatedReport.description,
      date: updatedReport.date,
      file: updatedReport.file,
      status: updatedReport.status,
      createdAt: updatedReport.createdAt,
    };

    return res.status(200).json({
      message: 'Report updated successfully',
      data: reportResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับลบรายงาน (ต้องล็อกอินก่อน, ผู้ใช้เอง, SuperAdmin, หรือ Admin)
router.delete('/delete/:issueId', protect, async (req, res) => { // เปลี่ยน id เป็น issueId
  try {
    const reportIssueId = req.params.issueId; // เปลี่ยน id เป็น issueId
    const userId = req.user.id;

    // ตรวจสอบว่า reportIssueId เป็น ObjectId ที่ถูกต้อง
    if (!mongoose.Types.ObjectId.isValid(reportIssueId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    // หารายงานจาก reportIssueId
    const report = await Report.findById(reportIssueId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // ตรวจสอบสิทธิ์: ผู้ใช้เอง, SuperAdmin, หรือ Admin
    if (report.userId.toString() !== userId && req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
      return res.status(403).json({
        message: 'You are not authorized to delete this report',
      });
    }

    // ลบไฟล์แนบ (ถ้ามี) จากโฟลเดอร์ ./uploads/reports
    if (report.file) {
      const fileName = report.file.split('/').pop(); // ดึงชื่อไฟล์จาก URL
      const filePath = path.join(reportsUploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // ลบไฟล์จากโฟลเดอร์
      }
    }

    // ลบรายงานจาก MongoDB
    await Report.findByIdAndDelete(reportIssueId); // เปลี่ยน id เป็น issueId

    return res.status(200).json({
      message: 'Report deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

export default router;