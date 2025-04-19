const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/zataS3Client');
const pool = require('../config/db');

const getFilesInFolder = async (userId, folderName) => {
    try {
      // First find the folder ID based on the folder_name
      const folderQuery = `
        SELECT id, folder_name, s3_key, created_at, updated_at
        FROM folders
        WHERE folder_name = $1 AND user_id = $2
      `;
      
      const folderResult = await pool.query(folderQuery, [folderName, userId]);
      
      if (folderResult.rows.length === 0) {
        throw new Error("Folder not found or unauthorized");
      }
  
      const folder = folderResult.rows[0];
  
      // Now fetch all files using uploaded_at instead of created_at
      const filesQuery = `
        SELECT 
          id, 
          file_name, 
          file_type, 
          file_size, 
          s3_key, 
          uploaded_at
        FROM files
        WHERE folder_id = $1 AND user_id = $2
        ORDER BY uploaded_at DESC
      `;
      const filesResult = await pool.query(filesQuery, [folder.id, userId]);
  
      return {
        folder: {
          id: folder.id,
          name: folder.folder_name,
          s3_key: folder.s3_key,
          created_at: folder.created_at,
          updated_at: folder.updated_at
        },
        files: filesResult.rows.map(file => ({
          ...file,
          size: formatFileSize(file.file_size)
        }))
      };
    } catch (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
  };
  
  // Utility function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

const uploadFile = async (userId, folderId, file) => {
  // Check folder exists and belongs to user
  const folderCheck = await pool.query(
    'SELECT * FROM folders WHERE id = $1 AND user_id = $2',
    [folderId, userId]
  );

  if (folderCheck.rows.length === 0) {
    throw new Error('Folder not found or unauthorized');
  }

  const folder = folderCheck.rows[0];
  const s3Key = `${folder.s3_key}${Date.now()}-${file.originalname}`;

  // Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: process.env.ZATA_BUCKET,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));

  // Save to database
  const result = await pool.query(
    `INSERT INTO files (user_id, folder_id, file_name, file_type, file_size, s3_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, folderId, file.originalname, file.mimetype, file.size, s3Key]
  );

  return result.rows[0];
};

const downloadFile = async (userId, fileId) => {
  const file = await getFileById(userId, fileId);
  
  const command = new GetObjectCommand({
    Bucket: process.env.ZATA_BUCKET,
    Key: file.s3_key
  });

  const s3Response = await s3.send(command);
  return { s3Response, file };
};

const viewFile = async (fileId, token) => {
  // Verify token and get user id
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.id;

  const file = await getFileById(userId, fileId);
  
  const command = new GetObjectCommand({
    Bucket: process.env.ZATA_BUCKET,
    Key: file.s3_key
  });

  const s3Response = await s3.send(command);
  return { s3Response, file };
};

const deleteFile = async (userId, fileId) => {
  const file = await getFileById(userId, fileId);

  // Delete from S3
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.ZATA_BUCKET,
    Key: file.s3_key
  }));

  // Delete from database
  await pool.query('DELETE FROM files WHERE id = $1 AND user_id = $2', 
    [fileId, userId]
  );

  return file;
};

const getFileById = async (userId, fileId) => {
    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );
  
    if (result.rows.length === 0) {
      throw new Error('File not found or unauthorized');
    }
  
    return result.rows[0];
  };
  
  const getFileContent = async (userId, fileId) => {
    const file = await getFileById(userId, fileId);
    
    const command = new GetObjectCommand({
      Bucket: process.env.ZATA_BUCKET,
      Key: file.s3_key
    });
  
    try {
      return await s3.send(command);
    } catch (error) {
      console.error("❌ S3 error:", error);
      throw new Error('Failed to retrieve file from storage');
    }
  };

module.exports = {
  getFilesInFolder,
  uploadFile,
  downloadFile,
  viewFile,
  deleteFile,
  getFileById,
  getFileContent
};