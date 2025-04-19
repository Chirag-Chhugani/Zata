const folderService = require('../services/folder.service');

const getFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const folders = await folderService.getAllFolders(userId);
    
    res.status(200).json({
      message: "Folders fetched successfully",
      folders
    });
  } catch (error) {
    console.error("❌ Error fetching folders:", error);
    res.status(500).json({ message: "Failed to fetch folders", error: error.message });
  }
};

const createFolder = async (req, res) => {
  try {
    const { folderName } = req.body;
    const userId = req.user.id;

    if (!folderName) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const folder = await folderService.createFolder(userId, folderName);
    res.status(201).json({
      message: "Folder created successfully",
      folder
    });
  } catch (error) {
    console.error("❌ Error creating folder:", error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: "Folder creation failed", error: error.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    await folderService.deleteFolder(userId, folderId);
    res.json({ 
      message: "✅ Folder and all associated files deleted successfully" 
    });
  } catch (error) {
    console.error("❌ Error deleting folder:", error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to delete folder", error: error.message });
  }
};

const renameFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { newName } = req.body;
    const userId = req.user.id;

    if (!newName) {
      return res.status(400).json({ message: "New folder name is required" });
    }

    const updatedFolder = await folderService.renameFolder(userId, folderId, newName);
    res.json({
      message: "Folder renamed successfully",
      folder: updatedFolder
    });
  } catch (error) {
    console.error("❌ Error renaming folder:", error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to rename folder", error: error.message });
  }
};

const getFolderStorage = async (userId, folderName) => {
    const folderResult = await pool.query(
      'SELECT id FROM folders WHERE folder_name = $1 AND user_id = $2',
      [folderName, userId]
    );
  
    if (folderResult.rows.length === 0) {
      throw new Error('Folder not found or unauthorized');
    }
  
    const folder = folderResult.rows[0];
  
    const storageResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CAST(file_size AS BIGINT)), 0) as total_size,
        COUNT(*) as file_count
      FROM files 
      WHERE folder_id = $1 AND user_id = $2`,
      [folder.id, userId]
    );
  
    return {
      totalSize: parseInt(storageResult.rows[0].total_size),
      fileCount: parseInt(storageResult.rows[0].file_count)
    };
  };
  
  // Add this utility function for formatting file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  module.exports = {
    getFolders,
    createFolder,
    deleteFolder,
    renameFolder,
    getFolderStorage
  };