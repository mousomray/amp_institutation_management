const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.YOUR_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.YOUR_ACCESS_KEY,
    secretAccessKey: process.env.YOUR_SECRET_KEY,
  },
});

const uploadSingleImage = async (file) => {
  const key = `books/${Date.now()}-${file.originalname}`;
  console.log("Uploading file to S3 with key:", key);
  const uploadParams = {
    Bucket: process.env.BUCKETNAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.BUCKETNAME}.s3.${process.env.YOUR_BUCKET_REGION}.amazonaws.com/${key}`;
};

module.exports = uploadSingleImage;
