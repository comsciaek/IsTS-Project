import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized, no token',
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id || !decoded.role) {
      throw new Error('Invalid token payload');
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({
      message: 'Not authorized, invalid token',
      error: error.message,
    });
  }
};

const authorizeAdminOrSuperAdmin = (req, res, next) => {
  const { role } = req.user || {};

  if (!role) {
    return res.status(401).json({
      message: 'User role not found in token',
    });
  }

  if (role !== 'SuperAdmin' && role !== 'Admin') {
    return res.status(403).json({
      message: 'Only SuperAdmin or Admin is authorized to perform this action',
    });
  }
 // console.log('role', role);
  next();
};

export { protect, authorizeAdminOrSuperAdmin };