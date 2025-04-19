import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { LogOut, Menu, ChevronDown, Cloud } from "lucide-react";
const Navbar = ({ onLogout }) => {
  const [userData, setUserData] = useState({
    username: "",
    email: ""
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  useEffect(() => {
    const fetchUserData = () => {
      try {
        // Try to get data from localStorage
        let username = localStorage.getItem("username");
        let email = localStorage.getItem("email");

        // If not found, try to get from token
        if (!username || !email) {
          const token = localStorage.getItem("token");
          if (token) {
            const decoded = jwtDecode(token);
            username = decoded.username || decoded.name;
            email = decoded.email;
            
            // Store for future use
            localStorage.setItem("username", username);
            localStorage.setItem("email", email);
          }
        }

        setUserData({
          username: username || "Guest",
          email: email || "No email provided"
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <nav className="h-[72px] bg-white backdrop-blur-lg bg-opacity-95 border-b border-gray-200 px-4 sm:px-6 lg:px-8 fixed w-full top-0 z-50">
      <div className="h-full max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex-1 flex items-center justify-start">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 shadow-lg">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                ZataExplorer
              </h1>
              <p className="text-xs text-gray-500">Cloud Storage</p>
            </div>
          </div>
        </div>
  
        {/* Center Section - can be used for navigation or search */}
        <div className="flex-1 flex justify-center">
          {/* Add any center content here if needed */}
        </div>
  
        {/* Profile Section */}
        <div className="flex-1 flex items-center justify-end">
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                {userData.username ? userData.username.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">{userData.username}</p>
                <p className="text-xs text-gray-500 truncate max-w-[150px]">{userData.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
  
            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userData.username}</p>
                  <p className="text-xs text-gray-500 truncate">{userData.email}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


