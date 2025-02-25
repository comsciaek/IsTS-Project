import { Button, Result } from "antd";
import { useNavigate } from "react-router";

const NotAuthorized = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-100">
      <Result
        status="403"
        title="403"
        subTitle="Sorry, you are not authorized to access this page."
        extra={
          <Button
            style={{
              backgroundColor: "#262362",
              transition: "background-color 0.3s",
              border: "none",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#193CB8")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#262362")}
            type="primary"
            onClick={handleBackToHome}>
            Back Home
          </Button>
        }
      />
    </div>
  );
};

export default NotAuthorized;
