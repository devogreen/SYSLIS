const express = require("express")
const router = express.Router();

const { nbdeliverycharger, nbreturncharger, nbexitcharger, nblivraisonpartype,
    nbdeliverychargeurperperdiod, statsreceveurs, nbetpepartypeparperiod,
    getGeneralStats, getLivraisonsParTypeLivre, getChargerLivraisonWithdrawals,
    getChargerStockWithdrawals, getChargerMovementServiceOptions, getChargerWithdrawalsTimeSeries,
} = require("../controllers/Stats/statsController")
const {
    getRepartitionParcTpe, getFluxParcTpe, getTpesParStatut,
    getDureesParcTpe, getTimelineTpe, getModelesParcTpe, getParcoursTpe,
} = require("../controllers/Stats/parcTpeStatsController")
const { getEntonnoirDecom } = require("../controllers/Stats/decomStatsController")

router.get("/nbdeliverycharger/:id", nbdeliverycharger)
router.get("/nbexitcharger/:id", nbexitcharger)
router.get("/nbreturncharger/:id", nbreturncharger)
router.get("/nblivraisonpartype/:id", nblivraisonpartype)
router.get("/nbdeliverychargeurperperdiod/:id", nbdeliverychargeurperperdiod)
router.get("/statsreceveurs/:id", statsreceveurs)
router.get("/nbetpepartypeparperiod/:id", nbetpepartypeparperiod)
router.get("/general", getGeneralStats)
router.get("/livraisons-par-type", getLivraisonsParTypeLivre)
router.get("/getChargerWithdrawalsTimeSeries", getChargerWithdrawalsTimeSeries);
router.get("/getChargerMovementServiceOptions", getChargerMovementServiceOptions);
router.get("/getChargerLivraisonWithdrawals", getChargerLivraisonWithdrawals);
router.get("/getChargerStockWithdrawals", getChargerStockWithdrawals);

// Dashboard statistiques parc TPE (cycle de vie)
router.get("/parc-tpe/repartition", getRepartitionParcTpe);
router.get("/parc-tpe/flux", getFluxParcTpe);
router.get("/parc-tpe/tpes", getTpesParStatut);
router.get("/parc-tpe/durees", getDureesParcTpe);
router.get("/parc-tpe/timeline/:sn", getTimelineTpe);
router.get("/parc-tpe/modeles", getModelesParcTpe);
router.get("/parc-tpe/parcours", getParcoursTpe);

// Tableau de bord des décommissionnements
router.get("/decom/entonnoir", getEntonnoirDecom);

module.exports = router
