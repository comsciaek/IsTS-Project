/**
 * Check if the user has the required role
 * @param {string} userRole - The current user's role
 * @param {string[]} allowedroles - Array of roles that are allowed
 * @returns {boolean} - True if user has permission, false otherwise
 */
export const hasRequiredRole = (userRole, allowedroles) => {
  if (!userRole || !allowedroles || allowedroles.length === 0) {
    return false;
  }

  return allowedroles.includes(userRole);
};

/**
 * Get redirect path based on user role
 * @param {string} role - The user's role
 * @returns {string} - The appropriate redirect path
 */
export const getRedirectPath = (role) => {
  switch (role) {
    case "SuperAdmin":
    case "Admin":
      return "/";
    case "User":
      return "/user/home";
    default:
      return "/login";
  }
};
