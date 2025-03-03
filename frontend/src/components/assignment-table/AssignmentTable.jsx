import { useState, useEffect, useRef, useCallback } from "react";
import { Layout, Table, Button, Space, message, theme, Avatar } from "antd";
import { ReloadOutlined, UserOutlined } from "@ant-design/icons";
import SearchColumn from "../contents/SearchColumn";
import StatusColumn from "../contents/StatusColumn";
import AssigneesColumn from "./AssigneesColumn";
import ActionsColumn from "./ActionsColumn";
import TableSkeleton from "../skeletons/TableSkeleton";

const { Content } = Layout;

const AssignmentTable = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownVisible, setDropdownVisible] = useState(null);
  const tableRef = useRef(null);

  // ลบ state timeRange และ menuItems ออกแล้ว

  const fetchData = useCallback(() => {
    setLoading(true);
    // ปรับปรุงการดึงข้อมูลไม่ให้มีการอ้างอิงถึง timeRange
    setTimeout(() => {
      setDataSource(
        Array.from({ length: 46 }).map((_, i) => ({
          key: i,
          id: `101 ${i}`,
          issue: `Issue ${i}`, // ลบ timeRange ออก
          date: "2025-02-05",
          name: "John Doe",
          status: "เสร็จสิ้น",
          assignees: [
            {
              name: "John Doe",
              avatar: "https://dummyimage.com/40x40/000/fff",
            },
          ],
        }))
      );
      setLoading(false);
    }, 1000);
  }, []); // ลบ timeRange ออกจาก dependencies

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleScroll = () => {
      setDropdownVisible(null);
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleStatusChange = (key, newStatus) => {
    const newData = dataSource.map((item) => {
      if (item.key === key) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    setDataSource(newData);
    message.success(`Status changed to ${newStatus}`);
  };

  const handleAssign = (key, assignee) => {
    const newData = dataSource.map((item) => {
      if (item.key === key) {
        return { ...item, assignees: [...item.assignees, assignee] };
      }
      return item;
    });
    setDataSource(newData);
    message.success(`Assigned to ${assignee.name}`);
  };

  const columns = [
    {
      title: "Issue",
      dataIndex: "issue",
      key: "issue",
      width: "20%",
      ...SearchColumn("issue"),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: "10%",
      ...SearchColumn("date", true),
    },
    {
      title: "Emlpoyees",
      dataIndex: "name",
      key: "name",
      width: "10%",
      ...SearchColumn("name"),
      render: (text) => (
        <Space>
          <Avatar
            src="https://dummyimage.com/40x40/000/fff"
            icon={<UserOutlined />}
          />
          {text}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: "11%",
      render: (text, record) => (
        <StatusColumn
          text={text}
          record={record}
          handleStatusChange={handleStatusChange}
        />
      ),
    },
    {
      title: "Assignees",
      dataIndex: "assignees",
      key: "assignees",
      width: "20%",
      render: (assignees) => <AssigneesColumn assignees={assignees} />,
    },
    {
      title: "Actions",
      key: "6",
      width: "5%",
      render: (_, record) => (
        <ActionsColumn
          record={record}
          handleAssign={handleAssign}
          dropdownVisible={dropdownVisible}
          setDropdownVisible={setDropdownVisible}
        />
      ),
    },
  ];

  return (
    <Layout>
      <Content
        ref={tableRef}
        style={{
          borderRadius: borderRadiusLG,
          background: colorBgContainer,
        }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {" "}
          {/* ปรับ layout เนื่องจากลบปุ่มซ้ายออก */}
          <Button
            type="primary"
            onClick={fetchData}
            style={{
              marginBottom: 16,
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
              borderRadius: "50%",
              height: "32px",
              width: "32px",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}>
            <ReloadOutlined />
          </Button>
        </div>
        {loading ? (
          <TableSkeleton />
        ) : (
          <Table
            dataSource={dataSource}
            columns={columns}
            pagination={{ pageSize: 10 }}
            scroll={{ x: "max-content", y: 300 }}
          />
        )}
      </Content>
    </Layout>
  );
};

export default AssignmentTable;
