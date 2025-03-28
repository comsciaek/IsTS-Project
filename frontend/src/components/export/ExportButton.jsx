import { useState } from "react";
import { Button, Dropdown, Menu, message } from "antd";
import { DownloadOutlined, LoadingOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import PropTypes from "prop-types";
import jsPDF from "jspdf";
import "jspdf-autotable";
import dayjs from "dayjs"; // เพิ่มการนำเข้า dayjs

const ExportButton = ({ data, filename, dateRange }) => {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState(null);

  // ฟังก์ชันสร้างชื่อไฟล์ที่มีวันที่ปัจจุบันและช่วงเวลาที่กรอง
  const generateFilename = () => {
    const date = new Date().toISOString().slice(0, 10);
    const baseFilename = filename || "report";
    const dateRangeText = dateRange ? `_${dateRange}` : "";
    return `${baseFilename}${dateRangeText}_${date}`;
  };

  // ฟังก์ชันสำหรับ Export เป็น Excel
  const exportToExcel = () => {
    try {
      setLoading(true);
      setExportType("excel");

      // ดึงข้อมูลที่ต้องการ Export และทำการกรองข้อมูลที่ไม่ต้องการออก
      const exportData = data.map((item) => {
        // ใช้ rest parameter เพื่อแยกข้อมูลที่ไม่ต้องการออก
        const {
          key, // eslint-disable-line no-unused-vars
          file, // eslint-disable-line no-unused-vars
          profileImage, // eslint-disable-line no-unused-vars
          originalData, // eslint-disable-line no-unused-vars
          submitter,
          assignedAdmin,
          ...rest
        } = item;

        // เพิ่มข้อมูลผู้แจ้งและผู้รับผิดชอบในรูปแบบที่อ่านง่าย
        return {
          ...rest,
          submitterName: submitter?.name || "-",
          submitterDepartment: submitter?.department || "-",
          assignedAdminName: assignedAdmin?.name || "-",
          // แปลงสถานะเป็นภาษาไทย
          status:
            item.status === "completed"
              ? "เสร็จสิ้น"
              : item.status === "rejected"
              ? "ถูกปฏิเสธ"
              : item.status,
          // แปลงวันที่เป็นรูปแบบที่อ่านง่าย
          date: dayjs(item.date).format("DD/MM/YYYY"),
        };
      });

      // สร้าง workbook และ worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reports");

      // สร้างไฟล์ Excel
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      // บันทึกไฟล์
      saveAs(blob, `${generateFilename()}.xlsx`);

      message.success("ส่งออกข้อมูลเป็น Excel สำเร็จ");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      message.error("ไม่สามารถส่งออกข้อมูลเป็น Excel ได้");
    } finally {
      setLoading(false);
      setExportType(null);
    }
  };

  // ฟังก์ชันสำหรับ Export เป็น CSV
  const exportToCSV = () => {
    try {
      setLoading(true);
      setExportType("csv");

      // ดึงข้อมูลที่ต้องการ Export
      const exportData = data.map((item) => {
        const {
          key, // eslint-disable-line no-unused-vars
          file, // eslint-disable-line no-unused-vars
          profileImage, // eslint-disable-line no-unused-vars
          originalData, // eslint-disable-line no-unused-vars
          submitter,
          assignedAdmin,
          ...rest
        } = item;

        return {
          ...rest,
          submitterName: submitter?.name || "-",
          submitterDepartment: submitter?.department || "-",
          assignedAdminName: assignedAdmin?.name || "-",
          status:
            item.status === "completed"
              ? "เสร็จสิ้น"
              : item.status === "rejected"
              ? "ถูกปฏิเสธ"
              : item.status,
          date: dayjs(item.date).format("DD/MM/YYYY"),
        };
      });

      // สร้าง workbook และ worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);

      // บันทึกไฟล์
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      saveAs(blob, `${generateFilename()}.csv`);

      message.success("ส่งออกข้อมูลเป็น CSV สำเร็จ");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      message.error("ไม่สามารถส่งออกข้อมูลเป็น CSV ได้");
    } finally {
      setLoading(false);
      setExportType(null);
    }
  };

  // ฟังก์ชันสำหรับ Export เป็น PDF
  const exportToPDF = () => {
    try {
      setLoading(true);
      setExportType("pdf");

      // สร้างเอกสาร PDF
      const doc = new jsPDF();

      // กำหนดหัวข้อเอกสาร
      const title = `รายงานคำร้อง${dateRange ? ` (${dateRange})` : ""}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(title, 105, 15, { align: "center" });

      // กำหนดวันที่รายงาน
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH")}`,
        105,
        22,
        { align: "center" }
      );

      // เตรียมข้อมูลสำหรับสร้างตาราง
      const tableColumn = [
        "ลำดับ",
        "หัวข้อ",
        "สถานะ",
        "วันที่",
        "ผู้แจ้ง",
        "แผนก",
        "ผู้รับผิดชอบ",
      ];
      const tableRows = data.map((item, index) => [
        index + 1,
        item.title,
        item.status === "completed" ? "เสร็จสิ้น" : "ถูกปฏิเสธ",
        dayjs(item.date).format("DD/MM/YYYY"),
        item.submitter?.name || "-",
        item.submitter?.department || "-",
        item.assignedAdmin?.name || "-",
      ]);

      // สร้างตาราง
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [38, 35, 98],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
      });

      // บันทึกไฟล์
      doc.save(`${generateFilename()}.pdf`);

      message.success("ส่งออกข้อมูลเป็น PDF สำเร็จ");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      message.error("ไม่สามารถส่งออกข้อมูลเป็น PDF ได้");
    } finally {
      setLoading(false);
      setExportType(null);
    }
  };

  // รายการเมนูสำหรับการ Export
  const menu = (
    <Menu
      items={[
        {
          key: "1",
          label: "ส่งออกเป็น Excel (.xlsx)",
          onClick: exportToExcel,
        },
        {
          key: "2",
          label: "ส่งออกเป็น CSV (.csv)",
          onClick: exportToCSV,
        },
        {
          key: "3",
          label: "ส่งออกเป็น PDF (.pdf)",
          onClick: exportToPDF,
        },
      ]}
    />
  );

  return (
    <Dropdown overlay={menu} placement="bottomRight">
      <Button
        type="primary"
        icon={loading ? <LoadingOutlined /> : <DownloadOutlined />}
        loading={loading}
        disabled={!data.length}
        style={{
          backgroundColor: "#262362",
          transition: "background-color 0.3s",
          border: "none",
          fontWeight: "bold",
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
        onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}>
        {loading
          ? `ส่งออกเป็น ${
              exportType === "excel"
                ? "Excel"
                : exportType === "csv"
                ? "CSV"
                : "PDF"
            }...`
          : "Export"}
      </Button>
    </Dropdown>
  );
};

ExportButton.propTypes = {
  data: PropTypes.array.isRequired,
  filename: PropTypes.string,
  dateRange: PropTypes.string,
};

export default ExportButton;
