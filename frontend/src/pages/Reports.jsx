import { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Table,
  Card,
  Select,
  Input,
  Button,
  Tag,
  Typography,
  Avatar,
  Space,
  Spin,
  message,
  Modal,
  Divider,
  Image,
  Rate,
} from "antd";
import {
  UserOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileOutlined,
  FileWordOutlined,
  DownloadOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// API Base URL
const API_BASE_URL = "http://172.18.43.39:5000/api";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  // เพิ่ม state สำหรับตัวกรองตามช่วงเวลา
  const [dateFilter, setDateFilter] = useState("all");
  // เพิ่ม state สำหรับ Modal รายละเอียด
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // ดึงข้อมูลรายงานทั้งหมด
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // เรียกใช้ API เพื่อดึงรายงานทั้งหมด (สำหรับ SuperAdmin)
      const response = await axios.get(`${API_BASE_URL}/reports/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("All reports response:", response.data);

      // ดึงข้อมูลรายงานจากการตอบกลับของ API
      let reportsData = [];
      if (response.data && Array.isArray(response.data.data)) {
        reportsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        reportsData = response.data;
      } else {
        console.warn("Unexpected API response format:", response.data);
      }

      // กรองเฉพาะรายการที่มีสถานะเป็น "completed" หรือ "rejected"
      const completedReports = reportsData.filter(
        (report) =>
          report.status === "completed" || report.status === "rejected"
      );

      // แปลงข้อมูลให้อยู่ในรูปแบบที่เหมาะสมสำหรับตาราง
      const formattedReports = completedReports.map((report, index) => ({
        key: report._id || report.issueId || index,
        id: report._id || report.issueId,
        title: report.topic || report.title || `Issue ${index}`,
        description: report.description || "ไม่มีคำอธิบาย",
        status: report.status || "unknown",
        date: report.date || report.createdAt || new Date(),
        submitter: report.userId
          ? {
              name:
                report.userId.firstName && report.userId.lastName
                  ? `${report.userId.firstName} ${report.userId.lastName}`
                  : report.userId.name || "ไม่ระบุชื่อ",
              department: report.userId.department || "ไม่ระบุแผนก",
              profileImage:
                report.userId.profileImage || report.userId.profilePicture,
              email: report.userId.email || "",
            }
          : {
              name: "ไม่ระบุชื่อ",
              department: "ไม่ระบุแผนก",
              profileImage: "",
              email: "",
            },
        assignedAdmin: report.assignedAdmin
          ? {
              name:
                report.assignedAdmin.firstName && report.assignedAdmin.lastName
                  ? `${report.assignedAdmin.firstName} ${report.assignedAdmin.lastName}`
                  : report.assignedAdmin.name || "ไม่ระบุชื่อ",
              role: report.assignedAdmin.role || "Admin",
              profileImage:
                report.assignedAdmin.profileImage ||
                report.assignedAdmin.profilePicture,
            }
          : null,
        file: report.file || "",
        rating: report.rating || 0, // เพิ่มการดึงคะแนนรีวิว
      }));

      setReports(formattedReports);
      setFilteredReports(formattedReports);
      console.log("Formatted reports:", formattedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      message.error("ไม่สามารถดึงข้อมูลรายงานได้");
    } finally {
      setLoading(false);
    }
  }, []);

  // ฟิลเตอร์รายงานตามสถานะ ช่วงเวลา และข้อความค้นหา
  useEffect(() => {
    let result = [...reports];

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((report) => report.status === statusFilter);
    }

    // Filter by date range
    if (dateFilter !== "all") {
      const today = dayjs();
      let startDate;

      if (dateFilter === "daily") {
        // รายวัน - วันนี้
        startDate = today.startOf("day");
      } else if (dateFilter === "weekly") {
        // รายสัปดาห์ - 7 วันล่าสุด
        startDate = today.subtract(7, "day");
      } else if (dateFilter === "monthly") {
        // รายเดือน - 30 วันล่าสุด
        startDate = today.subtract(30, "day");
      }

      if (startDate) {
        result = result.filter((report) => {
          const reportDate = dayjs(report.date);
          return (
            reportDate.isAfter(startDate) || reportDate.isSame(startDate, "day")
          );
        });
      }
    }

    // Filter by search text
    if (searchText) {
      const lowerCaseSearch = searchText.toLowerCase();
      result = result.filter(
        (report) =>
          report.title.toLowerCase().includes(lowerCaseSearch) ||
          report.description.toLowerCase().includes(lowerCaseSearch) ||
          report.submitter.name.toLowerCase().includes(lowerCaseSearch) ||
          report.submitter.department.toLowerCase().includes(lowerCaseSearch) ||
          (report.assignedAdmin?.name &&
            report.assignedAdmin.name.toLowerCase().includes(lowerCaseSearch))
      );
    }

    setFilteredReports(result);
  }, [reports, statusFilter, searchText, dateFilter]);

  // โหลดข้อมูลเมื่อ component mount
  useEffect(() => {
    fetchReports();
  }, [fetchReports]); // เพิ่ม fetchReports เป็น dependency

  // คอลัมน์ของตาราง
  const columns = [
    {
      title: "Issue",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
            {record.description}
          </div>
        </div>
      ),
    },
    {
      title: "Submitter",
      dataIndex: "submitter",
      key: "submitter",
      render: (submitter) => (
        <Space>
          <Avatar
            src={submitter.profileImage}
            icon={!submitter.profileImage && <UserOutlined />}
          />
          <div>
            <div>{submitter.name}</div>
            <div className="text-xs text-gray-500">{submitter.department}</div>
          </div>
        </Space>
      ),
      responsive: ["md"],
    },
    {
      title: "Assigned Admin",
      dataIndex: "assignedAdmin",
      key: "assignedAdmin",
      render: (admin) =>
        admin ? (
          <Space>
            <Avatar
              src={admin.profileImage}
              icon={!admin.profileImage && <UserOutlined />}
            />
            <div>
              <div>{admin.name}</div>
              <div className="text-xs text-gray-500">{admin.role}</div>
            </div>
          </Space>
        ) : (
          <Text type="secondary">ไม่มีผู้รับผิดชอบ</Text>
        ),
      responsive: ["lg"],
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
      responsive: ["sm"],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "default";
        let text = "ไม่ทราบสถานะ";

        if (status === "completed") {
          color = "green";
          text = "เสร็จสิ้น";
        } else if (status === "rejected") {
          color = "red";
          text = "ถูกปฏิเสธ";
        }

        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Ratings",
      dataIndex: "rating",
      key: "rating",
      render: (rating) =>
        rating ? (
          <Rate disabled defaultValue={rating} allowHalf />
        ) : (
          <span className="text-gray-400">ยังไม่มีคะแนน</span>
        ),
      responsive: ["sm", "md", "lg", "xl"],
      sorter: (a, b) => (a.rating || 0) - (b.rating || 0),
    },
    {
      title: "Details",
      key: "actions",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => showReportDetail(record)}
          style={{
            backgroundColor: "#262362",
            borderColor: "#262362",
          }}>
          ดูรายละเอียด
        </Button>
      ),
    },
  ];

  // แสดงรายละเอียดรายงาน
  const showReportDetail = (report) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  // ฟังก์ชันเพิ่มเติมสำหรับตรวจสอบประเภทไฟล์
  const getFileType = (fileUrl) => {
    if (!fileUrl) return null;

    const extension = fileUrl.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    } else if (["doc", "docx"].includes(extension)) {
      return "word";
    }

    return "other";
  };

  // ฟังก์ชันเพิ่มเติมสำหรับแสดงไฟล์แนบ
  const renderAttachment = (fileUrl) => {
    if (!fileUrl) return null;

    const fileType = getFileType(fileUrl);
    const fileName = fileUrl.split("/").pop();

    return (
      <div className="mt-4">
        <h4 className="mb-2 font-semibold">ไฟล์แนบ</h4>
        {fileType === "image" ? (
          <div className="border rounded p-2">
            <Image
              src={fileUrl}
              alt="Attachment"
              style={{ maxWidth: "100%", maxHeight: "300px" }}
            />
          </div>
        ) : (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-500 hover:underline mt-2">
            {fileType === "pdf" && (
              <FilePdfOutlined style={{ color: "#ff4d4f" }} />
            )}
            {fileType === "word" && (
              <FileWordOutlined style={{ color: "#2b579a" }} />
            )}
            {fileType === "other" && <FileOutlined />}
            <span className="ml-2 break-all">{fileName}</span>
            <DownloadOutlined className="ml-2" />
          </a>
        )}
      </div>
    );
  };

  // สร้างแผนภูมิและตารางคะแนน (ถ้าต้องการ)
  const renderRatingStats = () => {
    // กรองรายงานที่มีคะแนน
    const ratedReports = reports.filter((report) => report.rating > 0);

    if (ratedReports.length === 0) {
      return (
        <div className="text-center text-gray-500 p-4">
          ยังไม่มีคะแนนรีวิวจากพนักงาน
        </div>
      );
    }

    // คำนวณค่าเฉลี่ยคะแนน
    const averageRating =
      ratedReports.reduce((acc, report) => acc + report.rating, 0) /
      ratedReports.length;

    return (
      <div className="flex flex-col items-center mb-4">
        <div className="text-lg font-medium text-gray-700 mb-2">
          คะแนนรีวิวเฉลี่ย: {averageRating.toFixed(1)}
        </div>
        <Rate disabled allowHalf defaultValue={averageRating} />
        <div className="text-sm text-gray-500 mt-1">
          จาก {ratedReports.length} คะแนน
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <Content
        style={{
          margin: "24px 16px",
          padding: 24,
          background: "#fff",
          borderRadius: "8px",
        }}>
        <div className="flex justify-between items-center mb-6">
          <Title level={4}>รายงานคำร้อง</Title>
          <Button
            onClick={fetchReports}
            loading={loading}
            style={{
              borderRadius: "50%",
              height: "32px",
              width: "32px",
            }}>
            <ReloadOutlined />
          </Button>
        </div>

        {/* ปรับปรุงส่วนนี้ให้เป็น responsive มากขึ้น */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="ค้นหารายงาน..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ maxWidth: 300 }}
          />

          {/* จัดกลุ่มตัวกรองเป็นแนวตั้งในมุมมองมือถือ */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-gray-400">
                เลือกสถานะ :
              </span>
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                style={{ width: 150 }}
                placeholder="สถานะ">
                <Option value="all">สถานะทั้งหมด</Option>
                <Option value="completed">เสร็จสิ้น</Option>
                <Option value="rejected">ถูกปฏิเสธ</Option>
              </Select>
            </div>

            {/* ตัวเลือกกรองตามช่วงเวลา - จะอยู่ด้านล่างในมุมมองมือถือ */}
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-gray-400">
                เลือกช่วงเวลา :
              </span>
              <Select
                value={dateFilter}
                onChange={(value) => setDateFilter(value)}
                style={{ width: 150 }}
                placeholder="ช่วงเวลา"
                suffixIcon={<CalendarOutlined />}>
                <Option value="all">ทั้งหมด</Option>
                <Option value="daily">รายวัน</Option>
                <Option value="weekly">รายสัปดาห์</Option>
                <Option value="monthly">รายเดือน</Option>
              </Select>
            </div>
          </div>
        </div>

        {/* แสดงคะแนนรีวิวเฉลี่ย */}
        {renderRatingStats()}

        <Card>
          {loading ? (
            <div className="text-center py-10">
              <Spin size="large" />
              <div className="mt-2">กำลังโหลดรายงาน...</div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredReports}
              pagination={{ pageSize: 10 }}
              rowKey="id"
              scroll={{ x: "max-content" }}
            />
          )}
        </Card>

        {/* Modal แสดงรายละเอียด */}
        <Modal
          title={<span className="font-semibold">{selectedReport?.title}</span>}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              ปิด
            </Button>,
          ]}
          width={700}>
          {selectedReport && (
            <>
              <Divider style={{ margin: "16px 0" }} />

              {/* แสดงสถานะ */}
              <div className="mb-4">
                <h4 className="mb-2 font-semibold">สถานะ</h4>
                <Tag
                  color={
                    selectedReport.status === "completed" ? "green" : "red"
                  }>
                  {selectedReport.status === "completed"
                    ? "เสร็จสิ้น"
                    : "ถูกปฏิเสธ"}
                </Tag>
              </div>

              <Divider style={{ margin: "16px 0" }} />

              {/* แสดงรายละเอียด */}
              <div className="mb-4">
                <h4 className="mb-2 font-semibold">รายละเอียด</h4>
                <p>{selectedReport.description}</p>
              </div>

              <Divider style={{ margin: "16px 0" }} />

              {/* แสดงข้อมูลผู้แจ้ง */}
              <div className="mb-4">
                <h4 className="mb-2 font-semibold">ผู้แจ้ง</h4>
                <Space align="start">
                  <Avatar
                    src={selectedReport.submitter.profileImage}
                    icon={
                      !selectedReport.submitter.profileImage && <UserOutlined />
                    }
                    size={64}
                  />
                  <div>
                    <div className="font-medium">
                      {selectedReport.submitter.name}
                    </div>
                    <div className="text-gray-500">
                      {selectedReport.submitter.department}
                    </div>
                    {selectedReport.submitter.email && (
                      <div className="text-gray-500">
                        {selectedReport.submitter.email}
                      </div>
                    )}
                  </div>
                </Space>
              </div>

              {/* แสดงข้อมูลผู้รับผิดชอบ ถ้ามี */}
              {selectedReport.assignedAdmin && (
                <>
                  <Divider style={{ margin: "16px 0" }} />
                  <div className="mb-4">
                    <h4 className="mb-2 font-semibold">ผู้รับผิดชอบ</h4>
                    <Space align="start">
                      <Avatar
                        src={selectedReport.assignedAdmin.profileImage}
                        icon={
                          !selectedReport.assignedAdmin.profileImage && (
                            <UserOutlined />
                          )
                        }
                        size={64}
                      />
                      <div>
                        <div className="font-medium">
                          {selectedReport.assignedAdmin.name}
                        </div>
                        <div className="text-gray-500">
                          {selectedReport.assignedAdmin.role}
                        </div>
                      </div>
                    </Space>
                  </div>
                </>
              )}

              <Divider style={{ margin: "16px 0" }} />

              {/* แสดงวันที่ */}
              <div className="mb-4">
                <h4 className="mb-2 font-semibold">วันที่แจ้งปัญหา</h4>
                <p>{dayjs(selectedReport.date).format("DD/MM/YYYY")}</p>
              </div>
              <Divider style={{ margin: "16px 0" }} />
              {/* แสดงคะแนนรีวิว */}
              <div className="mb-4">
                <h4 className="mb-2 font-semibold">คะแนนรีวิว</h4>
                {selectedReport.rating > 0 ? (
                  <Rate
                    disabled
                    defaultValue={selectedReport.rating}
                    allowHalf
                  />
                ) : (
                  <span className="text-gray-400">ยังไม่มีคะแนน</span>
                )}
              </div>

              {/* แสดงไฟล์แนบ ถ้ามี */}
              {selectedReport.file && (
                <>
                  <Divider style={{ margin: "16px 0" }} />
                  {renderAttachment(selectedReport.file)}
                </>
              )}
            </>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};

export default Reports;
