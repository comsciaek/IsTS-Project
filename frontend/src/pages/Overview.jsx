import { Layout } from "antd";
import { useEffect } from "react";
import { message } from "antd";
import { useUser } from "../context/UserContext";
import { getUserDisplayName } from "../utils/userUtils";

import ContentOverview from "../components/contents/ContentOverview";

const { Content } = Layout;

const Overview = () => {
  const { user } = useUser();

  // แสดงข้อความต้อนรับเมื่อเข้าสู่หน้า Overview สำหรับ Admin/SuperAdmin
  useEffect(() => {
    if (user && !sessionStorage.getItem("welcomeShown")) {
      const displayName = getUserDisplayName(user);
      message.success(
        <span>
          ยินดีต้อน <b>{displayName}</b>! คุณพร้อมสำหรับการใช้งานระบบ
          Issue Support and Tracking แล้ว
        </span>,
        4
      );
      sessionStorage.setItem("welcomeShown", "true");
    }
  }, [user]);

  return (
    <Layout>
      <div className="pl-8 pt-5 pb-2">
        <h1 className="uppercase font-semibold tracking-[4px] text-2xl">
          Overview
        </h1>
      </div>
      <Content
        style={{
          padding: 24,
        }}>
        <ContentOverview timeRange="daily" />
      </Content>
    </Layout>
  );
};

export default Overview;
