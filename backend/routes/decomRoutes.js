const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    faireDecom, getAllDecoms, getOneDecom, modifyDecom, cancelDecom, receptionDecom, returnDecom,
    getSnDecom, verifyDecom, clotureDecom, regVerifyDecom, extractDecom, downloadTemplateDecom,
    exportOneDecomToExcel, getAllTpeRepare, extractSnReparation, reparerListeTpe,
    getAllLivraisonReparation, getOneLivraisonReparation, receptionLivraisonReparation, 
    cloturerLivraisonReparation, miseEnReparationTpe, extractMiseEnReparation, downloadTemplateLiaisonTpePieces,
    extractLiaisonTpePiecesData, liaisonTpePieces, exportAllDecomToExcel, getPieceDefectueuseTpe,
    getPieceDefectueuseListeTpe,
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
router.get('/getAllTpeRepare', getAllTpeRepare);
// router.put('/reparerTpe/:sn', reparerTpe);
router.post('/extractSnReparation', uploadExcel.single('file'), extractSnReparation);
router.post('/reparerListeTpe', reparerListeTpe);
router.get('/getAllLivraisonReparation', getAllLivraisonReparation);
router.get('/getOneLivraisonReparation/:id', getOneLivraisonReparation);
router.put('/receptionLivraisonReparation/:id', uploadAll.fields([
    { name: 'files' },
]), receptionLivraisonReparation);
router.put('/cloturerLivraisonReparation/:id', cloturerLivraisonReparation);
router.post('/miseEnReparationTpe', uploadAll.fields([
    { name: 'files' },
]), miseEnReparationTpe);
router.post('/extractMiseEnReparation', uploadExcel.single('file'), extractMiseEnReparation);
router.post('/downloadTemplateLiaisonTpePieces', downloadTemplateLiaisonTpePieces);
router.post('/extractLiaisonTpePiecesData', uploadExcel.single('file'), extractLiaisonTpePiecesData);
router.post('/liaisonTpePieces', liaisonTpePieces);
router.post('/exportAllDecomToExcel', exportAllDecomToExcel);
router.get('/getPieceDefectueuseTpe/:serial', getPieceDefectueuseTpe);
router.get('/getPieceDefectueuseListeTpe/:listeSn', getPieceDefectueuseListeTpe);
module.exports = router
