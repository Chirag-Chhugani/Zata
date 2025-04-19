// Check if user is authenticated
export const isAuthenticated = () => {
    const token = localStorage.getItem("token");
    return !!token; // returns true if token exists
  };
  
  // Logout helper
  export const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("username");
  };
  