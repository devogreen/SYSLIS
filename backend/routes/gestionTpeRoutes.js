const express = require("express")
const router = express.Router();
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    getParcTpe, getAllStatut, getTpeHistory,
} = require("../controllers/GestionTPE/gestionTpeController")

router.get('/getParcTpe', getParcTpe);
router.get('/getAllStatut', getAllStatut);
router.get('/getTpeHistory/:id', getTpeHistory);


module.exports = router