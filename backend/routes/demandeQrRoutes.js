const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")

const {
    getAllTypePaiement, faireDemandeQr, getAllDemandesQr, getOneDemandeQr, uploadDemandeQr,
    downloadQrCodes, impressionDemandeQr, livraisonDemandeQr, receptionDemandeQr, getAllFormatsQr,
    regularisationDemandeQr, getAllFormFiles, modifyDemandeQr, cancelDemandeQr,
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
]), regularisationDemandeQr)
router.get('/getAllFormFiles/:id', getAllFormFiles);
router.put('/modifyDemandeQr/:id', uploadAll.fields([
    { name: 'files' },
]), modifyDemandeQr);
router.put('/cancelDemandeQr/:id', cancelDemandeQr);

module.exports = router