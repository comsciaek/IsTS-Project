import axios from "axios";

/**
 * Test the login API with provided credentials and log response structure in detail
 *
 * @param {string} employeeId - The employee ID for login
 * @param {string} password - The password for login
 * @returns {Promise<object>} - The API response data
 */
export const testLoginAPI = async (employeeId, password) => {
  try {
    console.group("Login API Test");
    console.log("Testing login with:", { employeeId, password });

    const response = await axios.post(
      "http://172.18.43.39:5000/api/auth/login",
      {
        employeeId,
        password,
      }
    );

    console.log("✅ API Request Successful");
    console.log("Status:", response.status);

    // Detailed data structure analysis
    const data = response.data;
    console.log("Full response:", data);

    console.group("Response Structure Analysis");
    console.log("Keys at root level:", Object.keys(data));

    // Check for common properties
    console.log('Has "success" property:', "success" in data);
    console.log('Has "user" property:', "user" in data);
    console.log('Has "token" property:', "token" in data);

    // Try to find user data
    const possibleUserDataKeys = ["user", "userData", "data", "userInfo"];
    let foundUserData = null;

    for (const key of possibleUserDataKeys) {
      if (data[key]) {
        console.log(`✓ Found user data at "${key}" key:`, data[key]);
        foundUserData = data[key];
        break;
      }
    }

    if (!foundUserData) {
      console.warn("⚠️ No user data found in common locations");

      // Look for role information at root level
      if (data.role) {
        console.log("✓ Found role at root level:", data.role);
      }
    }

    console.groupEnd();
    console.groupEnd();

    return data;
  } catch (error) {
    console.group("Login API Test Failed");
    console.error("Error:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    console.groupEnd();
    throw error;
  }
};

/**
 * Use this function in the browser console to test the login API
 * Example: window.testLogin('admin', 'password123')
 */
export const setupLoginTest = () => {
  window.testLogin = async (employeeId, password) => {
    try {
      const result = await testLoginAPI(employeeId, password);
      console.log("Login test complete, see above for details");
      return result;
    } catch {
      console.error("Login test failed, see above for details");
    }
  };

  console.log(
    "Login API tester installed. Use window.testLogin(employeeId, password) to test the login API."
  );
};
