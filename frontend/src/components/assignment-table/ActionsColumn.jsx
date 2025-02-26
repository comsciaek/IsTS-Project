import { Dropdown, Button, Select, Space, Avatar } from "antd";
import { UsergroupAddOutlined, UserOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";

const itSupportOptions = [
  {
    name: "John Doe",
    value: "john_doe",
    avatar: "https://dummyimage.com/40x40/000/fff",
  },
  {
    name: "Jane Smith",
    value: "jane_smith",
    avatar: "https://dummyimage.com/40x40/000/fff",
  },
  {
    name: "Alice Johnson",
    value: "alice_johnson",
    avatar: "https://dummyimage.com/40x40/000/fff",
  },
  {
    name: "Bob Brown",
    value: "bob_brown",
    avatar: "https://dummyimage.com/40x40/000/fff",
  },
  {
    name: "Eve Wilson",
    value: "eve_wilson",
    avatar: "https://dummyimage.com/40x40/000/fff",
  },
  {
    name: "Chris Lee",
    value: "chris_lee",
    avatar: "https://dummyimage.com/40x40/000/fff",
  },
  {
    name: "David White",
    value: "david_white",
    avatar: "https://dummyimage.com/40x40/000/fff",
  },
  // Add more IT support members as needed
];

const ActionsColumn = ({
  record,
  handleAssign,
  dropdownVisible,
  setDropdownVisible,
}) => (
  <Dropdown
    overlay={
      <Select
        showSearch
        placeholder="Assign to"
        optionFilterProp="children"
        onChange={(value) => {
          const assignee = itSupportOptions.find(
            (option) => option.value === value
          );
          handleAssign(record.key, assignee);
          setDropdownVisible(null);
        }}
        filterOption={(input, option) =>
          (option?.name ?? "").toLowerCase().includes(input.toLowerCase())
        }
        options={itSupportOptions.map((option) => ({
          ...option,
          label: (
            <Space>
              <Avatar src={option.avatar} icon={<UserOutlined />} />
              {option.name}
            </Space>
          ),
        }))}
        style={{ width: 200 }}
      />
    }
    trigger={["hover"]}
    open={dropdownVisible === record.key}
    onOpenChange={(open) => setDropdownVisible(open ? record.key : null)}>
    <Button style={{ borderRadius: "50%", height: "32px", width: "30px" }}>
      <UsergroupAddOutlined />
    </Button>
  </Dropdown>
);

ActionsColumn.propTypes = {
  record: PropTypes.shape({
    key: PropTypes.string.isRequired,
  }).isRequired,
  handleAssign: PropTypes.func.isRequired,
  dropdownVisible: PropTypes.string,
  setDropdownVisible: PropTypes.func.isRequired,
};

export default ActionsColumn;
