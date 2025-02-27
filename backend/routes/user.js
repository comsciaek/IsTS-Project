import express from 'express';
import User from '../model/User.js';
import { protect, authorizeAdminOrSuperAdmin } from '../auth/middleware.js';
import multer from 'multer';
import fs from 'fs'
import path from 'path';



const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.user.id}_${uniqueSuffix}${ext}`); // ชื่อไฟล์: user_<userId>_<timestamp>_<random>.<ext>
  },
});

const upload = multer({ storage: storage });

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// Route สำหรับดึงข้อมูลผู้ใช้ทั้งหมด (เฉพาะ SuperAdmin)
router.get('/', protect, authorizeAdminOrSuperAdmin, async (req, res) => {
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
router.put('/:id/role', protect, authorizeAdminOrSuperAdmin, async (req, res) => {
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

// Route สำหรับดึงข้อมูลโปรไฟล์ผู้ใช้ตาม userId (ต้องล็อกอินก่อน)
router.get('/profile/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id; // ดึง userId จาก URL

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
      profileImage: user.profileImage || user.profilePicture || '', // รักษาการเลือก profileImage
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

router.get('/profile/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;

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
      profileImage: user.profileImage || user.profilePicture || '',
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

// Route สำหรับอัปเดตข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน (ต้องล็อกอินก่อน)
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user.id; // ดึง userId จาก token
    const { firstName, lastName, phoneNumber, profileImage } = req.body;

    // ตรวจสอบว่ามีข้อมูลที่ต้องการอัปเดตหรือไม่
    if (!firstName && !lastName && !phoneNumber && !profileImage) {
      return res.status(400).json({
        message: 'At least one field (firstName, lastName, phoneNumber, or profileImage) is required',
      });
    }

    // ตรวจสอบรูปแบบข้อมูล (ถ้าต้องการ)
    if (firstName && (firstName.length > 50 || !firstName.trim())) {
      return res.status(400).json({ message: 'Invalid first name' });
    }
    if (lastName && (lastName.length > 50 || !lastName.trim())) {
      return res.status(400).json({ message: 'Invalid last name' });
    }
    if (phoneNumber && !/^\d{9,}$/.test(phoneNumber.trim())) {
      return res.status(400).json({ message: 'Invalid phone number (at least 9 digits)' });
    }
    if (profileImage && !/^https?:\/\/.+/.test(profileImage)) {
      return res.status(400).json({ message: 'Invalid profile image URL' });
    }

    // หาผู้ใช้และอัปเดตข้อมูล
    const user = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phoneNumber, profileImage },
      { new: true, runValidators: true, select: '-password' }
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
      profileImage: user.profileImage,
      role: user.role,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: 'User profile updated successfully',
      data: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับอัปโหลดไฟล์รูปภาพและส่ง URL กลับ (ต้องล็อกอินก่อน)
router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id; // ดึง userId จาก token
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // สร้าง URL สำหรับไฟล์ในโฟลเดอร์ท้องถิ่น (ใช้ localhost และพอร์ต 5000 ตาม index.js)
    const imageUrl = `http://172.18.43.39:5000/uploads/${file.filename}`;

    // อัปเดต profileImage ใน MongoDB
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true, runValidators: true, select: '-password' }
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
      profileImage: user.profileImage, // ส่ง URL กลับ
      role: user.role,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: 'Image uploaded successfully',
      data: {
        imageUrl: user.profileImage, // ส่ง URL กลับ
        user: userResponse,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

export default router;