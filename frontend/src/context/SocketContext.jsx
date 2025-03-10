import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import PropTypes from "prop-types";
import { useUser } from "./UserContext";

// สร้าง context
export const SocketContext = createContext();

// URL ของ Socket.io server
const SOCKET_URL = "http://172.18.43.39:5000";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    // เชื่อมต่อ socket เมื่อมี user
    if (user && user.id) {
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

      // ดักจับเหตุการณ์ต่างๆ
      socketInstance.on("connect", () => {
        console.log("Socket.io connected with ID:", socketInstance.id);
        setIsConnected(true);

        // แจ้ง server เกี่ยวกับข้อมูลผู้ใช้
        socketInstance.emit("userConnected", {
          userId: user.id || user._id,
          role: user.role,
        });
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket.io connection error:", error);
        setIsConnected(false);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("Socket.io disconnected. Reason:", reason);
        setIsConnected(false);
      });

      // เพิ่มเหตุการณ์สำหรับรับข้อความ
      socketInstance.on("messageReceived", (data) => {
        console.log("New message received via socket:", data);
      });

      // เพิ่ม event listener อื่นๆ ตามที่จำเป็น

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
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
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
