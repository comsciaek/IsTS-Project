import { useState, useEffect, useRef } from "react";
import {
  Form,
  Input,
  Button,
  Upload,
  Avatar,
  message,
  Row,
  Col,
  Spin,
} from "antd";
import {
  UploadOutlined,
  UserOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useUser } from "../../context/UserContext";

const AccountSettings = () => {
  const [form] = Form.useForm();
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);

  // เรียกใช้ context สำหรับข้อมูลผู้ใช้
  const { user, updateUser } = useUser();

  // เพิ่ม ref เพื่อติดตามสถานะการดึงข้อมูลจาก API
  const apiCallMadeRef = useRef(false);
  const initialRenderRef = useRef(true);

  // ดึงข้อมูลผู้ใช้จาก localStorage และ API
  useEffect(() => {
    // ถ้าเป็นการเรนเดอร์ครั้งแรก หรือยังไม่เคยเรียก API ให้ดำเนินการ
    if (initialRenderRef.current || !apiCallMadeRef.current) {
      const fetchUserProfile = async () => {
        setLoading(true);
        try {
          // ใช้ข้อมูลจาก context แทนการดึงจาก localStorage โดยตรง
          if (!user) {
            message.error("ไม่พบข้อมูลผู้ใช้");
            setLoading(false);
            return;
          }

          setUserData(user); // เก็บข้อมูลเบื้องต้นจาก context ก่อน

          const userId = user.id || user._id;

          if (!userId) {
            message.error("ไม่พบ ID ของผู้ใช้");
            setLoading(false);
            return;
          }

          // ตั้งค่ารูปโปรไฟล์
          if (user.profilePicture) {
            setProfilePic(user.profilePicture);
          }

          // ตั้งค่าข้อมูลเริ่มต้นในฟอร์มจากข้อมูลที่มีอยู่ใน context
          form.setFieldsValue({
            firstName: user.firstName || user.name?.split(" ")[0] || "",
            lastName: user.lastName || user.name?.split(" ")[1] || "",
            employeeId: user.employeeId || "",
            department: user.department || "",
            position: user.position || "",
            email: user.email || "",
            phoneNumber: user.phoneNumber || "",
          });

          // ดึงข้อมูลจาก API เฉพาะเมื่อยังไม่เคยทำการ API call
          if (!apiCallMadeRef.current) {
            try {
              const token = localStorage.getItem("token");
              const response = await axios.get(
                `http://172.18.43.39:5000/api/users/profile/${userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              console.log("API response:", response.data);

              if (response.data) {
                // รองรับทั้งกรณี { user: {...} } และ { ... }
                const apiUser = response.data.user || response.data;

                // อัพเดทข้อมูลผู้ใช้ด้วยข้อมูลล่าสุดจาก API
                setUserData((prev) => ({ ...prev, ...apiUser }));

                // ตั้งค่าข้อมูลเริ่มต้นในฟอร์มจากข้อมูล API
                form.setFieldsValue({
                  firstName:
                    apiUser.firstName ||
                    apiUser.name?.split(" ")[0] ||
                    user.firstName ||
                    "",
                  lastName:
                    apiUser.lastName ||
                    apiUser.name?.split(" ")[1] ||
                    user.lastName ||
                    "",
                  employeeId: apiUser.employeeId || user.employeeId || "",
                  department: apiUser.department || user.department || "",
                  position: apiUser.position || user.position || "",
                  email: apiUser.email || user.email || "",
                  phoneNumber: apiUser.phoneNumber || user.phoneNumber || "",
                });

                // ตั้งค่ารูปโปรไฟล์จาก API
                if (apiUser.profilePicture) {
                  setProfilePic(apiUser.profilePicture);
                }

                // เราใช้ useRef แทนที่จะอัพเดต context ในที่นี้
                // นี่เป็นสาเหตุของการ loop
                // updateUser(apiUser); <- สาเหตุของการ loop
              }

              // ทำเครื่องหมายว่าได้เรียก API แล้ว
              apiCallMadeRef.current = true;
            } catch (apiError) {
              console.error("API Error:", apiError);
              message.warning(
                "ไม่สามารถดึงข้อมูลเพิ่มเติมจาก API ได้ จะใช้ข้อมูลเดิมที่มีอยู่"
              );

              // ถึงแม้จะเกิด error ก็ถือว่าได้พยายามเรียก API แล้ว
              apiCallMadeRef.current = true;
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          message.error("ไม่สามารถดึงข้อมูลโปรไฟล์ได้");
        } finally {
          setLoading(false);
          initialRenderRef.current = false;
        }
      };

      fetchUserProfile();
    }

    // ไม่ต้องมี return สำหรับ cleanup function เนื่องจากเราใช้ ref
    // ถ้ามีการ cleanup อาจทำให้ ref reset และเกิด loop ใหม่
  }, [form, user]); // ลบ updateUser ออกจาก dependencies

  const handleUpload = async (info) => {
    if (info.file.status !== "uploading") {
      console.log(info.file, info.fileList);
    }

    if (info.file.status === "done") {
      try {
        // สร้าง FormData สำหรับอัพโหลดไฟล์
        const formData = new FormData();
        formData.append("profilePicture", info.file.originFileObj);

        // ดึง token และ user ID
        const token = localStorage.getItem("token");
        const userId = userData.id || userData._id;

        // ส่งไฟล์ไปยัง endpoint สำหรับอัพโหลดรูปโปรไฟล์
        try {
          const response = await axios.post(
            `http://172.18.43.39:5000/api/users/${userId}/upload-profile-picture`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.data && response.data.success) {
            // อัพเดต URL รูปโปรไฟล์จาก response
            const profilePictureUrl =
              response.data.profilePictureUrl || response.data.url;
            setProfilePic(profilePictureUrl);
            message.success(`${info.file.name} อัปโหลดสำเร็จ`);

            // อัพเดตข้อมูล user ใน context ด้วย URL รูปใหม่
            updateUser({ profilePicture: profilePictureUrl });

            // อัพเดต state
            setUserData((prevData) => ({
              ...prevData,
              profilePicture: profilePictureUrl,
            }));
          } else {
            message.error(`${info.file.name} อัปโหลดไม่สำเร็จ`);
          }
        } catch (apiError) {
          console.error("API Error during upload:", apiError);
          message.warning(
            "ไม่สามารถอัพโหลดไปยังเซิร์ฟเวอร์ได้ แสดงภาพชั่วคราว"
          );

          // ใช้ URL ชั่วคราว
          const localUrl = URL.createObjectURL(info.file.originFileObj);
          setProfilePic(localUrl);

          // บันทึกและอัพเดต context ด้วย URL ภาพชั่วคราว
          updateUser({ profilePicture: localUrl });
        }
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        message.error(`${info.file.name} อัปโหลดไม่สำเร็จ: ${error.message}`);

        // ถ้าอัพโหลดไม่สำเร็จ เราจะใช้ URL ชั่วคราวเพื่อแสดงผลในหน้าเว็บ
        const localUrl = URL.createObjectURL(info.file.originFileObj);
        setProfilePic(localUrl);
      }
    } else if (info.file.status === "error") {
      message.error(
        `${info.file.name} อัปโหลดล้มเหลว: ${info.file.error.message}`
      );
    }
  };

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);

      if (!userData || !(userData.id || userData._id)) {
        message.error("ไม่พบข้อมูลผู้ใช้สำหรับอัปเดต");
        return;
      }

      const userId = userData.id || userData._id;
      const token = localStorage.getItem("token");
      const updatedData = {
        ...values,
        profilePicture: profilePic,
      };

      // อัพเดตข้อมูลผู้ใช้ผ่าน API
      try {
        const response = await axios.put(
          `http://172.18.43.39:5000/api/users/profile/${userId}`,
          updatedData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data && response.data.success) {
          message.success("อัปเดตโปรไฟล์สำเร็จ!");
        }
      } catch (apiError) {
        console.error("API Error during profile update:", apiError);
        message.warning(
          "ไม่สามารถอัพเดตโปรไฟล์ไปยังเซิร์ฟเวอร์ได้ บันทึกเฉพาะในเบราว์เซอร์"
        );
      }

      // อัพเดตชื่อเต็ม
      const fullName = `${values.firstName} ${values.lastName}`.trim();

      // อัพเดตข้อมูลใน context
      updateUser({
        firstName: values.firstName,
        lastName: values.lastName,
        name: fullName,
        phoneNumber: values.phoneNumber,
        profilePicture: profilePic,
      });

      // อัพเดต state
      setUserData((prevData) => ({
        ...prevData,
        firstName: values.firstName,
        lastName: values.lastName,
        name: fullName,
        phoneNumber: values.phoneNumber,
        profilePicture: profilePic,
      }));

      message.success("บันทึกข้อมูลเรียบร้อย!");
    } catch (error) {
      console.error("Error updating user profile:", error);
      message.error(`ไม่สามารถอัปเดตโปรไฟล์ได้: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        <p style={{ marginTop: 16 }}>กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  return (
    <>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item label="รูปโปรไฟล์" style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
            <Avatar
              size={100}
              src={profilePic}
              icon={<UserOutlined />}
              style={{ marginBottom: "16px" }}
            />
            <Upload
              name="profilePic"
              showUploadList={false}
              customRequest={({ onSuccess }) => {
                setTimeout(() => {
                  onSuccess("ok");
                }, 0);
              }}
              onChange={handleUpload}>
              <Button icon={<UploadOutlined />} style={{ marginTop: 8 }}>
                เปลี่ยนรูปโปรไฟล์
              </Button>
            </Upload>
          </div>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label="ชื่อจริง"
              rules={[{ required: true, message: "กรุณาใส่ชื่อจริง!" }]}>
              <Input size={"large"} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="lastName"
              label="นามสกุล"
              rules={[{ required: true, message: "กรุณาใส่นามสกุล!" }]}>
              <Input size={"large"} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="employeeId" label="รหัสพนักงาน">
          <Input
            size={"large"}
            disabled
            placeholder="รหัสพนักงานจะไม่สามารถเปลี่ยนแปลงได้"
          />
        </Form.Item>

        <Form.Item name="department" label="แผนก">
          <Input
            size={"large"}
            disabled
            placeholder="แผนกจะไม่สามารถเปลี่ยนแปลงได้"
          />
        </Form.Item>

        <Form.Item name="position" label="ตำแหน่ง">
          <Input
            size={"large"}
            disabled
            placeholder="ตำแหน่งจะไม่สามารถเปลี่ยนแปลงได้"
          />
        </Form.Item>

        <Form.Item name="email" label="อีเมล">
          <Input
            size={"large"}
            disabled
            placeholder="อีเมลจะไม่สามารถเปลี่ยนแปลงได้"
          />
        </Form.Item>

        <Form.Item
          name="phoneNumber"
          label="เบอร์โทรศัพท์"
          rules={[
            { required: true, message: "กรุณาใส่เบอร์โทรศัพท์!" },
            {
              pattern: /^[0-9]{9,10}$/,
              message: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก",
            },
          ]}>
          <Input size={"large"} placeholder="กรอกเบอร์โทรศัพท์" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}>
            บันทึกการเปลี่ยนแปลง
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default AccountSettings;
