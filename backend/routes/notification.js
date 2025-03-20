import express from 'express';
import Notification from '../model/Notification.js';
import { protect } from '../auth/middleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// Route สำหรับดึงการแจ้งเตือนที่ยังไม่ได้อ่านของผู้ใช้
router.get('/unread', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({
      userId: userId,
      isRead: false,
    }).sort({ createdAt: -1 }); // เรียงจากใหม่ไปเก่า

    if (!notifications.length) {
      return res.status(200).json({
        message: 'No unread notifications found',
        data: [],
      });
    }

    const notificationsResponse = notifications.map(notification => ({
      id: notification._id,
      userId: notification.userId,
      issueId: notification.issueId,
      message: notification.message,
      oldStatus: notification.oldStatus,
      newStatus: notification.newStatus,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    }));

    return res.status(200).json({
      message: 'Unread notifications retrieved successfully',
      data: notificationsResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับดึงการแจ้งเตือนทั้งหมดของผู้ใช้
router.get('/all', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    if (!notifications.length) {
      return res.status(200).json({
        message: 'No notifications found',
        data: [],
      });
    }

    const notificationsResponse = notifications.map(notification => ({
      id: notification._id,
      userId: notification.userId,
      issueId: notification.issueId,
      message: notification.message,
      oldStatus: notification.oldStatus,
      newStatus: notification.newStatus,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    }));

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      data: notificationsResponse,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

// Route สำหรับทำเครื่องหมายว่าอ่านการแจ้งเตือน
router.put('/:id/mark-read', protect, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'You are not authorized to mark this notification as read' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      message: 'Notification marked as read successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

export default router;