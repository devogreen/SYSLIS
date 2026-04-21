const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
// const multer = require("multer")
// const upload = multer({ storage: multer.memoryStorage() });
const { faireDemande, getAllDemandes, getOneDemande, livraisonDemande, returnDemande,
    cancelDemande, updateDemande, generateDemandePDF, receivePiece, validateDemande,
    getAllDemandeFiles, downloadFile, getDemandesEnAttente, getDemandesValideesNonLivrees,
    regularisationDemande, regValidateDemande, regLivraisonDemande, regReceptionDemande,
} = require("../controllers/Demande/demandeController")

router.post('/faireDemande', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), faireDemande);
router.get('/getAllDemandes', getAllDemandes);
router.get('/getOneDemande/:id', getOneDemande);
router.post('/livraisonDemande', livraisonDemande);
router.post('/returnDemande', returnDemande);
router.post('/cancelDemande', cancelDemande);
router.put('/updateDemande/:id', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), updateDemande);
router.get('/getPdf/:id', generateDemandePDF);
router.post('/receivePiece', uploadAll.fields([
    { name: 'signature'},
]), receivePiece);
router.post('/validateDemande', uploadAll.fields([
    { name: 'signature'},
]), validateDemande);
router.get('/getAllDemandeFiles/:idDemande', getAllDemandeFiles);
router.get("/downloadFile/:id", downloadFile);
router.get('/getDemandesEnAttente', getDemandesEnAttente);
router.get('/getDemandesValidees', getDemandesValideesNonLivrees);
router.post('/regularisationDemande', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), regularisationDemande);
router.post('/regValidateDemande', uploadAll.fields([
    { name: 'signature'},
]), regValidateDemande);
router.post('/regLivraisonDemande', regLivraisonDemande);
router.post('/regReceptionDemande', uploadAll.fields([
    { name: 'signature'},
]), regReceptionDemande);

module.exports = router
