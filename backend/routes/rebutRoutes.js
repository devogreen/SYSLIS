const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    downloadTemplateRebut, extractRebut, demandeRebut, getAllDemandesRebut, getAllTpeRebuts,
    getTpeRebutDetails, changeLotPiece, recupPieceFonc, getAllPiecesRebut, getOneDemandeRebut,
    updateDemandeRebut, validateDemandeRebut, cloturerDemandeRebut,
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
router.get('/getAllPiecesRebut', getAllPiecesRebut);
router.get('/getOneDemandeRebut/:id', getOneDemandeRebut);
router.put('/updateDemandeRebut/:id', uploadAll.fields([
    { name: 'files' },
]), updateDemandeRebut)
router.put('/validateDemandeRebut/:id', uploadAll.fields([
    { name: 'files' },
]), validateDemandeRebut)
router.put('/cloturerDemandeRebut/:id', cloturerDemandeRebut)

module.exports = router