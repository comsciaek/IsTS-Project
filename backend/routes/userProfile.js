// import express from 'express';
// import User from '../model/User.js';
// import { protect } from '../auth/middleware.js';
// import multer from 'multer';
// import path from 'path';

// // ตั้งค่าโฟลเดอร์สำหรับเก็บไฟล์
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = './uploads';
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     const ext = path.extname(file.originalname);
//     cb(null, `user_${req.user.id}_${uniqueSuffix}${ext}`); // ชื่อไฟล์: user_<userId>_<timestamp>_<random>.<ext>
//   },
// });

// const upload = multer({ storage: storage });

// // ตรวจสอบว่าโฟลเดอร์ uploads ถูกสร้าง (ถ้ายังไม่มี)
// const fs = require('fs');
// const uploadDir = './uploads';
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const router = express.Router();

// // Route สำหรับดึงข้อมูลโปรไฟล์ผู้ใช้ตาม userId (ต้องล็อกอินก่อน)
// router.get('/profile/:id', protect, async (req, res) => {
//   try {
//     const userId = req.params.id;

//     // หาผู้ใช้จาก userId และไม่ส่ง password กลับ
//     const user = await User.findById(userId).select('-password');
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const userResponse = {
//       id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       employeeId: user.employeeId,
//       department: user.department,
//       position: user.position,
//       email: user.email,
//       phoneNumber: user.phoneNumber,
//       profileImage: user.profileImage, // ส่งพาธหรือ URL กลับ (เช่น http://localhost:5001/uploads/filename.jpg)
//       role: user.role,
//       createdAt: user.createdAt,
//     };

//     return res.status(200).json({
//       message: 'User profile retrieved successfully',
//       data: userResponse,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: 'Internal Server Error',
//       error: error.message,
//     });
//   }
// });

// // Route สำหรับอัปเดตข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน (ต้องล็อกอินก่อน)
// router.put('/profile', protect, async (req, res) => {
//   try {
//     const userId = req.user.id; // ดึง userId จาก token
//     const { firstName, lastName, phoneNumber, profileImage } = req.body;

//     // ตรวจสอบว่ามีข้อมูลที่ต้องการอัปเดตหรือไม่
//     if (!firstName && !lastName && !phoneNumber && !profileImage) {
//       return res.status(400).json({
//         message: 'At least one field (firstName, lastName, phoneNumber, or profileImage) is required',
//       });
//     }

//     // ตรวจสอบรูปแบบข้อมูล
//     if (firstName && (firstName.length > 50 || !firstName.trim())) {
//       return res.status(400).json({ message: 'Invalid first name' });
//     }
//     if (lastName && (lastName.length > 50 || !lastName.trim())) {
//       return res.status(400).json({ message: 'Invalid last name' });
//     }
//     if (phoneNumber && !/^\d{9,}$/.test(phoneNumber.trim())) {
//       return res.status(400).json({ message: 'Invalid phone number (at least 9 digits)' });
//     }
//     if (profileImage && !/^https?:\/\/.+/.test(profileImage)) {
//       return res.status(400).json({ message: 'Invalid profile image URL' });
//     }

//     // หาผู้ใช้และอัปเดตข้อมูล
//     const user = await User.findByIdAndUpdate(
//       userId,
//       { firstName, lastName, phoneNumber, profileImage },
//       { new: true, runValidators: true, select: '-password' }
//     );

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const userResponse = {
//       id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       employeeId: user.employeeId,
//       department: user.department,
//       position: user.position,
//       email: user.email,
//       phoneNumber: user.phoneNumber,
//       profileImage: user.profileImage, // ส่งพาธหรือ URL กลับ (เช่น http://localhost:5001/uploads/filename.jpg)
//       role: user.role,
//       createdAt: user.createdAt,
//     };

//     return res.status(200).json({
//       message: 'User profile updated successfully',
//       data: userResponse,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: 'Internal Server Error',
//       error: error.message,
//     });
//   }
// });

// // Route สำหรับอัปโหลดไฟล์รูปภาพและส่ง URL กลับ (ต้องล็อกอินก่อน)
// router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
//   try {
//     const userId = req.user.id; // ดึง userId จาก token
//     const file = req.file;

//     if (!file) {
//       return res.status(400).json({ message: 'No image file uploaded' });
//     }

//     // สร้าง URL สำหรับไฟล์ในโฟลเดอร์ท้องถิ่น
//     const imageUrl = `http://localhost:5001/uploads/${file.filename}`; // สร้าง URL ตามพอร์ตเซิร์ฟเวอร์

//     // อัปเดต profileImage ใน MongoDB
//     const user = await User.findByIdAndUpdate(
//       userId,
//       { profileImage: imageUrl },
//       { new: true, runValidators: true, select: '-password' }
//     );

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const userResponse = {
//       id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       employeeId: user.employeeId,
//       department: user.department,
//       position: user.position,
//       email: user.email,
//       phoneNumber: user.phoneNumber,
//       profileImage: user.profileImage, // ส่ง URL กลับ
//       role: user.role,
//       createdAt: user.createdAt,
//     };

//     return res.status(200).json({
//       message: 'Image uploaded successfully',
//       data: {
//         imageUrl: user.profileImage, // ส่ง URL กลับ
//         user: userResponse,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: 'Internal Server Error',
//       error: error.message,
//     });
//   }
// });

// export default router;