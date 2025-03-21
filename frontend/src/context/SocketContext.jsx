import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import PropTypes from "prop-types";
import { useUser } from "./UserContext";
import { message } from "antd";
import axios from "axios"; // เพิ่มการนำเข้า axios สำหรับการเรียกใช้ API

// สร้าง context
export const SocketContext = createContext();

// URL ของ Socket.io server และ API
const SOCKET_URL = "http://172.18.43.39:5000";
const API_BASE_URL = "http://172.18.43.39:5000/api";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user } = useUser();

  // แปลงสถานะเป็น notification type
  const getNotificationType = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "pending":
      default:
        return "info";
    }
  };

  // สร้างข้อความแจ้งเตือนตามสถานะที่เปลี่ยน
  const getStatusChangeMessage = (oldStatus, newStatus, topic) => {
    // ถ้ามีการอัพเดตจากสถานะ pending ไปเป็นสถานะอื่น
    if (oldStatus === "pending") {
      switch (newStatus) {
        case "completed":
          return `คำร้องเรื่อง "${topic}" ได้รับการแก้ไขเรียบร้อยแล้ว`;
        case "approved":
          return `คำร้องเรื่อง "${topic}" ได้รับการอนุมัติแล้ว`;
        case "rejected":
          return `คำร้องเรื่อง "${topic}" ถูกปฏิเสธ`;
        default:
          return `มีการอัปเดตสถานะคำร้องเรื่อง "${topic}"`;
      }
    }
    // ถ้าเป็นการเปลี่ยนจากสถานะอื่นเป็น pending
    else if (newStatus === "รอดำเนินการ") {
      return `คำร้องเรื่อง "${topic}" อยู่ระหว่างการดำเนินการ`;
    }
    // กรณีอื่นๆ
    else {
      switch (newStatus) {
        case "completed":
          return `คำร้องเรื่อง "${topic}" ได้รับการแก้ไขเรียบร้อยแล้ว`;
        case "approved":
          return `คำร้องเรื่อง "${topic}" ได้รับการอนุมัติแล้ว`;
        case "rejected":
          return `คำร้องเรื่อง "${topic}" ถูกปฏิเสธ`;
        default:
          return `มีการอัปเดตสถานะคำร้องเรื่อง "${topic}" จาก ${oldStatus} เป็น ${newStatus}`;
      }
    }
  };

  // แสดงข้อความแจ้งเตือน
  const displayNotificationMessage = useCallback(
    (notification) => {
      // ตรวจสอบว่าเป็น notification สำหรับผู้ใช้ปัจจุบันหรือไม่
      if (
        user?.role === "User" &&
        notification.userId !== user?.id &&
        notification.userId !== user?._id
      ) {
        return; // ข้ามถ้าเป็น user แต่ notification ไม่ใช่ของเขา
      }

      // ใช้ type ที่มากับ notification หรือคำนวณจาก status
      const notificationType =
        notification.type ||
        getNotificationType(notification.status || notification.newStatus);

      // ใช้ message จาก notification โดยตรงถ้ามี หรือสร้างขึ้นเอง
      const displayMessage =
        notification.message ||
        getStatusChangeMessage(
          notification.oldStatus || "pending",
          notification.newStatus || notification.status || "pending",
          notification.topic || "คำร้อง"
        );

      switch (notificationType) {
        case "success":
          message.success(displayMessage);
          break;
        case "error":
          message.error(displayMessage);
          break;
        case "warning":
          message.warning(displayMessage);
          break;
        default:
          message.info(displayMessage);
      }
    },
    [user]
  );

  // เพิ่มฟังก์ชันเพื่อดึงการแจ้งเตือนจาก server
  const fetchNotifications = useCallback(async () => {
    if (!user || (!user.id && !user._id)) return;

    try {
      const token = localStorage.getItem("token");
      const userId = user.id || user._id;

      const response = await axios.get(
        `${API_BASE_URL}/notifications/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // console.log("Fetched notifications from server:", response.data);

      if (response.data && Array.isArray(response.data.data)) {
        const serverNotifications = response.data.data.map((notification) => ({
          id: notification._id || notification.id,
          issueId: notification.issueId,
          userId: notification.userId,
          message: notification.message,
          type: notification.type || "info",
          oldStatus: notification.oldStatus,
          newStatus: notification.newStatus,
          topic: notification.topic,
          createdAt: notification.createdAt || new Date().toISOString(),
          read: notification.isRead || false,
        }));

        // เพิ่มลงในรายการแจ้งเตือน (เฉพาะรายการที่ยังไม่มี)
        setNotifications((prev) => {
          // กรองรายการเดิมออกโดยเทียบจาก id
          const existingIds = prev.map((item) => item.id);
          const newNotifications = serverNotifications.filter(
            (item) => !existingIds.includes(item.id)
          );

          return [...newNotifications, ...prev];
        });
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user]);

  // เพิ่มฟังก์ชันเพื่อบันทึกการแจ้งเตือนไปยัง server
  const saveNotificationToServer = useCallback(
    async (notification) => {
      if (!user || (!user.id && !user._id)) return;

      try {
        // จัดเตรียมข้อมูลตามรูปแบบที่ API ต้องการ
        const notificationData = {
          userId: notification.userId || user.id || user._id,
          issueId: notification.issueId,
          message: notification.message,
          type: notification.type || "info",
          isRead: notification.read || false,
          oldStatus: notification.oldStatus,
          newStatus: notification.newStatus || notification.status,
          createdAt: notification.createdAt || new Date(),
        };

        // ข้อมูลถูกเตรียมไว้แล้วแต่ไม่มีการส่ง API request
        // console.log("Notification prepared for server:", notificationData);

        // การบันทึกการแจ้งเตือนจะถูกดำเนินการโดย backend แทน
        // เมื่อมีการส่ง socket events ที่เกี่ยวข้อง

        return notificationData;
      } catch (error) {
        console.error("Error preparing notification:", error);
        return null;
      }
    },
    [user]
  );

  // เพิ่มฟังก์ชันเพื่ออัปเดตสถานะการอ่านของการแจ้งเตือน
  const markNotificationAsReadOnServer = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `${API_BASE_URL}/notifications/read/${notificationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Notification marked as read on server:", response.data);
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    // เชื่อมต่อ socket เมื่อมี user
    if (user && (user.id || user._id)) {
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("No token available for socket authentication");
        return;
      }

      // สร้าง socket instance
      const socketInstance = io(SOCKET_URL, {
        auth: {
          token,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // ดักจับเหตุการณ์การเชื่อมต่อ
      socketInstance.on("connect", () => {
        // console.log("Socket.io connected with ID:", socketInstance.id);
        setIsConnected(true);

        // แจ้ง server เกี่ยวกับข้อมูลผู้ใช้ตามรูปแบบของ backend
        socketInstance.emit("userConnected", {
          userId: user.id || user._id,
          role: user.role,
        });

        // ดึงการแจ้งเตือนที่เกิดขึ้นขณะออฟไลน์
        fetchNotifications();
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket.io connection error:", error);
        setIsConnected(false);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("Socket.io disconnected. Reason:", reason);
        setIsConnected(false);
      });

      // รับการแจ้งเตือนแบบเดิม - statusUpdate
      socketInstance.on("statusUpdate", (data) => {
        // console.log("Status update notification received:", data);

        // แปลงรูปแบบข้อมูลให้ตรงกับโครงสร้างที่ต้องการแสดงผล
        const notification = {
          id:
            data.id ||
            `notif_${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
          issueId: data.issueId,
          userId: data.userId,
          message: data.message,
          oldStatus: data.oldStatus,
          newStatus: data.status || data.newStatus,
          createdAt: data.createdAt || new Date().toISOString(),
          read: false,
          type: getNotificationType(data.status || data.newStatus),
        };

        setNotifications((prev) => [notification, ...prev]);
        displayNotificationMessage(notification);

        // บันทึกการแจ้งเตือนลงในฐานข้อมูล
        saveNotificationToServer(notification);
      });

      // รับการแจ้งเตือนจากการเปลี่ยนสถานะคำร้อง - issue_status_changed
      socketInstance.on("issue_status_changed", (data) => {
        console.log("Issue status changed:", data);

        // สร้าง notification จากข้อมูลที่ได้รับ
        const notification = {
          id: `notif_${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
          issueId: data.issueId,
          userId: data.userId,
          message:
            data.message ||
            getStatusChangeMessage(
              data.oldStatus || "รอดำเนินการ",
              data.status,
              data.topic || "คำร้อง"
            ),
          oldStatus: data.oldStatus,
          newStatus: data.status,
          topic: data.topic,
          createdAt: new Date().toISOString(),
          read: false,
          type: getNotificationType(data.status),
        };

        setNotifications((prev) => [notification, ...prev]);
        displayNotificationMessage(notification);

        // บันทึกการแจ้งเตือนลงในฐานข้อมูล
        saveNotificationToServer(notification);
      });

      // รับการแจ้งเตือนจาก reportStatusUpdate (สำหรับผู้ที่อยู่ในห้องแชท)
      socketInstance.on("reportStatusUpdate", (data) => {
        console.log("Report status update received:", data);

        // รูปแบบคล้าย issue_status_changed แต่อาจใช้สำหรับปรับปรุง UI หน้าแชท
        if (data.oldStatus !== data.newStatus) {
          const notification = {
            id: `notif_${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
            issueId: data.issueId,
            message:
              data.message ||
              `สถานะคำร้องถูกเปลี่ยนเป็น ${
                data.newStatus === "completed"
                  ? "เสร็จสิ้น"
                  : data.newStatus === "approved"
                  ? "อนุมัติแล้ว"
                  : data.newStatus === "rejected"
                  ? "ถูกปฏิเสธ"
                  : "รอดำเนินการ"
              }`,
            oldStatus: data.oldStatus,
            newStatus: data.newStatus,
            createdAt: new Date().toISOString(),
            read: true, // ตั้งเป็น true เพราะผู้ใช้น่าจะเห็นการเปลี่ยนแปลงนี้ทันทีในหน้าแชท
            type: getNotificationType(data.newStatus),
          };

          // อาจไม่จำเป็นต้องเพิ่มเข้า notifications array ถ้าผู้ใช้เห็นการเปลี่ยนแปลงแล้วในหน้าแชท
          // แต่อาจส่ง message แสดงบนหน้าจอได้
          displayNotificationMessage(notification);
        }
      });

      // เพิ่มการรับการแจ้งเตือนข้อความใหม่
      socketInstance.on("newMessageNotification", (data) => {
        console.log("New message notification received:", data);

        const notification = {
          id:
            data.id ||
            `notif_${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
          issueId: data.issueId,
          message: data.message,
          createdAt: data.createdAt || new Date().toISOString(),
          read: false,
          type: "info",
        };

        setNotifications((prev) => [notification, ...prev]);
        displayNotificationMessage(notification);

        // บันทึกการแจ้งเตือนข้อความใหม่ลงในฐานข้อมูล
        saveNotificationToServer(notification);
      });

      // รับการแจ้งเตือนที่ถูกบันทึกไว้ขณะผู้ใช้ออฟไลน์
      socketInstance.on("storedNotifications", (notifications) => {
        if (
          notifications &&
          Array.isArray(notifications) &&
          notifications.length > 0
        ) {
          console.log("Received stored notifications:", notifications);

          const formattedNotifications = notifications.map((notif) => ({
            id: notif._id || notif.id,
            issueId: notif.issueId,
            userId: notif.userId,
            message: notif.message,
            type: notif.type || "info",
            oldStatus: notif.oldStatus,
            newStatus: notif.newStatus,
            topic: notif.topic,
            createdAt: notif.createdAt || new Date().toISOString(),
            read: notif.isRead || false,
          }));

          // เพิ่มเข้าในรายการการแจ้งเตือน
          setNotifications((prev) => {
            // เพิ่มเฉพาะรายการที่ไม่ซ้ำ
            const existingIds = prev.map((item) => item.id);
            const newNotifications = formattedNotifications.filter(
              (item) => !existingIds.includes(item.id)
            );

            return [...newNotifications, ...prev];
          });

          // แสดงการแจ้งเตือนรวมถ้ามีหลายรายการ
          if (formattedNotifications.length > 0) {
            message.info(
              `คุณมี ${formattedNotifications.length} การแจ้งเตือนใหม่`
            );
          }
        }
      });

      // เพิ่มการจัดการ error จาก server
      socketInstance.on("error", (errorData) => {
        console.error("Socket error from server:", errorData);
        message.error(`Socket error: ${errorData.message}`);
      });

      // เก็บ socket instance ใน state
      setSocket(socketInstance);

      // Cleanup function เมื่อ component unmount
      return () => {
        console.log("Disconnecting socket");
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [
    user,
    displayNotificationMessage,
    fetchNotifications,
    saveNotificationToServer,
  ]);

  // ฟังก์ชันสำหรับอัปเดตสถานะคำร้องผ่าน socket
  const updateReportStatus = useCallback(
    (issueId, status, topic = null) => {
      if (socket && socket.connected) {
        // เตรียมข้อมูลสำหรับส่งไปยัง server
        const data = { issueId, status };

        // เพิ่ม topic ถ้ามี
        if (topic) {
          data.topic = topic;
        }

        // ส่ง event เพื่ออัปเดตสถานะ
        socket.emit("reportStatusUpdate", data, (response) => {
          if (response.error) {
            message.error(`ไม่สามารถอัปเดตสถานะได้: ${response.error}`);
            console.error("Error updating report status:", response);
          } else {
            console.log("Report status updated successfully:", response);
          }
        });
      } else {
        message.warning(
          "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ โปรดรีเฟรชหน้าเว็บและลองใหม่อีกครั้ง"
        );
      }
    },
    [socket]
  );

  // ปรับปรุงฟังก์ชันลบการแจ้งเตือน
  const removeNotification = useCallback(async (notificationId) => {
    try {
      // อัปเดตสถานะใน UI ก่อน
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );

      // ลบการแจ้งเตือนจากเซิร์ฟเวอร์
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/notifications/delete/${notificationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // console.log("Notification deleted from server");
    } catch (error) {
      console.error("Error deleting notification from server:", error);
    }
  }, []);

  // ปรับปรุงฟังก์ชันสำหรับอ่านการแจ้งเตือนทั้งหมด
  const markAllAsRead = useCallback(async () => {
    if (!user || (!user.id && !user._id)) return;

    try {
      // อัปเดตสถานะใน UI ก่อน
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      // อัปเดตในฐานข้อมูล
      const token = localStorage.getItem("token");
      const userId = user.id || user._id;

      await axios.put(
        `${API_BASE_URL}/notifications/readAll/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // console.log("All notifications marked as read on server");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [user]);

  // เพิ่มฟังก์ชันสำหรับทำเครื่องหมายว่าอ่านการแจ้งเตือนแล้ว
  const markNotificationAsRead = useCallback(
    (notificationId) => {
      // อัปเดตใน state ก่อน
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      // อัปเดตในฐานข้อมูล
      markNotificationAsReadOnServer(notificationId);
    },
    [markNotificationAsReadOnServer]
  );

  // ฟังก์ชันสำหรับการเข้าร่วมห้องแชท
  const joinIssueChat = useCallback(
    (issueId) => {
      if (socket && socket.connected) {
        socket.emit("joinUserRoom", issueId);
      }
    },
    [socket]
  );

  // ฟังก์ชันสำหรับออกจากห้องแชท
  const leaveIssueChat = useCallback(
    (issueId) => {
      if (socket && socket.connected) {
        socket.emit("leaveIssueChat", issueId);
      }
    },
    [socket]
  );

  // เพิ่มฟังก์ชันสำหรับการส่งข้อความ
  const sendMessage = useCallback(
    (data, callback) => {
      if (socket && socket.connected) {
        socket.emit("sendMessage", data, callback);
      } else {
        message.warning(
          "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ โปรดรีเฟรชหน้าเว็บและลองใหม่อีกครั้ง"
        );
      }
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        removeNotification,
        markAllAsRead,
        markNotificationAsRead,
        updateReportStatus,
        joinIssueChat,
        leaveIssueChat,
        sendMessage,
        fetchNotifications, // เพิ่มฟังก์ชัน fetchNotifications เพื่อให้ component อื่นเรียกใช้ได้
      }}>
      {children}
    </SocketContext.Provider>
  );
};

// PropTypes validation
SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook
export const useSocket = () => useContext(SocketContext);
