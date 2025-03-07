import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import PropTypes from "prop-types";
import { useUser } from "./UserContext";
import axios from "axios";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    // เชื่อมต่อ socket เมื่อผู้ใช้เข้าสู่ระบบ
    if (user && (user.id || user._id)) {
      const token = localStorage.getItem("token");
      const newSocket = io("http://172.18.43.39:5000", {
        auth: {
          token: token,
        },
        query: {
          userId: user.id || user._id,
          role: user.role,
        },
      });

      // เหตุการณ์เมื่อเชื่อมต่อสำเร็จ
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);

        // เข้าร่วม socket rooms สำหรับคำร้องที่เกี่ยวข้อง
        if (user.role === "Admin" || user.role === "SuperAdmin") {
          // ถ้าเป็น Admin หรือ SuperAdmin ให้เรียก API เพื่อดึงคำร้องที่ถูกมอบหมาย
          const fetchAssignedReports = async () => {
            try {
              const response = await axios.get(
                `http://172.18.43.39:5000/api/reports/admin/assigned/${
                  user.id || user._id
                }`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              // ดึง issueId จากแต่ละคำร้อง
              const assignedIssueIds =
                response.data?.data?.map(
                  (report) => report._id || report.issueId
                ) || [];

              // เข้าร่วมแต่ละห้องด้วย issueId
              assignedIssueIds.forEach((issueId) => {
                if (issueId) {
                  // แก้ไขการส่งข้อมูลให้เข้ากับการรับของ server
                  newSocket.emit("join", { room: issueId });
                  console.log(`Joined room for issue: ${issueId}`);
                }
              });
            } catch (err) {
              console.error(
                "Error fetching assigned reports for socket rooms:",
                err
              );
            }
          };

          fetchAssignedReports();
        } else if (user.role === "User") {
          // ถ้าเป็น User ให้เรียก API เพื่อดึงคำร้องที่สร้างโดยผู้ใช้
          const fetchUserReports = async () => {
            try {
              const response = await axios.get(
                `http://172.18.43.39:5000/api/reports/user/me`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              // ดึง issueId จากแต่ละคำร้อง
              const userIssueIds =
                response.data?.data?.map(
                  (report) => report._id || report.issueId
                ) || [];

              // เข้าร่วมแต่ละห้องด้วย issueId
              userIssueIds.forEach((issueId) => {
                if (issueId) {
                  // แก้ไขการส่งข้อมูลให้เข้ากับการรับของ server
                  newSocket.emit("join", { room: issueId });
                  console.log(`Joined room for issue: ${issueId}`);
                }
              });
            } catch (err) {
              console.error(
                "Error fetching user reports for socket rooms:",
                err
              );
            }
          };

          fetchUserReports();
        }
      });

      // เหตุการณ์เมื่อมีข้อผิดพลาด
      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      // เหตุการณ์เมื่อถูกตัดการเชื่อมต่อ
      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      setSocket(newSocket);

      // ทำความสะอาดเมื่อคอมโพเนนท์ถูก unmounted
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  // ค่าที่จะส่งออกไปใน context
  const value = {
    socket,
    isConnected: socket?.connected || false,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SocketContext;
