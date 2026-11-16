const express = require("express")
const router = express.Router();
// Fiches, fichiers et exports : réservés aux rôles du module (voir middlewares/droitsModules.js)
const { accesModule, accesDemande, accesFichier, accesFichiersFormulaire } = require("../middlewares/droitsModules");
const { verifierUtilisateur } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    downloadTemplateRebut, extractRebut, demandeRebut, getAllDemandesRebut, getAllTpeRebuts,
    getTpeRebutDetails, changeLotPiece, recupPieceFonc, getAllPiecesRebut, getOneDemandeRebut,
    updateDemandeRebut, validateDemandeRebut, cloturerDemandeRebut,
    getStocksPourRebut, createStockFromRebut,
} = require("../controllers/Rebut/rebutController")

router.post('/downloadTemplateRebut', downloadTemplateRebut);
router.post('/extractRebut', uploadExcel.single('file'), extractRebut);
router.post('/demandeRebut', uploadAll.fields([
    { name: 'files' },
]), demandeRebut);
router.get('/getAllDemandesRebut', getAllDemandesRebut); 
router.get('/getAllTpeRebuts', getAllTpeRebuts);
router.get('/getTpeRebutDetails/:id', accesModule('rebut'), getTpeRebutDetails);
router.put('/changeLotPiece/:id', changeLotPiece)
router.put('/recupPieceFonc/:id', recupPieceFonc)
router.get('/getAllPiecesRebut', getAllPiecesRebut);
router.get('/getStocksPourRebut/:pieceId/:modelId/:userId', verifierUtilisateur, getStocksPourRebut);
router.post('/createStockFromRebut', createStockFromRebut);
router.get('/getOneDemandeRebut/:id', accesModule('rebut'), getOneDemandeRebut);
router.put('/updateDemandeRebut/:id', uploadAll.fields([
    { name: 'files' },
]), updateDemandeRebut)
router.put('/validateDemandeRebut/:id', uploadAll.fields([
    { name: 'files' },
]), validateDemandeRebut)
router.put('/cloturerDemandeRebut/:id', cloturerDemandeRebut)

module.exports = router