const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    faireDecom, getAllDecoms, getOneDecom, modifyDecom, cancelDecom, receptionDecom, returnDecom,
    getSnDecom, verifyDecom, clotureDecom, regVerifyDecom, extractDecom, downloadTemplateDecom,
    exportOneDecomToExcel,
} = require("../controllers/Decom/decomController")

router.post('/faireDecom', uploadAll.fields([
    { name: 'files' },
]), faireDecom); 
router.get('/getAllDecoms', getAllDecoms);
router.get('/getOneDecom/:id', getOneDecom);
router.put('/modifyDecom/:id', uploadAll.fields([
    { name: 'files' },
]), modifyDecom);
router.put('/cancelDecom/:id', cancelDecom);
router.put('/receptionDecom/:id', receptionDecom);
router.put('/returnDecom/:id', returnDecom);
router.get('/getSnDecom/:id', getSnDecom);
router.put('/verifyDecom/:id', verifyDecom);
router.put('/clotureDecom/:id', clotureDecom);
router.put('/regVerifyDecom/:id', regVerifyDecom);
router.post('/extractDecom', uploadExcel.single('file'), extractDecom);
router.get('/downloadTemplateDecom', downloadTemplateDecom);
router.get('/exportOneDecomToExcel/:id', exportOneDecomToExcel);
module.exports = router