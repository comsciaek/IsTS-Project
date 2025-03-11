import { useState, useEffect, useRef } from "react";
import {
  Input,
  Button,
  Avatar,
  Spin,
  Empty,
  Tooltip,
  Typography,
  message,
  Dropdown,
  Menu,
  Modal,
  Upload,
  Popover,
  Image,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  PaperClipOutlined,
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useSocket } from "../../../context/SocketContext";
import { useUser } from "../../../context/UserContext";
import axios from "axios";
import PropTypes from "prop-types";

const { Text } = Typography;

const ChatWindow = ({ chat, onClose, isMobile }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();
  const { user } = useUser();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [filePopoverVisible, setFilePopoverVisible] = useState(false);

  // เลื่อนลงล่างเมื่อมีข้อความใหม่
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ดึงข้อความเมื่อเลือกแชทใหม่
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chat || !chat.issueId) return;

      setLoading(true);
      try {
        const token = localStorage.getItem("token");

        // แก้ไข endpoint ให้ถูกต้องตาม API
        const response = await axios.get(
          `http://172.18.43.39:5000/api/reports/chat/${chat.issueId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Chat messages response:", response.data);

        // แปลงข้อมูลที่ได้จาก API เป็นรูปแบบที่ใช้งานได้
        let chatMessages = [];
        if (response.data?.data && Array.isArray(response.data.data)) {
          chatMessages = response.data.data;
        } else if (Array.isArray(response.data)) {
          chatMessages = response.data;
        }

        // แปลงรูปแบบข้อความให้เหมาะกับการแสดงผล
        const formattedMessages = chatMessages.map((msg) => ({
          id: msg.id || msg._id,
          text: msg.message || msg.text, // รองรับทั้ง message และ text
          senderId: msg.senderId?._id || msg.senderId?.id || msg.senderId,
          senderName: msg.senderId?.firstName
            ? `${msg.senderId.firstName} ${msg.senderId.lastName || ""}`
            : msg.senderName || "ไม่ระบุชื่อ",
          senderRole: msg.senderId?.role || "",
          senderProfileImage: msg.senderId?.profileImage || "",
          createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
          issueId: chat.issueId,
          fileUrl: msg.fileUrl || msg.file, // เพิ่มการรองรับข้อมูลไฟล์แนบ
          fileName:
            msg.fileName || (msg.fileUrl && msg.fileUrl.split("/").pop()),
          fileType: msg.fileType,
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        // ตรวจสอบข้อความ error จาก API เพื่อแสดงให้ user รู้ว่าเกิดอะไรขึ้น
        if (error.response?.status === 403) {
          console.warn("User not authorized to view this chat");
        } else if (error.response?.status === 404) {
          console.warn("Report not found");
        }
      } finally {
        setLoading(false);
        // เลื่อนลงล่างหลังจากโหลดข้อความ
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();
    setFileList([]); // รีเซ็ตรายการไฟล์เมื่อเปลี่ยนแชท
  }, [chat]);

  // ติดตามข้อความใหม่จาก socket
  useEffect(() => {
    if (!socket || !chat || !chat.issueId) return;

    // เปลี่ยนชื่อ event จาก "new_message" เป็น "newMessage" ตาม backend
    socket.on("newMessage", (messageData) => {
      console.log("Socket new message:", messageData);

      // ตรวจสอบว่าข้อความเป็นของแชทนี้หรือไม่ (ตาม issueId)
      if (messageData.issueId === chat.issueId) {
        // ปรับโครงสร้างข้อมูลเพื่อให้ตรงกับวิธีแสดงผล
        const formattedMessage = {
          id: messageData.id || messageData._id,
          text: messageData.message, // เปลี่ยนจาก text เป็น message ตามโครงสร้าง API
          senderId: messageData.senderId,
          createdAt: messageData.createdAt,
          issueId: messageData.issueId,
          fileUrl: messageData.fileUrl || messageData.file,
          fileName:
            messageData.fileName ||
            (messageData.fileUrl && messageData.fileUrl.split("/").pop()),
          fileType: messageData.fileType,
        };

        setMessages((prevMessages) => [...prevMessages, formattedMessage]);
        // เลื่อนลงล่างเมื่อมีข้อความใหม่
        setTimeout(scrollToBottom, 100);
      }
    });

    return () => {
      socket.off("newMessage"); // เปลี่ยนชื่อ event ที่ unsubscribe ด้วย
    };
  }, [socket, chat]);

  // เลื่อนลงล่างเมื่อมีข้อความใหม่
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ฟังก์ชันตรวจสอบประเภทของไฟล์
  const getFileIconByType = (fileUrl) => {
    if (!fileUrl) return <FileOutlined />;

    const extension = fileUrl.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif"].includes(extension)) {
      return <FileImageOutlined />;
    } else if (extension === "pdf") {
      return <FilePdfOutlined style={{ color: "#ff4d4f" }} />;
    } else if (["doc", "docx"].includes(extension)) {
      return <FileWordOutlined style={{ color: "#2b579a" }} />;
    } else if (["xls", "xlsx"].includes(extension)) {
      return <FileExcelOutlined style={{ color: "#217346" }} />;
    }

    return <FileOutlined />;
  };

  // ฟังก์ชันเรียกดูไฟล์แนบ
  const renderFile = (fileUrl, fileName) => {
    if (!fileUrl) return null;

    const extension = fileUrl.split(".").pop().toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif"].includes(extension);

    if (isImage) {
      return (
        <div className="mt-2 border rounded overflow-hidden">
          <Image
            src={fileUrl}
            alt={fileName || "Image"}
            style={{ maxHeight: "200px", maxWidth: "100%" }}
          />
        </div>
      );
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center text-blue-500 hover:underline mt-2">
        {getFileIconByType(fileUrl)}
        <span className="ml-2 break-all">
          {fileName || fileUrl.split("/").pop()}
        </span>
        <DownloadOutlined className="ml-2" />
      </a>
    );
  };

  // จัดการการเลือกไฟล์
  const handleFileChange = (info) => {
    if (info.fileList.length > 1) {
      info.fileList = [info.fileList[info.fileList.length - 1]]; // เก็บแค่ไฟล์ล่าสุด
    }
    setFileList(info.fileList);
  };

  // เช็คขนาดไฟล์ก่อนอัปโหลด
  const beforeUpload = (file) => {
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
      return false;
    }
    return false; // ป้องกันการอัปโหลดอัตโนมัติ
  };

  // ส่งข้อความใหม่พร้อมไฟล์
  const handleSend = async () => {
    if (
      (!newMessage.trim() && fileList.length === 0) ||
      !chat ||
      !chat.issueId ||
      !socket
    )
      return;

    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const userId = user.id || user._id;

      // ข้อมูลสำหรับ socket
      const messageData = {
        issueId: chat.issueId,
        message: newMessage.trim(),
        senderId: userId,
        senderName:
          user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        senderProfileImage: user.profileImage || user.profilePicture,
        createdAt: new Date().toISOString(),
      };

      // ถ้ามีไฟล์
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const file = fileList[0].originFileObj;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("issueId", chat.issueId); // เพิ่ม issueId ใน formData

        try {
          const response = await axios.post(
            "http://172.18.43.39:5000/api/upload/chat",
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
              },
            }
          );

          console.log("File uploaded successfully:", response.data);
          // เพิ่มข้อมูลไฟล์ลงในข้อความที่จะส่งผ่าน socket
          if (response.data && response.data.fileUrl) {
            messageData.fileUrl = response.data.fileUrl;
            messageData.fileName = file.name;
          }
        } catch (error) {
          console.error(
            "Error uploading file:",
            error.response ? error.response.data : error.message
          );
          message.error("ไม่สามารถอัพโหลดไฟล์ได้ โปรดลองอีกครั้ง");
          // แม้ว่าอัพโหลดไฟล์จะล้มเหลว เราก็ยังส่งข้อความได้
        }
      }

      // ส่งข้อความผ่าน socket
      socket.emit("sendMessage", messageData);

      // แสดงข้อความชั่วคราวในหน้าจอ (optimistic update)
      const optimisticMessage = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        senderId: userId,
        senderName:
          user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        senderProfileImage: user.profileImage || user.profilePicture,
        createdAt: new Date().toISOString(),
        issueId: chat.issueId,
        fileUrl: messageData.fileUrl,
        fileName: messageData.fileName,
        _isOptimistic: true,
      };

      setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

      // ล้างฟอร์ม
      setNewMessage("");
      setFileList([]);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error.response?.data?.message) {
        message.error(`ไม่สามารถส่งข้อความได้: ${error.response.data.message}`);
      } else {
        message.error("ไม่สามารถส่งข้อความได้ โปรดลองอีกครั้ง");
      }
    } finally {
      setUploading(false);
    }
  };

  // กด Enter เพื่อส่งข้อความ
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // รูปแบบการแสดงเวลา
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // เพิ่มสถานะสำหรับ Modal ยืนยันการปิดเคส
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false);

  // ฟังก์ชันสำหรับออกจากแชท
  const handleLeaveChat = () => {
    if (onClose) {
      onClose();
    }
  };

  // ฟังก์ชันสำหรับแสดง Modal ยืนยันการปิดเคส
  const showCloseIssueModal = () => {
    setIsCloseModalVisible(true);
  };

  // ฟังก์ชันสำหรับปิด Modal
  const handleCancelClose = () => {
    setIsCloseModalVisible(false);
  };

  // ฟังก์ชันสำหรับปิดเคส
  const handleCloseIssue = async () => {
    try {
      if (!chat || !chat.issueId) {
        message.error("ไม่พบข้อมูลคำร้อง");
        return;
      }

      const token = localStorage.getItem("token");

      // ส่งคำขอไปยัง API เพื่อเปลี่ยนสถานะคำร้องเป็น "completed"
      await axios.put(
        `http://172.18.43.39:5000/api/reports/edit/${chat.issueId}`, //404
        { status: "completed" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // แสดงข้อความสำเร็จและส่ง socket event หากจำเป็น
      message.success("ปิดคำร้องเรียบร้อยแล้ว");

      // ส่ง socket event เพื่อแจ้งการเปลี่ยนแปลงสถานะคำร้อง
      if (socket && socket.connected) {
        socket.emit("issue_status_changed", {
          issueId: chat.issueId,
          status: "completed",
        });
      }

      // ปิด Modal
      setIsCloseModalVisible(false);

      // ออกจากแชท
      handleLeaveChat();
    } catch (error) {
      console.error("Error closing issue:", error);
      message.error("ไม่สามารถปิดคำร้องได้ โปรดลองอีกครั้ง");
    }
  };

  // เมนูสำหรับปุ่ม ... ที่มุมขวาบน
  const menu = (
    <Menu>
      <Menu.Item
        key="leave"
        onClick={handleLeaveChat}
        icon={<LogoutOutlined />}>
        ออกจากแชท
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="close"
        onClick={showCloseIssueModal}
        icon={<CheckCircleOutlined />}
        danger>
        ปิดเคสคำร้อง
      </Menu.Item>
    </Menu>
  );

  // ถ้าไม่มีแชทที่เลือก
  if (!chat) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Empty description="เลือกคำร้องเพื่อเริ่มการสนทนา" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ส่วนหัวแชท (เพิ่มปุ่ม ... ที่มุมขวาบน) */}
      <div className="flex flex-col p-3 sm:p-4 border-b-gray-400 shadow-md relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar
              src={chat.profileImage}
              icon={!chat.profileImage && <UserOutlined />}
              size={isMobile ? "default" : "large"}
            />
            <div className="ml-3">
              <h3 className="font-medium text-sm sm:text-base">{chat.name}</h3>
              <div className="text-xs text-gray-500">
                {chat.department || "ไม่ระบุแผนก"}
              </div>
            </div>
          </div>

          {/* ปุ่ม ... ที่มุมขวาบน */}
          <Dropdown overlay={menu} trigger={["click"]} placement="bottomRight">
            <Button
              type="text"
              icon={
                <MoreOutlined
                  style={{ fontSize: isMobile ? "16px" : "20px" }}
                />
              }
              className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-100"
            />
          </Dropdown>
        </div>

        <div className="mt-2">
          <Text strong className="text-xs sm:text-sm">
            เรื่อง: {chat.topic}
          </Text>
        </div>
      </div>

      {/* ส่วนแสดงข้อความ */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spin tip="กำลังโหลดข้อความ..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            ยังไม่มีข้อความในการสนทนานี้
          </div>
        ) : (
          messages.map((message, index) => {
            const isSelf = message.senderId === (user.id || user._id);

            return (
              <div
                key={index}
                className={`flex mb-3 ${
                  isSelf ? "justify-end" : "justify-start"
                }`}>
                {!isSelf && (
                  <Avatar
                    src={message.senderProfileImage}
                    icon={!message.senderProfileImage && <UserOutlined />}
                    size={isMobile ? "small" : "default"}
                    className="mr-2 mt-1 "
                  />
                )}
                <div>
                  <Tooltip
                    title={
                      <>
                        <div>{message.senderName}</div>
                        <div>{formatTime(message.createdAt)}</div>
                      </>
                    }>
                    <div
                      className={`rounded-lg py-1.5 sm:py-2 px-3 sm:px-4 break-words text-sm sm:text-base ${
                        isSelf ? "bg-blue-500 text-white" : "bg-white shadow-sm"
                      }`}>
                      {message.text}
                    </div>
                  </Tooltip>
                  {message.fileUrl && (
                    <div
                      className={`mt-1 ${isSelf ? "text-right" : "text-left"}`}>
                      {renderFile(message.fileUrl, message.fileName)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ส่วนส่งข้อความ */}
      <div
        className={`p-2 sm:p-3 border-b-gray-400 shadow-md borer-t ${
          isMobile ? "pb-safe" : ""
        }`}>
        {fileList.length > 0 && (
          <div className="mb-2 bg-gray-50 p-2 rounded  flex items-center justify-between">
            <div className="flex items-center">
              {getFileIconByType(fileList[0].name)}
              <span className="ml-2 text-xs sm:text-sm truncate max-w-[150px] sm:max-w-xs">
                {fileList[0].name}
              </span>
            </div>
            <Button
              type="text"
              size="small"
              danger
              onClick={() => setFileList([])}>
              ลบ
            </Button>
          </div>
        )}

        <div className="flex">
          <Popover
            content={
              <Upload
                beforeUpload={beforeUpload}
                fileList={fileList}
                onChange={handleFileChange}
                maxCount={1}>
                <Button icon={<PaperClipOutlined />}>เลือกไฟล์</Button>
              </Upload>
            }
            title="แนบไฟล์"
            trigger="click"
            placement={isMobile ? "topRight" : "bottom"}
            open={filePopoverVisible}
            onOpenChange={setFilePopoverVisible}>
            <Button
              icon={<PaperClipOutlined />}
              className="mr-2"
              size={isMobile ? "middle" : "default"}
              onClick={() => setFilePopoverVisible(true)}
            />
          </Popover>

          <Input.TextArea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="พิมพ์ข้อความ..."
            autoSize={{ minRows: 1, maxRows: isMobile ? 3 : 4 }}
            className="flex-1 resize-none"
            disabled={uploading}
          />

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={
              (newMessage.trim() === "" && fileList.length === 0) || uploading
            }
            loading={uploading}
            className="ml-2"
            style={{
              backgroundColor: "#262362",
              borderColor: "#262362",
            }}
            size={isMobile ? "middle" : "default"}
          />
        </div>
        <div
          className={`${
            isMobile ? "mt-0.5 text-2xs" : "mt-1 text-xs"
          } text-gray-500`}>
          สามารถอัปโหลดไฟล์ได้ไม่เกิน 10MB (รูปภาพ, เอกสาร, ฯลฯ)
        </div>
      </div>

      {/* Modal ยืนยันการปิดเคส */}
      <Modal
        title={<span className="text-red-500">ยืนยันการปิดเคส</span>}
        open={isCloseModalVisible}
        onOk={handleCloseIssue}
        onCancel={handleCancelClose}
        okText="ยืนยันการปิดเคส"
        cancelText="ยกเลิก"
        okButtonProps={{ danger: true }}>
        <p>คุณต้องการปิดเคสคำร้องนี้ใช่หรือไม่?</p>
        <p>
          เมื่อปิดเคสแล้ว คำร้องนี้จะถูกเปลี่ยนสถานะเป็น &ldquo;เสร็จสิ้น&rdquo;
          และจะหายไปจากรายการแชท
        </p>
      </Modal>
    </div>
  );
};

// ปรับปรุง PropTypes
ChatWindow.propTypes = {
  chat: PropTypes.shape({
    issueId: PropTypes.string,
    userId: PropTypes.string,
    name: PropTypes.string,
    department: PropTypes.string,
    topic: PropTypes.string,
    profileImage: PropTypes.string,
  }),
  onClose: PropTypes.func, // เพิ่ม prop สำหรับการออกจากแชท
  isMobile: PropTypes.bool,
};

export default ChatWindow;
