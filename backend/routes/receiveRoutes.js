const express = require("express")
const router = express.Router();
// Fiches, fichiers et exports : réservés aux rôles du module (voir middlewares/droitsModules.js)
const { accesModule, accesDemande, accesFichier, accesFichiersFormulaire } = require("../middlewares/droitsModules");
const multer = require("multer");
const securiserUpload = require("../middlewares/securiserUpload");
const { IMAGES, ErreurUpload, estAutorise } = require("../middlewares/filtresUpload");
const upload = securiserUpload(multer({
    dest: "uploads/",
    fileFilter: (req, file, cb) => estAutorise(file, IMAGES)
        ? cb(null, true)
        : cb(new ErreurUpload("La signature doit être une image PNG, JPG ou WEBP.")),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}));
const uploadAll = require("../middlewares/uploadAll")


const {createValidation,getAllValidations,getOneValidation,updateValidation,deleteValidation,returnDelivery,returnDemandeDelivery} = require("../controllers/Reveive/receiveController")

router.post("/receive", uploadAll.fields([
    { name: 'signature' },
]), createValidation);
router.get("/getAllValidations", getAllValidations);
router.get("/getOneValidation/:id", accesModule('livraison'), getOneValidation);
router.put("/updateValidation/:id", upload.single("signature"), updateValidation);
router.delete("/deleteValidation/:id", deleteValidation);
router.post("/returnDelivery", returnDelivery);
router.post("/returnDemandeDelivery", returnDemandeDelivery);


module.exports = router
