const multer = require('multer');
const path = require('path');

const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only Excel files are allowed"));
    }

    cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

module.exports = uploadExcel;