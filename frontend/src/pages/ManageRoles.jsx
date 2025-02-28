import { useState, useEffect } from "react";
import {
  Table,
  Select,
  message,
  Avatar,
  Button,
  Modal,
  Input,
  Space,
  Tag,
  Spin,
  Card,
} from "antd";
import {
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Option } = Select;
const { confirm } = Modal;

// API Base URL
const API_BASE_URL = "http://172.18.43.39:5000/api";

const ManageRoles = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // ดึงข้อมูลผู้ใช้ทั้งหมด
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // เรียก API เพื่อดึงข้อมูลผู้ใช้
      const response = await axios.get(`${API_BASE_URL}/users/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response:", response.data); // ดูโครงสร้างข้อมูลจริงที่ได้

      // ตรวจสอบรูปแบบของข้อมูล
      let userData = [];

      if (Array.isArray(response.data)) {
        // กรณีที่ response.data เป็นอาร์เรย์โดยตรง
        userData = response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        // กรณีที่ข้อมูลอยู่ในฟิลด์ users
        userData = response.data.users;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // กรณีที่ข้อมูลอยู่ในฟิลด์ data
        userData = response.data.data;
      } else {
        // กรณีที่ไม่สามารถหาอาร์เรย์ผู้ใช้ได้
        console.warn("Unexpected API response format:", response.data);
        message.warning("รูปแบบข้อมูลจาก API ไม่ตรงตามที่คาดหวัง");
        userData = []; // ใช้อาร์เรย์ว่าง
      }

      // แปลงข้อมูล
      const formattedUsers = userData.map((user) => ({
        key: user.id || user._id,
        id: user.id || user._id,
        employeeId: user.employeeId || "N/A",
        name:
          user.name ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "ไม่ระบุชื่อ",
        email: user.email || "ไม่มีอีเมล",
        image: user.profileImage || user.profilePicture,
        role: user.role || "User",
        department: user.department || "ไม่ระบุแผนก",
      }));

      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);

      if (formattedUsers.length > 0) {
        message.success("โหลดข้อมูลผู้ใช้สำเร็จ");
      } else {
        message.info("ไม่พบข้อมูลผู้ใช้");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลผู้ใช้เมื่อเปิดหน้า
  useEffect(() => {
    fetchUsers();
  }, []);

  // ค้นหาและกรองข้อมูล
  useEffect(() => {
    let result = [...users];

    // ค้นหาตามข้อความ
    if (searchText) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(searchText.toLowerCase()) ||
          user.email.toLowerCase().includes(searchText.toLowerCase()) ||
          user.employeeId.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // กรองตามบทบาท
    if (roleFilter !== "All") {
      result = result.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(result);
  }, [users, searchText, roleFilter]);

  // เปลี่ยนบทบาทผู้ใช้
  const handleRoleChange = (userId, newRole) => {
    confirm({
      title: "ต้องการเปลี่ยนบทบาทผู้ใช้หรือไม่?",
      icon: <ExclamationCircleOutlined />,
      content: `ต้องการเปลี่ยนบทบาทของผู้ใช้นี้เป็น ${newRole} ใช่หรือไม่?`,
      okText: "ใช่",
      cancelText: "ไม่",
      onOk: async () => {
        try {
          const token = localStorage.getItem("token");

          // ส่งคำขอเปลี่ยนบทบาท
          await axios.put(
            `${API_BASE_URL}/users/${userId}/role`,
            { role: newRole },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          // อัพเดตข้อมูลใน state
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId ? { ...user, role: newRole } : user
            )
          );

          message.success("อัพเดตบทบาทผู้ใช้สำเร็จ");
        } catch (error) {
          console.error("Error updating user role:", error);
          message.error("ไม่สามารถอัพเดตบทบาทผู้ใช้ได้");
        }
      },
    });
  };

  // ลบผู้ใช้
  const handleDeleteUser = (userId, userName) => {
    confirm({
      title: `ต้องการลบผู้ใช้ ${userName} หรือไม่?`,
      icon: <ExclamationCircleOutlined />,
      content: "การดำเนินการนี้ไม่สามารถเรียกคืนได้",
      okText: "ลบ",
      okType: "danger",
      cancelText: "ยกเลิก",
      onOk: async () => {
        try {
          const token = localStorage.getItem("token");

          // ส่งคำขอลบผู้ใช้
          await axios.delete(`${API_BASE_URL}/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // ลบผู้ใช้จาก state
          setUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== userId)
          );

          message.success("ลบผู้ใช้สำเร็จ");
        } catch (error) {
          console.error("Error deleting user:", error);
          message.error("ไม่สามารถลบผู้ใช้ได้");
        }
      },
    });
  };

  // กำหนดคอลัมน์สำหรับตาราง
  const columns = [
    {
      title: "ผู้ใช้งาน",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div className="flex items-center">
          <Avatar
            src={record.image}
            icon={!record.image && <UserOutlined />}
            size={40}
            style={{ marginRight: 12 }}
          />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-xs text-gray-500">#{record.employeeId}</div>
          </div>
        </div>
      ),
    },
    {
      title: "อีเมล",
      dataIndex: "email",
      key: "email",
      responsive: ["md"],
    },
    {
      title: "แผนก",
      dataIndex: "department",
      key: "department",
      responsive: ["lg"],
    },
    {
      title: "บทบาท",
      dataIndex: "role",
      key: "role",
      render: (text, record) => (
        <Select
          value={text}
          onChange={(value) => handleRoleChange(record.id, value)}
          style={{ width: 130 }}
          popupMatchSelectWidth={false}
          variant={true}>
          <Option value="User">
            <Tag color="blue">User</Tag>
          </Option>
          <Option value="Admin">
            <Tag color="green">Admin</Tag>
          </Option>
          <Option value="SuperAdmin">
            <Tag color="red">Super Admin</Tag>
          </Option>
        </Select>
      ),
    },
    {
      title: "จัดการ",
      key: "action",
      render: (_, record) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteUser(record.id, record.name)}
          size="small"
          style={{ borderRadius: "50%", height: "30px", width: "30px" }}
        />
      ),
    },
  ];

  return (
    <Card title="จัดการบทบาทผู้ใช้" className="shadow-md">
      <div className="mb-6 flex justify-between flex-wrap gap-4">
        <div>
          <Input
            placeholder="ค้นหาผู้ใช้..."
            prefix={<SearchOutlined />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
        </div>

        <Space>
          <div className="flex items-center gap-2">
            <FilterOutlined />
            <Select
              defaultValue="All"
              style={{ width: 150 }}
              onChange={(value) => setRoleFilter(value)}>
              <Option value="All">All roles</Option>
              <Option value="User">User</Option>
              <Option value="Admin">Admin</Option>
              <Option value="SuperAdmin">Super Admin</Option>
            </Select>
          </div>

          <Button
            type="primary"
            onClick={fetchUsers}
            style={{
              backgroundColor: "#262362",
              borderColor: "#262362",
              borderRadius: "50%",
              height: "30px",
              width: "30px",
            }}>
            <ReloadOutlined />
          </Button>
        </Space>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin
            size="large"
            indicator={
              <div>
                <LoadingOutlined style={{ fontSize: 24 }} spin />
              </div>
            }
          />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredUsers}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `ทั้งหมด ${total} คน`,
          }}
          rowKey="id"
          locale={{
            emptyText: "ไม่พบข้อมูลผู้ใช้",
          }}
        />
      )}

      <div className="mt-4 text-gray-500 text-sm">
        <p>สามารถเปลี่ยนบทบาทผู้ใช้ได้โดยการเลือกจาก dropdown</p>
        <p>* ผู้ดูแลระบบ (Admin) สามารถจัดการข้อมูลทั่วไปได้</p>
        <p>* ผู้ดูแลระบบระดับสูง (Super Admin) สามารถจัดการผู้ใช้และบทบาทได้</p>
      </div>
    </Card>
  );
};

export default ManageRoles;
