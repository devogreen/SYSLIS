const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
// const uploadDeliver = require("../middlewares/uploadDeliver");
// const multer = require("multer")
// const upload = multer({ storage: multer.memoryStorage() });
const {deliver,getAllLivraisons, getOneLivraison,deleteLivraison,updateLivraison, generateLivraisonPDF,
    deliverOld, deliverStock, getAllTypeLivraisonCommerciale, getAllStockDeliveries,
    getOneLivraisonDemande, receiveStock, addDeliveryType, getOneTypeLivraison, updateTypeLivraison,
    deleteTypeLivraison, updateDeliveryStock, generateTotalLivraisonPDF,getAllTypeParametrage, makeRemplacement,
    getAllRemplacements, getOneRemplacement, validateRemplacement, generateDeliveriesXLSX, generateRemplacementsXLSX,
    updateRemplacement, returnRemplacement, generateRemplacementPDF,deliverregularisation,regularisationReception,
} = require("../controllers/Delivery/deliveryController")

// router.post('/deliver', uploadDeliver.fields([
//     { name: "signature_expediteur", maxCount: 1 },
//     { name: "files", maxCount: 10 }
// ]), deliver
// );
router.post('/deliverregularisation', upload.single('signature_expediteur'), deliverregularisation);
router.post('/regularisationReception', upload.single('signature_expediteur'), regularisationReception);
router.post('/deliver', upload.single('signature_expediteur'), deliver);
router.get("/getAllLivraisons", getAllLivraisons);
router.get("/getOneLivraison/:id", getOneLivraison);
router.put("/updateLivraison/:id", updateLivraison);
router.get("/deleteLivraison/:id", deleteLivraison);
router.get("/pdf/:id", generateLivraisonPDF);
router.post("/deliverOld", deliverOld);
router.post("/deliverStock", upload.single('signature_expediteur'), deliverStock);
router.get("/getAllTypeLivraisonCommerciale", getAllTypeLivraisonCommerciale);
router.get("/getAllStockDeliveries", getAllStockDeliveries);
router.get("/getOneLivraisonDemande/:id", getOneLivraisonDemande);
router.post("/receiveStock", upload.single('signature'), receiveStock);
router.post("/addDeliveryType", addDeliveryType);
router.get("/getOneTypeLivraison/:id", getOneTypeLivraison);
router.put("/updateTypeLivraison/:id", updateTypeLivraison);
router.put("/deleteTypeLivraison/:id", deleteTypeLivraison);
router.put("/updateDeliveryStock/:id", updateDeliveryStock);
router.post("/totalPdf", generateTotalLivraisonPDF);
router.get("/getAllTypeParametrage", getAllTypeParametrage);
router.post("/makeRemplacement", upload.single('signature_expediteur'), makeRemplacement);
router.get("/getAllRemplacements", getAllRemplacements);
router.get("/getOneRemplacement/:id", getOneRemplacement);
router.post("/validateRemplacement", upload.single('signature'), validateRemplacement);
router.post("/generateDeliveriesXLSX", generateDeliveriesXLSX);
router.post("/generateRemplacementsXLSX", generateRemplacementsXLSX);
router.put("/updateRemplacement/:id", updateRemplacement);
router.post("/returnRemplacement", returnRemplacement);
router.get("/generateRemplacementPDF/:id", generateRemplacementPDF);

module.exports = router
