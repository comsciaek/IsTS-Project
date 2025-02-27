import express from 'express';
import Report from '../model/Report.js';
import { protect,authorizeAdminOrSuperAdmin } from '../auth/middleware.js';

const router = express.Router();

// Route สำหรับสร้างรายงานใหม่ (ต้องล็อกอินก่อน)
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user.id; // ได้จาก middleware protect
    const { description } = req.body;

    // ตรวจสอบว่ามี description หรือไม่
    if (!description) {
      return res.status(400).json({
        message: 'Description is required',
      });
    }

    const report = await Report.create({
      userId,
      description,
    });

    const reportResponse = {
      id: report._id,
      userId: report.userId,
      description: report.description,
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
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const reports = await Report.find({ userId }).sort({ createdAt: -1 }); // เรียงลำดับจากใหม่ไปเก่า
    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for this user' });
    }

    const reportsResponse = reports.map(report => ({
      id: report._id,
      userId: report.userId,
      description: report.description,
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
router.get('/all', protect, authorizeAdminOrSuperAdmin, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }); // ดึงทั้งหมดและเรียงจากใหม่ไปเก่า
    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: 'No reports found' });
    }

    const reportsResponse = reports.map(report => ({
      id: report._id,
      userId: report.userId,
      description: report.description,
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

export default router;