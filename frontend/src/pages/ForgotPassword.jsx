import { useState } from "react";
import { Card, Form, Input, Button, Steps, Alert, message } from "antd";
import {
  MailOutlined,
  KeyOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import ResetPasswordForm from "./ResetPasswordForm";
import { useSearchParams, useNavigate } from "react-router";

const ForgotPassword = () => {
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState(""); // Correct useState
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const requestPasswordReset = async (values) => {
    try {
      setLoading(true);
      setError(null);
      await axios.post("http://172.18.43.39:5000/api/auth/forgot-password", {
        email: values.email,
      });
      message.success("ลิงก์รีเซ็ตรหัสผ่านถูกส่งไปยังอีเมลของคุณ");
      setEmail(values.email);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      console.log("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        background: "#f0f2f5",
      }}>
      <Card title="ตั้งรหัสผ่านใหม่" style={{ width: 400 }}>
        <Steps current={step} style={{ marginBottom: 20 }}>
          <Steps.Step title="อีเมล" icon={<MailOutlined />} />
          <Steps.Step title="รหัสผ่านใหม่" icon={<KeyOutlined />} />
        </Steps>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 10 }}
          />
        )}

        {token ? (
          <ResetPasswordForm token={token} setStep={setStep} />
        ) : (
          step === 0 && (
            <Form form={form} onFinish={requestPasswordReset} layout="vertical">
              <Form.Item
                name="email"
                label="อีเมล"
                rules={[
                  {
                    required: true,
                    type: "email",
                    message: "กรุณากรอกอีเมลที่ถูกต้อง",
                  },
                ]}>
                <Input
                  prefix={<MailOutlined />}
                  placeholder="กรอกอีเมลของคุณ"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                ขอรีเซ็ตรหัสผ่าน
              </Button>
            </Form>
          )
        )}

        {step === 2 && (
          <div style={{ textAlign: "center" }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: "green" }} />
            <h3>เปลี่ยนรหัสผ่านสำเร็จ</h3>
            <p>คุณสามารถใช้รหัสผ่านใหม่ในการเข้าสู่ระบบได้</p>
            <Button type="primary" block onClick={() => navigate("/login")}>
              ไปยังหน้าเข้าสู่ระบบ
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
