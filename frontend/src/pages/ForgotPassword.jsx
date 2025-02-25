import { useState } from "react";
import { Form, Input, Button, Layout, Alert, Result } from "antd";
import { Link } from "react-router";
import axios from "axios";

const { Content } = Layout;

const ForgotPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        "http://172.18.43.39:5000/api/auth/forgot-password",
        {
          email: values.email,
        }
      );

      if (response.data.success) {
        setSubmitted(true);
      } else {
        setError(
          response.data.message ||
            "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ โปรดลองอีกครั้งในภายหลัง"
        );
      }

      setLoading(false);
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setError(
        error.response?.data?.message ||
          "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ โปรดลองอีกครั้งในภายหลัง"
      );
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout style={{ height: "100vh" }}>
        <Content
          style={{
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            padding: "30px",
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            maxWidth: "90%",
            width: "100%",
          }}>
          <Result
            status="success"
            title="ส่งลิงก์รีเซ็ตรหัสผ่านเรียบร้อยแล้ว"
            subTitle={`กรุณาตรวจสอบอีเมลของคุณสำหรับลิงก์เพื่อรีเซ็ตรหัสผ่าน ลิงก์จะหมดอายุใน 30 นาที`}
            extra={[
              <Button
                type="primary"
                key="login"
                onClick={() => (window.location.href = "/login")}
                style={{
                  backgroundColor: "#262362",
                  transition: "background-color 0.3s",
                  border: "none",
                }}>
                กลับไปยังหน้าเข้าสู่ระบบ
              </Button>,
            ]}
          />
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
          ลืมรหัสผ่าน
        </h2>

        <p style={{ marginBottom: "24px" }}>
          กรุณากรอกอีเมลที่คุณใช้ลงทะเบียน
          เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ
        </p>

        {error && (
          <Alert
            message="เกิดข้อผิดพลาด"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: "24px" }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <p className="mb-3">อีเมล</p>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "กรุณาใส่อีเมลของคุณ" },
              { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
            ]}>
            <Input size="large" placeholder="name@example.com" />
          </Form.Item>
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
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "#262362")
              }>
              ส่งลิงก์รีเซ็ตรหัสผ่าน
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <Link to="/login">กลับไปยังหน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    </Content>
  );
};

export default ForgotPassword;
