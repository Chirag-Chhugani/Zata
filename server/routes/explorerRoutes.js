// const express = require("express");
// const multer = require("multer");
// const { PutObjectCommand ,DeleteObjectCommand,GetObjectCommand} = require("@aws-sdk/client-s3");
// const s3 = require("../config/zataS3Client");
// const pool = require("../config/db");
// const { ensureAuthenticated } = require("../middlewares/auth");
// const router = express.Router();
// const storage = multer.memoryStorage();
// const upload = multer({ 
//   storage, 
//   limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
//   fileFilter: (req, file, cb) => {
//     // Accept images, videos, and other allowed file types
//     if (file.mimetype.startsWith('image/') || 
//         file.mimetype.startsWith('video/') ||
//         file.mimetype.startsWith('application/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type'));
//     }
//   }
// });
// const jwt = require('jsonwebtoken');

// // 1️⃣ GET all folders of the user
// router.get("/folders", ensureAuthenticated, async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const query = `
//       SELECT id, folder_name, created_at, updated_at
//       FROM folders
//       WHERE user_id = $1
//       ORDER BY created_at DESC
//     `;
//     const { rows } = await pool.query(query, [userId]);

//     res.status(200).json({
//       message: "Folders fetched successfully",
//       folders: rows,
//     });
//   } catch (err) {
//     console.error("❌ Error fetching folders:", err);
//     res.status(500).json({ message: "Failed to fetch folders", error: err.message });
//   }
// });

// // 3️⃣ POST - Create a folder
// router.post("/folder", ensureAuthenticated, async (req, res) => {
//   try {
//     const { folderName } = req.body;
//     const userId = req.user.id;

//     if (!folderName) {
//       return res.status(400).json({ message: "Folder name is required" });
//     }

//     // Check if folder already exists
//     const checkQuery = `SELECT * FROM folders WHERE user_id = $1 AND folder_name = $2`;
//     const exists = await pool.query(checkQuery, [userId, folderName]);

//     if (exists.rows.length > 0) {
//       return res.status(400).json({ message: "Folder already exists" });
//     }

//     const s3FolderKey = `uploads/${userId}/${folderName}/`;
//     const s3KeyWithKeep = `${s3FolderKey}.keep`;

//     const s3Command = new PutObjectCommand({
//       Bucket: process.env.ZATA_BUCKET,
//       Key: s3KeyWithKeep,
//       Body: "keep folder",
//     });

//     await s3.send(s3Command);

//     const insertQuery = `
//       INSERT INTO folders (user_id, folder_name, s3_key)
//       VALUES ($1, $2, $3)
//       RETURNING id, folder_name, s3_key;
//     `;
//     const result = await pool.query(insertQuery, [userId, folderName, s3FolderKey]);

//     res.status(201).json({
//       message: "Folder created successfully",
//       folder: result.rows[0],
//     });
//   } catch (err) {
//     console.error("❌ Error creating folder:", err);
//     res.status(500).json({ message: "Folder creation failed", error: err.message });
//   }
// });

// // 4️⃣ POST - Upload file to a specific folder
// router.post("/folders/:folderId/upload", ensureAuthenticated, upload.single("file"), async (req, res) => {
//   try {
//     const { folderId } = req.params;
//     const userId = req.user.id;
//     const file = req.file;
    
//     if (!file) {
//       return res.status(400).json({ message: "File is required" });
//     }
    
//     if (!/^[0-9a-fA-F-]{36}$/.test(folderId)) {
//       return res.status(400).json({ message: "Invalid folder ID" });
//     }

//     // 🧠 1. Verify folder belongs to user
//     const folderQuery = `SELECT * FROM folders WHERE id = $1 AND user_id = $2`;
//     const folderResult = await pool.query(folderQuery, [folderId, userId]);

//     if (folderResult.rows.length === 0) {
//       return res.status(404).json({ message: "Folder not found or unauthorized" });
//     }

//     const folder = folderResult.rows[0];
//     const fileName = file.originalname;

//     // 🔍 2. Check if a file with the same name already exists in the folder
//     const checkFileQuery = `
//       SELECT id FROM files
//       WHERE folder_id = $1 AND user_id = $2 AND file_name = $3
//     `;
//     const duplicateCheck = await pool.query(checkFileQuery, [folderId, userId, fileName]);

//     if (duplicateCheck.rows.length > 0) {
//       return res.status(409).json({ message: "File with this name already exists in the folder" });
//     }

//     // 🪣 3. Upload to S3/Zata
//     const fileKey = `${folder.s3_key}${Date.now()}_${fileName}`;

//     const s3Command = new PutObjectCommand({
//       Bucket: process.env.ZATA_BUCKET,
//       Key: fileKey,
//       Body: file.buffer,
//       ContentType: file.mimetype,
//     });

//     const uploadTimeout = setTimeout(() => {
//       res.status(408).json({ message: "Upload timeout. Please try again." });
//     }, 30 * 60 * 1000);


//     await s3.send(s3Command);
//     clearTimeout(uploadTimeout);
//     // 🧾 4. Store file metadata in DB
//     const insertQuery = `
//       INSERT INTO files (file_name, file_type, file_size, folder_id, user_id, s3_key)
//       VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING id, file_name, file_type, file_size, s3_key, uploaded_at;
//     `;

//     const result = await pool.query(insertQuery, [
//       fileName,
//       file.mimetype,
//       file.size,
//       folderId,
//       userId,
//       fileKey
//     ]);

//     res.status(201).json({
//       message: "File uploaded successfully",
//       file: result.rows[0],
//     });
//   } catch (err) {
//     console.error("❌ Upload failed:", err);
//     res.status(500).json({ 
//       message: "File upload failed", 
//       error: err.message 
//     });
//   }
// });


// // 5️⃣ GET - Fetch files in a specific folder
// router.get("/folders/:folderName/files", ensureAuthenticated, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const folderName = req.params.folderName;
//     // First find the folder ID based on the folder_name
//     const folderQuery = `
//       SELECT id, folder_name, s3_key, created_at, updated_at
//       FROM folders
//       WHERE folder_name = $1 AND user_id = $2
//     `;
    
//     const folderResult = await pool.query(folderQuery, [folderName, userId]);
    
//     if (folderResult.rows.length === 0) {
//       return res.status(404).json({
//         message: "Folder not found or you don't have access to this folder"
//       });
//     }

//     const folder = folderResult.rows[0];

//     // Now fetch all files in this folder using the folder ID
//     const filesQuery = `
//       SELECT id, file_name, file_type, file_size, s3_key, uploaded_at
//       FROM files
//       WHERE folder_id = $1
//       ORDER BY uploaded_at DESC
//     `;
//     const filesResult = await pool.query(filesQuery, [folder.id]);

//     res.status(200).json({
//       message: "Files fetched successfully",
//       folder: {
//         id: folder.id,
//         name: folder.folder_name,
//         s3_key: folder.s3_key,
//         created_at: folder.created_at,
//         updated_at: folder.updated_at
//       },
//       files: filesResult.rows
//     });
    
//   } catch (err) {
//     console.error("❌ Error fetching files:", err);
//     res.status(500).json({ 
//       message: "Failed to fetch files", 
//       error: err.message 
//     });
//   }
// });

// // GET - Get folder storage information
// router.get("/folder/:folderName/storage", ensureAuthenticated, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const folderName = req.params.folderName;

//     // First get the folder ID
//     const folderQuery = `
//       SELECT id FROM folders 
//       WHERE folder_name = $1 AND user_id = $2
//     `;
//     const folderResult = await pool.query(folderQuery, [folderName, userId]);

//     if (folderResult.rows.length === 0) {
//       return res.status(404).json({
//         message: "Folder not found or unauthorized"
//       });
//     }

//     const folderId = folderResult.rows[0].id;

//     // Get total size of all files in the folder
//     const sizeQuery = `
//       SELECT COALESCE(SUM(file_size), 0) as total_size
//       FROM files
//       WHERE folder_id = $1 AND user_id = $2
//     `;
//     const sizeResult = await pool.query(sizeQuery, [folderId, userId]);

//     res.status(200).json({
//       message: "Storage information retrieved successfully",
//       folderName,
//       size: parseInt(sizeResult.rows[0].total_size) || 0
//     });

//   } catch (err) {
//     console.error("❌ Error getting folder storage:", err);
//     res.status(500).json({
//       message: "Failed to get folder storage information",
//       error: err.message
//     });
//   }
// });

// // 6️⃣ DELETE - Delete a folder by ID
// router.delete('/folder/:folderId', ensureAuthenticated, async (req, res) => {
//   const { folderId } = req.params;
//   const userId = req.user.id;

//   try {
//     // 1. Fetch all file S3 keys
//     const fileRes = await pool.query(
//       'SELECT s3_key FROM files WHERE folder_id = $1 AND user_id = $2',
//       [folderId, userId]
//     );

//     for (const file of fileRes.rows) {
//       const deleteCommand = new DeleteObjectCommand({
//         Bucket: process.env.ZATA_BUCKET,
//         Key: file.s3_key,
//       });

//       try {
//         await s3.send(deleteCommand);
//       } catch (err) {
//         console.warn(`⚠️ Failed to delete file from Zata: ${file.s3_key}`, err.message);
//       }
//     }

//     // 2. Optionally delete the .keep file (folder marker)
//     const folderMeta = await pool.query(
//       'SELECT s3_key FROM folders WHERE id = $1 AND user_id = $2',
//       [folderId, userId]
//     );

//     if (folderMeta.rows.length > 0) {
//       const folderKey = folderMeta.rows[0].s3_key + ".keep";
//       const deleteKeep = new DeleteObjectCommand({
//         Bucket: process.env.ZATA_BUCKET,
//         Key: folderKey,
//       });

//       try {
//         await s3.send(deleteKeep);
//       } catch (err) {
//         console.warn(`⚠️ Failed to delete keep file: ${folderKey}`, err.message);
//       }
//     }

//     // 3. Delete files metadata from DB
//     await pool.query(
//       'DELETE FROM files WHERE folder_id = $1 AND user_id = $2',
//       [folderId, userId]
//     );

//     // 4. Delete folder metadata from DB
//     const result = await pool.query(
//       'DELETE FROM folders WHERE id = $1 AND user_id = $2 RETURNING *',
//       [folderId, userId]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: 'Folder not found or unauthorized' });
//     }

//     res.json({ message: '✅ Folder and all associated files deleted successfully from DB and Zata cloud' });
//   } catch (err) {
//     console.error('❌ Error deleting folder:', err);
//     res.status(500).json({ message: 'Failed to delete folder and associated files', error: err.message });
//   }
// });

// // DELETE /api/explorer/files/:fileId
// router.delete('/files/:fileId', async (req, res) => {
//   const { fileId } = req.params;

//   try {
//     // 1. Get the file info from DB
//     const result = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: 'File not found in database.' });
//     }

//     const file = result.rows[0];
//     const fileKey = file.s3_key;

//     // 2. Delete the file from Zata storage
//     await s3.send(new DeleteObjectCommand({
//       Bucket: process.env.ZATA_BUCKET,
//       Key: fileKey,
//     }));

//     // 3. Delete file record from PostgreSQL
//     await pool.query('DELETE FROM files WHERE id = $1', [fileId]);

//     res.status(200).json({ message: 'File deleted successfully from DB and Zata storage.' });
//   } catch (error) {
//     console.error('Delete file error:', error);
//     res.status(500).json({ message: 'Error deleting file', error: error.message });
//   }
// });


// // Add this new route for file previews
// router.get("/files/:fileId/preview", ensureAuthenticated, async (req, res) => {
//   try {
//     const { fileId } = req.params;
//     const userId = req.user.id;

//     // Get file info from database
//     const fileResult = await pool.query(
//       "SELECT * FROM files WHERE id = $1 AND user_id = $2",
//       [fileId, userId]
//     );

//     if (fileResult.rows.length === 0) {
//       return res.status(404).json({ message: "File not found" });
//     }

//     const file = fileResult.rows[0];

//     // Check if file is an image
//     if (!file.file_type.startsWith('image/')) {
//       return res.status(400).json({ message: "File is not an image" });
//     }

//     // Get file from S3
//     const getObjectParams = {
//       Bucket: process.env.ZATA_BUCKET,
//       Key: file.s3_key,
//     };

//     const s3Object = await s3.send(new GetObjectCommand(getObjectParams));
//     s3Object.Body.pipe(res);

//   } catch (err) {
//     console.error("Error getting file preview:", err);
//     res.status(500).json({ message: "Error getting file preview" });
//   }
// });

// router.get("/files/:fileId/download", ensureAuthenticated, async (req, res) => {
//   try {
//     const { fileId } = req.params;
//     const userId = req.user.id;

//     // Get file info from database
//     const fileResult = await pool.query(
//       "SELECT * FROM files WHERE id = $1 AND user_id = $2",
//       [fileId, userId]
//     );

//     if (fileResult.rows.length === 0) {
//       return res.status(404).json({ message: "File not found" });
//     }

//     const file = fileResult.rows[0];

//     // Get file from S3
//     const getObjectParams = {
//       Bucket: process.env.ZATA_BUCKET,
//       Key: file.s3_key,
//     };

//     try {
//       const s3Response = await s3.send(new GetObjectCommand(getObjectParams));
      
//       // Set headers for download
//       res.set({
//         'Content-Type': file.file_type,
//         'Content-Disposition': `attachment; filename="${file.file_name}"`, // Changed to attachment
//         'Content-Length': file.file_size // Added Content-Length
//       });
    
//       // Pipe the S3 stream to the response
//       s3Response.Body.pipe(res);
//     } catch (s3Error) {
//       console.error("S3 error:", s3Error);
//       res.status(500).json({ message: "Error retrieving file from storage" });
//     }
//   } catch (err) {
//     console.error("Error getting file:", err);
//     res.status(500).json({ message: "Error retrieving file" });
//   }
// });

// router.put("/folder/:folderId/rename", ensureAuthenticated, async (req, res) => {
//   try {
//     const { folderId } = req.params;
//     const { newName } = req.body;
//     const userId = req.user.id;

//     // Check if folder exists and belongs to user
//     const folderCheck = await pool.query(
//       "SELECT * FROM folders WHERE id = $1 AND user_id = $2",
//       [folderId, userId]
//     );

//     if (folderCheck.rows.length === 0) {
//       return res.status(404).json({ message: "Folder not found" });
//     }

//     // Update folder name
//     await pool.query(
//       "UPDATE folders SET folder_name = $1 WHERE id = $2 AND user_id = $3",
//       [newName, folderId, userId]
//     );

//     res.json({ message: "Folder renamed successfully" });
//   } catch (err) {
//     console.error("Error renaming folder:", err);
//     res.status(500).json({ message: "Failed to rename folder" });
//   }
// });

// // route for file viewing
// router.get("/files/:fileId/view", async (req, res) => {
//   try {
//     const { fileId } = req.params;
//     const token = req.query.token;

//     if (!token) {
//       return res.status(401).json({ message: "Authentication required" });
//     }

//     // Verify token and get user id
//     let userId;
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       userId = decoded.id;
//     } catch (tokenError) {
//       return res.status(401).json({ message: "Invalid or expired token" });
//     }

//     // Get file info from database
//     const fileResult = await pool.query(
//       "SELECT * FROM files WHERE id = $1 AND user_id = $2",
//       [fileId, userId]
//     );

//     if (fileResult.rows.length === 0) {
//       return res.status(404).json({ message: "File not found" });
//     }

//     const file = fileResult.rows[0];

//     // Get file from S3
//     const getObjectParams = {
//       Bucket: process.env.ZATA_BUCKET,
//       Key: file.s3_key,
//     };

//     const s3Response = await s3.send(new GetObjectCommand(getObjectParams));
    
//     // Set headers for inline viewing
//     res.set({
//       'Content-Type': file.file_type,
//       'Content-Disposition': `inline; filename="${file.file_name}"`,
//       'Content-Length': file.file_size,
//       'Cache-Control': 'no-store, no-cache, must-revalidate, private',
//       'Pragma': 'no-cache'
//     });

//     // Pipe the S3 stream to the response
//     s3Response.Body.pipe(res);

//   } catch (err) {
//     console.error("Error viewing file:", err);
//     res.status(500).json({ message: "Error viewing file" });
//   }
// });


// module.exports = router;


const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const {upload,handleMulterError} = require('../middlewares/uploadMiddleware');
const folderController = require('../controllers/folder.controller');
const fileController = require('../controllers/file.controller');

// Folder routes
router.get("/folders", ensureAuthenticated, folderController.getFolders);
router.post("/folder", ensureAuthenticated, folderController.createFolder);
router.delete("/folder/:folderId", ensureAuthenticated, folderController.deleteFolder);
router.put("/folder/:folderId/rename", ensureAuthenticated, folderController.renameFolder);
router.get("/folder/:folderName/storage", ensureAuthenticated, folderController.getFolderStorage);

// File routes
router.get("/folders/:folderName/files", ensureAuthenticated, fileController.getFilesInFolder);
router.post("/folders/:folderId/upload", ensureAuthenticated, upload.single('file'),handleMulterError, fileController.uploadFile);
router.get("/files/:fileId/download", ensureAuthenticated, fileController.downloadFile);
router.get("/files/:fileId/preview", ensureAuthenticated, fileController.previewFile);
router.get("/files/:fileId/view", fileController.viewFile);
router.delete("/files/:fileId", ensureAuthenticated, fileController.deleteFile);

module.exports = router;