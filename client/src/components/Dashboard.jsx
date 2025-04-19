import React, { useEffect, useState, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { logout } from "../utils/auth";
import { 
  FaFolder, 
  FaPlus, 
  FaUpload, 
  FaSearch, 
  FaClock, 
  FaEllipsisV, 
  FaTimes,
  FaTrash,
  FaPencilAlt,
  FaHdd,
  FaChartPie,
  FaRegFolder,
  FaRegClock
} from "react-icons/fa";
import Navbar from "./Navbar";

const COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

const Dashboard = () => {
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalStorage, setTotalStorage] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, folderId: null, folderName: "" });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [files, setFiles] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false); // State for the upload modal
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const dropdownRef = useRef(null);
const [notification, setNotification] = useState({ show: false, message: "", type: "" });
const [renameDialog, setRenameDialog] = useState({ 
  isOpen: false, 
  folderId: null, 
  folderName: "",
  newName: ""
});

  useEffect(() => {
    fetchFolders();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const foldersRes = await axios.get("http://localhost:5000/api/explorer/folders", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // Get detailed folder info with storage
      const foldersWithDetails = await Promise.all(
        foldersRes.data.folders.map(async (folder) => {
          try {
            const filesRes = await axios.get(
              `http://localhost:5000/api/explorer/folders/${folder.folder_name}/files`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
  
            const folderSize = filesRes.data.data.files.reduce((acc, file) => 
              acc + parseInt(file.file_size || 0), 0
            );
  
            return {
              ...folder,
              size: folderSize,
              fileCount: filesRes.data.data.files.length
            };
          } catch (err) {
            console.error(`Failed to fetch files for ${folder.folder_name}:`, err);
            return { ...folder, size: 0, fileCount: 0 };
          }
        })
      );
  
      // Calculate total storage
      const totalSize = foldersWithDetails.reduce((acc, folder) => 
        acc + (Number(folder.size) || 0), 0
      );
  
      setTotalStorage(totalSize);
      setFolders(foldersWithDetails);
      setError("");
    } catch (err) {
      console.error("Failed to fetch folders:", err);
      setError(err.response?.data?.message || "Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  // Create New Folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/api/explorer/folder",
        { folderName: newFolderName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newFolder = {
        ...res.data.folder,
        size: 0,
        created_at: res.data.folder.created_at || new Date().toISOString(),
      };

      setFolders([newFolder, ...folders]);
      setNewFolderName("");
      setShowDialog(false);
    } catch (err) {
      setError(err.response?.data?.message || "Folder creation failed");
    } finally {
      setLoading(false);
    }
  };

  // Add this function with the other handlers
const handleRenameFolder = async () => {
  if (!renameDialog.folderId || !renameDialog.newName.trim()) return;

  try {
    setLoading(true);
    await axios.put(
      `http://localhost:5000/api/explorer/folder/${renameDialog.folderId}/rename`,
      { newName: renameDialog.newName },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Update folders state with renamed folder
    setFolders(folders.map(folder => 
      folder.id === renameDialog.folderId 
        ? { ...folder, folder_name: renameDialog.newName }
        : folder
    ));

    setRenameDialog({ isOpen: false, folderId: null, folderName: "", newName: "" });
    showNotification("Folder renamed successfully", "success");
  } catch (err) {
    showNotification(err.response?.data?.message || "Failed to rename folder", "error");
  } finally {
    setLoading(false);
  }
};

  // Delete Folder
  const handleDeleteFolder = async () => {
    if (!deleteDialog.folderId) return;

    try {
      setLoading(true);
      await axios.delete(
        `http://localhost:5000/api/explorer/folder/${deleteDialog.folderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFolders(folders.filter((folder) => folder.id !== deleteDialog.folderId));
      
      const updatedFolders = folders.filter((folder) => folder.id !== deleteDialog.folderId);
      const newTotal = updatedFolders.reduce((acc, folder) => acc + folder.size, 0);
      setTotalStorage(newTotal);
      
      setDeleteDialog({ isOpen: false, folderId: null, folderName: "" });
      setError(""); 
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete folder");
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    logout();    
    navigate("/login");
  };

  // Toggle Dropdown
  const toggleDropdown = (e, folderId) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === folderId ? null : folderId);
  };

  // Open Delete Confirmation Dialog
  const openDeleteDialog = (e, folder) => {
    e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      folderId: folder.id,
      folderName: folder.folder_name,
    });
    setActiveDropdown(null);
  };

  // Filter folders based on search term
  const filteredFolders = folders.filter((folder) =>
    folder.folder_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format size in bytes
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Render storage usage pie chart
  const renderPieChart = () => {
    if (filteredFolders.length === 0 || totalStorage === 0) return null;
  
    const pieData = filteredFolders
      .filter(folder => folder.size > 0)
      .map(folder => ({
        name: folder.folder_name,
        value: folder.size,
        percentage: ((folder.size / totalStorage) * 100).toFixed(1)
      }));
  
    if (pieData.length === 0) return null;
  
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Storage Usage</h2>
          <div className="text-sm font-medium px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full">
            Total: {formatSize(totalStorage)}
          </div>
        </div>
  
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={({ name, percentage }) => 
                  `${name} (${percentage}%)`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatSize(value)}
                contentStyle={{ 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  padding: '8px 12px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Handle file input change
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    // Add file validation
    const maxSize = 500 * 1024 * 1024; // 500MB
    const validFiles = selectedFiles.filter(file => file.size <= maxSize);
  
    if (validFiles.length !== selectedFiles.length) {
      showNotification("Some files exceed the 500MB limit", "error");
    }
  
    setFiles(validFiles);
  };

  // Handle folder selection for upload
  const handleFolderSelect = (folderId) => {
    setSelectedFolderId(folderId);
    setUploadModalOpen(true); // Open the upload modal
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFolderId || !files || files.length === 0) {
      showNotification("Please select a folder and files", "error");
      return;
    }
  
    try {
      setLoading(true);
      let uploadedCount = 0;
      const totalFiles = files.length;
  
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
  
        await axios.post(
          `http://localhost:5000/api/explorer/folders/${selectedFolderId}/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              // You can add progress tracking here if needed
            }
          }
        );
        uploadedCount++;
      }
  
      await fetchFolders(); // Refresh folder list
      showNotification(`Successfully uploaded ${uploadedCount} files`, "success");
      setUploadModalOpen(false);
    } catch (err) {
      console.error("Upload error:", err);
      showNotification(
        err.response?.data?.message || "Failed to upload files. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
      setSelectedFolderId(null);
      setFiles(null);
    }
  };

  const renderDialog = () => {
    if (!showDialog) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => setShowDialog(false)}
      >
        <div
          className="bg-white w-full max-w-md mx-4 rounded-md p-6 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Create New Folder</h3>
            <button
              onClick={() => setShowDialog(false)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <FaTimes size={18} />
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-1">
              Folder Name
            </label>
            <input
              id="folderName"
              type="text"
              placeholder="Enter folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowDialog(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={loading || !newFolderName.trim()}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </div>
      </div>
    );
  };// Add this function with other render functions
  const renderRenameDialog = () => {
    if (!renameDialog.isOpen) return null;
  
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => setRenameDialog({ isOpen: false, folderId: null, folderName: "", newName: "" })}
      >
        <div
          className="bg-white w-full max-w-md mx-4 rounded-md p-6 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Rename Folder</h3>
            <button
              onClick={() => setRenameDialog({ isOpen: false, folderId: null, folderName: "", newName: "" })}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <FaTimes size={18} />
            </button>
          </div>
  
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Name
            </label>
            <input
              type="text"
              value={renameDialog.folderName}
              disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500"
            />
          </div>
  
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Name
            </label>
            <input
              type="text"
              value={renameDialog.newName}
              onChange={(e) => setRenameDialog({ ...renameDialog, newName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>
  
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRenameDialog({ isOpen: false, folderId: null, folderName: "", newName: "" })}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleRenameFolder}
              disabled={!renameDialog.newName.trim() || loading}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Renaming..." : "Rename"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteDialog = () => {
    if (!deleteDialog.isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => setDeleteDialog({ isOpen: false, folderId: null, folderName: "" })}
      >
        <div
          className="bg-white w-full max-w-md mx-4 rounded-md p-6 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Delete Folder</h3>
            <button
              onClick={() => setDeleteDialog({ isOpen: false, folderId: null, folderName: "" })}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <FaTimes size={18} />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-center bg-red-50 p-4 rounded-lg mb-4">
              <FaTrash className="h-10 w-10 text-red-500" />
            </div>
            <p className="text-gray-700">
              Are you sure you want to delete "<span className="font-medium">{deleteDialog.folderName}</span>"? This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setDeleteDialog({ isOpen: false, folderId: null, folderName: "" })}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteFolder}
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete Folder"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Upload Modal
  const renderUploadModal = () => {
    if (!uploadModalOpen) return null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md mx-4 rounded-md p-6 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Upload Files to Folder</h3>
            <button
              onClick={() => {
                setUploadModalOpen(false);
                setSelectedFolderId(null);
                setFiles(null);
              }}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <FaTimes size={18} />
            </button>
          </div>
  
          <select
            className="block w-full mb-4 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedFolderId || ""}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            disabled={loading}
          >
            <option value="" disabled>Select a folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.folder_name}</option>
            ))}
              </select>

<input
  type="file"
  multiple
  onChange={handleFileChange}
  disabled={loading}
  className="mb-6 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
  accept="video/*,.mp4,.mov,.avi,.mkv,image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
/>

{files && files.length > 0 && (
  <div className="mb-4">
    <p className="text-sm text-gray-600">Selected files: {files.length}</p>
    <ul className="mt-2 max-h-32 overflow-y-auto">
      {Array.from(files).map((file, index) => (
        <li key={index} className="text-xs text-gray-500 truncate">
          {file.name} ({formatSize(file.size)})
        </li>
      ))}
    </ul>
  </div>
)}

<div className="flex justify-end gap-2">
  <button
  onClick={() => {
    setUploadModalOpen(false);
    setSelectedFolderId(null);
    setFiles(null);
  }}
  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
  disabled={loading}
>
  Cancel
</button>
<button
  onClick={handleUpload}
  disabled={!files || !selectedFolderId || loading || files.length === 0}
  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
>
  {loading ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
      Uploading...
    </>
  ) : (
    <>
      <FaUpload className="mr-2" />
      Upload
    </>
        )}
        </button>
      </div>
    </div>
  </div>
);
};


 
 
 
 
  // Add this function before the return statement
const showNotification = (message, type = "success") => {
  setNotification({ show: true, message, type });
  setTimeout(() => {
    setNotification({ show: false, message: "", type: "" });
  }, 3000);
};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      <Navbar onLogout={handleLogout} />

      <div className="h-[72px]"></div>
      
      <div className="w-full flex-grow px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full flex flex-col lg:flex-row gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:w-2/3 w-full">
            <div className="flex justify-between items-center mb-6 w-full">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-800">My Folders</h1>
                <div className="ml-3 flex items-center text-sm bg-blue-50 px-3 py-1 rounded-full shadow-sm">
                  <span className="text-blue-700 font-medium">
                    {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search folders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 bg-gray-50"
                />
              </div>

              <div className="flex space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowDialog(true)}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex-1 sm:flex-none shadow-sm"
                >
                  <FaPlus className="mr-2 h-4 w-4" />
                  <span>Create Folder</span>
                </button>

                <button
                  onClick={() => setUploadModalOpen(true)} // Open the upload modal
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex-1 sm:flex-none shadow-sm"
                >
                  <FaUpload className="mr-2 h-4 w-4 text-gray-500" />
                  <span>Upload</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 mb-6 bg-red-50 rounded-lg text-sm text-red-700 border border-red-200 shadow-sm w-full">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {loading && !error ? (
              <div className="flex justify-center items-center py-16 w-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <>
                {filteredFolders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-lg shadow-md border border-gray-100 w-full">
                    <div className="bg-indigo-50 p-4 rounded-full mb-4">
                      <FaFolder className="h-16 w-16 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No folders found</h3>
                    <p className="text-gray-500">Create your first folder to get started!</p>
                    <button
                      onClick={() => setShowDialog(true)}
                      className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm"
                    >
                      <FaPlus className="mr-2 h-4 w-4" />
                      <span>Create Folder</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 w-full">
                    {filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="group bg-white overflow-hidden rounded-lg shadow-md hover:shadow-lg border border-gray-100 transition-all duration-200 cursor-pointer transform hover:-translate-y-1 w-full"
                      >
                        <div 
                          onClick={() => navigate(`/folder/${folder.folder_name}`)}
                          className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 flex items-center justify-center relative h-40 w-full"
                        >
                          <FaFolder className="h-20 w-20 text-indigo-500 group-hover:text-indigo-600 transition-all duration-200" />
                          <button 
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-gray-400 hover:text-gray-600 hover:bg-white transition-all shadow-sm z-10"
                            onClick={(e) => toggleDropdown(e, folder.id)}
                          >
                            <FaEllipsisV className="h-3 w-3" />
                          </button>
                          
                          {/* Dropdown Menu */}
                         {/* Replace the existing dropdown menu content */}
                         {activeDropdown === folder.id && (
  <div 
    ref={dropdownRef}
    className="absolute top-12 right-3 bg-white rounded-md shadow-lg py-1 z-20 min-w-[150px] border border-gray-100"
  >
    <button
      onClick={(e) => {
        e.stopPropagation();
        setRenameDialog({
          isOpen: true,
          folderId: folder.id,
          folderName: folder.folder_name,
          newName: folder.folder_name
        });
        setActiveDropdown(null);
      }}
      className="flex items-center w-full px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
    >
      <FaPencilAlt className="mr-2 h-3 w-3" />
      Rename
    </button>
    <button
      onClick={(e) => openDeleteDialog(e, folder)}
      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
    >
      <FaTrash className="mr-2 h-3 w-3" />
      Delete Folder
    </button>
  </div>
)}
                        </div>
                        <div 
                          onClick={() => navigate(`/folder/${folder.folder_name}`)}
                          className="p-5 border-t border-gray-100 w-full"
                        >
                          <h3 className="text-lg font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                            {folder.folder_name}
                          </h3>
                          <div className="flex items-center justify-between mt-3 text-xs text-gray-500 w-full">
                            <div className="flex items-center">
                              <FaClock className="h-3 w-3 mr-1 text-gray-400" />
                              <p>
                              {folder.created_at && !isNaN(new Date(folder.created_at).getTime()) 
                              ? new Date(folder.created_at).toLocaleDateString() 
                              : 'Just now'}</p>
                            </div>
                            <div className="text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded">
                              {formatSize(folder.size)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Pie Chart */}
          <div className="lg:w-1/3 w-full">
            {!loading && !error && renderPieChart()}
            
            {/* Additional Statistics Card */}
            {!loading && !error && filteredFolders.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mt-6 w-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Storage Statistics</h2>
                
                <div className="space-y-4 w-full">
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-1 w-full">
                      <span className="text-sm font-medium text-gray-600">Largest Folder</span>
                      <span className="text-sm text-indigo-600 font-medium">
                        {formatSize(Math.max(...filteredFolders.map(f => f.size)))}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, Math.max(...filteredFolders.map(f => f.size)) / totalStorage * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-1 w-full">
                      <span className="text-sm font-medium text-gray-600">Average Size</span>
                      <span className="text-sm text-indigo-600 font-medium">
                        {formatSize(totalStorage / filteredFolders.length)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (totalStorage / filteredFolders.length) / totalStorage * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-between text-sm w-full">
                    <span className="font-medium text-gray-600">Total Folders</span>
                    <span className="bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded">
                      {filteredFolders.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {renderDialog()}
      {renderDeleteDialog()}
      {renderRenameDialog()}
      {renderUploadModal()}
{notification.show && (
  <div 
    className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg flex items-center z-50 animate-fade-in-up ${
      notification.type === 'success' ? 'bg-green-500 text-white' :
      notification.type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}
  >
    <span className="text-sm font-medium">{notification.message}</span>
  </div>
)}
    </div>
  );
};

<style jsx>{`
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out;
  }
`}</style> 



export default Dashboard;