import { useState, useEffect, useMemo } from "react";
import { Layout, Menu, Dropdown, Space, Avatar, message } from "antd";
import {
  TableOutlined,
  SettingOutlined,
  LogoutOutlined,
  DownOutlined,
  MessageOutlined,
  PieChartOutlined,
  LayoutOutlined,
} from "@ant-design/icons";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import logo from "../../assets/jib-logo-2.png";
import { Content } from "antd/es/layout/layout";
import { Outlet } from "react-router";
import NotiFications from "../NotiFications";
import { ShieldCheck } from "lucide-react";
import { getUserDisplayName, getUserInitial } from "../../utils/userUtils";

const { Header, Sider } = Layout;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState("");
  const [user, setUser] = useState(null);

  // Define all menu items with role permissions
  const allMenuItems = useMemo(
    () => [
      {
        key: "1",
        icon: <LayoutOutlined />,
        label: <NavLink to="/">Overview</NavLink>,
        allowedroles: ["Admin", "SuperAdmin"],
      },
      {
        key: "2",
        icon: <TableOutlined />,
        label: <NavLink to="/table">Issues Table</NavLink>,
        allowedroles: ["Admin", "SuperAdmin"],
      },
      {
        key: "3",
        icon: <MessageOutlined />,
        label: <NavLink to="/messages">Messages</NavLink>,
        allowedroles: ["Admin", "SuperAdmin"],
      },
      {
        key: "4",
        icon: <PieChartOutlined />,
        label: <NavLink to="/reports">Reports</NavLink>,
        allowedroles: ["SuperAdmin"],
      },
      {
        key: "5",
        icon: <ShieldCheck size={16} strokeWidth={1.25} absoluteStrokeWidth />,
        label: <NavLink to="/manage-roles">Manage Roles</NavLink>,
        allowedroles: ["SuperAdmin"],
      },
      {
        key: "6",
        icon: <SettingOutlined />,
        label: <NavLink to="/settings">Settings</NavLink>,
        allowedroles: ["Admin", "SuperAdmin", "User"],
      },
    ],
    []
  );

  // Filter menu items based on user role - MOVED UP before it's used in useEffect
  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    return allMenuItems.filter((item) => item.allowedroles.includes(user.role));
  }, [allMenuItems, user]);

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
   * ถ้าไม่พบข้อมูลผู้ใช้ จะ redirect ไปยังหน้า login
   * ไม่มีการตรวจสอบ role เพราะมีการกรองเมนูตาม role แทน
   */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
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
    if (location.pathname === "/settings") {
      setSelectedKey("6");
    } else {
      // Make sure we handle the case when filteredMenuItems might be empty
      if (filteredMenuItems.length > 0) {
        const menuItem = filteredMenuItems.find(
          (item) => item.label.props.to === location.pathname
        );
        setSelectedKey(menuItem ? menuItem.key : "1");
      }
    }
  }, [location.pathname, user, filteredMenuItems]);

  /**
   * Logout function
   *
   * อธิบาย: ไม่ได้เชื่อมต่อ API logout โดยตรง แต่ลบข้อมูล token และ user
   * ออกจาก localStorage ซึ่งในระบบที่สมบูรณ์ควรมีการเรียก API Logout ด้วย
   *
   * สำหรับระบบที่มีความปลอดภัยสูง ควรทำการเพิ่ม:
   * 1. การเรียก API ไปยัง endpoint เช่น /api/auth/logout เพื่อยกเลิก token ฝั่งเซิร์ฟเวอร์
   * 2. ล้าง cookies ที่เกี่ยวข้อง (ถ้ามี)
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
          to="/settings"
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
        width={170}>
        <div className="logo-container mt-6">
          <Link to="/">
            <img src={logo} alt="logo" />
          </Link>
        </div>
        <Menu
          style={{ marginTop: "25px" }}
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={filteredMenuItems}
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

export default Sidebar;
