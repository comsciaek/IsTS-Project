import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js'; // Route สำหรับ auth
import userRoutes from './routes/user.js'; // Route สำหรับ user

dotenv.config();



const app = express();
app.use(cors());
app.use(express.json());

const port = 5000;

// เชื่อมต่อ Route
app.use('/api/auth', authRoutes); // Route เกี่ยวกับ auth (register, login)
app.use('/api/users', userRoutes); // Route เกี่ยวกับ user (เช่น อัปเดต role)

// Route ทดสอบ
app.get('/api-test', (req, res) => {
  res.send('Hello World2');
});

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});