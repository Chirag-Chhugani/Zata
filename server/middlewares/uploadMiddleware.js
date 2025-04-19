const multer = require('multer');

// Configure multer storage
const storage = multer.memoryStorage();

// Create multer instance with configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file types
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('application/') ||
      file.mimetype === 'text/plain'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, documents, and text files are allowed.'), false);
    }
  }
});

// Error handling middleware for multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'File is too large. Maximum size is 500MB'
      });
    }
    return res.status(400).json({
      message: `Upload error: ${error.message}`
    });
  } else if (error) {
    return res.status(400).json({
      message: error.message
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError
};