import { Button, Form, Input, Select, message } from "antd";
import { useNavigate } from "react-router";
import { useState } from "react";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons"; // เพิ่มการ import ไอคอน
import axios from "axios";

const formItemLayout = {
  labelCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 24,
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

const RegisterForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    department: "",
    position: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });

  // เพิ่ม state สำหรับการแสดง/ซ่อนรหัสผ่าน
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (value, name) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const departmentOptions = [
    { label: "HR", value: "HR" },
    { label: "Engineering", value: "Engineering" },
    { label: "Marketing", value: "Marketing" },
    { label: "Sales", value: "Sales" },
    { label: "Finance", value: "Finance" },
    { label: "IT", value: "IT" },
    { label: "Operation", value: "Operation" },
    { label: "Admin", value: "Admin" },
    { label: "Others", value: "Others" },
  ];

  const positionOptions = [
    { label: "Manager", value: "Manager" },
    { label: "Team Lead", value: "Team Lead" },
    { label: "Senior Developer", value: "Senior Developer" },
    { label: "Junior Developer", value: "Junior Developer" },
    { label: "Intern", value: "intern" },
    // Add more positions as needed
  ];

  const employeeIdOptions = [
    { label: "101", value: "101" },
    { label: "102", value: "102" },
    { label: "103", value: "103" },
    { label: "104", value: "104" },
    { label: "105", value: "105" },
    { label: "106", value: "106" },
    { label: "107", value: "107" },
    { label: "108", value: "108" },
    { label: "109", value: "109" },
    { label: "110", value: "110" },
    { label: "111", value: "111" },
    { label: "112", value: "112" },
    { label: "113", value: "113" },
    { label: "114", value: "114" },
    { label: "115", value: "115" },
    { label: "116", value: "116" },
    { label: "117", value: "117" },
    { label: "118", value: "118" },
    { label: "119", value: "119" },
    { label: "120", value: "120" },

    // Add more employee IDs as needed
  ];

  const checkRequiredFields = () => {
    const {
      firstName,
      lastName,
      employeeId,
      department,
      position,
      email,
      password,
      confirmPassword,
      phoneNumber,
    } = formData;
    if (
      !firstName ||
      !lastName ||
      !employeeId ||
      !department ||
      !position ||
      !email ||
      !password ||
      !confirmPassword ||
      !phoneNumber
    ) {
      message.error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!checkRequiredFields()) return;

    try {
      const dataToSubmit = { ...formData };

      // console.log(" Sending data:", dataToSubmit);

      const response = await axios.post(
        "http://172.18.43.39:5000/api/auth/register",
        dataToSubmit,
        { headers: { "Content-Type": "application/json" } }
      );

      // console.log(" Response received:", response);

      if (response.status === 201) {
        message.success("ลงทะเบียนสำเร็จ! กำลังนำทางไปยังหน้าล็อกอิน...");
        navigate("/login");
      } else {
        message.error("เกิดข้อผิดพลาดขณะส่งแบบฟอร์ม กรุณาลองใหม่อีกครั้ง");
      }
    } catch (error) {
      console.error(" Error submitting form:", error);

      if (error.response) {
        console.error(" Server Response:", error.response.data);

        const errorMessage =
          error.response.data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
        message.error(errorMessage);
      } else {
        message.error(
          "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาตรวจสอบการเชื่อมต่อ"
        );
      }
    }
  };

  return (
    <Form
      className="w-80 max-w-md p-4"
      {...formItemLayout}
      form={form}
      initialValues={{
        variant: "filled",
      }}>
      <div className="mt-2 mb-10 flex justify-center items-center">
        <span className="text-black text-[22px] font-normal">
          Register
          <img
            src="/src/assets/jib-logo-2.png"
            className="w-10 inline-block ml-2 "
          />
        </span>
      </div>
      <div className="overflow-auto" style={{ height: "400px" }}>
        <div className="flex flex-col">
          <p>ชื่อ</p>
          <Form.Item
            name="firstName"
            rules={[{ required: true, message: "กรุณากรอกชื่อ!" }]}>
            <Input
              placeholder="ชื่อ"
              size="large"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
            />
          </Form.Item>
          <p>นามสกุล</p>
          <Form.Item
            name="lastName"
            rules={[{ required: true, message: "กรุณากรอกนามสกุล!" }]}>
            <Input
              placeholder="นามสกุล"
              size="large"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
            />
          </Form.Item>
        </div>
        <div className="flex flex-col">
          <p>รหัสพนักงาน</p>
          <Form.Item
            name="employeeId"
            rules={[{ required: true, message: "กรุณาเลือกรหัสพนักงาน!" }]}>
            <Select
              showSearch
              placeholder="กรุณาเลือกรหัสพนักงาน"
              optionFilterProp="label"
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? "")
                  .toLowerCase()
                  .localeCompare((optionB?.label ?? "").toLowerCase())
              }
              size="large"
              value={formData.employeeId}
              onChange={(value) => handleSelectChange(value, "employeeId")}
              options={employeeIdOptions}
            />
          </Form.Item>
          <p>เลือกแผนก</p>
          <Form.Item
            name="department"
            rules={[{ required: true, message: "กรุณาเลือกแผนก!" }]}>
            <Select
              showSearch
              placeholder="กรุณาเลือกแผนก"
              optionFilterProp="label"
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? "")
                  .toLowerCase()
                  .localeCompare((optionB?.label ?? "").toLowerCase())
              }
              size="large"
              value={formData.department}
              onChange={(value) => handleSelectChange(value, "department")}
              options={departmentOptions}
            />
          </Form.Item>
          <p>เลือกตำแหน่ง</p>
          <Form.Item
            name="position"
            rules={[{ required: true, message: "กรุณาเลือกตำแหน่ง!" }]}>
            <Select
              showSearch
              placeholder="กรุณาเลือกตำแหน่ง"
              optionFilterProp="label"
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? "")
                  .toLowerCase()
                  .localeCompare((optionB?.label ?? "").toLowerCase())
              }
              size="large"
              value={formData.position}
              onChange={(value) => handleSelectChange(value, "position")}
              options={positionOptions}
            />
          </Form.Item>
          <p>เบอร์โทรศัพท์</p>
          <Form.Item
            name="phoneNumber"
            rules={[{ required: true, message: "กรุณากรอกเบอร์โทรศัพท์!" }]}>
            <Input
              type="phoneNumber"
              placeholder="กรอกเบอร์โทรศัพท์"
              size="large"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </Form.Item>
          <p>Email</p>
          <Form.Item
            name="email"
            rules={[{ required: true, message: "กรุณากรอกอีเมล!" }]}>
            <Input
              type="email"
              placeholder="email@gmail.com"
              size="large"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </Form.Item>
          <p>รหัสผ่าน</p>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน!" }]}>
            <Input
              type={passwordVisible ? "text" : "password"}
              placeholder="กรอกรหัสผ่าน"
              size="large"
              name="password"
              value={formData.password}
              onChange={handleChange}
              suffix={
                <span
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  style={{ cursor: "pointer" }}>
                  {passwordVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </span>
              }
            />
          </Form.Item>
          <p>ยืนยันรหัสผ่าน</p>
          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "กรุณายืนยันรหัสผ่านใหม่!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("รหัสผ่านไม่ตรงกัน!"));
                },
              }),
            ]}>
            <Input
              type={confirmPasswordVisible ? "text" : "password"}
              placeholder="ยืนยันรหัสผ่าน"
              size="large"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              suffix={
                <span
                  onClick={() =>
                    setConfirmPasswordVisible(!confirmPasswordVisible)
                  }
                  style={{ cursor: "pointer" }}>
                  {confirmPasswordVisible ? (
                    <EyeInvisibleOutlined />
                  ) : (
                    <EyeOutlined />
                  )}
                </span>
              }
            />
          </Form.Item>
        </div>
      </div>
      <div className="gap-2 grid lg:grid-cols-2 mt-15 mb-6">
        <Button onClick={() => navigate("/login")} size={"large"}>
          Cancel
        </Button>
        <Button
          type="primary"
          style={{
            backgroundColor: "#262362",
            transition: "background-color 0.3s",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}
          size={"large"}
          onClick={handleSubmit}>
          Submit
        </Button>
      </div>
    </Form>
  );
};
export default RegisterForm;
