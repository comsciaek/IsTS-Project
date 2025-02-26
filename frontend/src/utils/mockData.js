/**
 * ข้อมูลจำลองสำหรับใช้ทดสอบหน้า ManageRoles
 * สามารถใช้ในกรณีที่ API ยังไม่พร้อม
 */

// สร้างข้อมูลผู้ใช้จำลอง
export const generateMockUsers = (count = 50) => {
  const roles = ["User", "Admin", "SuperAdmin"];
  const departments = [
    "IT",
    "HR",
    "Finance",
    "Marketing",
    "Operations",
    "Sales",
    "Support",
  ];
  const domains = ["company.com", "example.com", "mail.com"];

  return Array.from({ length: count }, (_, i) => {
    const firstName = `User${i + 1}`;
    const lastName = `LastName${i + 1}`;
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const role =
      roles[Math.floor(Math.random() * (roles.length - (i < 5 ? 0 : 1)))]; // ให้มี SuperAdmin น้อยๆ
    const department =
      departments[Math.floor(Math.random() * departments.length)];
    const employeeId = `EMP${String(1000 + i).padStart(4, "0")}`;

    return {
      id: `user-${i + 1}`,
      employeeId,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}@${domain}`,
      role,
      department,
      createdAt: new Date(
        Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)
      ).toISOString(),
    };
  });
};

// ใช้ในกรณีที่ API ยังไม่พร้อม
export const mockUserAPI = {
  getUsers: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateMockUsers());
      }, 500);
    });
  },

  updateUserRole: (userId, role) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Updated user ${userId} role to ${role}`,
        });
      }, 300);
    });
  },

  deleteUser: (userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: `Deleted user ${userId}` });
      }, 300);
    });
  },
};
