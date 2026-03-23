const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    getAllFormFiles, downloadFile,
} = require("../controllers/Files/filesController")

router.get('/getAllFormFiles/:id', getAllFormFiles);
router.get("/downloadFile/:id", downloadFile);

module.exports = router