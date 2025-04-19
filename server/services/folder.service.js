const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/zataS3Client');
const pool = require('../config/db');

const getAllFolders = async (userId) => {
  const result = await pool.query(
    'SELECT id, folder_name, created_at, updated_at FROM folders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

const createFolder = async (userId, folderName) => {
  // Check if folder already exists
  const exists = await pool.query(
    'SELECT id FROM folders WHERE user_id = $1 AND folder_name = $2',
    [userId, folderName]
  );

  if (exists.rows.length > 0) {
    throw new Error('Folder with this name already exists');
  }

  const s3FolderKey = `uploads/${userId}/${folderName}/`;

  // Create folder marker in S3
  await s3.send(new PutObjectCommand({
    Bucket: process.env.ZATA_BUCKET,
    Key: `${s3FolderKey}.keep`,
    Body: 'keep folder'
  }));

  // Create folder in database
  const result = await pool.query(
    `INSERT INTO folders (user_id, folder_name, s3_key)
     VALUES ($1, $2, $3)
     RETURNING id, folder_name, created_at`,
    [userId, folderName, s3FolderKey]
  );

  return result.rows[0];
};

const deleteFolder = async (userId, folderId) => {
  // Get folder info
  const folderResult = await pool.query(
    'SELECT * FROM folders WHERE id = $1 AND user_id = $2',
    [folderId, userId]
  );

  if (folderResult.rows.length === 0) {
    throw new Error('Folder not found or unauthorized');
  }

  const folder = folderResult.rows[0];

  // Get all files in folder
  const filesResult = await pool.query(
    'SELECT s3_key FROM files WHERE folder_id = $1',
    [folderId]
  );

  // Delete all files from S3
  for (const file of filesResult.rows) {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.ZATA_BUCKET,
      Key: file.s3_key
    }));
  }

  // Delete folder marker from S3
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.ZATA_BUCKET,
    Key: `${folder.s3_key}.keep`
  }));

  // Delete files from database
  await pool.query('DELETE FROM files WHERE folder_id = $1', [folderId]);

  // Delete folder from database
  await pool.query('DELETE FROM folders WHERE id = $1', [folderId]);

  return folder;
};

const renameFolder = async (userId, folderId, newName) => {
  // Check if new name already exists
  const exists = await pool.query(
    'SELECT id FROM folders WHERE user_id = $1 AND folder_name = $2 AND id != $3',
    [userId, newName, folderId]
  );

  if (exists.rows.length > 0) {
    throw new Error('Folder with this name already exists');
  }

  // Update folder name
  const result = await pool.query(
    `UPDATE folders 
     SET folder_name = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND user_id = $3
     RETURNING id, folder_name, updated_at`,
    [newName, folderId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Folder not found or unauthorized');
  }

  return result.rows[0];
};

const getFolderById = async (userId, folderId) => {
  const result = await pool.query(
    'SELECT * FROM folders WHERE id = $1 AND user_id = $2',
    [folderId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Folder not found or unauthorized');
  }

  return result.rows[0];
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
        COALESCE(SUM(file_size), 0) as total_size,
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



module.exports = {
  getAllFolders,
  createFolder,
  deleteFolder,
  renameFolder,
  getFolderById,
  getFolderStorage
};