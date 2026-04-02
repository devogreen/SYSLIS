const multer = require("multer");
const path = require("path");

const TEST_ENV = require("../utils/consts")

const localUrl = "uploads"
const serverUrl =  "../syslisUploads"
let baseUrl = serverUrl
if (TEST_ENV) {
  baseUrl = localUrl
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${baseUrl}/uploadsFiles/`);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const uploadFiles = multer({ storage });

module.exports = uploadFiles;