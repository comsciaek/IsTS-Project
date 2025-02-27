import axios from "axios";

/**
 * อัพโหลดรูปโปรไฟล์ไปยัง server
 * @param {File} file - ไฟล์รูปภาพที่ต้องการอัพโหลด
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<string>} - URL ของรูปโปรไฟล์ที่อัพโหลดสำเร็จ
 */
export const uploadProfilePicture = async (file, userId) => {
  try {
    const formData = new FormData();
    formData.append("profileImage", file);

    const token = localStorage.getItem("token");

    const response = await axios.post(
      `http://172.18.43.39:5000/api/users/profile/${userId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data && response.data.success) {
      // คืนค่า URL ของรูปโปรไฟล์
      return response.data.profilePictureUrl || response.data.url;
    } else {
      throw new Error(response.data?.message || "การอัพโหลดล้มเหลว");
    }
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error;
  }
};

/**
 * อัพเดตข้อมูลผู้ใช้ใน localStorage
 * @param {Object} userData - ข้อมูลผู้ใช้ที่ต้องการอัพเดต
 */
export const updateUserInLocalStorage = (userData) => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    const updatedUser = { ...storedUser, ...userData };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    return updatedUser;
  } catch (error) {
    console.error("Error updating user in localStorage:", error);
  }
};

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้จาก API
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Object>} - ข้อมูลผู้ใช้
 */
export const fetchUserProfile = async (userId) => {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      `http://172.18.43.39:5000/api/uploads/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data) {
      return response.data.user || response.data;
    } else {
      throw new Error("ไม่พบข้อมูลผู้ใช้");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};
