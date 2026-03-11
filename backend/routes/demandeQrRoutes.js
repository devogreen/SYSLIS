const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    getAllTypePaiement, faireDemandeQr, getAllDemandesQr, getOneDemandeQr, uploadDemandeQr,
    downloadQrCodes, impressionDemandeQr, livraisonDemandeQr, receptionDemandeQr, getAllFormatsQr,
    regularisationDemandeQrV2, getAllFormFiles, modifyDemandeQr, cancelDemandeQr, regularisationLivraisonDemandeQr,
    regularisationReceptionDemandeQr, extractMarchandsQr,
} = require("../controllers/Demande/demandeQrController")

router.get('/getAllTypePaiement', getAllTypePaiement);
router.post('/faireDemandeQr', uploadAll.fields([
    { name: 'files' },
]), faireDemandeQr);
router.get('/getAllDemandesQr', getAllDemandesQr);
router.get('/getOneDemandeQr/:id', getOneDemandeQr);
router.put('/uploadDemandeQr/:id', uploadAll.fields([
    { name: 'qrCodes' },
]), uploadDemandeQr);
router.get("/downloadQrCodes/:idDemande/:idGeneration", downloadQrCodes);
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
router.get('/getAllFormFiles/:id', getAllFormFiles);
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

module.exports = router