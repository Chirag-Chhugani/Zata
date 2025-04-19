const fileService = require('../services/file.service');
const jwt = require('jsonwebtoken');

const getFilesInFolder = async (req, res) => {
    try {
      const { folderName } = req.params;
      const userId = req.user.id;
  
      if (!folderName) {
        return res.status(400).json({ 
          success: false,
          message: "Folder name is required" 
        });
      }
  
      const result = await fileService.getFilesInFolder(userId, decodeURIComponent(folderName));
      
      res.status(200).json({
        success: true,
        message: "Files fetched successfully",
        data: result
      });
    } catch (error) {
      console.error("❌ Error fetching files:", error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: "Folder not found or unauthorized"
        });
      }
  
      res.status(500).json({
        success: false,
        message: "Failed to fetch files",
        error: error.message
      });
    }
  };

const uploadFile = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;
    const file = req.file;

    if (!folderId) {
      return res.status(400).json({ message: "Folder ID is required" });
    }

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const uploadedFile = await fileService.uploadFile(userId, folderId, file);
    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file: uploadedFile
    });
  } catch (error) {
    console.error("❌ Upload failed:", error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
};


const viewFile = async (req, res) => {
    try {
      const { fileId } = req.params;
      const token = req.query.token;
  
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }
  
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
  
        // Get file details
        const file = await fileService.getFileById(userId, fileId);
        if (!file) {
          return res.status(404).json({ message: "File not found" });
        }
  
        // Get file from S3
        const s3Response = await fileService.getFileContent(userId, fileId);
  
        // Set response headers
        res.setHeader('Content-Type', file.file_type);
        res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  
        // Stream the file
        s3Response.Body.pipe(res);
      } catch (tokenError) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    } catch (error) {
      console.error("❌ View failed:", error);
      res.status(500).json({ message: "Failed to view file", error: error.message });
    }
  };

const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const { s3Response, file } = await fileService.downloadFile(userId, fileId);

    res.setHeader('Content-Type', file.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    s3Response.Body.pipe(res);
  } catch (error) {
    console.error("❌ Download failed:", error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: "File not found" });
    }
    res.status(500).json({ message: "File download failed", error: error.message });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    await fileService.deleteFile(userId, fileId);
    res.status(200).json({ 
      success: true,
      message: "File deleted successfully" 
    });
  } catch (error) {
    console.error("❌ Delete failed:", error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: "File not found" });
    }
    res.status(500).json({ message: "File deletion failed", error: error.message });
  }
};

const previewFile = async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
  
      const file = await fileService.getFileById(userId, fileId);
  
      if (!file.file_type.startsWith('image/')) {
        return res.status(400).json({ message: "File is not an image" });
      }
  
      const { s3Response } = await fileService.getFileContent(userId, fileId);
      
      res.setHeader('Content-Type', file.file_type);
      res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
      
      s3Response.Body.pipe(res);
    } catch (error) {
      console.error("❌ Preview failed:", error);
      res.status(500).json({ message: "File preview failed", error: error.message });
    }
  };

module.exports = {
  getFilesInFolder,
  uploadFile,
  downloadFile,
  viewFile,
  deleteFile,
  previewFile
};