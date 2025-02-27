import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide your first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Please provide your last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters'],
  },
  employeeId: {
    type: String,
    required: [true, 'Please provide your employee ID'],
    unique: true,
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Please provide your department'],
    trim: true,
    maxlength: [50, 'Department cannot be more than 50 characters'],
  },
  position: {
    type: String,
    required: [true, 'Please provide your position'],
    trim: true,
    maxlength: [50, 'Position cannot be more than 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  confirmPassword: {
    type: String,
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords do not match',
    },
    // ไม่กำหนด required: true เพื่อให้ไม่บังคับใช้ในทุกกรณี
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide your phone number'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'Admin', 'User'], // เปลี่ยน HeadAdmin เป็น SuperAdmin
    default: 'User', // ผู้ใช้ใหม่จะเป็น User โดยอัตโนมัติ
  },
  profileImage: {
    type: String, // เก็บ URL ของรูปภาพ (เช่น "https://example.com/image.jpg")
    default: '', // ค่าเริ่มต้นเป็นสตริงว่างถ้าไม่มีรูปภาพ
  },
  profileImage: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.confirmPassword = undefined;
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;