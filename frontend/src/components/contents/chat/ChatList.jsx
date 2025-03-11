import { useState, useEffect } from "react";
import { Avatar, Badge, Spin, Empty, Input, List } from "antd";
import { UserOutlined, PaperClipOutlined } from "@ant-design/icons";
import axios from "axios";
import { useSocket } from "../../../context/SocketContext";
import { useUser } from "../../../context/UserContext";
import PropTypes from "prop-types";

const { Search } = Input;

// Import message component สำหรับการแสดงข้อความแจ้งเตือน
import { message as antMessage } from "antd";

const ChatList = ({ onSelectChat, selectedChat }) => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { socket } = useSocket();
  const { user } = useUser(); // เพิ่มการใช้งาน user context

  // ดึงรายการคำร้องที่ได้รับมอบหมาย
  useEffect(() => {
    const fetchAssignedIssues = async () => {
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

        // ดึงคำร้องที่ถูกมอบหมายให้กับ Admin/SuperAdmin นี้
        const response = await axios.get(
          `http://172.18.43.39:5000/api/reports/admin/assigned/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Assigned issues response:", response.data);

        // แปลงข้อมูลจาก API เป็นรูปแบบ contacts
        let assignedIssues = [];
        if (response.data?.data && Array.isArray(response.data.data)) {
          assignedIssues = response.data.data;
        } else if (Array.isArray(response.data)) {
          assignedIssues = response.data;
        }

        // กรองเอาเฉพาะรายการที่ไม่ได้มีสถานะ "completed" หรือ "rejected"
        assignedIssues = assignedIssues.filter(
          (issue) => issue.status !== "completed" && issue.status !== "rejected"
        );

        // ดึงข้อมูลการแชทเพื่อตรวจสอบข้อความที่ยังไม่ได้อ่าน
        const chatCountsPromises = assignedIssues.map(async (issue) => {
          try {
            const issueId = issue._id || issue.issueId;

            // แก้ไข endpoint ให้ถูกต้อง
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

        // รอผลลัพธ์จากการดึงข้อมูลการแชททุกคำร้อง
        const chatCounts = await Promise.all(chatCountsPromises);

        // แปลงคำร้องเป็นรายการผู้ติดต่อพร้อมข้อมูลการแชท
        const contactsList = assignedIssues.map((issue) => {
          const chatInfo = chatCounts.find(
            (chat) => chat.issueId === (issue._id || issue.issueId)
          ) || { unreadCount: 0, lastMessage: null };

          return {
            issueId: issue._id || issue.issueId,
            userId: issue.userId?._id || issue.userId,
            name: issue.userId?.firstName
              ? `${issue.userId.firstName} ${issue.userId.lastName || ""}`
              : issue.userId?.name || "ไม่ระบุชื่อ",
            department: issue.userId?.department || "ไม่ระบุแผนก",
            profileImage:
              issue.userId?.profileImage || issue.userId?.profilePicture,
            topic: issue.topic || issue.title || "ไม่มีหัวข้อ",
            lastActive: issue.updatedAt || issue.createdAt,
            unreadCount: chatInfo.unreadCount || 0,
            lastMessage: chatInfo.lastMessage?.message || null,
            lastMessageTime: chatInfo.lastMessage?.createdAt || null,
          };
        });

        console.log("Transformed contacts:", contactsList);
        setContacts(contactsList);
        setFilteredContacts(contactsList);
      } catch (error) {
        console.error(
          "Error fetching assigned issues:",
          error.response?.data || error.message
        );
        antMessage.error("ไม่สามารถโหลดรายการคำร้องที่ได้รับมอบหมายได้");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedIssues();
  }, [user]);

  // ติดตามข้อความใหม่จาก socket
  useEffect(() => {
    if (!socket) return;

    // เปลี่ยนชื่อ event จาก "new_message" เป็น "newMessage" ตาม backend
    socket.on("newMessage", (messageData) => {
      console.log("New message received:", messageData);

      setContacts((prev) =>
        prev.map((contact) => {
          if (contact.issueId === messageData.issueId) {
            // เพิ่มการตรวจสอบว่าเป็นข้อความหรือไฟล์
            const lastMessage = messageData.fileUrl
              ? `📎 ${messageData.fileName || "ไฟล์แนบ"}`
              : messageData.message;

            return {
              ...contact,
              lastMessage,
              lastMessageTime:
                messageData.createdAt || new Date().toISOString(),
              unreadCount:
                selectedChat?.issueId !== messageData.issueId
                  ? (contact.unreadCount || 0) + 1
                  : 0,
            };
          }
          return contact;
        })
      );
    });

    // เพิ่มการติดตามเมื่อมีการเปลี่ยนแปลงสถานะคำร้อง
    socket.on("issue_status_changed", (data) => {
      if (data.status === "completed" || data.status === "rejected") {
        // ลบคำร้องที่ถูกปิดหรือถูกปฏิเสธออกจากรายการ
        setContacts((prev) =>
          prev.filter((contact) => contact.issueId !== data.issueId)
        );
        setFilteredContacts((prev) =>
          prev.filter((contact) => contact.issueId !== data.issueId)
        );

        // ถ้ากำลังดูแชทที่ถูกปิดอยู่ ให้แสดงข้อความแจ้งเตือน
        if (selectedChat?.issueId === data.issueId) {
          antMessage.info(
            data.status === "completed"
              ? "คำร้องนี้ได้รับการแก้ไขเรียบร้อยแล้ว"
              : "คำร้องนี้ถูกปฏิเสธ"
          );
        }
      }
    });

    return () => {
      socket.off("newMessage"); // เปลี่ยนชื่อ event ที่ unsubscribe ด้วย
      socket.off("issue_status_changed");
    };
  }, [socket, selectedChat]);

  // ฟังก์ชันค้นหาผู้ติดต่อ
  const handleSearch = (value) => {
    setSearchText(value);
    if (!value) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(
      (contact) =>
        (contact.name?.toLowerCase() || "").includes(value.toLowerCase()) ||
        (contact.department?.toLowerCase() || "").includes(
          value.toLowerCase()
        ) ||
        (contact.topic?.toLowerCase() || "").includes(value.toLowerCase())
    );
    setFilteredContacts(filtered);
  };

  // การเลือกแชท
  const handleSelectChat = (contact) => {
    // อัพเดตสถานะการอ่าน
    setContacts((prev) =>
      prev.map((c) =>
        c.issueId === contact.issueId ? { ...c, unreadCount: 0 } : c
      )
    );

    // อัพเดต filteredContacts ด้วยเพื่อให้ Badge หายไปทันที
    setFilteredContacts((prev) =>
      prev.map((c) =>
        c.issueId === contact.issueId ? { ...c, unreadCount: 0 } : c
      )
    );

    // ส่งข้อมูลไปบอก server ว่าได้อ่านข้อความแล้ว
    markAsRead(contact.issueId);

    // แจ้งคอมโพเนนต์หลัก
    onSelectChat(contact);
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
  const renderLastMessage = (contact) => {
    if (!contact.lastMessage) return null;

    // ตรวจสอบว่าเป็นข้อความไฟล์แนบหรือไม่
    if (contact.lastMessage.startsWith("📎")) {
      return (
        <div className="text-xs text-blue-600 truncate">
          <PaperClipOutlined /> {contact.lastMessage.substring(2)}
        </div>
      );
    }

    return (
      <div className="text-xs text-gray-600 truncate">
        {contact.lastMessage}
      </div>
    );
  };

  return (
    <div className="chat-list-container h-full flex flex-col">
      {/* ส่วนค้นหา */}
      <div className="p-3 border-b-gray-300 border-b">
        <Search
          placeholder="ค้นหาชื่อ หรือแผนก..."
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
      </div>

      {/* รายการผู้ติดต่อ */}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spin tip="กำลังโหลดรายการ..." />
        </div>
      ) : filteredContacts.length === 0 ? (
        <Empty
          description={
            searchText
              ? "ไม่พบคำร้องที่ตรงกับการค้นหา"
              : "ไม่มีคำร้องที่ถูกมอบหมาย"
          }
          className="my-10"
        />
      ) : (
        <List
          className="overflow-auto flex-1"
          dataSource={filteredContacts}
          renderItem={(contact) => (
            <List.Item
              className={`cursor-pointer hover:bg-gray-100 transition-colors ${
                selectedChat?.issueId === contact.issueId ? "bg-blue-50" : ""
              }`}
              onClick={() => handleSelectChat(contact)}>
              <List.Item.Meta
                className="p-2"
                avatar={
                  <Badge
                    count={contact.unreadCount || 0}
                    dot={false}
                    overflowCount={99}>
                    <Avatar
                      src={contact.profileImage}
                      icon={!contact.profileImage && <UserOutlined />}
                      size="large"
                    />
                  </Badge>
                }
                title={
                  <div className="flex justify-between">
                    <span className="font-medium">{contact.name}</span>
                    {contact.lastActive && (
                      <span className="text-xs text-gray-400">
                        {new Date(contact.lastActive).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                }
                description={
                  <div>
                    <div className="text-sm text-gray-500 truncate">
                      {contact.department}
                    </div>
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {contact.topic}
                    </div>
                    {contact.lastMessage && renderLastMessage(contact)}
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
ChatList.propTypes = {
  onSelectChat: PropTypes.func.isRequired,
  selectedChat: PropTypes.shape({
    issueId: PropTypes.string,
    userId: PropTypes.string,
    name: PropTypes.string,
    department: PropTypes.string,
    topic: PropTypes.string,
    profileImage: PropTypes.string,
  }),
};

export default ChatList;
