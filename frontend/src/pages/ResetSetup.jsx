import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Form, Input, Button, message, Layout, Alert, Spin } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import axios from "axios";
import {jwtDecode} from "jwt-decode"; // Correct import

const { Content } = Layout;

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const ResetSetup = () => {
  const query = useQuery();
  const token = query.get("token");
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  // Verify token on component mount
  useEffect(() => {
    if (typeof token === "string") {
      try {
        const decodedToken = jwtDecode(token); // Use jwtDecode correctly
        setEmail(decodedToken.email);
        setTokenValid(true);
      } catch (err) {
        console.log("Error:", err);
        setError("Invalid token");
      }
    } else {
      setError("Invalid token");
    }
    setLoading(false);
  }, [token]);

  const resetPassword = async (values) => {
    if (values.password !== values.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await axios.post("http://172.18.43.39:5000/api/auth/reset-password", {
        token,
        email,
        newPassword: values.password,
      });
      message.success("เปลี่ยนรหัสผ่านสำเร็จ!");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout style={{ height: "50vh" }}>
        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>กำลังตรวจสอบรหัสการรีเซ็ตรหัสผ่าน...</p>
        </Content>
      </Layout>
    );
  }

  return (
    <Content
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}>
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "30px",
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}>
        <h2 style={{ marginBottom: "24px", textAlign: "center" }}>
          รีเซ็ตรหัสผ่าน
        </h2>

        {error && (
          <Alert
            message="เกิดข้อผิดพลาด"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: "24px" }}
          />
        )}

        {tokenValid && !error && (
          <>
            <p style={{ marginBottom: "24px" }}>
              กรุณาสร้างรหัสผ่านใหม่สำหรับบัญชีของคุณ
            </p>
            <Form form={form} layout="vertical" onFinish={resetPassword}>
              <Form.Item
                name="password"
                label="รหัสผ่านใหม่"
                rules={[
                  { required: true, message: "กรุณาใส่รหัสผ่านใหม่" },
                  {
                    min: 6,
                    message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
                  },
                  {
                    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/,
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
                  { required: true, message: "กรุณายืนยันรหัสผ่าน" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("รหัสผ่านทั้งสองไม่ตรงกัน!")
                      );
                    },
                  }),
                ]}>
                <Input.Password
                  prefix={<KeyOutlined />}
                  placeholder="ยืนยันรหัสผ่าน"
                />
              </Form.Item>
              {error && (
                <div style={{ color: "red", marginBottom: "10px" }}>
                  {error}
                </div>
              )}
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{
                    backgroundColor: "#262362",
                    transition: "background-color 0.3s",
                    border: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#193CB8")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#262362")
                  }>
                    รีเซ็ตรหัสผ่าน
                  </Button>
                </Form.Item>
              </Form>
            </>
        )}

        {!tokenValid && !loading && !error && (
          <Alert
            message="ไม่พบโทเค็น"
            description="ไม่พบรหัสการรีเซ็ตรหัสผ่าน กรุณาขอลิงก์รีเซ็ตใหม่"
            type="warning"
            showIcon
            action={
              <Button
                size="small"
                type="primary"
                onClick={() => navigate("/forgot-password")}
                style={{
                  backgroundColor: "#262362",
                }}>
                ขอลิงก์ใหม่
              </Button>
            }
          />
        )}
      </div>
    </Content>
  );
};

export default ResetSetup;
