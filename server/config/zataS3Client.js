const { S3Client } = require("@aws-sdk/client-s3");

const zataS3Client = new S3Client({
  region: "idr01", // or your region if required
  endpoint: process.env.ZATA_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.ZATA_ACCESS_KEY,
    secretAccessKey: process.env.ZATA_SECRET_KEY,
  },
});

module.exports = zataS3Client;
