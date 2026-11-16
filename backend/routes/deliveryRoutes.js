const express = require("express")
const router = express.Router();
// Fiches, fichiers et exports : réservés aux rôles du module (voir middlewares/droitsModules.js)
const { accesModule, accesDemande, accesFichier, accesFichiersFormulaire } = require("../middlewares/droitsModules");
const { exigerRole, ROLE_SUPER_ADMIN } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
// const uploadDeliver = require("../middlewares/uploadDeliver");
// const multer = require("multer")
// const upload = multer({ storage: multer.memoryStorage() });
const {deliver,getAllLivraisons, getOneLivraison,deleteLivraison,updateLivraison, generateLivraisonPDF,
    deliverOld, deliverStock, getAllTypeLivraisonCommerciale, getAllStockDeliveries,
    getOneLivraisonDemande, receiveStock, addDeliveryType, getOneTypeLivraison, updateTypeLivraison,
    deleteTypeLivraison, updateDeliveryStock, generateTotalLivraisonPDF,getAllTypeParametrage, makeRemplacement,
    getAllRemplacements, getOneRemplacement, validateRemplacement, generateDeliveriesXLSX, generateRemplacementsXLSX,
    updateRemplacement, returnRemplacement, generateRemplacementPDF, regLivraison, regReception,
    deliverregularisation,regularisationReception,getLivraisonsInRange,getStatsLivraisons, regRemplacement,
} = require("../controllers/Delivery/deliveryController")

router.post('/deliver', uploadAll.fields([
    { name: 'signature' },
]), deliver);
router.get("/getAllLivraisons", getAllLivraisons);
router.get("/getOneLivraison/:id", accesModule('livraison'), getOneLivraison);
router.put("/updateLivraison/:id", updateLivraison);
// Suppression (logique) : méthode DELETE et super administrateur uniquement (une action ne passe jamais par un GET)
router.delete("/deleteLivraison/:id", exigerRole(ROLE_SUPER_ADMIN), deleteLivraison);
router.get("/pdf/:id", accesModule('livraison'), generateLivraisonPDF);
router.post("/deliverOld", deliverOld);
router.post("/deliverStock", uploadAll.fields([
    { name: 'signature' },
]), deliverStock);
router.get("/getAllTypeLivraisonCommerciale", getAllTypeLivraisonCommerciale);
router.get("/getAllStockDeliveries", getAllStockDeliveries);
router.get("/getOneLivraisonDemande/:id", accesDemande('id'), getOneLivraisonDemande);
router.post("/receiveStock", upload.single('signature'), receiveStock);
router.post("/addDeliveryType", addDeliveryType);
router.get("/getOneTypeLivraison/:id", getOneTypeLivraison);
router.put("/updateTypeLivraison/:id", updateTypeLivraison);
router.put("/deleteTypeLivraison/:id", deleteTypeLivraison);
router.put("/updateDeliveryStock/:id", updateDeliveryStock);
router.post("/totalPdf", accesModule('livraison'), generateTotalLivraisonPDF);
router.get("/getAllTypeParametrage", getAllTypeParametrage);
router.post("/makeRemplacement", uploadAll.fields([
    { name: 'signature' },
]), makeRemplacement);
router.get("/getAllRemplacements", getAllRemplacements);
router.get("/getOneRemplacement/:id", accesModule('livraison'), getOneRemplacement);
router.post("/validateRemplacement", uploadAll.fields([
    { name: 'signature' },
]), validateRemplacement);
router.post("/generateDeliveriesXLSX", accesModule('livraison'), generateDeliveriesXLSX);
router.post("/generateRemplacementsXLSX", accesModule('livraison'), generateRemplacementsXLSX);
router.put("/updateRemplacement/:id", updateRemplacement);
router.post("/returnRemplacement", returnRemplacement);
router.get("/generateRemplacementPDF/:id", accesModule('livraison'), generateRemplacementPDF);
router.post('/regLivraison', uploadAll.fields([
    { name: 'signature' },
]), regLivraison);
router.post('/regReception', uploadAll.fields([
    { name: 'signature' },
]), regReception);
// router.get("/livraisons-stats",getStatsLivraisons);
// router.get("/statsLivraisons", require("../controllers/Delivery/statsLivraisonsController").getStatsLivraisons);
router.get('/livraisons-in-range', getLivraisonsInRange);
router.post('/regRemplacement', uploadAll.fields([
    { name: 'signature' },
]), regRemplacement);

module.exports = router
