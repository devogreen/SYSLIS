const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    faireDecom,
} = require("../controllers/Decom/decomController")

router.post('/faireDecom', uploadAll.fields([
    { name: 'files' },
]), faireDecom); 

module.exports = router