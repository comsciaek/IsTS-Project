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
  Image,
  Upload,
  Popover,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
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

const ChatWindowUser = ({ chat, isMobile }) => {
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

        // สำหรับ User ใช้ endpoint ที่แตกต่างจาก Admin
        const response = await axios.get(
          `http://172.18.43.39:5000/api/reports/chat/${chat.issueId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("User chat messages response:", response.data);

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
          text: msg.message || msg.text,
          senderId: msg.senderId?._id || msg.senderId?.id || msg.senderId,
          senderName: msg.senderId?.firstName
            ? `${msg.senderId.firstName} ${msg.senderId.lastName || ""}`
            : msg.senderName || "ไม่ระบุชื่อ",
          senderRole: msg.senderId?.role || "",
          senderProfileImage: msg.senderId?.profileImage || "",
          createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
          issueId: chat.issueId,
          fileUrl: msg.fileUrl || msg.file,
          fileName:
            msg.fileName || (msg.fileUrl && msg.fileUrl.split("/").pop()),
          fileType: msg.fileType,
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        message.error("ไม่สามารถโหลดข้อความได้ โปรดลองอีกครั้ง");
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();
    setFileList([]);
  }, [chat]);

  // ติดตามข้อความใหม่จาก socket
  useEffect(() => {
    if (!socket || !chat || !chat.issueId) return;

    // คำสั่งนี้สำคัญ - ถอด listener เก่าก่อนที่จะเพิ่มอันใหม่เพื่อป้องกันการซ้ำซ้อน
    socket.off("newMessage");

    const handleNewMessage = (messageData) => {
      console.log("Socket new message:", messageData);

      if (messageData.issueId === chat.issueId) {
        const formattedMessage = {
          id: messageData.id || messageData._id,
          text: messageData.message,
          senderId: messageData.senderId,
          createdAt: messageData.createdAt,
          issueId: messageData.issueId,
          fileUrl: messageData.fileUrl || messageData.file,
          fileName:
            messageData.fileName ||
            (messageData.fileUrl && messageData.fileUrl.split("/").pop()),
          fileType: messageData.fileType,
        };

        // ตรวจสอบว่าข้อความนี้มีอยู่แล้วหรือไม่
        setMessages((prevMessages) => {
          // ตรวจสอบว่ามีข้อความ optimistic ที่รอการแทนที่หรือไม่
          const hasMatchingOptimisticMessage = prevMessages.some(
            (msg) =>
              msg._isOptimistic &&
              msg.text === formattedMessage.text &&
              msg.fileName === formattedMessage.fileName
          );

          // ถ้ามีข้อความ optimistic ที่ตรงกัน ให้แทนที่ด้วยข้อความจริง
          if (hasMatchingOptimisticMessage) {
            return prevMessages.map((msg) => {
              if (
                msg._isOptimistic &&
                msg.text === formattedMessage.text &&
                msg.fileName === formattedMessage.fileName
              ) {
                return formattedMessage; // แทนที่ด้วยข้อความจริงจาก server
              }
              return msg;
            });
          }

          // ตรวจสอบว่าข้อความนี้มีอยู่แล้วหรือไม่ด้วย ID
          const duplicateMessage = prevMessages.find(
            (msg) => msg.id === formattedMessage.id
          );

          if (duplicateMessage) {
            return prevMessages; // ไม่เพิ่มข้อความซ้ำ
          }

          return [...prevMessages, formattedMessage];
        });

        setTimeout(scrollToBottom, 100);
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, chat, user]);

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
      info.fileList = [info.fileList[info.fileList.length - 1]];
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
    return false;
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
      // ลบตัวแปร userId ที่ไม่ได้ใช้งาน

      const formData = new FormData();

      if (newMessage.trim()) {
        formData.append("message", newMessage.trim());
      } else {
        formData.append("message", "");
      }

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append("file", fileList[0].originFileObj);
      }

      // ใช้ endpoint สำหรับ user
      const response = await axios.post(
        `http://172.18.43.39:5000/api/reports/chat/${chat.issueId}/message`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Message sent response:", response.data);

      // เก็บข้อมูลข้อความที่ส่งไปสำหรับการตรวจสอบ
      const messageData = {
        id: response.data?.data?.id || Date.now().toString(),
        message: newMessage.trim(),
        fileUrl: response.data?.data?.fileUrl,
        fileName: fileList.length > 0 ? fileList[0].name : null,
        createdAt: response.data?.data?.createdAt || new Date().toISOString(),
      };

      // เคลียร์ข้อมูล input หลังส่งข้อความเสร็จ
      setNewMessage("");
      setFileList([]);

      // ส่งข้อความผ่าน socket
      if (socket && socket.connected) {
        socket.emit("sendMessage", {
          issueId: chat.issueId,
          message: newMessage.trim(),
          fileUrl: response.data?.data?.fileUrl,
          fileName: fileList.length > 0 ? fileList[0].name : null,
        });
      }

      // ไม่ต้องอัพเดต UI ทันที รอให้ socket ส่งข้อมูลกลับมาแทน
      // ซึ่งจะช่วยป้องกันการแสดงข้อความซ้ำซ้อน

      // อย่างไรก็ตาม ถ้าต้องการแสดงผลทันที (optimistic update) โดยไม่ซ้ำซ้อน
      // สามารถทำการอัพเดต UI ด้วยตัวเองและเก็บ ID ข้อความไว้
      const localMessageId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: localMessageId, // ใช้ ID ชั่วคราว
        text: newMessage.trim(),
        senderId: user.id || user._id,
        createdAt: new Date().toISOString(),
        issueId: chat.issueId,
        fileUrl: messageData.fileUrl,
        fileName: messageData.fileName,
        _isOptimistic: true, // เพิ่ม flag สำหรับระบุว่าเป็นข้อความ optimistic
      };

      // เพิ่มข้อความชั่วคราวลงในรายการ
      setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      message.error("ไม่สามารถส่งข้อความได้ โปรดลองอีกครั้ง");
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
      {/* ส่วนหัวแชท */}
      <div className="flex flex-col p-4 border-b-gray-400 shadow-md relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar
              src={chat.adminProfileImage}
              icon={!chat.adminProfileImage && <UserOutlined />}
              size={isMobile ? "default" : "large"}
            />
            <div className="ml-3">
              <h3 className="font-medium">{chat.adminName || "ผู้ดูแลระบบ"}</h3>
              <div className="text-xs text-gray-500">ผู้รับผิดชอบคำร้อง</div>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <Text strong className="text-sm">
            เรื่อง: {chat.topic}
          </Text>
          <div className="text-xs text-gray-500">
            สถานะ:{" "}
            <span
              className={
                chat.status === "completed"
                  ? "text-green-500"
                  : "text-orange-500"
              }>
              {chat.status === "completed"
                ? "เสร็จสิ้น"
                : chat.status === "approved"
                ? "อนุมัติแล้ว"
                : chat.status === "rejected"
                ? "ถูกปฏิเสธ"
                : "รอดำเนินการ"}
            </span>
          </div>
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
                className={`flex mb-4 ${
                  isSelf ? "justify-end" : "justify-start"
                }`}>
                {!isSelf && (
                  <Avatar
                    src={message.senderProfileImage}
                    icon={!message.senderProfileImage && <UserOutlined />}
                    size="small"
                    className="mr-2 mt-1"
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
                      className={`rounded-lg py-2 px-4 break-words ${
                        isSelf
                          ? "bg-blue-500 text-white"
                          : "bg-white shadow-sm"
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
      <div className={`p-2 sm:p-3 border-b-gray-400 shadow-md borer-t ${isMobile ? "pb-safe" : ""}`}>
        {fileList.length > 0 && (
          <div className="mb-2 bg-gray-50 p-2 rounded border flex items-center justify-between">
            <div className="flex items-center">
              {getFileIconByType(fileList[0].name)}
              <span className="ml-2 text-sm truncate max-w-xs">
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
            open={filePopoverVisible}
            placement={isMobile ? "topRight" : "bottom"}
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
            disabled={uploading || chat.status === "completed"}
          />

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={
              (newMessage.trim() === "" && fileList.length === 0) ||
              uploading ||
              chat.status === "completed"
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

        {/* ลดขนาดข้อความขนาดเล็กลงเมื่ออยู่ในโหมดมือถือ */}
        <div
          className={`${
            isMobile ? "mt-0.5 text-2xs" : "mt-1 text-xs"
          } text-gray-500`}>
          {chat.status === "completed"
            ? "คำร้องนี้ได้รับการแก้ไขเรียบร้อยแล้ว ไม่สามารถส่งข้อความเพิ่มเติมได้"
            : "สามารถอัปโหลดไฟล์ได้ไม่เกิน 10MB (รูปภาพ, เอกสาร, ฯลฯ)"}
        </div>
      </div>
    </div>
  );
};

ChatWindowUser.propTypes = {
  chat: PropTypes.shape({
    issueId: PropTypes.string,
    topic: PropTypes.string,
    adminName: PropTypes.string,
    adminProfileImage: PropTypes.string,
    status: PropTypes.string,
  }),
  isMobile: PropTypes.bool, // prop สำหรับตรวจสอบโหมดการแสดงผล
};

export default ChatWindowUser;
