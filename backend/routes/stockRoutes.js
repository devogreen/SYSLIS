const express = require("express")
const router = express.Router();
const { authentifier, verifierUtilisateur } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploads");
const uploadExcel = require("../middlewares/uploadExcel");


const {getAllItems, getAllModels, addPiece, getAllMouvementStock, getPiece, modifyPiece,
    getLotPiece, getCartonLot, getCartonPiece, getItemModels, getItemServices, getAllTypeMouvementStock,
    getOneMouvement, createStock,
    getAllStocks, getAllItemModels, getAllItemServices, getOneStock, getCartonStock, getLotStock, getOneStockMouvements,
    getStockParPiece, setStockSn, getAllUserTypeStocks, modifyStock,
    createMouvementStock, getAllStockSubOwners, getStocksFusionnables, associerStocks, deleteStock,
} = require("../controllers/Stock/stockController")


// Toutes les routes exigent un utilisateur connecté ; l'utilisateur envoyé dans la requête doit être celui du token.
// (verifierUtilisateur est répété après multer sur les routes multipart — le body n'existe qu'après l'upload — et sur les routes avec :userId dans l'URL.)
router.use(authentifier, verifierUtilisateur);

router.get('/getAllItems', getAllItems);
router.get('/getAllModels', getAllModels);
router.post('/addPiece', addPiece);
router.get('/getAllMouvementStock', getAllMouvementStock);
router.get('/getPiece/:id', getPiece);
router.put('/modifyPiece/:id', modifyPiece);
router.get('/getLotPiece/:item_id/:model_id/:service_id', getLotPiece);
router.get('/getCartonLot/:id', getCartonLot);
router.get('/getCartonPiece/:item_id/:model_id/:service_id', getCartonPiece);
router.get('/getItemModels/:id', getItemModels);
router.get('/getItemServices/:id', getItemServices);
router.get('/getAllTypeMouvementStock', getAllTypeMouvementStock);
router.get('/getOneMouvement/:id', getOneMouvement);
router.put('/createStock', createStock);
router.get('/getAllStocks', getAllStocks);
router.get('/getAllItemModels', getAllItemModels);
router.get('/getAllItemServices', getAllItemServices);
router.get('/getOneStock/:id', getOneStock);
router.get('/getCartonStock/:id', getCartonStock);
router.get('/getLotStock/:id', getLotStock);
router.get('/getOneStockMouvements/:id', getOneStockMouvements);
router.get('/getStockParPiece/:id', getStockParPiece);
router.post('/setStockSn', uploadExcel.single("file"), verifierUtilisateur, setStockSn);
router.get('/getAllUserTypeStocks/:itemId/:modelId/:serviceId', getAllUserTypeStocks);
router.put('/modifyStock/:id', modifyStock);
router.put('/createMouvementStock/:stockId', createMouvementStock);
router.get('/getAllStockSubOwners/:stockId', getAllStockSubOwners);
// Associer (fusionner) des stocks dans celui-ci / supprimer ce stock : propriétaire ou super administrateur
router.get('/getStocksFusionnables/:stockId/:userId', verifierUtilisateur, getStocksFusionnables);
router.put('/associerStocks/:stockId', associerStocks);
router.put('/supprimerStock/:stockId', deleteStock);
module.exports = router