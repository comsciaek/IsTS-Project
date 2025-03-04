import {
  Card,
  Dropdown,
  Menu,
  Button,
  Tag,
  Avatar,
  Typography,
  Tooltip,
} from "antd";
import {
  MoreOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  FileWordOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useUser } from "../context/UserContext";

const { Text, Paragraph } = Typography;

// กำหนดสีของสถานะ
const statusColors = {
  รอดำเนินการ: "orange",
  กำลังดำเนินการ: "blue",
  เสร็จสิ้น: "green",
  ถูกปฏิเสธ: "red",
  อนุมัติแล้ว: "green",
  pending: "orange",
  "in-progress": "blue",
  completed: "green",
  rejected: "red",
  approved: "green",
};

const IssueCard = ({ issue, onEdit, onDelete }) => {
  // ดึงข้อมูลผู้ใช้จาก UserContext
  const { user } = useUser();

  // สร้างเมนูสำหรับตัวเลือกบนการ์ด
  const menu = (
    <Menu>
      <Menu.Item key="edit" onClick={() => onEdit(issue)}>
        แก้ไขคำร้อง
      </Menu.Item>
      <Menu.Item key="delete" danger onClick={() => onDelete(issue)}>
        ลบคำร้อง
      </Menu.Item>
    </Menu>
  );

  // ดึงข้อมูลและตั้งค่าตัวแปรเริ่มต้น (กรณีรูปแบบข้อมูลต่างกัน) - แก้ไขให้ตรงกับ API
  const title = issue.topic || issue.title || issue.issue || "ไม่มีหัวข้อ";
  const description = issue.description || "";
  const date = issue.date || issue.createdAt || issue.updatedAt;
  const status = issue.status || "รอดำเนินการ";

  // ข้อมูลผู้ใช้จะเก็บแยกอยู่แล้ว ไม่มีในคำร้อง
  const employeeName = user?.name || user?.employeeId || "ผู้ใช้งาน";
  const profileImage = user?.profileImage || user?.profilePicture;

  // สำหรับไฟล์แนบ
  const fileUrl = issue.file || ""; // backend เก็บเป็น file (ไม่ใช่ files array)
  const fileName = fileUrl ? fileUrl.split("/").pop() : "";

  // แปลงสถานะภาษาอังกฤษเป็นภาษาไทย
  const statusMapping = {
    pending: "รอดำเนินการ",
    "in-progress": "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    rejected: "ถูกปฏิเสธ",
    approved: "อนุมัติแล้ว",
  };

  const displayStatus = statusMapping[status] || status;
  const statusColor = statusColors[status] || "default";

  const formattedDate = dayjs(date).format("YYYY-MM-DD HH:mm");

  // ตรวจสอบประเภทไฟล์แนบ
  const getFileTypeFromUrl = (url) => {
    if (!url) return null;
    const extension = url.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    } else if (["doc", "docx"].includes(extension)) {
      return "word";
    }
    return "other";
  };

  const fileType = getFileTypeFromUrl(fileUrl);

  return (
    <Card
      title={
        <Tooltip title={title}>
          <div className="text-lg font-medium truncate max-w-full">{title}</div>
        </Tooltip>
      }
      extra={
        <Dropdown overlay={menu} trigger={["click"]}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      }
      className="w-full h-full shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-wrap items-center mb-4 gap-2">
        <Avatar src={profileImage} size="large" className="mr-2" />
        <div className="min-w-0 flex-grow">
          <Text strong className="text-sm block truncate" title={employeeName}>
            {employeeName}
          </Text>
          <Text
            type="secondary"
            className="text-xs block truncate"
            title={user?.department || "ไม่ระบุแผนก"}>
            {user?.department || "ไม่ระบุแผนก"}
          </Text>
        </div>
        <Tooltip title={formattedDate}>
          <div className="flex items-center text-xs text-gray-400 ml-auto">
            <ClockCircleOutlined className="mr-1" />
            {dayjs(date).format("YYYY-MM-DD")}
          </div>
        </Tooltip>
      </div>

      <div className="mb-4">
        <Paragraph
          ellipsis={{ rows: 3, expandable: true, symbol: "อ่านเพิ่มเติม" }}
          className="whitespace-pre-line">
          {description}
        </Paragraph>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <Tag color={statusColor} className="px-2 py-1 mr-0">
          {displayStatus}
        </Tag>
      </div>

      {/* แสดงไฟล์แนบ (เปลี่ยนจาก files array เป็น file เดี่ยว) */}
      {fileUrl && (
        <div className="mt-4 border-t pt-3">
          <Text strong className="text-sm mb-2 block">
            ไฟล์แนบ:
          </Text>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-500 hover:text-blue-700">
            {fileType === "image" && (
              <FileImageOutlined style={{ color: "#1890ff" }} />
            )}
            {fileType === "pdf" && (
              <FilePdfOutlined style={{ color: "#ff0000" }} />
            )}
            {fileType === "word" && (
              <FileWordOutlined style={{ color: "#2b579a" }} />
            )}
            {fileType === "other" && <FileOutlined />}
            <span className="ml-2 truncate max-w-[180px]">{fileName}</span>
          </a>
        </div>
      )}
    </Card>
  );
};

IssueCard.propTypes = {
  issue: PropTypes.shape({
    issueId: PropTypes.string, // เพิ่ม issueId ตามที่ backend ใช้
    _id: PropTypes.string,
    id: PropTypes.string,
    userId: PropTypes.string,
    topic: PropTypes.string, // เปลี่ยนจาก title เป็น topic ตามที่ backend ใช้
    title: PropTypes.string,
    issue: PropTypes.string,
    description: PropTypes.string,
    date: PropTypes.string,
    file: PropTypes.string, // เปลี่ยนจาก files array เป็น file string
    status: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default IssueCard;
