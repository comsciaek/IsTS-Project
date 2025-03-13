import { useState, useEffect } from "react";
import { List, Avatar, Badge, Spin, Empty, Input } from "antd";
import { UserOutlined, PaperClipOutlined } from "@ant-design/icons";
import axios from "axios";
import { useSocket } from "../../../context/SocketContext";
import { useUser } from "../../../context/UserContext";
import PropTypes from "prop-types";

const { Search } = Input;

// Import message component สำหรับการแสดงข้อความแจ้งเตือน
import { message as antMessage } from "antd";

// ฟังก์ชันสำหรับเล่นเสียงแจ้งเตือน
const playNotificationSound = () => {
  const audio = new Audio("/notification.mp3");
  audio
    .play()
    .catch((error) => console.log("Error playing notification sound:", error));
};

const UserChatList = ({ onSelectChat, selectedChat }) => {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { socket } = useSocket();
  const { user } = useUser();

  // ดึงรายการคำร้องของผู้ใช้
  useEffect(() => {
    const fetchUserIssues = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = user?.id || user?._id;

        if (!userId) {
          console.error("User ID is missing");
          setLoading(false);
          return;
        }

        if (!token) {
          console.error("No token found, please log in again");
          antMessage.error("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
          setLoading(false);
          return;
        }

        // ดึงคำร้องของผู้ใช้
        const response = await axios.get(
          `http://172.18.43.39:5000/api/reports/user/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("User issues response:", response.data);

        // แปลงข้อมูลจาก API
        let userIssues = [];
        if (response.data?.data && Array.isArray(response.data.data)) {
          userIssues = response.data.data;
        } else if (Array.isArray(response.data)) {
          userIssues = response.data;
        }

        // กรองเอาเฉพาะรายการที่ไม่ได้มีสถานะ "completed" หรือ "rejected"
        userIssues = userIssues.filter(
          (issue) => issue.status !== "completed" && issue.status !== "rejected"
        );

        // ดึงข้อมูลข้อความที่ยังไม่ได้อ่าน
        const chatCountsPromises = userIssues.map(async (issue) => {
          try {
            const issueId = issue._id || issue.issueId;

            if (!token) {
              console.error("No token found, please log in again");
              return {
                issueId,
                unreadCount: 0,
                lastMessage: null,
              };
            }

            // แก้ไข endpoint ให้ถูกต้อง - ใช้ endpoint เดียวกับ admin แต่เพิ่ม user
            const chatResponse = await axios.get(
              `http://172.18.43.39:5000/api/reports/chat/${issueId}/unread-count`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            console.log(
              `Chat response for issue ${issueId}:`,
              chatResponse.data
            );

            return {
              issueId,
              unreadCount: chatResponse.data?.data?.unreadCount || 0,
              lastMessage: chatResponse.data?.data?.lastMessage || null,
            };
          } catch (error) {
            console.error(
              `Error fetching chat counts for issue ${
                issue._id || issue.issueId
              }:`,
              error.response?.data || error.message
            );
            return {
              issueId: issue._id || issue.issueId,
              unreadCount: 0,
              lastMessage: null,
            };
          }
        });

        const chatCounts = await Promise.all(chatCountsPromises);

        // แปลงคำร้องเป็นรายการแชท
        const issuesList = userIssues.map((issue) => {
          const chatInfo = chatCounts.find(
            (chat) => chat.issueId === (issue._id || issue.issueId)
          ) || { unreadCount: 0, lastMessage: null };

          // ดึงข้อมูลผู้รับผิดชอบ
          const admin = issue.assignedAdmin || {};

          return {
            issueId: issue._id || issue.issueId,
            topic: issue.topic || issue.title || "ไม่มีหัวข้อ",
            status: issue.status || "รอดำเนินการ",
            date: issue.date || issue.createdAt,
            lastActive: issue.updatedAt || issue.createdAt,
            unreadCount: chatInfo.unreadCount || 0,
            lastMessage: chatInfo.lastMessage?.message || null,
            lastMessageTime: chatInfo.lastMessage?.createdAt || null,
            adminName: admin.firstName
              ? `${admin.firstName} ${admin.lastName || ""}`
              : admin.name || "ผู้ดูแลระบบ",
            adminProfileImage: admin.profileImage || admin.profilePicture,
          };
        });

        // console.log("Transformed issues:", issuesList);
        setIssues(issuesList);
        setFilteredIssues(issuesList);
      } catch (error) {
        console.error(
          "Error fetching user issues:",
          error.response?.data || error.message
        );
        antMessage.error("ไม่สามารถโหลดรายการคำร้องของคุณได้");
      } finally {
        setLoading(false);
      }
    };

    fetchUserIssues();
  }, [user]);

  // ติดตามข้อความใหม่จาก socket
  useEffect(() => {
    if (!socket) return;

    // ล้าง event listener เก่าก่อน
    socket.off("newMessage");
    socket.off("issue_status_changed");

    const handleNewMessage = (messageData) => {
      console.log("Socket new message:", messageData);

      // ตรวจสอบว่าเป็นข้อความจากตัวเอง
      const isOwnMessage = messageData.senderId === (user?.id || user?._id);

      setIssues((prev) => {
        const updatedIssues = prev.map((issue) => {
          if (issue.issueId === messageData.issueId) {
            const lastMessage = messageData.fileUrl
              ? `📎 ${messageData.fileName || "ไฟล์แนบ"}`
              : messageData.message;

            // ตรวจสอบว่าเป็นข้อความซ้ำหรือไม่
            const isMessageAlreadyDisplayed =
              issue.lastMessageTime &&
              messageData.createdAt &&
              new Date(issue.lastMessageTime).getTime() ===
                new Date(messageData.createdAt).getTime();

            if (isOwnMessage) {
              // ถ้าเป็นข้อความของตัวเอง ไม่อัพเดตข้อความล่าสุดและไม่เพิ่ม unreadCount
              return {
                ...issue,
                // ถ้าต้องการไม่ให้แสดงข้อความของตัวเองเป็นข้อความล่าสุด ให้เอา 2 บรรทัดนี้ออก
                // lastMessage,
                // lastMessageTime: messageData.createdAt || new Date().toISOString(),
              };
            } else {
              // ถ้าเป็นข้อความจากคู่สนทนา อัพเดตข้อความล่าสุดและเพิ่ม unreadCount (ถ้าไม่ได้ดูแชทนั้นอยู่)
              return {
                ...issue,
                lastMessage,
                lastMessageTime:
                  messageData.createdAt || new Date().toISOString(),
                unreadCount: isMessageAlreadyDisplayed
                  ? issue.unreadCount // คงค่าเดิมถ้าเป็นข้อความซ้ำ
                  : selectedChat?.issueId !== messageData.issueId
                  ? (issue.unreadCount || 0) + 1
                  : 0, // ถ้ากำลังดูแชทนี้อยู่ให้เป็น 0
              };
            }
          }
          return issue;
        });

        return updatedIssues;
      });

      // ทำแบบเดียวกันกับ filteredIssues
      setFilteredIssues((prev) => {
        const updatedIssues = prev.map((issue) => {
          if (issue.issueId === messageData.issueId) {
            const lastMessage = messageData.fileUrl
              ? `📎 ${messageData.fileName || "ไฟล์แนบ"}`
              : messageData.message;

            // ตรวจสอบว่าเป็นข้อความซ้ำหรือไม่
            const isMessageAlreadyDisplayed =
              issue.lastMessageTime &&
              messageData.createdAt &&
              new Date(issue.lastMessageTime).getTime() ===
                new Date(messageData.createdAt).getTime();

            if (isOwnMessage) {
              // ถ้าเป็นข้อความของตัวเอง ไม่อัพเดตข้อความล่าสุดและไม่เพิ่ม unreadCount
              return {
                ...issue,
                // ถ้าต้องการไม่ให้แสดงข้อความของตัวเองเป็นข้อความล่าสุด ให้เอา 2 บรรทัดนี้ออก
                // lastMessage,
                // lastMessageTime: messageData.createdAt || new Date().toISOString(),
              };
            } else {
              // ถ้าเป็นข้อความจากคู่สนทนา อัพเดตข้อความล่าสุดและเพิ่ม unreadCount (ถ้าไม่ได้ดูแชทนั้นอยู่)
              return {
                ...issue,
                lastMessage,
                lastMessageTime:
                  messageData.createdAt || new Date().toISOString(),
                unreadCount: isMessageAlreadyDisplayed
                  ? issue.unreadCount // คงค่าเดิมถ้าเป็นข้อความซ้ำ
                  : selectedChat?.issueId !== messageData.issueId
                  ? (issue.unreadCount || 0) + 1
                  : 0, // ถ้ากำลังดูแชทนี้อยู่ให้เป็น 0
              };
            }
          }
          return issue;
        });

        return updatedIssues;
      });

      // เล่นเสียงแจ้งเตือนเฉพาะเมื่อเป็นข้อความจากคู่สนทนา และไม่ได้กำลังดูแชทนั้นอยู่
      if (!isOwnMessage && selectedChat?.issueId !== messageData.issueId) {
        playNotificationSound();
      }
    };

    const handleStatusChanged = (data) => {
      if (data.status === "completed" || data.status === "rejected") {
        // ลบคำร้องที่ถูกปิดหรือถูกปฏิเสธออกจากรายการ
        setIssues((prev) =>
          prev.filter((issue) => issue.issueId !== data.issueId)
        );
        setFilteredIssues((prev) =>
          prev.filter((issue) => issue.issueId !== data.issueId)
        );

        // ถ้ากำลังดูแชทที่ถูกปิดอยู่ ให้แสดงข้อความแจ้งเตือน
        if (selectedChat?.issueId === data.issueId) {
          antMessage.info(
            data.status === "completed"
              ? "คำร้องนี้ได้รับการแก้ไขเรียบร้อยแล้ว"
              : "คำร้องนี้ถูกปฏิเสธ"
          );
        }
      } else {
        // อัพเดทสถานะตามปกติ
        setIssues((prev) =>
          prev.map((issue) => {
            if (issue.issueId === data.issueId) {
              return {
                ...issue,
                status: data.status,
              };
            }
            return issue;
          })
        );

        setFilteredIssues((prev) =>
          prev.map((issue) => {
            if (issue.issueId === data.issueId) {
              return {
                ...issue,
                status: data.status,
              };
            }
            return issue;
          })
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("issue_status_changed", handleStatusChanged);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("issue_status_changed", handleStatusChanged);
    };
  }, [socket, selectedChat, user]);

  // ฟังก์ชันค้นหาคำร้อง
  const handleSearch = (value) => {
    setSearchText(value);
    if (!value) {
      setFilteredIssues(issues);
      return;
    }

    const filtered = issues.filter(
      (issue) =>
        (issue.topic?.toLowerCase() || "").includes(value.toLowerCase()) ||
        (issue.adminName?.toLowerCase() || "").includes(value.toLowerCase())
    );
    setFilteredIssues(filtered);
  };

  // การเลือกแชท
  const handleSelectChat = (issue) => {
    // อัพเดตสถานะการอ่าน
    setIssues((prev) =>
      prev.map((i) =>
        i.issueId === issue.issueId ? { ...i, unreadCount: 0 } : i
      )
    );

    // อัพเดต filteredIssues ด้วยเพื่อให้ Badge หายไปทันที
    setFilteredIssues((prev) =>
      prev.map((i) =>
        i.issueId === issue.issueId ? { ...i, unreadCount: 0 } : i
      )
    );

    // ส่งข้อมูลไปบอก server ว่าได้อ่านข้อความแล้ว
    markAsRead(issue.issueId);

    // แจ้งคอมโพเนนต์หลัก
    onSelectChat(issue);
  };

  // เพิ่มฟังก์ชันแจ้ง server ว่าได้อ่านข้อความแล้ว
  const markAsRead = async (issueId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      // เรียก API เพื่อทำเครื่องหมายว่าอ่านแล้ว
      await axios.post(
        `http://172.18.43.39:5000/api/reports/chat/${issueId}/mark-read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log(`Marked messages as read for issue ${issueId}`);
    } catch (error) {
      console.error(
        `Error marking messages as read for issue ${issueId}:`,
        error
      );
    }
  };

  // ปรับปรุงการแสดงข้อความสุดท้าย
  const renderLastMessage = (issue) => {
    if (!issue.lastMessage) return null;

    // ตรวจสอบว่าเป็นข้อความไฟล์แนบหรือไม่
    if (issue.lastMessage.startsWith("📎")) {
      return (
        <div className="text-xs text-blue-600 truncate">
          <PaperClipOutlined /> {issue.lastMessage.substring(2)}
        </div>
      );
    }

    return (
      <div className="text-xs text-gray-600 truncate">{issue.lastMessage}</div>
    );
  };

  // แสดงสถานะคำร้อง
  const getStatusDisplay = (status) => {
    switch (status) {
      case "completed":
        return <span className="text-green-500">เสร็จสิ้น</span>;
      case "approved":
        return <span className="text-green-500">อนุมัติแล้ว</span>;
      case "rejected":
        return <span className="text-red-500">ปฏิเสธแล้ว</span>;
      default:
        return <span className="text-orange-500">รอดำเนินการ</span>;
    }
  };

  return (
    <div className="chat-list-container h-full flex flex-col">
      {/* ส่วนค้นหา */}
      <div className="p-3 border-b-gray-300 border-b">
        <Search
          placeholder="ค้นหาคำร้อง..."
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
      </div>

      {/* รายการคำร้อง */}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spin tip="กำลังโหลดรายการ..." />
        </div>
      ) : filteredIssues.length === 0 ? (
        <Empty
          description={
            searchText
              ? "ไม่พบคำร้องที่ตรงกับการค้นหา"
              : "คุณยังไม่มีคำร้องที่สามารถแชทได้"
          }
          className="my-10"
        />
      ) : (
        <List
          className="overflow-auto flex-1"
          dataSource={filteredIssues}
          renderItem={(issue) => (
            <List.Item
              className={`cursor-pointer hover:bg-gray-100 transition-colors ${
                selectedChat?.issueId === issue.issueId ? "bg-blue-50" : ""
              }`}
              onClick={() => handleSelectChat(issue)}>
              <List.Item.Meta
                className="p-2"
                avatar={
                  <Badge
                    count={issue.unreadCount || 0}
                    dot={false}
                    overflowCount={99}>
                    <Avatar
                      src={issue.adminProfileImage}
                      icon={!issue.adminProfileImage && <UserOutlined />}
                      size="large"
                    />
                  </Badge>
                }
                title={
                  <div className="flex justify-between">
                    <span className="font-medium">{issue.adminName}</span>
                    {issue.lastActive && (
                      <span className="text-xs text-gray-400">
                        {new Date(issue.lastActive).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                }
                description={
                  <div>
                    <div className="text-sm text-gray-800 truncate">
                      {issue.topic}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getStatusDisplay(issue.status)}
                    </div>
                    {issue.lastMessage && renderLastMessage(issue)}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

// PropTypes
UserChatList.propTypes = {
  onSelectChat: PropTypes.func.isRequired,
  selectedChat: PropTypes.shape({
    issueId: PropTypes.string,
    adminName: PropTypes.string,
    adminProfileImage: PropTypes.string,
    topic: PropTypes.string,
    status: PropTypes.string,
  }),
};

export default UserChatList;
