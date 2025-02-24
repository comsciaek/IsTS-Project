import { useState, useEffect } from "react";
import {
  Layout,
  Table,
  Button,
  Space,
  Dropdown,
  message,
  theme,
  Avatar,
  Modal,
} from "antd";
import {
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  MessageOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import IssueModal from "./IssueModal"; // Import the new component
import { Link } from "react-router"; // Import Link from react-router-dom
import SearchColumn from "./SearchColumn";
import StatusColumn from "./StatusColumn";
import TableSkeleton from "../skeletons/TableSkeleton"; // Import TableSkeleton

const { Content } = Layout;
const { confirm } = Modal;

const ContentTable = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const fetchData = () => {
    setLoading(true);
    // Simulate data fetching
    setTimeout(() => {
      setDataSource(
        Array.from({ length: 46 }).map((_, i) => ({
          key: i,
          id: `101 ${i}`,
          issue: "Login failure",
          date: "2025-02-05",
          name: "John Doe",
          profilePic: `https://i.pravatar.cc/150?img=${i}`, // Add profile picture URL
          status: "เสร็จสิ้น", // Resolved in Thai
        }))
      );
      setLoading(false);
    }, 1000); // Simulate a 1-second loading time
  };

  useEffect(() => {
    fetchData();
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

  const handleDelete = (key) => {
    confirm({
      title: "Are you sure you want to delete this item?",
      onOk() {
        const newData = dataSource.filter((item) => item.key !== key);
        setDataSource(newData);
        message.success("Request deleted successfully");
      },
    });
  };

  const handleReject = (key) => {
    const newData = dataSource.map((item) => {
      if (item.key === key) {
        return { ...item, status: "ถูกปฏิเสธ" }; // Rejected in Thai
      }
      return item;
    });
    setDataSource(newData);
    message.success("Issue rejected successfully");
  };

  const showModal = (record) => {
    setEditingRecord(record);
    setIsModalVisible(true);
  };

  const handleOk = (values) => {
    const newData = [...dataSource];
    const formattedValues = {
      ...values,
      date: values.date ? values.date.format("YYYY-MM-DD") : null,
    };
    if (editingRecord) {
      const index = newData.findIndex((item) => item.key === editingRecord.key);
      newData[index] = { ...editingRecord, ...formattedValues };
    } else {
      const newId = `101 ${dataSource.length + 1}`; // Auto-generate Issue ID
      newData.push({ ...formattedValues, id: newId, key: dataSource.length });
    }
    setDataSource(newData);
    setIsModalVisible(false);
    setEditingRecord(null);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
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
      render: (text, record) => (
        <Space>
          <Avatar src={record.profilePic} />
          {text}
          <Link to={"/messages"}>
            <Button icon={<MessageOutlined />} />
          </Link>
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
      title: "Actions",
      key: "6",
      width: "10%",
      render: (_, record) => (
        <Space>
          <Button onClick={() => showModal(record)} icon={<EditOutlined />} />
          <Button onClick={() => handleDelete(record.key)} danger>
            <DeleteOutlined />
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: "1",
                  label: "Reject Issue",
                  danger: true,
                  onClick: () => handleReject(record.key),
                },
              ],
            }}>
            <Button icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <Layout>
      <Content
        style={{
          margin: "30px 16px",
          padding: 24,
          borderRadius: borderRadiusLG,
          background: colorBgContainer,
        }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}
            type="primary"
            onClick={handleAdd}
            style={{
              marginBottom: 16,
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
            }}>
            <PlusCircleOutlined /> เพิ่มปัญหา
          </Button>
          <Button
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}
            type="primary"
            onClick={fetchData}
            style={{
              marginBottom: 16,
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
            }}>
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
            scroll={{ x: "max-content", y: 450 }} // Add horizontal and vertical scroll
          />
        )}
        <IssueModal
          visible={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          editingRecord={editingRecord}
        />
      </Content>
    </Layout>
  );
};

export default ContentTable;
