const multer = require("multer")

const storage = multer.memoryStorage(); 
 const upload = multer({ storage });

 const uploadStudentImages = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

module.exports = {uploadStudentImages, upload}