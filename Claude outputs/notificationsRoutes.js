const express = require("express")
const router = express.Router();
const { authentifier } = require("../middlewares/authMiddleware");
const { getNotificationsSidebar, getListeNotifications } = require("../controllers/Notifications/notificationsController")

// L'utilisateur est celui du token : aucun identifiant n'est lu dans la requête.
router.use(authentifier);

router.get('/sidebar', getNotificationsSidebar);
router.get('/liste', getListeNotifications);

module.exports = router
