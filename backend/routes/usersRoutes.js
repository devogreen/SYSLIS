const express = require("express")
const router = express.Router();
// const multer = require("multer")
// const upload = multer({ storage: multer.memoryStorage() });
const { authentifier, exigerRole, ROLE_GESTION_PROFILS, ROLE_SUPER_ADMIN } = require("../middlewares/authMiddleware")

// Gestion des comptes : rôle "Gestion des profils" (5) ou super administrateur (39)
const gestionProfils = exigerRole(ROLE_GESTION_PROFILS, ROLE_SUPER_ADMIN)
const { limiterConnexion, limiterMotDePasseOublie, limiterReinitialisation } = require("../middlewares/limiteur")
const {register,login,forgotPassword,resetPassword,updateUser,deleteUser,changePassword,logout,me,getAllUsers,getUserRoles,getAllUserRoles,getAllRoles,getAllServices,getAllUserServices,getOneUser,getUserServices} = require("../controllers/Users/usersController")

// Seuls login, forgot-password et reset-password sont publics (voir app.js) ; les autres routes exigent un token.
router.post("/register", authentifier, gestionProfils, register);
router.post("/login", limiterConnexion, login);
router.post("/forgot-password", limiterMotDePasseOublie, forgotPassword);
router.post("/reset-password/:token", limiterReinitialisation, resetPassword);
router.put("/updateUser/:id", authentifier, gestionProfils, updateUser);
router.delete("/delete/:id", authentifier, gestionProfils, deleteUser);
router.post("/change-password", authentifier, changePassword);
router.post("/logout", authentifier, logout);
router.get("/me", authentifier, me);
router.get("/getAllUsers",getAllUsers);
router.get("/getUserRoles/:id", getUserRoles);
router.get("/getAllUserRoles", getAllUserRoles);
router.get("/getAllRoles", getAllRoles);
router.get("/getAllServices", getAllServices);
router.get("/getAllUserServices", getAllUserServices);
router.get("/getOneUser/:id", getOneUser);
router.get("/getUserServices/:id", getUserServices);


module.exports = router
