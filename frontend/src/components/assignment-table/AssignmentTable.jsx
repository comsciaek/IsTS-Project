import { useState, useEffect, useRef, useCallback } from "react";
import {
  Layout,
  Table,
  Button,
  Space,
  Dropdown,
  message,
  theme,
  Avatar,
} from "antd";
import { ReloadOutlined, DownOutlined, UserOutlined } from "@ant-design/icons";
import SearchColumn from "../contents/SearchColumn";
import StatusColumn from "../contents/StatusColumn";
import AssigneesColumn from "./AssigneesColumn";
import ActionsColumn from "./ActionsColumn";
import TableSkeleton from "../skeletons/TableSkeleton"; // Import TableSkeleton

const { Content } = Layout;

const AssignmentTable = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownVisible, setDropdownVisible] = useState(null);
  const [timeRange, setTimeRange] = useState("daily");
  const tableRef = useRef(null);

  const menuItems = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
  ];

  const fetchData = useCallback(() => {
    setLoading(true);
    // Simulate data fetching based on timeRange
    setTimeout(() => {
      setDataSource(
        Array.from({ length: 46 }).map((_, i) => ({
          key: i,
          id: `101 ${i}`,
          issue: `Issue ${timeRange} ${i}`,
          date: "2025-02-05",
          name: "John Doe",
          status: "เสร็จสิ้น", // Resolved in Thai
          assignees: [
            {
              name: "John Doe",
              avatar: "https://dummyimage.com/40x40/000/fff",
            },
          ],
        }))
      );
      setLoading(false);
    }, 1000); // Simulate a 1-second loading time
  }, [timeRange]);

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
      title: "Issue ID",
      dataIndex: "id",
      key: "id",
      width: "10%",
      ...SearchColumn("id"),
    },
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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Dropdown
            menu={{
              items: menuItems,
              onClick: (e) => setTimeRange(e.key),
            }}>
            <Button style={{ marginBottom: 16 }}>
              <Space>
                {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
          <Button
            type="primary"
            onClick={fetchData}
            style={{
              marginBottom: 16,
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
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
            scroll={{ x: "max-content", y: 300 }} // Add horizontal and vertical scroll
          />
        )}
      </Content>
    </Layout>
  );
};

export default AssignmentTable;
