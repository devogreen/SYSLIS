const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadExcel = require("../middlewares/uploadExcel");


const {getAllItems, setStockPiece, getAllModels, addPiece, getAllMouvementStock, getPiece, modifyPiece,
    getLotPiece, getCartonLot, getCartonPiece, getItemModels, getItemServices, getQuantitePiece, getAllTypeMouvementStock,
    setStockCarton, setStockPieceCarton, setStockLot, setStockCartonLot, getOneMouvement, createStock,
    getAllStocks, getAllItemModels, getAllItemServices, getOneStock, getCartonStock, getLotStock, getOneStockMouvements,
    getStockParPiece, getAllOneQuantitePiece, setStockSn, getAllUserTypeStocks, modifyStock,
    createMouvementStock, getAllStockSubOwners,
} = require("../controllers/Stock/stockController")

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
router.get('/getQuantitePiece/:item_id/:model_id/:service_id', getQuantitePiece);
router.get('/getAllTypeMouvementStock', getAllTypeMouvementStock);
router.put('/setStockPiece/:item_id/:model_id/:service_id', setStockPiece);
router.put('/setStockCarton/:item_id/:model_id/:service_id', setStockCarton);
router.put('/setStockPieceCarton/:item_id/:model_id/:service_id', setStockPieceCarton);
router.put('/setStockCartonLot/:item_id/:model_id/:service_id', setStockCartonLot);
router.put('/setStockLot/:item_id/:model_id/:service_id', setStockLot);
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
router.get('/getAllOneQuantitePiece/:id', getAllOneQuantitePiece);
router.post('/setStockSn', uploadExcel.single("file"), setStockSn);
router.get('/getAllUserTypeStocks/:itemId/:modelId/:serviceId', getAllUserTypeStocks);
router.put('/modifyStock/:id', modifyStock);
router.put('/createMouvementStock/:stockId', createMouvementStock);
router.get('/getAllStockSubOwners/:stockId', getAllStockSubOwners);
module.exports = router