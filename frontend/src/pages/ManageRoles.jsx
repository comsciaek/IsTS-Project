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
  Drawer,
  Typography,
  List,
} from "antd";
import {
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  LoadingOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useMediaQuery } from "react-responsive";

const { Option } = Select;
const { confirm } = Modal;
const { Text, Title } = Typography;

// API Base URL
const API_BASE_URL = "http://172.18.43.39:5000/api";

const ManageRoles = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const isMobile = useMediaQuery({ maxWidth: 767 });

  const getResponsiveColumns = () => {
    const baseColumns = [
      {
        title: "Employee",
        dataIndex: "name",
        key: "name",
        render: (_, record) => (
          <div className="flex items-center">
            <Avatar
              src={record.image}
              icon={!record.image && <UserOutlined />}
              size={isMobile ? 32 : 40}
              style={{ marginRight: isMobile ? 8 : 12 }}
            />
            <div>
              <div className="font-medium">{record.name}</div>
              <div className="text-xs text-gray-500">#{record.employeeId}</div>
            </div>
          </div>
        ),
        fixed: "left",
        width: isMobile ? 180 : 250,
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
        title: "Roles",
        dataIndex: "role",
        key: "role",
        render: (text, record) => (
          <Select
            value={text}
            onChange={(value) => handleRoleChange(record.id, value)}
            style={{ width: isMobile ? 100 : 130 }}
            popupMatchSelectWidth={false}
            size={isMobile ? "small" : "middle"}
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
    ];

    if (isMobile) {
      baseColumns.push({
        title: "",
        key: "view",
        width: 50,
        render: (_, record) => (
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setDrawerVisible(true);
            }}
            size="small"
          />
        ),
      });
    }

    baseColumns.push({
      title: "Action",
      key: "action",
      width: 60,
      render: (_, record) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteUser(record.id, record.name)}
          size={isMobile ? "small" : "small"}
          style={{
            borderRadius: "50%",
            height: isMobile ? "28px" : "30px",
            width: isMobile ? "28px" : "30px",
          }}
        />
      ),
    });

    return baseColumns;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_BASE_URL}/users/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response:", response.data);

      let userData = [];

      if (Array.isArray(response.data)) {
        userData = response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        userData = response.data.users;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        userData = response.data.data;
      } else {
        console.warn("Unexpected API response format:", response.data);
        message.warning("รูปแบบข้อมูลจาก API ไม่ตรงตามที่คาดหวัง");
        userData = [];
      }

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

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users];

    if (searchText) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(searchText.toLowerCase()) ||
          user.email.toLowerCase().includes(searchText.toLowerCase()) ||
          user.employeeId.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (roleFilter !== "All") {
      result = result.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(result);
  }, [users, searchText, roleFilter]);

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

          await axios.delete(`${API_BASE_URL}/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

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

  const renderMobileList = () => {
    return (
      <List
        itemLayout="horizontal"
        dataSource={filteredUsers}
        renderItem={(user) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                type="text"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedUser(user);
                  setDrawerVisible(true);
                }}
              />,
              <Button
                key="delete"
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteUser(user.id, user.name)}
              />,
            ]}>
            <List.Item.Meta
              avatar={
                <Avatar
                  src={user.image}
                  icon={!user.image && <UserOutlined />}
                  size={40}
                />
              }
              title={<span className="font-medium">{user.name}</span>}
              description={
                <div>
                  <div className="text-xs text-gray-500">
                    #{user.employeeId}
                  </div>
                  <Tag
                    color={
                      user.role === "SuperAdmin"
                        ? "red"
                        : user.role === "Admin"
                        ? "green"
                        : "blue"
                    }
                    style={{ marginTop: 5 }}>
                    {user.role}
                  </Tag>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const renderUserDetailDrawer = () => {
    return (
      <Drawer
        title="รายละเอียดผู้ใช้งาน"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={320}>
        {selectedUser && (
          <div className="flex flex-col space-y-4">
            <div className="flex justify-center">
              <Avatar
                src={selectedUser.image}
                icon={!selectedUser.image && <UserOutlined />}
                size={80}
              />
            </div>

            <div className="text-center mb-4">
              <Title level={5} className="m-0">
                {selectedUser.name}
              </Title>
              <Text type="secondary">#{selectedUser.employeeId}</Text>
            </div>

            <div className="flex justify-between">
              <Text strong>อีเมล:</Text>
              <Text>{selectedUser.email}</Text>
            </div>

            <div className="flex justify-between">
              <Text strong>แผนก:</Text>
              <Text>{selectedUser.department}</Text>
            </div>

            <div className="flex justify-between items-center">
              <Text strong>บทบาท:</Text>
              <Select
                value={selectedUser.role}
                onChange={(value) => {
                  handleRoleChange(selectedUser.id, value);
                  setSelectedUser({ ...selectedUser, role: value });
                }}
                style={{ width: 130 }}
                size="middle">
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
            </div>

            <div className="pt-8">
              <Button
                danger
                type="primary"
                icon={<DeleteOutlined />}
                onClick={() => {
                  handleDeleteUser(selectedUser.id, selectedUser.name);
                  setDrawerVisible(false);
                }}
                block>
                ลบผู้ใช้งานนี้
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
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
      );
    }

    if (isMobile && window.innerWidth < 500) {
      return renderMobileList();
    }

    return (
      <Table
        columns={getResponsiveColumns()}
        dataSource={filteredUsers}
        pagination={{
          pageSize: isMobile ? 5 : 10,
          showTotal: (total) => `ทั้งหมด ${total} คน`,
          size: isMobile ? "small" : "default",
        }}
        rowKey="id"
        locale={{
          emptyText: "ไม่พบข้อมูลผู้ใช้",
        }}
        size={isMobile ? "small" : "middle"}
        scroll={{ x: "max-content" }}
      />
    );
  };

  return (
    <Card
      title="จัดการบทบาทผู้ใช้"
      className="shadow-md"
      bodyStyle={{ padding: isMobile ? "12px" : "24px" }}>
      <div
        className={`${
          isMobile ? "flex-col space-y-4" : "flex justify-between flex-wrap"
        } mb-6 gap-4`}>
        <div>
          <Input
            placeholder="ค้นหาผู้ใช้..."
            prefix={<SearchOutlined />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? "100%" : 250 }}
            size={isMobile ? "middle" : "middle"}
          />
        </div>

        <Space>
          <div className="flex items-center gap-2">
            <FilterOutlined />
            <Select
              defaultValue="All"
              style={{ width: isMobile ? 120 : 150 }}
              onChange={(value) => setRoleFilter(value)}
              size={isMobile ? "middle" : "middle"}>
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
              height: "32px",
              width: "32px",
            }}>
            <ReloadOutlined />
          </Button>
        </Space>
      </div>

      {renderContent()}
      {renderUserDetailDrawer()}

      {!isMobile && (
        <div className="mt-4 text-gray-500 text-sm">
          <p>สามารถเปลี่ยนบทบาทผู้ใช้ได้โดยการเลือกจาก dropdown</p>
          <p>* ผู้ดูแลระบบ (Admin) สามารถจัดการข้อมูลทั่วไปได้</p>
          <p>
            * ผู้ดูแลระบบระดับสูง (Super Admin) สามารถจัดการผู้ใช้และบทบาทได้
          </p>
        </div>
      )}
    </Card>
  );
};

export default ManageRoles;
