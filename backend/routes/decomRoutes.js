const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    faireDecom, getAllDecoms
} = require("../controllers/Decom/decomController")

router.post('/faireDecom', uploadAll.fields([
    { name: 'files' },
]), faireDecom); 
router.get('/getAllDecoms', getAllDecoms);

module.exports = router