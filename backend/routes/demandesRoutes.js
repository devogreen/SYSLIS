const express = require("express")
const router = express.Router();
const { authentifier, verifierUtilisateur } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
// const multer = require("multer")
// const upload = multer({ storage: multer.memoryStorage() });
const { faireDemande, getAllDemandes, getOneDemande, livraisonDemande, returnDemande,
    cancelDemande, updateDemande, generateDemandePDF, receivePiece, validateDemande,
    getAllDemandeFiles, downloadFile, getDemandesEnAttente, getDemandesValideesNonLivrees,
    regularisationDemande, regValidateDemande, regLivraisonDemande, regReceptionDemande,
    getStocksLivraison, getOptionsReception,
} = require("../controllers/Demande/demandeController")


// Toutes les routes exigent un utilisateur connecté ; l'utilisateur envoyé dans la requête doit être celui du token.
// (verifierUtilisateur est répété après multer sur les routes multipart — le body n'existe qu'après l'upload — et sur les routes avec :userId dans l'URL.)
router.use(authentifier, verifierUtilisateur);

router.post('/faireDemande', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), verifierUtilisateur, faireDemande);
router.get('/getAllDemandes', getAllDemandes);
router.get('/getOneDemande/:id', getOneDemande);
router.post('/livraisonDemande', livraisonDemande);
router.post('/returnDemande', returnDemande);
router.post('/cancelDemande', cancelDemande);
router.put('/updateDemande/:id', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), verifierUtilisateur, updateDemande);
router.get('/getPdf/:id', generateDemandePDF);
router.post('/receivePiece', uploadAll.fields([
    { name: 'signature'},
]), verifierUtilisateur, receivePiece);
router.post('/validateDemande', uploadAll.fields([
    { name: 'signature'},
]), verifierUtilisateur, validateDemande);
router.get('/getAllDemandeFiles/:idDemande', getAllDemandeFiles);
router.get("/downloadFile/:id", downloadFile);
router.get('/getDemandesEnAttente', getDemandesEnAttente);
router.get('/getDemandesValidees', getDemandesValideesNonLivrees);
router.post('/regularisationDemande', uploadAll.fields([
    { name: 'files', maxCount: 10 },
]), verifierUtilisateur, regularisationDemande);
router.post('/regValidateDemande', uploadAll.fields([
    { name: 'signature'},
]), verifierUtilisateur, regValidateDemande);
router.post('/regLivraisonDemande', regLivraisonDemande);
router.post('/regReceptionDemande', uploadAll.fields([
    { name: 'signature'},
]), verifierUtilisateur, regReceptionDemande);
router.get('/getStocksLivraison/:demandeId/:userId', verifierUtilisateur, getStocksLivraison);
router.get('/getOptionsReception/:demandeId/:userId', verifierUtilisateur, getOptionsReception);

module.exports = router
