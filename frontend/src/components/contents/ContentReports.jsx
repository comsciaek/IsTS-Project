import { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Dropdown,
  Button,
  Space,
  Table,
  Tag,
  Avatar,
  theme,
} from "antd";
import { DownOutlined, ReloadOutlined } from "@ant-design/icons";

import dayjs from "dayjs";
import TableSkeleton from "../skeletons/TableSkeleton"; // Import TableSkeleton
import TopCard from "../TopCard";

const { Content } = Layout;

const statusColors = {
  เสร็จสิ้น: "green",
  กำลังดำเนินการ: "blue",
  รอดำเนินการ: "orange",
  ถูกปฏิเสธ: "red",
};

const ContentReports = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("daily");

  const menuItems = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
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
          date: dayjs().format("YYYY-MM-DD"),
          employee: {
            name: "John Doe",
            avatar: "https://dummyimage.com/40x40/000/fff",
          },
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

  const columns = [
    {
      title: "Issue",
      dataIndex: "issue",
      key: "issue",
      width: "20%",
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: "10%",
    },
    {
      title: "Employee",
      dataIndex: "employee",
      key: "employee",
      width: "15%",
      render: (employee) => (
        <Space>
          <Avatar src={employee.avatar} />
          {employee.name}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: "11%",
      render: (text) => <Tag color={statusColors[text]}>{text}</Tag>,
    },
    {
      title: "Assignees",
      dataIndex: "assignees",
      key: "assignees",
      width: "20%",
      render: (assignees) => (
        <div>
          {assignees.map((assignee, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center" }}>
              <img
                src={assignee.avatar}
                alt={assignee.name}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  marginRight: "8px",
                }}
              />
              <span>{assignee.name}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="mx-2">
        <TopCard />
      </div>
      <Content
        className="rounded-lg"
        style={{
          margin: "45px 10px",
          padding: 24,
          borderRadius: borderRadiusLG,
          background: colorBgContainer,
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}>
          <Dropdown
            menu={{
              items: menuItems,
              onClick: (e) => setTimeRange(e.key),
            }}>
            <Button>
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

export default ContentReports;
