import { Button, Checkbox, Input, Form, message } from "antd";
import { Link } from "react-router";
import { useState } from "react";
import axios from "axios";
import {
  logNavigationAttempt,
  diagnoseNavigationIssues,
} from "../utils/debugUtils";

const onChange = (e) => {
  console.log(`checked = ${e.target.checked}`);
};

const formItemLayout = {
  labelCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 6,
    },
  },
  wrapperCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 24,
    },
  },
};

const LoginForm = () => {
  const [form] = Form.useForm();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const variant = Form.useWatch("variant", form);

  const handleLogin = () => {
    // Check for common navigation issues before attempting login
    diagnoseNavigationIssues();

    form
      .validateFields()
      .then((values) => {
        setLoading(true);
        setError("");

        // Call the API to login
        axios
          .post("http://172.18.43.39:5000/api/auth/login", values)
          .then((response) => {
            const data = response.data;
            console.log("Raw login response:", data); // Log the exact response structure

            if (data && data.success) {
              // Look for user data in different possible locations
              const userData = data.user || data.userData || data.data || {};

              console.log("User data extracted:", userData);

              // Check if we have enough user information to proceed
              if (
                !userData ||
                (typeof userData === "object" &&
                  Object.keys(userData).length === 0)
              ) {
                console.warn(
                  "Login successful but user data is missing or empty"
                );

                // Create minimal user data if needed
                const fallbackUserData = {
                  // Try to extract from other parts of the response or use defaults
                  employeeId: values.employeeId,
                  name: data.name || values.employeeId || "User",
                  role: data.role || "User", // Default to User role if missing
                };

                console.log("Using fallback user data:", fallbackUserData);

                // Store what we have
                localStorage.setItem("token", data.token || "");
                localStorage.setItem("user", JSON.stringify(fallbackUserData));

                message.success("Login successful!");

                // Log navigation attempt for debugging
                logNavigationAttempt("/user/home", fallbackUserData);

                // Redirect to user home as fallback
                console.log("Redirecting to user home (fallback)");
                window.location.href = "/user/home";
                return;
              }

              // If we got here, we have user data - store it
              localStorage.setItem("token", data.token || "");
              localStorage.setItem("user", JSON.stringify(userData));

              message.success(
                "Welcome to the Issue Support and Tracking System!"
              );

              // Determine where to redirect based on user role
              const role = userData.role;

              if (!role) {
                console.warn("User role is undefined, defaulting to User role");
                userData.role = "User"; // Set default role
                localStorage.setItem("user", JSON.stringify(userData)); // Update stored user data
              }

              // Log navigation attempt for debugging
              logNavigationAttempt(
                userData.role === "User" ? "/user/home" : "/",
                userData
              );

              console.log("User role:", userData.role);

              // Redirect based on role with safe checks
              if (userData.role === "User") {
                console.log("Redirecting to user home");
                window.location.href = "/user/home";
              } else if (
                userData.role === "Admin" ||
                userData.role === "SuperAdmin"
              ) {
                console.log("Redirecting to admin dashboard");
                window.location.href = "/";
              } else {
                console.log(
                  "Unknown role, redirecting to user home as fallback"
                );
                window.location.href = "/user/home";
              }
            } else {
              setError(data?.message || "Login failed");
            }
          })
          .catch((error) => {
            console.error("Error during login:", error);
            // Better error handling with more details
            if (error.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              console.error("Server error data:", error.response.data);
              console.error("Server error status:", error.response.status);
              setError(
                `Server error: ${
                  error.response.data?.message || error.response.status
                }`
              );
            } else if (error.request) {
              // The request was made but no response was received
              console.error("No response received:", error.request);
              setError(
                "No response from server. Please check your connection."
              );
            } else {
              // Something happened in setting up the request that triggered an Error
              console.error("Error message:", error.message);
              setError(`Error: ${error.message}`);
            }
          })
          .finally(() => {
            setLoading(false);
          });
      })
      .catch((errorInfo) => {
        console.log("Form validation failed:", errorInfo);
        setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      });
  };

  return (
    <Form
      className="w-80 max-w-md p-4"
      {...formItemLayout}
      form={form}
      variant={variant || "filled"}
      initialValues={{
        variant: "filled",
      }}
      onFinish={handleLogin} // เพิ่ม onFinish prop เพื่อให้ทำงานเมื่อกด Enter
    >
      <div className="text-2xl font-semibold mb-6 ">
        <span className="text-[#757575] text-sm font-normal">
          ยินดีต้อนรับ Issue Support and Tracking System!
        </span>

        <h1 className="text-[#333333] text-[22px] font-normal">
          ล็อกอินเข้าสู่ระบบ
        </h1>
      </div>

      {/* รหัสพนักงาน */}
      <div className="mb-4">
        <p className="mb-2">รหัสพนักงาน</p>
        <Form.Item
          name="employeeId"
          rules={[{ required: true, message: "กรุณากรอกรหัสพนักงาน" }]}>
          <Input type="text" placeholder="กรอกรหัสพนักงาน" size={"large"} />
        </Form.Item>
      </div>

      {/* รหัสผ่าน */}
      <div className="mb-4">
        <p className="mb-2">รหัสผ่าน</p>
        <Form.Item
          name="password"
          rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}>
          <Input type="password" placeholder="กรอกรหัสผ่าน" size={"large"} />
        </Form.Item>
      </div>

      {/* Remember Me */}
      <div className="mb-4">
        <Checkbox onChange={onChange}>Remember me</Checkbox>
      </div>

      {/* Error Message */}
      {error && <div className="mb-4 text-red-500">{error}</div>}

      {/* ปุ่ม Login */}
      <div className="mb-4">
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit" // เพิ่ม htmlType="submit" เพื่อระบุว่านี่เป็นปุ่ม submit ของแบบฟอร์ม
            style={{
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}
            size={"large"}
            block
            loading={loading}
            onClick={handleLogin}>
            Login
          </Button>
        </Form.Item>
      </div>

      {/* ลิงก์ Create Account และ Forgot Password */}
      <div className="flex justify-between text-sm text-blue-500 mt-5">
        <Link to="/register">ลงทะเบียน</Link>
        <Link to="/forgot-password">ลืมรหัสผ่าน?</Link>
      </div>
    </Form>
  );
};

export default LoginForm;
