import express from 'express';
import User from '../model/User.js';
import { protect, authorizeSuperAdmin } from '../auth/middleware.js';

const router = express.Router();

// Route สำหรับดึงข้อมูลผู้ใช้ปัจจุบัน (ต้องล็อกอินก่อน)
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id; // ได้จาก middleware protect

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

// Route สำหรับอัปเดตบทบาท (เฉพาะ SuperAdmin)
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

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (targetUser.role === 'SuperAdmin') {
      return res.status(403).json({
        message: 'Cannot update the role of a SuperAdmin',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: role },
      { new: true, runValidators: true }
    );

    const userResponse = {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      employeeId: updatedUser.employeeId,
      department: updatedUser.department,
      position: updatedUser.position,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
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