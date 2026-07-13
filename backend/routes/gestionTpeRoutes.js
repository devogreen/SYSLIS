const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    getParcTpe, getAllStatut, getTpeHistory, getTpeInfos, changeTpeStatut, extractSn, 
    changeListeStatut, getTpe, exportTpeToExcel,
} = require("../controllers/GestionTPE/gestionTpeController")

router.get('/getParcTpe', getParcTpe);
router.get('/getAllStatut', getAllStatut);
router.get('/getTpeHistory/:id', getTpeHistory);
router.get('/getTpeInfos/:sn', getTpeInfos);
router.put('/changeTpeStatut/:sn', changeTpeStatut);
router.post('/extractSn', uploadExcel.single("file"), extractSn);
router.post('/changeListeStatut', changeListeStatut);
router.get('/getTpe/:id', getTpe);
router.post('/exportTpeToExcel', exportTpeToExcel);

module.exports = router