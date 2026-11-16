const express = require("express")
const router = express.Router();
// Fiches, fichiers et exports : réservés aux rôles du module (voir middlewares/droitsModules.js)
const { accesModule, accesDemande, accesFichier, accesFichiersFormulaire } = require("../middlewares/droitsModules");
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    getAllTypePaiement, faireDemandeQr, getAllDemandesQr, getOneDemandeQr, uploadDemandeQr,
    downloadQrCodes, impressionDemandeQr, livraisonDemandeQr, receptionDemandeQr, getAllFormatsQr,
    regularisationDemandeQrV2, getAllFormFiles, modifyDemandeQr, cancelDemandeQr, regularisationLivraisonDemandeQr,
    regularisationReceptionDemandeQr, extractMarchandsQr, getAllMarchandsQr, getCumulQrCodes, downloadTemplateQr,
    exportTotalDemandesQrToExcel, exportOneDemandeQrToExcel, getAllDataDemandeQr, getDataImpressionQr,
    suspendreDemandeQr, annulationSuspensionQr,
} = require("../controllers/Demande/demandeQrController")

router.get('/getAllTypePaiement', getAllTypePaiement);
router.post('/faireDemandeQr', uploadAll.fields([
    { name: 'files' },
]), faireDemandeQr);
router.get('/getAllDemandesQr', getAllDemandesQr);
router.get('/getOneDemandeQr/:id', accesModule('qr'), getOneDemandeQr);
router.put('/uploadDemandeQr/:id', uploadAll.fields([
    { name: 'qrCodes' },
]), uploadDemandeQr);
router.get("/downloadQrCodes/:idDemande/:idGeneration", accesModule('qr'), downloadQrCodes);
router.put('/impressionDemandeQr/:idDemande/:idGeneration', impressionDemandeQr);
router.put('/livraisonDemandeQr/:idDemande', uploadAll.fields([
    { name: 'signature' },
]), livraisonDemandeQr);
router.put('/receptionDemandeQr/:idDemande/:idLivraison', uploadAll.fields([
    { name: 'signature' },
]), receptionDemandeQr);
router.get('/getAllFormatsQr', getAllFormatsQr);
router.post('/regularisationDemandeQr', uploadAll.fields([
    { name: 'signature' },
    { name: 'files' },
]), regularisationDemandeQrV2)
router.get('/getAllFormFiles/:id', accesModule('qr'), getAllFormFiles);
router.put('/modifyDemandeQr/:id', uploadAll.fields([
    { name: 'files' },
]), modifyDemandeQr);
router.put('/cancelDemandeQr/:id', cancelDemandeQr);
router.put('/regularisationLivraisonDemandeQr/:idDemande', uploadAll.fields([
    { name: 'signature' },
]), regularisationLivraisonDemandeQr);
router.put('/regularisationReceptionDemandeQr/:idDemande/:idLivraison', uploadAll.fields([
    { name: 'signature' },
]), regularisationReceptionDemandeQr);
router.post('/extractMarchandsQr', uploadExcel.single("file"), extractMarchandsQr);
router.get('/getAllMarchandsQr', getAllMarchandsQr);
router.get('/getCumulQrCodes', getCumulQrCodes);
router.post('/downloadTemplateQr', downloadTemplateQr);
router.get('/exportTotalDemandesQrToExcel', accesModule('qr'), exportTotalDemandesQrToExcel);
router.get('/exportOneDemandeQrToExcel/:idDemande', accesModule('qr'), exportOneDemandeQrToExcel);
router.get('/getAllDataDemandeQr', getAllDataDemandeQr);
router.get('/getDataImpressionQr', getDataImpressionQr);
router.put('/suspendreDemandeQr/:id', suspendreDemandeQr);
router.put('/annulationSuspensionQr/:id', annulationSuspensionQr);
module.exports = router