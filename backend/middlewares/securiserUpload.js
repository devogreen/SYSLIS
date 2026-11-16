// middlewares/securiserUpload.js
// Le body d'une requête multipart n'est rempli qu'après multer : la vérification
// "l'utilisateur de la requête est celui du token" (verifierUtilisateur) doit donc passer APRÈS l'upload.
// Cet enrobage ajoute verifierUtilisateur à chaque middleware multer, pour toutes les routes qui l'utilisent.
// Express accepte un tableau de middlewares à la place d'un middleware.
const { verifierUtilisateur } = require("./authMiddleware");

const securiserUpload = (instance) => ({
  single: (...args) => [instance.single(...args), verifierUtilisateur],
  array: (...args) => [instance.array(...args), verifierUtilisateur],
  fields: (...args) => [instance.fields(...args), verifierUtilisateur],
  any: (...args) => [instance.any(...args), verifierUtilisateur],
  none: (...args) => [instance.none(...args), verifierUtilisateur],
});

module.exports = securiserUpload;
