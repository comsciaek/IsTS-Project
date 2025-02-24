import { Form, Input, Button, message } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import axios from "axios";
import { useState, useEffect } from "react";
import process from "process";
import PropTypes from "prop-types";
import {jwtDecode} from "jwt-decode"; // Correct import

const ResetPasswordForm = ({ token, setStep }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const decodedToken = jwtDecode(token); // Use jwtDecode correctly
      setEmail(decodedToken.email);
    } catch (err) {
      console.log("Error:", err);
      setError("Invalid token");
    }
  }, [token]);

  const resetPassword = async (values) => {
    if (values.password !== values.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/reset-password`, {
        token,
        email,
        newPassword: values.password,
      });
      message.success("เปลี่ยนรหัสผ่านสำเร็จ!");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={resetPassword} layout="vertical">
      <Form.Item
        name="password"
        label="รหัสผ่านใหม่"
        rules={[
          {
            required: true,
            min: 8,
            message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
          },
          {
            pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
            message: "รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข",
          },
        ]}>
        <Input.Password
          prefix={<KeyOutlined />}
          placeholder="กรอกรหัสผ่านใหม่"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="ยืนยันรหัสผ่าน"
        dependencies={["password"]}
        rules={[
          {
            required: true,
            message: "กรุณากรอกรหัสผ่านอีกครั้ง",
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("รหัสผ่านไม่ตรงกัน"));
            },
          }),
        ]}>
        <Input.Password prefix={<KeyOutlined />} placeholder="ยืนยันรหัสผ่าน" />
      </Form.Item>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      )}

      <Button type="primary" htmlType="submit" loading={loading} block>
        บันทึกรหัสผ่านใหม่
      </Button>
    </Form>
  );
};

ResetPasswordForm.propTypes = {
  token: PropTypes.string.isRequired,
  setStep: PropTypes.func.isRequired,
};

export default ResetPasswordForm;
