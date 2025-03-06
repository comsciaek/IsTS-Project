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
  UserOutlined,
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

const IssueCard = ({ issue, onEdit, onDelete, readOnly = false }) => {
  // ดึงข้อมูลผู้ใช้จาก UserContext
  const { user } = useUser();

  // สร้างเมนูสำหรับตัวเลือกบนการ์ด - ปรับให้รองรับโหมด readOnly
  const menu = (
    <Menu>
      {/* แสดงตัวเลือกแก้ไขเฉพาะเมื่อไม่ใช่โหมด readOnly และมี onEdit */}
      {!readOnly && onEdit && (
        <Menu.Item key="edit" onClick={() => onEdit(issue)}>
          แก้ไขคำร้อง
        </Menu.Item>
      )}

      {/* แสดงตัวเลือกลบเสมอถ้ามี onDelete แม้จะเป็น readOnly */}
      {onDelete && (
        <Menu.Item key="delete" danger onClick={() => onDelete(issue)}>
          ลบคำร้อง
        </Menu.Item>
      )}
    </Menu>
  );

  // ปรับจากไอคอน EyeOutlined เป็น MoreOutlined เสมอ เพื่อให้สื่อว่ามีเมนู
  const menuIcon = <MoreOutlined />;

  // ดึงข้อมูลและตั้งค่าตัวแปรเริ่มต้น (กรณีรูปแบบข้อมูลต่างกัน) - แก้ไขให้ตรงกับ API
  const title = issue.topic || issue.title || issue.issue || "ไม่มีหัวข้อ";
  const description = issue.description || "";
  const date = issue.date || issue.createdAt || issue.updatedAt;
  const status = issue.status || "รอดำเนินการ";

  // ข้อมูลผู้ใช้จะเก็บแยกอยู่แล้ว ไม่มีในคำร้อง
  const employeeName = user?.name || user?.employeeId || "ผู้ใช้งาน";
  const profileImage = user?.profileImage || user?.profilePicture;

  // ข้อมูลผู้รับผิดชอบ (Admin/SuperAdmin)
  const assignedAdmin = issue.assignedAdmin || null;
  const hasAssignedAdmin =
    assignedAdmin !== null && typeof assignedAdmin === "object";

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

  const formattedDate = dayjs(date).format("YYYY-MM-DD ");

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
          <Button type="text" icon={menuIcon} />
        </Dropdown>
      }
      className={`w-full h-full shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
        readOnly ? "bg-gray-50" : ""
      }`}>
      {/* ข้อมูลผู้แจ้ง */}
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
            {dayjs(date).format("DD/MM/YYYY")}
          </div>
        </Tooltip>
      </div>

      {/* คำอธิบาย */}
      <div className="mb-4">
        <Paragraph
          ellipsis={{ rows: 3, expandable: true, symbol: "อ่านเพิ่มเติม" }}
          className="whitespace-pre-line">
          {description}
        </Paragraph>
      </div>

      {/* แถวด้านล่าง - แสดงสถานะ (ซ้าย) และผู้รับผิดชอบ (ขวา) */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        {/* สถานะด้านซ้าย */}
        <Tag color={statusColor} className="px-2 py-1">
          {displayStatus}
        </Tag>

        {/* ผู้รับผิดชอบด้านขวา */}
        {hasAssignedAdmin && (
          <Tooltip
            title={`ผู้รับผิดชอบ: ${
              assignedAdmin.firstName && assignedAdmin.lastName
                ? `${assignedAdmin.firstName} ${assignedAdmin.lastName}`
                : assignedAdmin.name || "ผู้ดูแลระบบ"
            }`}
            placement="bottom">
            <div className="flex items-center">
              <Text className="text-xs text-gray-500 mr-1">ผู้รับผิดชอบ:</Text>
              <Avatar
                src={assignedAdmin.profileImage || assignedAdmin.profilePicture}
                icon={
                  !(
                    assignedAdmin.profileImage || assignedAdmin.profilePicture
                  ) && <UserOutlined />
                }
                size="small"
              />
              <Text strong className="text-xs ml-1 hidden sm:inline">
                {assignedAdmin.firstName && assignedAdmin.lastName
                  ? `${assignedAdmin.firstName} ${assignedAdmin.lastName}`
                  : assignedAdmin.name || "ผู้ดูแลระบบ"}
              </Text>
            </div>
          </Tooltip>
        )}
      </div>

      {/* แสดงไฟล์แนบ */}
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
    issueId: PropTypes.string,
    _id: PropTypes.string,
    id: PropTypes.string,
    userId: PropTypes.string,
    topic: PropTypes.string,
    title: PropTypes.string,
    issue: PropTypes.string,
    description: PropTypes.string,
    date: PropTypes.string,
    file: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    assignedAdmin: PropTypes.shape({
      _id: PropTypes.string,
      id: PropTypes.string,
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      name: PropTypes.string,
      role: PropTypes.string,
      profileImage: PropTypes.string,
      profilePicture: PropTypes.string,
    }),
  }).isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  readOnly: PropTypes.bool,
};

export default IssueCard;
