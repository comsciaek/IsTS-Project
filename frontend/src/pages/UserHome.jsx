import { Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import IssuesReport from "../users-components/IssuesReport";

const UserHome = () => {
  return (
    <Layout className=" pt-5 pb-2">
      <Content
        style={{
          padding: 24,
        }}>
        <IssuesReport />
      </Content>
    </Layout>
  );
};

export default UserHome;
