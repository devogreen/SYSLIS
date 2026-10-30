const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    faireDecom, getAllDecoms, getOneDecom, modifyDecom, cancelDecom, validationListeDecom, returnDecom,
    getSnDecom, verifyDecom, clotureDecom, regVerifyDecom, extractDecom, downloadTemplateDecom,
    exportOneDecomToExcel, getAllTpeRepare, extractSnReparation,
    getAllLivraisonReparation, getOneLivraisonReparation, receptionLivraisonReparation, 
    cloturerLivraisonReparation, miseEnReparationTpe, extractMiseEnReparation, downloadTemplateLiaisonTpePieces,
    extractLiaisonTpePiecesData, liaisonTpePieces, exportAllDecomToExcel, getPieceDefectueuseTpe,
    getPieceDefectueuseListeTpe, receptionDecom, transmisDecomMaintenance, validationTransmissionDecom,
    confirmDiagnosticDecom, cancelDiagnosticDecom,
} = require("../controllers/Decom/decomController")
const {
    getTpeParamMaintenance, livrerParamDecom, getAllLivraisonParamDecom, getOneLivraisonParamDecom,
    receptionLivraisonParamDecom, cloturerLivraisonParamDecom,
} = require("../controllers/Decom/livraisonParamDecomController")
const {
    reparerListeTpe, getAllReparationTpe, getOneReparationTpe, validerReparationTpe, livrerReparationTpe,
} = require("../controllers/Decom/reparationTpeController")

router.post('/faireDecom', uploadAll.fields([
    { name: 'files' },
]), faireDecom); 
router.get('/getAllDecoms', getAllDecoms);
router.get('/getOneDecom/:id', getOneDecom);
router.put('/modifyDecom/:id', uploadAll.fields([
    { name: 'files' },
]), modifyDecom);
router.put('/cancelDecom/:id', cancelDecom);
router.put('/validationListeDecom/:id',uploadAll.fields([
    { name: 'files' },
]), validationListeDecom);
router.put('/returnDecom/:id', returnDecom);
router.get('/getSnDecom/:id', getSnDecom);
router.put('/verifyDecom/:id', verifyDecom);
router.put('/clotureDecom/:id', clotureDecom);
router.put('/regVerifyDecom/:id', regVerifyDecom);
router.post('/extractDecom', uploadExcel.single('file'), extractDecom);
router.post('/downloadTemplateDecom', downloadTemplateDecom);
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
router.put('/receptionDecom/:id', receptionDecom);
router.put('/transmisDecomMaintenance/:id', transmisDecomMaintenance);
router.put('/validationTransmissionDecom/:id', uploadAll.fields([
    { name: 'files' },
]), validationTransmissionDecom);
router.put('/confirmDiagnosticDecom/:id', confirmDiagnosticDecom);
router.put('/cancelDiagnosticDecom/:id', cancelDiagnosticDecom);
// Livraisons des TPE en param maintenance
router.get('/getTpeParamMaintenance', getTpeParamMaintenance);
router.post('/livrerParamDecom', livrerParamDecom);
router.get('/getAllLivraisonParamDecom', getAllLivraisonParamDecom);
router.get('/getOneLivraisonParamDecom/:id', getOneLivraisonParamDecom);
router.put('/receptionLivraisonParamDecom/:id', receptionLivraisonParamDecom);
router.put('/cloturerLivraisonParamDecom/:id', cloturerLivraisonParamDecom);
// Réparation des TPE par lots (création -> validation -> livraison)
router.get('/getAllReparationTpe', getAllReparationTpe);
router.get('/getOneReparationTpe/:id', getOneReparationTpe);
router.put('/validerReparationTpe/:id', validerReparationTpe);
router.put('/livrerReparationTpe/:id', livrerReparationTpe);
module.exports = router
