const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    downloadTemplateRebut, extractRebut,
} = require("../controllers/Rebut/rebutController")

router.post('/downloadTemplateRebut', downloadTemplateRebut);
router.post('/extractRebut', uploadExcel.single('file'), extractRebut);

module.exports = router