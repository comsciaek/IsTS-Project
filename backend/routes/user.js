import express from 'express';
import User from '../model/User.js';
import { protect, authorizeSuperAdmin } from '../auth/middleware.js';

const router = express.Router();

// Route สำหรับดึงข้อมูลผู้ใช้ทั้งหมด (เฉพาะ SuperAdmin)
router.get('/', protect, authorizeSuperAdmin, async (req, res) => {
  try {
    // ดึงข้อมูลผู้ใช้ทั้งหมด (ไม่ส่ง password กลับ)
    const users = await User.find().select('-password');
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    const usersResponse = users.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      department: user.department,
      position: user.position,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      message: 'Users retrieved successfully',
      data: usersResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับดึงข้อมูลผู้ใช้ปัจจุบัน (ต้องล็อกอินก่อน)
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // หาผู้ใช้จาก userId และไม่ส่ง password กลับ
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      department: user.department,
      position: user.position,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profileImage: user.profileImage, // รวมลิงก์รูปภาพใน response
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: 'User profile retrieved successfully',
      data: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับอัปเดตลิงก์รูปภาพของผู้ใช้ปัจจุบัน (ต้องล็อกอินก่อน)
router.put('/me/profile-image', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileImage } = req.body; // รับ URL ของรูปภาพจาก body

    // ตรวจสอบว่ามี URL หรือไม่
    if (!profileImage) {
      return res.status(400).json({
        message: 'Profile image URL is required',
      });
    }

    // หาผู้ใช้และอัปเดตลิงก์รูปภาพ (ใช้ findByIdAndUpdate เพื่อหลีกเลี่ยงการ validate confirmPassword)
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: profileImage },
      { new: true, runValidators: true, select: '-password' } // ไม่ส่ง password กลับ
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      department: user.department,
      position: user.position,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profileImage: user.profileImage, // ส่งลิงก์รูปภาพกลับมา
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: 'Profile image updated successfully',
      data: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับเปลี่ยนบทบาทของผู้ใช้ (เฉพาะ SuperAdmin)
router.put('/:id/role', protect, authorizeSuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // ตรวจสอบว่า role ใหม่ถูกต้อง
    if (!['SuperAdmin', 'Admin', 'User'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Role must be SuperAdmin, Admin, or User',
      });
    }

    // หาผู้ใช้เป้าหมาย
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // ตรวจสอบว่าไม่สามารถเปลี่ยนบทบาทของ SuperAdmin ได้
    if (targetUser.role === 'SuperAdmin') {
      return res.status(403).json({
        message: 'Cannot update the role of a SuperAdmin',
      });
    }

    // อัปเดตบทบาท
    targetUser.role = role;
    await targetUser.save();

    const userResponse = {
      id: targetUser._id,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      employeeId: targetUser.employeeId,
      department: targetUser.department,
      position: targetUser.position,
      email: targetUser.email,
      phoneNumber: targetUser.phoneNumber,
      role: targetUser.role,
      profileImage: targetUser.profileImage, // รวมลิงก์รูปภาพใน response
      createdAt: targetUser.createdAt,
    };

    return res.status(200).json({
      message: 'User role updated successfully',
      data: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

export default router;