import { useState, useEffect } from "react";
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
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import axios from "axios";

const { Content } = Layout;
const { Option } = Select;
const { Search } = Input;

const ManageRoles = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://172.18.43.39:5000/users");
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        message.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`http://172.18.43.39:5000/manage-roles/${userId}/role`, {
        role: newRole,
      });

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      message.success("Role updated successfully");
    } catch (error) {
      console.error("Error:", error);
      message.error("Failed to update role");
    }
  };

  const handleDeleteUser = (userId) => {
    Modal.confirm({
      title: "Are you sure you want to delete this user?",
      onOk: async () => {
        try {
          await axios.delete(`http://172.18.43.39:5000/users/${userId}`);

          setUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== userId)
          );
          message.success("User deleted successfully");
        } catch (error) {
          console.error("Error:", error);
          message.error("Failed to delete user");
        }
      },
    });
  };

  const filteredUsers = users
    .filter((user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((user) => {
      if (filter === "new") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return new Date(user.joinedAt) > oneMonthAgo;
      }
      return true;
    });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Space>
          <Avatar src={record.avatar} />
          {text}
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (text, record) => (
        <Select
          value={text}
          onChange={(value) => handleRoleChange(record.id, value)}
          style={{ width: 120 }}>
          <Option value="user">User</Option>
          <Option value="admin">Admin</Option>
          <Option value="super-admin">Super Admin</Option>
        </Select>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          style={{ color: "#f5222d" }}
          type="danger"
          onClick={() => handleDeleteUser(record.id)}>
          <DeleteOutlined />
        </Button>
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
        }}>
        <h1 className="text-2xl font-semibold mb-6">Manage User Roles</h1>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
          }}>
          <Search
            placeholder="Search users"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            value={filter}
            onChange={(value) => setFilter(value)}
            style={{ width: 200 }}>
            <Option value="all">All Users</Option>
            <Option value="new">New Users</Option>
          </Select>
        </div>
        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content", y: 450 }}
        />
      </Content>
    </Layout>
  );
};

export default ManageRoles;
