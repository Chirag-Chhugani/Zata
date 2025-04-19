import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, FileText, Download, Trash2, Upload, Folder, 
  AlertCircle, Check, X, File, Camera, Video, 
  Music, Table, Search, ArrowLeft, Settings,
  Clock, Shield } from "lucide-react";
import Navbar from "./Navbar";
import {logout} from "../utils/auth"; 
const FolderDetails = () => {
  const [files, setFiles] = useState([]);
  const [folderInfo, setFolderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, fileId: null, fileName: "",isDeleting:false });
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const { folderName } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");
  
  const fetchFolderFiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:5000/api/explorer/folders/${folderName}/files`, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Update to match new backend response structure
      if (res.data.data) {
        setFiles(res.data.data.files || []);
        setFolderInfo(res.data.data.folder);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
      setError(err.response?.data?.message || "Failed to load folder contents");
      showNotification("Failed to load folder contents", "error");
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchFolderFiles();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [folderName]);

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const filteredFiles = files.filter(file => 
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    // Check for file size (500MB limit)
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      showNotification("File size cannot exceed 500MB", "error");
      e.target.value = ''; // Reset input
      return;
    }
  
    // Check for duplicate filename
    const isDuplicate = files.some(
      existingFile => existingFile.file_name === file.name
    );
  
    if (isDuplicate) {
      showNotification("A file with this name already exists in this folder", "error");
      e.target.value = ''; // Reset input
      return;
    }
  
    setSelectedFile(file);
  };


  const handleFileUpload = async () => {
    if (!selectedFile) return;
  
    // Check for duplicate files
    const isDuplicate = files.some(
      existingFile => existingFile.file_name === selectedFile.name
    );
  
    if (isDuplicate) {
      showNotification("A file with this name already exists in this folder", "error");
      setSelectedFile(null);
      document.getElementById("file-upload").value = ''; // Reset input
      return;
    }
  
    const formData = new FormData();
    formData.append("file", selectedFile);
  
    setIsUploading(true);
    setUploadProgress(0);
  
    try {
      const res = await axios.post(
        `http://localhost:5000/api/explorer/folders/${folderInfo.id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      );
  
      setFiles([res.data.file, ...files]);
      setSelectedFile(null);
      document.getElementById("file-upload").value = ''; // Reset file input
      showNotification("File uploaded successfully!", "success");
    } catch (err) {
      let errorMessage = "Upload failed";
      if (err.response?.data?.message === "FILE_EXISTS") {
        errorMessage = "A file with this name already exists";
      } else if (err.response?.data?.message === "DUPLICATE_CONTENT") {
        errorMessage = "This file has already been uploaded";
      }
      showNotification(errorMessage, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  const handleFileDownload = async (fileId, fileName) => {
    try {
      showNotification("Starting download...", "info");
      
      const response = await axios({
        url: `http://localhost:5000/api/explorer/files/${fileId}/download`,
        method: 'GET',
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
  
      showNotification("Download completed!", "success");
    } catch (err) {
      console.error("Download error:", err);
      showNotification("Failed to download file", "error");
    }
  };

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} bytes`;
    if (size < 1048576) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / 1048576).toFixed(2)} MB`;
  };

  const getFileIcon = (fileType) => {
    const iconClass = "w-12 h-12"; // Increased size for better visibility
    
    if (fileType.includes("image")) {
      return <Camera className={`${iconClass} text-indigo-500`} />;
    } else if (fileType.includes("pdf")) {
      return <FileText className={`${iconClass} text-red-500`} />;
    } else if (fileType.includes("doc") || fileType.includes("word")) {
      return <File className={`${iconClass} text-blue-500`} />;
    } else if (fileType.includes("sheet") || fileType.includes("excel")) {
      return <Table className={`${iconClass} text-green-500`} />;
    } else if (fileType.includes("video")) {
      return <Video className={`${iconClass} text-purple-500`} />;
    } else if (fileType.includes("audio")) {
      return <Music className={`${iconClass} text-pink-500`} />;
    }
    return <File className={`${iconClass} text-gray-500`} />;
  };
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderFilePreview = (file) => {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 rounded-t-lg">
        {getFileIcon(file.file_type)}
      </div>
    );
  };

  const openDeleteDialog = (fileId, fileName) => {
    setDeleteDialog({
      isOpen: true,
      fileId,
      fileName
    });
  };
  
  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      fileId: null,
      fileName: ""
    });
  };
  
  const confirmFileDelete = async () => {
    try {
      setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
      await axios.delete(`http://localhost:5000/api/explorer/files/${deleteDialog.fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      setFiles(files.filter(file => file.id !== deleteDialog.fileId));
      showNotification("File deleted successfully", "success");
      closeDeleteDialog();
    } catch (err) {
      showNotification("Failed to delete file", "error");
    }
    finally {
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-blue-50">
      <Navbar onLogout={handleLogout} />
     
      <div className="h-[72px]"></div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="max-w-full px-4 md:px-6 lg:px-8 py-6">
          {/* Folder Header */}
<div className="bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg shadow-lg rounded-xl p-6 mb-6 border border-gray-200">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-center">
      <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-4 rounded-xl mr-5">
        <Folder className="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{folderInfo?.name || folderName}</h2>
        <div className="flex items-center mt-1 text-gray-600">
          <div className="flex items-center">
            <File className="h-4 w-4 mr-1" />
            <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          </div>
          <span className="mx-2">•</span>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>Created {new Date(folderInfo?.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <button 
        onClick={() => navigate("/dashboard")}
        className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg shadow-sm flex items-center transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Folders
      </button>
    </div>
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  {/* Enhanced Upload Section */}
  <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <Upload className="w-5 h-5 mr-2 text-indigo-500" />
        Upload Files
      </h3>
      <Shield className="w-5 h-5 text-gray-400" title="Max file size: 500MB" />
    </div>
    <div className="flex flex-col space-y-4">
      <input
        type="file"
        id="file-upload"
        onChange={handleFileSelection}
        accept="video/*,.mp4,.mov,.avi,.mkv,image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
      />
      <button 
        onClick={() => document.getElementById("file-upload").click()} 
        className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
      >
        <span className="truncate">
          {selectedFile ? selectedFile.name : "Choose file..."}
        </span>
      </button>
      <button 
        onClick={handleFileUpload} 
        className={`px-6 py-3 rounded-lg shadow-sm text-sm font-medium flex items-center justify-center transition-all duration-200 ${
          !selectedFile ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600"
        }`}
        disabled={!selectedFile || isUploading}
      >          
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      {isUploading && (
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600">Uploading...</span>
            <span className="text-sm font-medium text-indigo-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-200" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Enhanced Search Section */}
  <div className="md:col-span-2 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <Search className="w-5 h-5 mr-2 text-indigo-500" />
      Search Files
    </h3>
    <div className="relative">
      <input
        type="text"
        placeholder="Search files by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 transition-all duration-200"
      />
      {searchTerm && (
        <button 
          onClick={() => setSearchTerm("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
</div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Files Grid Section */}
<div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 mb-6">
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center">
      <FileText className="w-6 h-6 mr-2 text-indigo-500" />
      <h3 className="text-xl font-semibold text-gray-800">Files</h3>
    </div>
    {filteredFiles.length > 0 && (
      <div className="px-3 py-1 bg-indigo-50 rounded-full">
        <span className="text-sm font-medium text-indigo-600">
          {filteredFiles.length} of {files.length} files
        </span>
      </div>
    )}
  </div>

  {/* Loading State */}
  {loading ? (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      <p className="mt-4 text-sm text-gray-500">Loading files...</p>
    </div>
  ) : filteredFiles.length === 0 ? (
    <div className="text-center py-16 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
      <FileText className="mx-auto h-16 w-16 text-gray-400" />
      <h3 className="mt-4 text-xl font-medium text-gray-900">No files found</h3>
      <p className="mt-2 text-base text-gray-500">
        {searchTerm ? "Try adjusting your search" : "Get started by uploading your first file"}
      </p>
      {!searchTerm && (
        <button 
          onClick={() => document.getElementById("file-upload").click()}
          className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 inline-flex items-center"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Now
        </button>
      )}
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
      {filteredFiles.map((file) => (
        <div 
          key={file.id} 
          className="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
        >
          {/* File Preview */}
          <div className="p-4 bg-gradient-to-b from-gray-50 to-white rounded-t-xl">
            <div className="flex items-center justify-center h-32 w-full">
              {renderFilePreview(file)}
            </div>
          </div>
          
          {/* File Info */}
          <div className="p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {file.file_name}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(file.file_size)}
              </p>
            </div>
            
             {/*file actions section*/}
<div className="flex items-center justify-between pt-3 border-t border-gray-100">
  <div className="flex items-center gap-1">
  {/* Replace the existing view button with this improved version */}
{/* Replace the existing view button with this simplified version */}
<button 
  onClick={() => {
    try {
      const viewUrl = `http://localhost:5000/api/explorer/files/${file.id}/view?token=${token}`;
      window.open(viewUrl, '_blank');
    } catch (error) {
      console.error("View error:", error);
      showNotification("Failed to view file", "error");
    }
  }}
  className="flex items-center px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
>
  <Eye className="w-3 h-3 mr-1" />
  View
</button>
    <button 
      onClick={() => handleFileDownload(file.id, file.file_name)}
      className="flex items-center px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
    >
      <Download className="w-3 h-3 mr-1" />
      Download
    </button>
  </div>
  <button 
    onClick={() => openDeleteDialog(file.id, file.file_name)}
    className="flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-1"
  >
    <Trash2 className="w-3 h-3 mr-1" />
    Delete
  </button>
</div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 backdrop-blur-sm transition-opacity"
            onClick={closeDeleteDialog}
          ></div>
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in-down">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Confirm Delete</h4>
              <button 
                onClick={closeDeleteDialog} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteDialog.fileName}"</span>? 
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={closeDeleteDialog}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm transition-colors"
              >
                Cancel
              </button>
              <button 
             onClick={confirmFileDelete}
            disabled={deleteDialog.isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm flex items-center transition-colors disabled:opacity-50"
             >
           {deleteDialog.isDeleting ? (
             <>
             <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
           Deleting...
             </>
              ) : (
            <> 
               <Trash2 className="w-4 h-4 mr-2" />
             Delete
            </>
           )}
           </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center animate-fade-in-up z-50 ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-indigo-500 text-white'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 mr-2" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 mr-2" />
          ) : (
            <FileText className="w-5 h-5 mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Custom Animation Styles */}
      <style>
  {`
    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-down {
      animation: fadeInDown 0.3s ease-out;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-out;
    }
  `}
</style>
    </div>
  );
};

export default FolderDetails;