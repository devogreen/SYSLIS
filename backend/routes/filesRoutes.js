const express = require("express")
const router = express.Router();
// Fiches, fichiers et exports : réservés aux rôles du module (voir middlewares/droitsModules.js)
const { accesModule, accesDemande, accesFichier, accesFichiersFormulaire } = require("../middlewares/droitsModules");
const upload = require("../middlewares/uploads");
const uploadAll = require("../middlewares/uploadAll")
const uploadExcel = require("../middlewares/uploadExcel");

const {
    getAllFormFiles, downloadFile,
} = require("../controllers/Files/filesController")

router.get('/getAllFormFiles/:id', accesFichiersFormulaire('id'), getAllFormFiles);
router.get("/downloadFile/:id", accesFichier('id'), downloadFile);

module.exports = router