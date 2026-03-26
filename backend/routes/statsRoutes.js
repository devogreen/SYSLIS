const express = require("express")
const router = express.Router();

const {nbdeliverycharger,nbreturncharger,nbexitcharger,nblivraisonpartype, nbdeliverychargeurperperdiod, statsreceveurs,nbetpepartypeparperiod,getGeneralStats,getLivraisonsParTypeLivre}=require("../controllers/Stats/statsController")

router.get("/nbdeliverycharger/:id", nbdeliverycharger)
router.get("/nbexitcharger/:id", nbexitcharger)
router.get("/nbreturncharger/:id", nbreturncharger)
router.get("/nblivraisonpartype/:id", nblivraisonpartype)
router.get("/nbdeliverychargeurperperdiod/:id", nbdeliverychargeurperperdiod)
router.get("/statsreceveurs/:id", statsreceveurs)
router.get("/nbetpepartypeparperiod/:id",nbetpepartypeparperiod)
router.get("/general", getGeneralStats)
router.get("/livraisons-par-type", getLivraisonsParTypeLivre)

module.exports = router
