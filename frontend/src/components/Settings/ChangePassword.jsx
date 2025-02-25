import { Form, Input, Button, message } from "antd";
import axios from "axios"; // Import Axios

const ChangePassword = () => {
  const [form] = Form.useForm();

  const handleFinish = async (values) => {
    try {
      // Call the API to change the password
      const response = await axios.post(
        "http://172.18.43.39:5000/api/auth/change-password",
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmNewPassword: values.confirmNewPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`, // Add token to headers
          },
        }
      );

      if (response.data.message === "Password changed successfully") {
        message.success("เปลี่ยนรหัสผ่านสำเร็จ!");
        form.resetFields();
      } else {
        message.error(response.data.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.response?.status === 401) {
        message.error("Unauthorized: Please log in again.");
      } else {
        message.error(
          error.response?.data?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้"
        );
      }
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="currentPassword"
        label="รหัสผ่านปัจจุบัน"
        rules={[{ required: true, message: "กรุณาใส่รหัสผ่านปัจจุบัน!" }]}>
        <Input.Password size={"large"} />
      </Form.Item>
      <Form.Item
        name="newPassword"
        label="รหัสผ่านใหม่"
        rules={[{ required: true, message: "กรุณาใส่รหัสผ่านใหม่!" }]}>
        <Input.Password size={"large"} />
      </Form.Item>
      <Form.Item
        name="confirmNewPassword"
        label="ยืนยันรหัสผ่าน"
        dependencies={["newPassword"]}
        rules={[
          { required: true, message: "กรุณายืนยันรหัสผ่านใหม่!" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("newPassword") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("รหัสผ่านไม่ตรงกัน!"));
            },
          }),
        ]}>
        <Input.Password size={"large"} />
      </Form.Item>
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          style={{
            backgroundColor: "#262362",
            transition: "background-color 0.3s",
            border: "none",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}>
          Reset Password
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ChangePassword;
