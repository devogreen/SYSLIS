const express = require("express")
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const uploadAll = require("../middlewares/uploadAll")


const {createValidation,getAllValidations,getOneValidation,updateValidation,deleteValidation,returnDelivery,returnDemandeDelivery} = require("../controllers/Reveive/receiveController")

router.post("/receive", uploadAll.fields([
    { name: 'signature' },
]), createValidation);
router.get("/getAllValidations", getAllValidations);
router.get("/getOneValidation/:id", getOneValidation);
router.put("/updateValidation/:id", upload.single("signature"), updateValidation);
router.delete("/deleteValidation/:id", deleteValidation);
router.post("/returnDelivery", returnDelivery);
router.post("/returnDemandeDelivery", returnDemandeDelivery);


module.exports = router
