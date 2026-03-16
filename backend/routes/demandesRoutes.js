const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
// const multer = require("multer")
// const upload = multer({ storage: multer.memoryStorage() });
const { faireDemande, getAllDemandes, getOneDemande, validateDemande, returnDemande,
    cancelDemande, updateDemande, generateDemandePDF, receivePiece, preValidateDemande,
    getAllDemandeFiles, downloadFile, getDemandesEnAttente, getDemandesValideesNonLivrees,
    regularisationDemande, regValidateDemande,
} = require("../controllers/Demande/demandeController")

router.post('/faireDemande', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), faireDemande);
router.get('/getAllDemandes', getAllDemandes);
router.get('/getOneDemande/:id', getOneDemande);
router.post('/validateDemande', validateDemande);
router.post('/returnDemande', returnDemande);
router.post('/cancelDemande', cancelDemande);
router.put('/updateDemande/:id', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), updateDemande);
router.get('/getPdf/:id', generateDemandePDF);
router.post('/receivePiece', upload.single("signature"), receivePiece);
router.post('/preValidateDemande', upload.single("signature"), preValidateDemande);
router.get('/getAllDemandeFiles/:idDemande', getAllDemandeFiles);
router.get("/downloadFile/:id", downloadFile);
router.get('/getDemandesEnAttente', getDemandesEnAttente);
router.get('/getDemandesValidees', getDemandesValideesNonLivrees);
router.post('/regularisationDemande', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), regularisationDemande);
router.post('/regValidateDemande',  uploadAll.fields([
    { name: 'signature'},
]), regValidateDemande);

module.exports = router
