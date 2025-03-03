import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true,
    maxlength: [100, 'Topic cannot be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now,
  },
  file: {
    type: String, // เก็บ URL หรือพาธของไฟล์
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected','inprogress'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model('Report', reportSchema);

export default Report;