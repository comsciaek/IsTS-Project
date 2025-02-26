import { useState, useEffect, useMemo } from "react";
import { Layout, Menu, Dropdown, Space, Avatar, message } from "antd";
import {
  SettingOutlined,
  LogoutOutlined,
  DownOutlined,
  MessageOutlined,
  LayoutOutlined,
} from "@ant-design/icons";
import { Link, NavLink, useLocation, useNavigate } from "react-router"; // Change to react-router-dom
import logo from "../../assets/jib-logo-2.png";
import { Content } from "antd/es/layout/layout";
import { Outlet } from "react-router";
import NotiFications from "../NotiFications";
import { getUserDisplayName, getUserInitial } from "../../utils/userUtils";

const { Header, Sider } = Layout;

const UsersSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState("");
  const [user, setUser] = useState(null);

  // Define menu items with role-based access
  const menuItems = useMemo(
    () => [
      {
        key: "1",
        icon: <LayoutOutlined />,
        label: <NavLink to="/user/home">Home</NavLink>,
      },
      {
        key: "2",
        icon: <MessageOutlined />,
        label: <NavLink to="/user/message">Messages</NavLink>,
      },
      {
        key: "3",
        icon: <SettingOutlined />,
        label: <NavLink to="/user/settings">Settings</NavLink>,
      },
    ],
    []
  );

  /**
   * เชื่อมต่อ API: ดึงข้อมูลผู้ใช้จาก localStorage
   *
   * อธิบาย: ไม่ได้เชื่อมต่อ API โดยตรง แต่ดึงข้อมูลที่บันทึกไว้ใน localStorage
   * ซึ่งได้จากการ login ก่อนหน้านี้ โดยมีโครงสร้างข้อมูลดังนี้:
   *
   * Expected user structure:
   * {
   *   id: string,
   *   name: string,
   *   employeeId: string,
   *   email: string,
   *   role: "User" | "Admin" | "SuperAdmin",
   *   profilePicture?: string (optional),
   *   ...other properties
   * }
   *
   * ถ้าไม่พบข้อมูลผู้ใช้ หรือไม่ใช่ role "User" จะ redirect ไปยังหน้า unauthorized หรือ login
   */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Check if user has User role
        if (parsedUser.role !== "User") {
          navigate("/unauthorized");
        }
      } catch (error) {
        console.error("Failed to parse user data:", error);
        localStorage.removeItem("user");
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    // Find selected key based on current path
    const path = location.pathname;
    if (path === "/user/home") setSelectedKey("1");
    else if (path === "/user/message") setSelectedKey("2");
    else if (path === "/user/settings") setSelectedKey("3");
    else setSelectedKey("");
  }, [location]);

  /**
   * Logout function
   *
   * อธิบาย: ไม่ได้เชื่อมต่อ API logout โดยตรง แต่ลบข้อมูล token และ user
   * ออกจาก localStorage ซึ่งในระบบที่สมบูรณ์ควรมีการเรียก API Logout ด้วย
   */
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    message.success("Logged out successfully");
    navigate("/login");
  };

  const accountdropdown = [
    {
      key: "1",
      label: (
        <NavLink
          to="/user/settings"
          style={{ display: "flex", alignItems: "center" }}>
          <SettingOutlined />
          <span style={{ marginLeft: "8px" }}>Settings</span>
        </NavLink>
      ),
    },
    {
      type: "divider",
    },
    {
      key: "2",
      label: (
        <div
          onClick={handleLogout}
          style={{ display: "flex", alignItems: "center" }}>
          <LogoutOutlined />
          <span style={{ marginLeft: "8px" }}>Logout</span>
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ height: "100vh", width: "100vw" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
        collapsedWidth="50"
        className="bg-white"
        width={160}>
        <div className="logo-container mt-6">
          <Link to="/user/home">
            <img src={logo} alt="logo" />
          </Link>
        </div>
        <Menu
          style={{ marginTop: "25px" }}
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 0",
            backgroundColor: "#262362",
            zIndex: 1000,
          }}>
          <div className="flex ml-auto">
            <NotiFications className="mr-5" />
          </div>
          <div className="flex mr-5">
            <Dropdown menu={{ items: accountdropdown }}>
              <a
                onClick={(e) => e.preventDefault()}
                style={{ marginLeft: "16px" }}>
                <Space className="text-white">
                  {user?.profilePicture ? (
                    <Avatar src={user.profilePicture} />
                  ) : (
                    <Avatar>{getUserInitial(user)}</Avatar>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}>
                    <div style={{ lineHeight: "1.2", fontWeight: "500" }}>
                      {getUserDisplayName(user)}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        opacity: 0.8,
                        lineHeight: "1.2",
                      }}>
                      {user?.role}
                    </div>
                  </div>
                  <DownOutlined />
                </Space>
              </a>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: "16px", overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default UsersSidebar;
