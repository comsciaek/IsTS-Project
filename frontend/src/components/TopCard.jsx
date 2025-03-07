import {
  IssuesCloseOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Statistic } from "antd";

const TopCard = () => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} md={12} lg={6}>
      <Card
        variant={true}
        style={{ background: "linear-gradient(to right, #91b3e6, #a2d1f3)" }}>
        <Statistic
          title={<span style={{ color: "#ffffff" }}>ปัญหาทั้งหมดตอนนี้</span>}
          valueStyle={{
            color: "#ffffff",
          }}
          prefix={<IssuesCloseOutlined />}
          value={0}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={12} lg={6}>
      <Card
        variant={true}
        style={{ background: "linear-gradient(to right, #e08b6d, #e5c05b)" }}>
        <Statistic
          title={<span style={{ color: "#ffffff" }}>ถูกปฏิเสธ</span>}
          valueStyle={{
            color: "#ffffff",
          }}
          prefix={<SyncOutlined />}
          value={0}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={12} lg={6}>
      <Card
        variant={true}
        style={{ background: "linear-gradient(to right, #4e8b2b, #8dbf4f)" }}>
        <Statistic
          title={<span style={{ color: "#ffffff" }}>เสร็จสิ้น</span>}
          valueStyle={{
            color: "#ffffff",
          }}
          prefix={<CheckCircleOutlined />}
          value={0}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={12} lg={6}>
      <Card
        variant={true}
        style={{ background: "linear-gradient(to right, #e05a5a, #a35dbb)" }}>
        <Statistic
          title={<span style={{ color: "#ffffff" }}>รอกำเนินการ</span>}
          valueStyle={{
            color: "#ffffff",
          }}
          prefix={<ClockCircleOutlined />}
          value={0}
        />
      </Card>
    </Col>
  </Row>
);

export default TopCard;
