import {
  
  Routes,
  Route,
  useParams,
} from "react-router"; // Correct import
import Login from "./pages/Login";
import RootLayout from "./layout/RootLayout";
import Register from "./pages/Register";
import NotFound from "./components/NotFound";
import Issuestable from "./pages/Issuestable";
import DashboardLayout from "./layout/DashboardLayout";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Reports from "./pages/Reports";
import ForgotPassword from "./pages/ForgotPassword";
import Overview from "./pages/Overview";
import ManageRoles from "./pages/ManageRoles";
import ResetPasswordForm from "./pages/ResetPasswordForm";

const ResetSetup = () => {
  const { "*": token } = useParams();

  return <ForgotPassword token={token} />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        {/* /* Public Routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPasswordForm />} />
        <Route path="/reset/*" element={<ResetSetup />} />
        {/* Protected Routes */}
        <Route element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="table" element={<Issuestable />} />
          <Route path="messages" element={<Messages />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="manage-roles" element={<ManageRoles />} />
        </Route>
        {/* Catch-all Route */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
