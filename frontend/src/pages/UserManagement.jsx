import { useState, useEffect } from "react";
import {
  Table,
  Switch,
  Button,
  message,
  Input,
  Modal,
  Form,
  Select,
  Avatar,
  Spin,
  Tag,
  Dropdown,
  List,
  Empty,
} from "antd";
import {
  UserOutlined,
  ReloadOutlined,
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const API_BASE_URL = "http://172.18.43.39:5000/api";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedDeleteUser, setSelectedDeleteUser] = useState(null);
  const [form] = Form.useForm();
  const [issuesModalVisible, setIssuesModalVisible] = useState(false);
  const [userIssues, setUserIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [selectedUserForIssues, setSelectedUserForIssues] = useState(null);
  const [assignedIssuesModalVisible, setAssignedIssuesModalVisible] =
    useState(false);
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [loadingAssignedIssues, setLoadingAssignedIssues] = useState(false);
  const [selectedUserForAssignedIssues, setSelectedUserForAssignedIssues] =
    useState(null);

  // Fetch users from existing API endpoint
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // ใช้ endpoint /users/all ที่มีอยู่แล้ว
      const response = await axios.get(`${API_BASE_URL}/users/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ตรวจสอบรูปแบบการตอบกลับที่ถูกต้อง
      let userData = [];
      if (response.data && Array.isArray(response.data.data)) {
        userData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        userData = response.data;
      } else {
        console.warn("Unexpected API response format:", response.data);
        userData = [];
      }

      console.log("Fetched users:", userData);
      setUsers(userData);
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

  // Handle status change using existing API
  const handleStatusChange = async (userId, newStatus) => {
    try {
      const token = localStorage.getItem("token");

      // อัพเดตสถานะผู้ใช้ผ่าน API ที่มีอยู่แล้ว
      await axios.put(
        `${API_BASE_URL}/users/resign/${userId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // อัพเดตข้อมูลในตาราง
      setUsers(
        users.map((user) =>
          user._id === userId || user.id === userId
            ? { ...user, status: newStatus }
            : user
        )
      );

      message.success(
        `อัพเดตสถานะผู้ใช้เป็น ${
          newStatus === "active" ? "active" : "inactive"
        } เรียบร้อยแล้ว`
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      message.error("ไม่สามารถอัพเดตสถานะผู้ใช้ได้");
    }
  };

  // Edit user
  const handleEditUser = (user) => {
    setSelectedUser(user);

    // กำหนดค่าเริ่มต้นของฟอร์ม
    form.setFieldsValue({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      role: user.role,
      status: user.status || "active",
      department: user.department || "",
    });

    setIsModalVisible(true);
  };

  // Save user changes
  const handleSaveUser = async (values) => {
    try {
      const token = localStorage.getItem("token");
      const userId = selectedUser._id || selectedUser.id;

      // อัพเดตข้อมูลผู้ใช้ผ่าน API ที่มีอยู่แล้ว
      await axios.put(`${API_BASE_URL}/users/edit/${userId}`, values, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // อัพเดตข้อมูลในตาราง
      setUsers(
        users.map((user) =>
          user._id === userId || user.id === userId
            ? { ...user, ...values }
            : user
        )
      );

      message.success("อัพเดตข้อมูลผู้ใช้เรียบร้อยแล้ว");
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error updating user:", error);
      message.error("ไม่สามารถอัพเดตข้อมูลผู้ใช้ได้");
    }
  };

  // เพิ่มฟังก์ชันสำหรับลบผู้ใช้
  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");

      // ส่งคำขอลบผู้ใช้ไปยัง API
      await axios.delete(`${API_BASE_URL}/users/delete/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // อัพเดตข้อมูลผู้ใช้ในตาราง
      setUsers(
        users.filter((user) => user._id !== userId && user.id !== userId)
      );

      message.success("ลบผู้ใช้เรียบร้อยแล้ว");
      setConfirmModalVisible(false);
      setSelectedDeleteUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      message.error("ไม่สามารถลบผู้ใช้ได้");
    }
  };

  // เพิ่มฟังก์ชันแสดง Modal ยืนยันการลบ
  const showDeleteConfirm = (user) => {
    setSelectedDeleteUser(user);
    setConfirmModalVisible(true);
  };

  // ฟังก์ชันดึงประวัติคำร้องของผู้ใช้
  const fetchUserIssues = async (user) => {
    try {
      setLoadingIssues(true);
      setSelectedUserForIssues(user);

      const token = localStorage.getItem("token");

      // เปลี่ยนมาใช้ endpoint /reports/user/me แทน
      const endpoint = `${API_BASE_URL}/reports/user/me`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ตรวจสอบรูปแบบการตอบกลับ
      let issueData = [];
      if (response.data && Array.isArray(response.data.data)) {
        issueData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        issueData = response.data;
      } else {
        console.warn("Unexpected API response format:", response.data);
        issueData = [];
      }

      // เพิ่ม logging เพื่อตรวจสอบข้อมูลที่ได้รับ
      console.log(`ประวัติคำร้องของผู้ใช้:`, issueData);

      setUserIssues(issueData);
      setIssuesModalVisible(true);
    } catch (error) {
      console.error("Error fetching user issues:", error);
      message.error("ไม่สามารถดึงข้อมูลประวัติคำร้องของผู้ใช้ได้");
    } finally {
      setLoadingIssues(false);
    }
  };

  // แก้ไขในฟังก์ชัน fetchAssignedIssues
  const fetchAssignedIssues = async (user) => {
    try {
      setLoadingAssignedIssues(true);
      setSelectedUserForAssignedIssues(user);

      const token = localStorage.getItem("token");
      const userId = user._id || user.id;
      const currentUserData = JSON.parse(localStorage.getItem("user"));
      const currentUserRole = currentUserData?.role || "";

      console.log(`กำลังดึงข้อมูลคำร้องที่มอบหมายให้ ${userId}`);

      const endpoint = `${API_BASE_URL}/reports/admin/all`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ตรวจสอบรูปแบบการตอบกลับ
      let issueData = [];
      if (response.data && Array.isArray(response.data.data)) {
        issueData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        issueData = response.data;
      } else {
        console.warn("Unexpected API response format:", response.data);
        issueData = [];
      }

      console.log(
        `ข้อมูลคำร้องที่ได้รับจาก API (ผู้ใช้ ${userId}):`,
        issueData
      );

      // กรองข้อมูลเฉพาะคำร้องที่มอบหมายให้ userId ที่กำลังดู
      let filteredIssues = issueData.filter((issue) => {
        if (!issue.assignedAdmin) return false;

        const adminId = issue.assignedAdmin._id || issue.assignedAdmin.id;

        console.log(
          `เปรียบเทียบ assignedAdmin (${adminId}) กับ userId (${userId}): ${
            adminId === userId
          }`
        );

        return adminId === userId;
      });

      // แก้ไขตรงนี้: ลบการจำกัดการเข้าถึงสำหรับ Admin
      // เปลี่ยนเป็นให้ดูได้เฉพาะ SuperAdmin และ Admin
      if (currentUserRole !== "SuperAdmin" && currentUserRole !== "Admin") {
        // ถ้าไม่ใช่ SuperAdmin หรือ Admin ให้ดูได้เฉพาะของตัวเอง
        const currentUserId = currentUserData?.id || currentUserData?._id || "";
        if (currentUserId !== userId) {
          filteredIssues = []; // ถ้าดูข้อมูลคนอื่นให้เป็นค่าว่าง
        }
      }

      console.log(
        `คำร้องที่กรองแล้ว (${filteredIssues.length} รายการ):`,
        filteredIssues
      );

      setAssignedIssues(filteredIssues);
      setAssignedIssuesModalVisible(true);
    } catch (error) {
      console.error("Error fetching assigned issues:", error);
      message.error("ไม่สามารถดึงข้อมูลรายการคำร้องที่ได้รับมอบหมายได้");
    } finally {
      setLoadingAssignedIssues(false);
    }
  };

  // ฟังก์ชันแปลงสถานะเป็นภาษาไทย
  const getStatusText = (status) => {
    const statusMapping = {
      pending: "รอดำเนินการ",
      approved: "อนุมัติแล้ว",
      rejected: "ถูกปฏิเสธ",
      completed: "เสร็จสิ้น",
    };
    return statusMapping[status] || status;
  };

  // สีของแต่ละสถานะ
  const getStatusColor = (status) => {
    const statusColors = {
      pending: "orange",
      approved: "blue",
      rejected: "red",
      completed: "green",
      รอดำเนินการ: "orange",
      อนุมัติแล้ว: "blue",
      ถูกปฏิเสธ: "red",
      เสร็จสิ้น: "green",
    };
    return statusColors[status] || "default";
  };

  // ฟังก์ชันนำทางไปยังหน้าคำร้องที่ได้รับมอบหมาย

  // Filter users by search text
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`
      .toLowerCase()
      .trim();
    const email = user.email?.toLowerCase() || "";
    const department = user.department?.toLowerCase() || "";
    const searchValue = searchText.toLowerCase();

    return (
      fullName.includes(searchValue) ||
      email.includes(searchValue) ||
      department.includes(searchValue)
    );
  });

  // Table columns
  const columns = [
    {
      title: "ผู้ใช้งาน",
      key: "user",
      render: (_, record) => (
        <div className="flex items-center space-x-3">
          <Avatar
            src={record.profileImage || record.profilePicture}
            icon={
              !record.profileImage && !record.profilePicture && <UserOutlined />
            }
          />
          <div>
            <div className="font-medium">
              {`${record.firstName || ""} ${record.lastName || ""}`.trim()}
            </div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
      sorter: (a, b) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: "แผนก",
      dataIndex: "department",
      key: "department",
      render: (department) => department || "-",
    },
    {
      title: "บทบาท",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag
          color={
            role === "SuperAdmin" ? "red" : role === "Admin" ? "blue" : "green"
          }>
          {role}
        </Tag>
      ),
      filters: [
        { text: "User", value: "User" },
        { text: "Admin", value: "Admin" },
        { text: "SuperAdmin", value: "SuperAdmin" },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: "สถานะ",
      key: "status",
      render: (_, record) => (
        <Switch
          checked={record.status !== "inactive"}
          onChange={(checked) =>
            handleStatusChange(
              record._id || record.id,
              checked ? "active" : "inactive"
            )
          }
          checkedChildren="active"
          unCheckedChildren="inactive"
        />
      ),
      filters: [
        { text: "active", value: "active" },
        { text: "inactive", value: "inactive" },
      ],
      onFilter: (value, record) => (record.status || "active") === value,
    },
    {
      title: "การจัดการ",
      key: "actions",
      render: (_, record) => {
        // สร้างรายการเมนูตามบทบาทของผู้ใช้
        const menuItems = [];

        // ตัวเลือกแก้ไขสำหรับทุกคน
        menuItems.push({
          key: "1",
          icon: <EditOutlined />,
          label: "แก้ไข",
          onClick: () => handleEditUser(record),
        });

        // ตัวเลือกประวัติคำร้องสำหรับ User
        if (record.role === "User") {
          menuItems.push({
            key: "2",
            icon: <HistoryOutlined />,
            label: "ดูประวัติคำร้อง",
            onClick: () => fetchUserIssues(record),
          });
        }

        // ตัวเลือกคำร้องที่ได้รับมอบหมายสำหรับ Admin และ SuperAdmin
        if (record.role === "Admin" || record.role === "SuperAdmin") {
          menuItems.push({
            key: "2",
            icon: <SolutionOutlined />,
            label: "รายการคำร้องที่ได้รับมอบหมาย",
            onClick: () => fetchAssignedIssues(record),
          });
        }

        // ตัวเลือกลบสำหรับทุกคน
        menuItems.push({
          key: "3",
          icon: <DeleteOutlined />,
          label: "ลบ",
          danger: true,
          onClick: () => showDeleteConfirm(record),
        });

        return (
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={["click"]}>
            <Button
              type="text"
              icon={<EllipsisOutlined style={{ fontSize: "20px" }} />}
              style={{
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">จัดการผู้ใช้งาน</h1>
        <div className="flex space-x-2">
          <Input.Search
            placeholder="ค้นหาผู้ใช้งาน..."
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Button
            onClick={fetchUsers}
            type="primary"
            style={{
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}
            icon={<ReloadOutlined />}>
            รีเฟรช
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey={(record) => record._id || record.id}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "ไม่พบข้อมูลผู้ใช้งาน" }}
        />
      )}

      <Modal
        title="แก้ไขข้อมูลผู้ใช้"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item
            name="firstName"
            label="ชื่อ"
            rules={[{ required: true, message: "กรุณาระบุชื่อ" }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="นามสกุล"
            rules={[{ required: true, message: "กรุณาระบุนามสกุล" }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="อีเมล"
            rules={[
              { required: true, message: "กรุณาระบุอีเมล" },
              { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
            ]}>
            <Input readOnly />
          </Form.Item>

          <Form.Item name="department" label="แผนก">
            <Input />
          </Form.Item>

          <Form.Item name="role" label="บทบาท">
            <Select>
              <Select.Option value="User">User</Select.Option>
              <Select.Option value="Admin">Admin</Select.Option>
              <Select.Option value="SuperAdmin">SuperAdmin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label="สถานะ">
            <Select>
              <Select.Option value="active">active</Select.Option>
              <Select.Option value="inactive">inactive</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <div className="flex justify-end">
              <Button
                onClick={() => setIsModalVisible(false)}
                style={{ marginRight: 8 }}>
                ยกเลิก
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  backgroundColor: "#262362",
                  transition: "background-color 0.3s",
                  border: "none",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#193CB8")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "#262362")
                }>
                บันทึกการเปลี่ยนแปลง
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* เพิ่ม Modal ยืนยันการลบผู้ใช้ */}
      <Modal
        title="ยืนยันการลบผู้ใช้"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmModalVisible(false)}>
            ยกเลิก
          </Button>,
          <Button
            key="delete"
            danger
            onClick={() =>
              handleDeleteUser(
                selectedDeleteUser?._id || selectedDeleteUser?.id
              )
            }>
            ยืนยันการลบ
          </Button>,
        ]}>
        <p>
          คุณต้องการลบผู้ใช้ &quot;{selectedDeleteUser?.firstName}{" "}
          {selectedDeleteUser?.lastName}&quot; ใช่หรือไม่?
        </p>
        <p>การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
      </Modal>

      {/* Modal แสดงประวัติคำร้อง */}
      <Modal
        title={
          <div>
            ประวัติคำร้องของ{" "}
            <span className="font-medium">
              {selectedUserForIssues?.firstName}{" "}
              {selectedUserForIssues?.lastName}
            </span>
          </div>
        }
        open={issuesModalVisible}
        onCancel={() => setIssuesModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setIssuesModalVisible(false)}>
            ปิด
          </Button>,
        ]}>
        {loadingIssues ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : userIssues.length === 0 ? (
          <Empty description="ไม่พบประวัติคำร้อง" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={userIssues}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <div className="flex justify-between items-center">
                      <span>{item.topic || item.title || "ไม่ระบุหัวข้อ"}</span>
                      <Tag color={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        {item.description?.length > 100
                          ? `${item.description.substring(0, 100)}...`
                          : item.description || "ไม่มีคำอธิบาย"}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>
                          รหัสคำร้อง: {item._id || item.issueId || "ไม่ระบุ"}
                        </span>
                        <span>
                          วันที่:{" "}
                          {dayjs(item.createdAt || item.date).format(
                            "DD/MM/YYYY"
                          )}
                        </span>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
            pagination={{
              pageSize: 5,
              size: "small",
            }}
          />
        )}
      </Modal>

      {/* Modal แสดงรายการคำร้องที่ได้รับมอบหมาย */}
      <Modal
        title={
          <div>
            รายการคำร้องที่ได้รับมอบหมายของ{" "}
            <span className="font-medium">
              {selectedUserForAssignedIssues?.firstName}{" "}
              {selectedUserForAssignedIssues?.lastName}
            </span>
          </div>
        }
        open={assignedIssuesModalVisible}
        onCancel={() => setAssignedIssuesModalVisible(false)}
        width={700}
        footer={[
          <Button
            key="close"
            onClick={() => setAssignedIssuesModalVisible(false)}>
            ปิด
          </Button>,
        ]}>
        {loadingAssignedIssues ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : assignedIssues.length === 0 ? (
          <Empty description="ไม่พบรายการคำร้องที่ได้รับมอบหมาย" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={assignedIssues}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <div className="flex justify-between items-center">
                      <span>{item.topic || item.title || "ไม่ระบุหัวข้อ"}</span>
                      <Tag color={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        {item.description?.length > 100
                          ? `${item.description.substring(0, 100)}...`
                          : item.description || "ไม่มีคำอธิบาย"}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>
                          รหัสคำร้อง: {item._id || item.issueId || "ไม่ระบุ"}
                        </span>
                        <span>
                          วันที่:{" "}
                          {dayjs(item.createdAt || item.date).format(
                            "DD/MM/YYYY"
                          )}
                        </span>
                      </div>
                      {item.userId && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span>
                            ผู้แจ้ง:{" "}
                            {item.userId.firstName
                              ? `${item.userId.firstName} ${
                                  item.userId.lastName || ""
                                }`
                              : item.userId.name || "ไม่ระบุชื่อ"}
                          </span>
                        </div>
                      )}
                      {item.assignedAdmin && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span>
                            ผู้รับผิดชอบ:{" "}
                            {item.assignedAdmin.firstName
                              ? `${item.assignedAdmin.firstName} ${
                                  item.assignedAdmin.lastName || ""
                                }`
                              : item.assignedAdmin.name || "ไม่ระบุชื่อ"}
                          </span>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
            pagination={{
              pageSize: 5,
              size: "small",
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
