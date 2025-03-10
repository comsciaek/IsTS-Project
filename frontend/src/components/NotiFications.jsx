import { BellOutlined } from "@ant-design/icons";
import { Badge, Dropdown, List, Avatar, Button } from "antd";
import { useState } from "react";

const NotiFications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "New comment on your post",
      avatar: "https://example.com/path/to/your/image.jpg",
    },
    {
      id: 2,
      message: "You have a new follower",
      avatar: "https://example.com/path/to/your/image.jpg",
    },
    {
      id: 3,
      message: "Your password was changed",
      avatar: "https://example.com/path/to/your/image.jpg",
    },
    {
      id: 4,
      message: "New message from John",
      avatar: "https://example.com/path/to/your/image.jpg",
    },
  ]);
  const [unreadCount, setUnreadCount] = useState(notifications.length);

  const handleClearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleMenuClick = () => {
    setUnreadCount(0);
  };

  const notificationMenu = (
    <div style={{ width: "250px", margin: "0 auto" }}>
      <List
        itemLayout="horizontal"
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar src={item.avatar} />}
              title={item.message}
            />
          </List.Item>
        )}
      />
      <Button
        type="text"
        onClick={handleClearNotifications}
        style={{ width: "100%", textAlign: "center" }}>
        Clear All
      </Button>
    </div>
  );

  return (
    <Dropdown
      menu={{ items: [{ key: "notifications", label: notificationMenu }] }}
      trigger={["click"]}
      placement="bottomRight"
      onOpenChange={handleMenuClick}>
      <Badge count={unreadCount} overflowCount={99}>
        <BellOutlined
          style={{ fontSize: "24px", cursor: "pointer", color: "white" }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotiFications;