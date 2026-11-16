// middlewares/droitsModules.js
// Accès aux enregistrements par module (fiche ouverte par id, fichiers joints, PDF et exports Excel).
// Règle : seuls les rôles du module (et le super administrateur) y ont accès.
// Les listes et tableaux de bord ne sont pas concernés (visibles par tous les utilisateurs connectés).
const prisma = require("../prisma/client");
const { aUnRole, ROLE_SUPER_ADMIN } = require("./authMiddleware");
const { whereResponsablesStocks } = require("../utils/gestionStock");

// Rôles par module (voir le chapitre « Rôles » du guide utilisateur)
const ROLES_MODULES = {
  // 1 livraison, 2 reception, 6 modification, 8/9/10 reception_commerciale/support/maintenance,
  // 13 supervision_livraisons, 14 gestion_livraisons
  livraison: [1, 2, 6, 8, 9, 10, 13, 14],
  // 3 demande, 4 validation, 6 modification, 7 gestion_stock, 11 voir_demande, 12 reception_piece
  // (+ responsables d'un stock de la pièce demandée, et le demandeur : voir accesDemande)
  demande: [3, 4, 6, 7, 11, 12],
  // 15 à 22 : demande, génération, impression, livraison, réception, téléchargement, admin, supervision QR
  qr: [15, 16, 17, 18, 19, 20, 21, 22],
  // 23 decom, 24 reception_decom, 25 verification_decom, 26 supervision_decom, 29 cloture_decom,
  // 35 reparation, 36 reception_reparation, 37 supervision_reparation, 38 validation_decom
  decom: [23, 24, 25, 26, 29, 35, 36, 37, 38],
  // 30 demande, 31 validation, 32 gestion, 33 supervision, 34 admin rebut
  rebut: [30, 31, 32, 33, 34],
};

// Module d'un fichier joint (fichiers.type_formulaire)
const MODULE_FICHIER = {
  livraison: "livraison",
  remplacement: "livraison",
  demande: "demande",
  demande_qr: "qr",
  decom: "decom",
  mise_en_reparation_tpe: "decom",
  reparation_tpe: "decom",
  rebut: "rebut",
};

const MESSAGE_REFUS = "Vous n'avez pas les droits pour consulter cet élément.";

const aLeRoleDuModule = (req, module) => aUnRole(req, [...ROLES_MODULES[module], ROLE_SUPER_ADMIN]);

// Middleware : rôles du module requis
const accesModule = (module) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Vous devez être connecté." });
  if (aLeRoleDuModule(req, module)) return next();
  return res.status(403).json({ message: MESSAGE_REFUS });
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const lireJson = (texte) => {
  try {
    return typeof texte === "string" ? JSON.parse(texte) : texte || {};
  } catch (e) {
    return {};
  }
};

// Demande de stock : rôles du module, OU demandeur / créateur de la demande,
// OU responsable (propriétaire, sous-propriétaire) d'un stock de la pièce demandée — c'est lui qui livre.
const peutVoirDemande = async (req, demandeId) => {
  if (aLeRoleDuModule(req, "demande")) return true;
  const demande = await prisma.demandes.findUnique({
    where: { id: demandeId },
    select: { user_id: true, id_demandeur: true, item_id: true, details_demande: true },
  });
  if (!demande) return true; // le contrôleur répondra 404
  const userId = req.user.id_user;
  if (demande.user_id === userId || demande.id_demandeur === userId) return true;
  if (!demande.item_id) return false;
  const details = lireJson(demande.details_demande) || {};
  const responsable = await prisma.users.count({
    where: {
      id_user: userId,
      ...whereResponsablesStocks({
        pieceId: demande.item_id,
        modelId: toInt(details.selectedModel ?? details.model),
        serviceId: toInt(details.selectedServicePiece ?? details.service),
      }),
    },
  });
  return responsable > 0;
};

// Middleware : demande de stock dont l'id est dans req.params[param]
const accesDemande = (param = "id") => async (req, res, next) => {
  try {
    const demandeId = toInt(req.params[param]);
    if (!demandeId) return next(); // le contrôleur répondra 400
    if (await peutVoirDemande(req, demandeId)) return next();
    return res.status(403).json({ message: MESSAGE_REFUS });
  } catch (error) {
    console.error("Erreur lors du contrôle d'accès à la demande :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Accès à un fichier selon le module de son formulaire
const peutVoirFichier = async (req, fichier) => {
  const module = MODULE_FICHIER[fichier.type_formulaire];
  if (!module) return aUnRole(req, [ROLE_SUPER_ADMIN]);
  if (module === "demande") {
    if (fichier.demande_id) return peutVoirDemande(req, fichier.demande_id);
    return aLeRoleDuModule(req, "demande");
  }
  return aLeRoleDuModule(req, module);
};

// Middleware : fichier dont l'id est dans req.params[param]
const accesFichier = (param = "id") => async (req, res, next) => {
  try {
    const fichierId = toInt(req.params[param]);
    if (!fichierId) return next();
    const fichier = await prisma.fichiers.findUnique({
      where: { id: fichierId },
      select: { type_formulaire: true, demande_id: true },
    });
    if (!fichier) return next(); // le contrôleur répondra 404
    if (await peutVoirFichier(req, fichier)) return next();
    return res.status(403).json({ message: MESSAGE_REFUS });
  } catch (error) {
    console.error("Erreur lors du contrôle d'accès au fichier :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Middleware : fichiers d'un formulaire (forms.id dans req.params[param]) — tous doivent être accessibles
const accesFichiersFormulaire = (param = "id") => async (req, res, next) => {
  try {
    const formId = toInt(req.params[param]);
    if (!formId) return next();
    const fichiers = await prisma.fichiers.findMany({
      where: { form_id: formId },
      select: { type_formulaire: true, demande_id: true },
    });
    for (const fichier of fichiers) {
      if (!(await peutVoirFichier(req, fichier))) return res.status(403).json({ message: MESSAGE_REFUS });
    }
    return next();
  } catch (error) {
    console.error("Erreur lors du contrôle d'accès aux fichiers :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

module.exports = { ROLES_MODULES, accesModule, accesDemande, accesFichier, accesFichiersFormulaire };
