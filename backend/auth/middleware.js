import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
  let token;


  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
 
  }

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized, no token',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   
    req.user = decoded; // เก็บข้อมูลทั้งหมดจาก token รวมถึง role (เช่น { id, role })
   
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Not authorized, invalid token',
    });
  }
};

// Middleware สำหรับตรวจสอบว่าผู้ใช้เป็น SuperAdmin เท่านั้น
const authorizeSuperAdmin = (req, res, next) => {
  // ดึงข้อมูลผู้ใช้จาก token (จาก middleware protect)
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({
      message: 'Only SuperAdmin is authorized to perform this action',
    });
  }
  next();
};

export { protect, authorizeSuperAdmin }; // เปลี่ยนชื่อ authorizeHeadAdmin เป็น authorizeSuperAdmin