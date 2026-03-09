const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = "uploads/files/";

    if (file.fieldname === "signature") {
      dir = "uploads/signatures/";
    }

    if(file.fieldname === "qrCodes") {
      dir = "uploads/qrCodes/"
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  }
});

const fileFilterUpload = (req, file, cb) => {

  const allowedDocs = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-outlook",   // .msg
    "message/rfc822"                // .eml
  ];

  if (file.fieldname === "signature") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Signature must be an image"));
    }

  } else if (file.fieldname === "files" || file.fieldname == "qrCodes") {

    const ext = path.extname(file.originalname).toLowerCase();

    const allowedExtensions = [
      ".pdf", ".doc", ".docx",
      ".xls", ".xlsx",
      ".jpg", ".jpeg", ".png",
      ".eml", ".msg"
    ];

    if (
      file.mimetype.startsWith("image/") ||
      allowedDocs.includes(file.mimetype) ||
      allowedExtensions.includes(ext)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }

  } else {
    cb(null, false);
  }
};

const uploadAll = multer({
  storage,
  fileFilterUpload,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = uploadAll