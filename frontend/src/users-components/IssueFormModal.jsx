import { useEffect, useState } from "react";
import { useForm } from "antd/es/form/Form";
import { Modal, Form, Input, DatePicker, Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PropTypes from "prop-types";

const IssueFormModal = ({ visible, onOk, onCancel, editingRecord }) => {
  const [form] = useForm();
  const [fileList, setFileList] = useState([]);

  // ดึงข้อมูลผู้ใช้จาก UserContext

  useEffect(() => {
    if (editingRecord) {
      // ดึงข้อมูลจากคำร้องที่ต้องการแก้ไข - ใช้ชื่อฟิลด์ตามที่ API ส่งมา
      const topicValue =
        editingRecord.topic || editingRecord.title || editingRecord.issue || "";

      // แปลงวันที่จากข้อมูลที่มีอยู่เป็น dayjs object สำหรับ DatePicker
      const issueDate =
        editingRecord.date ||
        editingRecord.createdAt ||
        editingRecord.updatedAt;

      form.setFieldsValue({
        topic: topicValue, // ใช้ฟิลด์ 'topic' ตามที่ backend ใช้
        description: editingRecord.description || "",
        date: issueDate ? dayjs(issueDate) : dayjs(),
      });

      // ตั้งค่าไฟล์ที่แนบมากับคำร้อง (ถ้ามี)
      if (editingRecord.file) {
        // กรณีที่มีไฟล์เดียว (เพราะ backend รองรับแค่ 1 ไฟล์)
        const fileName = editingRecord.file.split("/").pop(); // ดึงชื่อไฟล์จาก URL
        setFileList([
          {
            uid: "1",
            name: fileName,
            status: "done",
            url: editingRecord.file,
          },
        ]);
      } else {
        setFileList([]);
      }
    } else {
      // กรณีสร้างใหม่
      form.resetFields();
      form.setFieldsValue({
        date: dayjs(),
      });
      setFileList([]);
    }
  }, [editingRecord, form]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        // สร้าง FormData สำหรับส่งไฟล์และข้อมูลอื่นๆ
        const formData = new FormData();

        // เพิ่มข้อมูลตามที่ API ต้องการ
        formData.append("topic", values.topic); // ใช้ชื่อฟิลด์ 'topic' ตามที่ backend ใช้
        formData.append("description", values.description);

        // เพิ่มวันที่ในรูปแบบที่ API ต้องการ (เช่น ISO string)
        if (values.date) {
          formData.append("date", values.date.format("YYYY-MM-DD"));
        }

        // เพิ่มไฟล์ (backend รองรับ 1 ไฟล์)
        if (fileList.length > 0 && fileList[0].originFileObj) {
          formData.append("file", fileList[0].originFileObj);
        }

        // ส่งข้อมูลกลับไปที่คอมโพเนนต์หลัก
        onOk(formData);
      })
      .catch((info) => {
        console.log("Form validation failed:", info);
      });
  };

  // จำกัดให้อัพโหลดได้แค่ 1 ไฟล์ตามที่ backend รองรับ
  const handleFileChange = (info) => {
    // ถ้ามีไฟล์ใหม่อัพโหลด จะแทนที่ไฟล์เก่า
    if (info.fileList.length > 1) {
      info.fileList = [info.fileList[info.fileList.length - 1]];
    }

    // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
    if (info.file.size && info.file.size > 5 * 1024 * 1024) {
      message.error("ไฟล์ต้องมีขนาดไม่เกิน 5MB!");
      // ลบไฟล์ที่ขนาดเกิน
      info.fileList = info.fileList.filter((f) => f.uid !== info.file.uid);
    }

    setFileList(info.fileList);
  };

  // ตรวจสอบประเภทของไฟล์ว่าตรงตามที่ API รองรับหรือไม่
  const beforeUpload = (file) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      message.error(
        "สามารถอัพโหลดเฉพาะไฟล์รูปภาพ (JPEG/PNG), PDF, หรือ Word (DOC/DOCX) เท่านั้น"
      );
      return false;
    }

    return false; // ป้องกันการอัพโหลดอัตโนมัติ
  };

  return (
    <Modal
      title={editingRecord ? "แก้ไขคำร้อง" : "เพิ่มคำร้องใหม่"}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}>
      <Form form={form} layout="vertical">
        <Form.Item
          name="topic" // แก้ไขเป็น 'topic' ตาม backend
          label="หัวข้อคำร้อง"
          rules={[{ required: true, message: "กรุณากรอกหัวข้อคำร้อง!" }]}>
          <Input placeholder="กรอกหัวข้อคำร้อง" />
        </Form.Item>

        <Form.Item
          name="description"
          label="รายละเอียด"
          rules={[{ required: true, message: "กรุณากรอกรายละเอียด!" }]}>
          <Input.TextArea rows={4} placeholder="กรอกรายละเอียดคำร้อง" />
        </Form.Item>

        <Form.Item
          name="date"
          label="วันที่"
          rules={[{ required: true, message: "กรุณาเลือกวันที่!" }]}>
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item label="แนบไฟล์">
          <Upload
            listType="picture"
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={beforeUpload}
            maxCount={1} // จำกัดจำนวนไฟล์ที่อัพโหลดได้
          >
            <Button icon={<UploadOutlined />}>เลือกไฟล์</Button>
          </Upload>
          <div className="mt-2 text-gray-400 text-xs">
            สามารถอัพโหลดไฟล์รูปภาพ (JPEG/PNG), PDF, หรือ Word (DOC/DOCX)
            ที่มีขนาดไม่เกิน 5MB
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

IssueFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  editingRecord: PropTypes.shape({
    issueId: PropTypes.string, // เพิ่ม issueId ตามที่ backend ใช้
    _id: PropTypes.string,
    id: PropTypes.string,
    topic: PropTypes.string, // เปลี่ยนเป็น topic ตามที่ backend ใช้
    title: PropTypes.string,
    issue: PropTypes.string,
    description: PropTypes.string,
    date: PropTypes.string,
    file: PropTypes.string, // เปลี่ยนจาก files เป็น file เพื่อให้ตรงกับ API
    status: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
  }),
};

export default IssueFormModal;
