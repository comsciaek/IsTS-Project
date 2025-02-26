import { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Table,
  Select,
  message,
  Avatar,
  Button,
  Modal,
  Input,
  Space,
  Tag,
  Tooltip,
  Switch,
} from "antd";
import {
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { getUserInitial } from "../utils/userUtils";
import { mockUserAPI } from "../utils/mockData";

const { Content } = Layout;
const { Option } = Select;
const { confirm } = Modal;

const ManageRoles = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [useMockData, setUseMockData] = useState(false);
  // ใช้สำหรับป้องกันการลูปไม่หยุด
  const [errorOccurred, setErrorOccurred] = useState(false);

  // ฟังก์ชั่นดึงข้อมูลผู้ใช้ทั้งหมด
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      let userData;

      if (useMockData) {
        // ใช้ mock data
        userData = await mockUserAPI.getUsers();
      } else {
        // ใช้ API จริง
        const response = await axios.get("http://172.18.43.39:5000/api/users");
        userData = response.data;
      }

      // แปลงข้อมูลให้เข้ากับ format ที่ต้องการ
      const formattedUsers = userData.map((user, index) => ({
        key: user.id || user._id || index.toString(),
        id: user.id || user._id || `mock-${index}`,
        employeeId:
          user.employeeId || `EMP${String(1000 + index).padStart(4, "0")}`,
        name:
          user.name || user.firstName || user.username || `User ${index + 1}`,
        email: user.email || `user${index + 1}@example.com`,
        role: user.role || "User",
        department:
          user.department || ["IT", "HR", "Support", "Finance"][index % 4],
        createdAt: user.createdAt || new Date().toISOString(),
        avatar: user.profilePicture || null,
      }));

      setUsers(formattedUsers);
      console.log("Fetched users:", formattedUsers);
      // รีเซ็ตสถานะ error เมื่อดึงข้อมูลสำเร็จ
      setErrorOccurred(false);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      message.error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");

      // หากเกิดข้อผิดพลาดและยังไม่ได้ใช้ mock data และยังไม่เคยเกิด error
      if (!useMockData && !errorOccurred) {
        message.warning("กำลังใช้ข้อมูลจำลองเพื่อแสดงตัวอย่าง");
        setErrorOccurred(true); // ตั้งค่าว่าเกิด error แล้ว
        setUseMockData(true);
      }
    } finally {
      setLoading(false);
    }
  }, [useMockData, errorOccurred]);

  // แยกการเรียก fetchUsers ครั้งแรกออกจาก useEffect ที่มี dependency
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // useEffect สำหรับเมื่อ useMockData เปลี่ยน (จากการกดปุ่มสวิตช์)
  useEffect(() => {
    // เรียก fetch เฉพาะเมื่อการเปลี่ยน useMockData เกิดจากผู้ใช้กดปุ่มสวิตช์
    // เรียก fetch เฉพาะเมื่อการเปลี่ยน useMockData เกิดจากผู้ใช้กดปุ่มสวิตช์
    // ไม่ใช่จากการเกิด error
    if (!errorOccurred) {
      fetchUsers();
    }
  }, [useMockData, fetchUsers, errorOccurred]);

  // ฟังก์ชั่นเปลี่ยนบทบาทของผู้ใช้
  const handleRoleChange = async (userId, newRole) => {
    try {
      confirm({
        title: "ต้องการเปลี่ยนบทบาทผู้ใช้หรือไม่?",
        icon: <ExclamationCircleOutlined />,
        content: `ต้องการเปลี่ยนบทบาทของผู้ใช้นี้เป็น ${newRole} ใช่หรือไม่?`,
        okText: "ใช่",
        cancelText: "ไม่",
        onOk: async () => {
          if (useMockData) {
            // ใช้ mock API
            await mockUserAPI.updateUserRole(userId, newRole);
          } else {
            // ใช้ API จริง
            await axios.put(
              `http://172.18.43.39:5000/api/users/${userId}/role`,
              {
                role: newRole,
              }
            );
          }

          // อัปเดต state
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId ? { ...user, role: newRole } : user
            )
          );

          message.success("อัปเดตบทบาทผู้ใช้สำเร็จ");
        },
      });
    } catch (error) {
      console.error("Failed to update user role:", error);
      message.error("ไม่สามารถอัปเดตบทบาทผู้ใช้ได้");
    }
  };

  // ฟังก์ชั่นลบผู้ใช้
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
          if (useMockData) {
            // ใช้ mock API
            await mockUserAPI.deleteUser(userId);
          } else {
            // ใช้ API จริง
            await axios.delete(`http://172.18.43.39:5000/api/users/${userId}`);
          }

          // ลบผู้ใช้ออกจาก state
          setUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== userId)
          );
          message.success("ลบผู้ใช้สำเร็จ");
        } catch (error) {
          console.error("Failed to delete user:", error);
          message.error("ไม่สามารถลบผู้ใช้ได้");
        }
      },
    });
  };

  // กรองข้อมูลตามการค้นหาและตัวกรอง
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.employeeId &&
        user.employeeId
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    if (roleFilter === "All") {
      return matchesSearch;
    }
    return matchesSearch && user.role === roleFilter;
  });

  // กำหนดคอลัมน์สำหรับตาราง
  const columns = [
    {
      title: "Employees",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Space>
          {record.avatar ? (
            <Avatar src={record.avatar} />
          ) : (
            <Avatar icon={<UserOutlined />}>
              {getUserInitial({ name: text })}
            </Avatar>
          )}
          <div>
            <div>{text}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>
              {record.employeeId}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      responsive: ["md"],
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      responsive: ["lg"],
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (text, record) => {
        return (
          <Select
            value={text}
            onChange={(value) => handleRoleChange(record.id, value)}
            style={{ width: 130 }}
            variant={false}
            popupMatchSelectWidth={false}
            className="role-select"
            optionLabelProp="label">
            <Option value="User" label={<Tag color="blue">User</Tag>}>
              <Tag color="blue">User</Tag>
            </Option>
            <Option value="Admin" label={<Tag color="green">Admin</Tag>}>
              <Tag color="green">Admin</Tag>
            </Option>
            <Option
              value="SuperAdmin"
              label={<Tag color="red">Super Admin</Tag>}>
              <Tag color="red">Super Admin</Tag>
            </Option>
          </Select>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Tooltip title="ลบ">
          <Button
            danger
            type="primary"
            shape="circle"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record.id, record.name)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Layout>
      <Content
        style={{
          padding: 24,
          minHeight: 280,
          background: "#fff",
          borderRadius: 8,
        }}>
        <div className="flex justify-between items-center mb-6 flex-wrap">
          <h1 className="text-2xl font-semibold">จัดการบทบาทผู้ใช้</h1>
          <Space>
            <Tooltip
              title={
                useMockData ? "กำลังใช้ข้อมูลจำลอง" : "กำลังใช้ข้อมูลจริง"
              }>
              <Switch
                checkedChildren="ข้อมูลจริง"
                unCheckedChildren="ข้อมูลจำลอง"
                checked={!useMockData}
                onChange={(checked) => setUseMockData(!checked)}
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchUsers}>
              รีเฟรช
            </Button>
          </Space>
        </div>

        <div
          className="flex justify-between items-center mb-4 flex-wrap"
          style={{ gap: 8 }}>
          <Input
            placeholder="ค้นหาด้วยชื่อ, อีเมล, รหัสพนักงาน"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            style={{ width: "100%", maxWidth: 300 }}
            prefix={<SearchOutlined />}
          />

          <Space>
            <FilterOutlined />
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 140 }}
              placeholder="กรองตามบทบาท">
              <Option value="All">ทุกบทบาท</Option>
              <Option value="User">User</Option>
              <Option value="Admin">Admin</Option>
              <Option value="SuperAdmin">Super Admin</Option>
            </Select>
          </Space>
        </div>

        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `ทั้งหมด ${total} คน`,
            pageSizeOptions: ["10", "20", "50"],
          }}
          scroll={{ x: "max-content" }}
          loading={loading}
          bordered
          size="middle"
        />
      </Content>
    </Layout>
  );
};

export default ManageRoles;
