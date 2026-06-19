const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    downloadTemplateRebut, extractRebut, demandeRebut, getAllDemandesRebut, getAllTpeRebuts,
    getTpeRebutDetails, changeLotPiece, recupPieceFonc,
} = require("../controllers/Rebut/rebutController")

router.post('/downloadTemplateRebut', downloadTemplateRebut);
router.post('/extractRebut', uploadExcel.single('file'), extractRebut);
router.post('/demandeRebut', uploadAll.fields([
    { name: 'files' },
]), demandeRebut);
router.get('/getAllDemandesRebut', getAllDemandesRebut); 
router.get('/getAllTpeRebuts', getAllTpeRebuts);
router.get('/getTpeRebutDetails/:id', getTpeRebutDetails);
router.put('/changeLotPiece/:id', changeLotPiece)
router.put('/recupPieceFonc/:id', recupPieceFonc)

module.exports = router