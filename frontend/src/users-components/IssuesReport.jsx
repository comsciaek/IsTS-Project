import { useState, useEffect } from "react";
import { Layout, Button, Input, theme, message, Spin, Row, Col } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import IssueFormModal from "./IssueFormModal";
import IssueCard from "./IssueCard";
import { Content } from "antd/es/layout/layout";
import axios from "axios";
import { useUser } from "../context/UserContext";

// API Base URL
const API_BASE_URL = "http://172.18.43.39:5000/api";

const IssuesReport = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [issues, setIssues] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // ใช้ข้อมูลผู้ใช้จาก context
  const { user } = useUser();

  // เรียกข้อมูลคำร้องจาก API เมื่อโหลดคอมโพเนนต์
  useEffect(() => {
    fetchIssues();
  }, []);

  // ดึงข้อมูลคำร้องทั้งหมดของผู้ใช้ปัจจุบัน
  const fetchIssues = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_BASE_URL}/reports/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Fetched issues:", response.data);

      // ตรวจสอบรูปแบบการตอบกลับจาก API
      if (response.data && Array.isArray(response.data.data)) {
        // Backend คืนค่าในรูปแบบ { data: [...] }
        setIssues(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        // กรณีเผื่อ API คืนข้อมูลเป็น Array โดยตรง
        setIssues(response.data);
      } else {
        console.warn("Unexpected API response format:", response.data);
        setIssues([]);
      }
    } catch (error) {
      console.error("Error fetching issues:", error);

      if (error.response && error.response.status === 404) {
        // API ส่ง 404 เมื่อไม่พบข้อมูล ไม่ถือเป็น error
        setIssues([]);
      } else {
        message.error("ไม่สามารถโหลดข้อมูลคำร้องได้");
        setIssues([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddIssue = () => {
    setEditingIssue(null);
    setIsModalVisible(true);
  };

  const handleEditIssue = (issue) => {
    setEditingIssue(issue);
    setIsModalVisible(true);
  };

  const handleDeleteIssue = async (issue) => {
    try {
      const token = localStorage.getItem("token");

      // ใช้ issueId จาก API response หรือ ใช้ _id ถ้าไม่มี issueId
      const issueId = issue.issueId || issue._id || issue.id;

      if (!issueId) {
        message.error("ไม่พบ ID ของคำร้อง");
        return;
      }

      // ใช้ URL endpoint ตามที่ backend กำหนด
      await axios.delete(`${API_BASE_URL}/reports/delete/${issueId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // อัพเดตรายการคำร้องหลังจากลบ
      setIssues(
        issues.filter(
          (i) => i.issueId !== issueId && i._id !== issueId && i.id !== issueId
        )
      );
      message.success("ลบคำร้องสำเร็จ");
    } catch (error) {
      console.error("Error deleting report:", error);

      // แสดงข้อความผิดพลาดที่ได้จาก API ถ้ามี
      if (error.response && error.response.data) {
        message.error(
          `ไม่สามารถลบคำร้องได้: ${
            error.response.data.message ||
            error.response.data.error ||
            "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์"
          }`
        );
      } else {
        message.error("ไม่สามารถลบคำร้องได้");
      }
    }
  };

  const handleModalOk = async (formData) => {
    try {
      const token = localStorage.getItem("token");

      if (editingIssue) {
        // กรณีแก้ไขคำร้อง
        const issueId =
          editingIssue.issueId || editingIssue._id || editingIssue.id;

        if (!issueId) {
          message.error("ไม่พบ ID ของคำร้องที่ต้องการแก้ไข");
          return;
        }

        console.log(`Updating issue with ID: ${issueId}`);

        // ใช้ URL endpoint ตามที่ backend กำหนด
        await axios.put(`${API_BASE_URL}/reports/edit/${issueId}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        message.success("แก้ไขคำร้องสำเร็จ");
      } else {
        // กรณีสร้างคำร้องใหม่
        console.log("Creating new issue");

        // ใช้ URL endpoint ตามที่ backend กำหนด
        await axios.post(`${API_BASE_URL}/reports/create/me`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        message.success("สร้างคำร้องสำเร็จ");
      }

      // โหลดข้อมูลใหม่หลังจากการเปลี่ยนแปลง
      fetchIssues();

      // เคลียร์ฟอร์มและปิดโมดัล
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error saving report:", error);

      // แสดงข้อความผิดพลาดที่ได้จาก API ถ้ามี
      if (error.response && error.response.data) {
        message.error(
          `ไม่สามารถบันทึกคำร้องได้: ${
            error.response.data.message ||
            error.response.data.error ||
            "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์"
          }`
        );
      } else {
        message.error("ไม่สามารถบันทึกคำร้องได้");
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  // กรองคำร้องตามคำค้นหา - แก้ไขให้ตรงกับชื่อฟิลด์ในข้อมูลที่ได้จาก API
  const filteredIssues = issues.filter((issue) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (issue.topic || "").toLowerCase().includes(searchLower) ||
      (issue.description || "").toLowerCase().includes(searchLower)
    );
  });

  return (
    <Layout>
      <Content
        className="rounded-lg"
        style={{
          minHeight: "75vh", // ปรับจาก fixed height เป็น minHeight ให้รองรับเนื้อหาที่ยาว
          margin: "3px 10px",
          padding: 24,
          borderRadius: borderRadiusLG,
          background: colorBgContainer,
          overflowY: "auto",
        }}>
        <div className="sticky top-0 bg-white z-30 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-xl font-medium">คำร้องของฉัน</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <Input
                placeholder="ค้นหาคำร้อง"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", maxWidth: "300px" }}
                prefix={<SearchOutlined />}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddIssue}
                style={{
                  backgroundColor: "#262362",
                  transition: "background-color 0.3s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#193CB8")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "#262362")
                }>
                เพิ่มคำร้อง
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="flex justify-center items-center py-16 text-gray-500">
            {searchTerm
              ? "ไม่พบคำร้องที่ตรงกับคำค้นหา"
              : "คุณยังไม่มีคำร้อง กดปุ่ม 'เพิ่มคำร้อง' เพื่อสร้างคำร้องใหม่"}
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredIssues.map((issue) => (
              <Col
                xs={24}
                sm={24}
                md={12}
                lg={8}
                xl={8}
                key={issue._id || issue.id}>
                <IssueCard
                  issue={issue}
                  onEdit={handleEditIssue}
                  onDelete={handleDeleteIssue}
                />
              </Col>
            ))}
          </Row>
        )}

        <IssueFormModal
          visible={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          editingRecord={editingIssue}
          key={editingIssue ? editingIssue._id || editingIssue.id : "new"}
          userData={user}
        />
      </Content>
    </Layout>
  );
};

export default IssuesReport;
