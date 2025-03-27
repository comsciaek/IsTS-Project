import mongoose from 'mongoose';

const UserLinkSchema = new mongoose.Schema({
  lineUserId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, unique: true },
  linkedAt: { type: Date, default: Date.now },
});

export default mongoose.model('UserLink', UserLinkSchema);