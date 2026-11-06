const TEST_ENV = require("../../utils/consts")

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const prisma = require('../../prisma/client');
const { toModelId } = require("../../utils/parcTpeModele");
const {
  HttpError,
  TYPES_MOUVEMENT,
  ACTIONS_RECEPTION,
  toInt,
  parseJson,
  estResponsableStock,
  debiterStockLivraison,
  construireDetailsLivraison,
  lireContenuLivre,
  whereStocksAlimentables,
  mettreEnStockReception,
  quantiteDansUnite,
  detailsSansLivraison,
  bilanLivraisons,
  suiviLivraisons,
  appliquerStatutParc,
} = require("../../utils/stockDemande");

const { estSuperAdmin, whereResponsablesStocks } = require("../../utils/gestionStock");

// Responsables des stocks actifs pouvant livrer la demande (destinataires des mails de validation).
// Calculé côté serveur : la liste « owners » envoyée par l'écran est ignorée.
const responsablesStocksDemande = async (demande) => {
  const details = parseJson(demande.details_demande, {}) || {}
  return prisma.users.findMany({
    where: whereResponsablesStocks({
      pieceId: demande.item_id,
      modelId: toInt(details.selectedModel ?? details.model),
      serviceId: toInt(details.selectedServicePiece ?? details.service),
    }),
    select: { id_user: true, email: true, fullname: true },
  })
}

// Une demande se livre (en une ou plusieurs fois) tant qu'elle est validée ou partiellement livrée
const STATUTS_LIVRABLES = ['valide', 'partiel']

/**
 * Contrôles serveur de la saisie d'une demande (création, régularisation, modification).
 * Renvoie les valeurs sûres : détails, quantité entière > 0, service demandeur, demandeur (nom relu en base).
 * Le modèle et le service de la pièce sont vérifiés quand ils sont fournis (et doivent être rattachés à la pièce
 * quand la pièce a une liste de modèles / services).
 */
const validerSaisieDemande = async (db, { detailsDemande, quantite, serviceUser, selectedUser, userId, otherFields }) => {
  const details = parseJson(detailsDemande, null)
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    throw new HttpError(400, "Détails de la demande invalides.")
  }
  const pieceId = toInt(details.selectedPiece)
  const piece = pieceId ? await db.items.findUnique({ where: { id_piece: pieceId } }) : null
  if (!piece || piece.is_deleted) throw new HttpError(404, "Pièce introuvable !")

  const qte = toInt(quantite)
  if (qte === null || qte < 1) {
    throw new HttpError(400, "La quantité demandée doit être un nombre entier supérieur à 0.")
  }

  const modelId = toInt(details.selectedModel)
  if (details.selectedModel !== undefined && details.selectedModel !== null && details.selectedModel !== '') {
    const model = modelId ? await db.model_piece.findUnique({ where: { id_model: modelId } }) : null
    if (!model) throw new HttpError(400, "Modèle de pièce invalide.")
    const liens = await db.items_models.findMany({ where: { item_id: piece.id_piece }, select: { model_id: true } })
    if (liens.length > 0 && !liens.some((l) => l.model_id === modelId)) {
      throw new HttpError(400, `Le modèle ${model.nom_model} n'est pas rattaché à la pièce ${piece.nom_piece}.`)
    }
  }

  const servicePieceId = toInt(details.selectedServicePiece)
  if (details.selectedServicePiece !== undefined && details.selectedServicePiece !== null && details.selectedServicePiece !== '') {
    const servicePiece = servicePieceId ? await db.services.findUnique({ where: { id: servicePieceId } }) : null
    if (!servicePiece) throw new HttpError(400, "Service de la pièce invalide.")
    const liens = await db.items_services.findMany({ where: { item_id: piece.id_piece }, select: { service_id: true } })
    if (liens.length > 0 && !liens.some((l) => l.service_id === servicePieceId)) {
      throw new HttpError(400, `Le service ${servicePiece.nom_service} ne gère pas la pièce ${piece.nom_piece}.`)
    }
  }

  const serviceId = toInt(serviceUser)
  const service = serviceId ? await db.services.findUnique({ where: { id: serviceId } }) : null
  if (!service) throw new HttpError(400, "Service demandeur invalide.")

  const demandeurId = toInt(selectedUser) || toInt(userId)
  const demandeur = demandeurId ? await db.users.findUnique({ where: { id_user: demandeurId } }) : null
  if (!demandeur) throw new HttpError(404, "Demandeur introuvable !")

  const autres = parseJson(otherFields, [])

  return { details, piece, quantite: qte, service, demandeur, autres: Array.isArray(autres) ? autres : [] }
}

// Applique les valeurs contrôlées au body (le reste du traitement lit req.body) ; renvoie false si une réponse d'erreur est partie
const appliquerSaisieDemande = async (req, res) => {
  try {
    const saisie = await validerSaisieDemande(prisma, req.body || {})
    Object.assign(req.body, {
      detailsDemande: saisie.details,
      quantite: saisie.quantite,
      serviceUser: saisie.service.id,
      selectedUser: saisie.demandeur.id_user,
      nomUser: saisie.demandeur.fullname,
      otherFields: saisie.autres,
    })
    return true
  } catch (error) {
    if (error.status) {
      console.error(error.message)
      res.status(error.status).json({ message: error.message })
      return false
    }
    throw error
  }
}
const cloudinary = require("../../config/clouddinaryConifg");
const { get } = require("http");
const { urlToHttpOptions } = require("url");
const { type } = require("os");
const sendMail = require("../../utils/emailSender");
const configEmail = process.env.NODEMAILER_USER


// Fonction de format de date pour les fiches PDF. La date va apparaître avec l'heure.
const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleString("fr-FR", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// baseUrl est l'addresse du site de livraison
const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
// localUrl est l'addresse en local pour les tests
const localUrl = "http://localhost:5173"
// GENERAL_URL va être utilisée dans les mails envoyés pour pouvoir rediriger correctement l'utilisateur vers la page avec le bon lien
// En test GENERAL_URL doit avoir la valeur de localUrl et celle de baseUrl lors du deploiement.
let GENERAL_URL = baseUrl
let test_env = TEST_ENV
if (test_env) {
  GENERAL_URL = localUrl
}

// Faire une demande
// DEMANDE CHARGEURS POUR TPE SANS RI SUPPORT -> DT -> ORNELLA
// DEMANDE CHARGEUR ORNELLA -> DT
// DEMANDE PIECE DETACHEES ORNELLA -> DT
// DEMANDE TPE ORNELLA -> DT


// const faireDemande = async (req, res) => {
//   try {
//     const {
//       nomDemandeur,
//       commentaire,
//       selectedStock,
//       quantite_demande,
//       nomenclature,
//       detailsDemande,
//       detailsDemandeur,
//       userId,
//       itemId,
//       idDemandeur,
//       motif,
//       serviceDemandeur,
//       champsAutre,
//     } = req.body;

//     const details = typeof detailsDemande === "string"
//       ? JSON.parse(detailsDemande)
//       : detailsDemande;

//     const autres = typeof champsAutre === "string"
//       ? JSON.parse(champsAutre)
//       : champsAutre

//     const piece = await prisma.items.findUnique({
//       where: {
//         id_piece: parseInt(itemId)
//       }
//     })

//     if (!piece) {
//       console.log("Erreur serveur 404: pièce introuvable ! ")
//       return res.status(404).json({ message: "Pièce introuvable !" })
//     }

//     const stock = await prisma.stocks.findUnique({
//       where: {
//         id: parseInt(selectedStock)
//       }
//     })

//     if (!stock) {
//       console.log("Erreur serveur 404: stock introuvable ! ")
//       return res.status(404).json({ message: "Stock introuvable !" })
//     }

//     let utilisateur = null;
//     utilisateur = await prisma.users.findUnique({
//       where: {
//         id_user: parseInt(userId)
//       }
//     });

//     if (!utilisateur) {
//       console.log("Erreur serveur 404: utilisateur introuvable ! ")
//       return res.status(404).json({ message: "Utilisateur non trouvé" });
//     }

//     const nouvelleDemande = await prisma.demandes.create({
//       data: {
//         nom_demandeur: nomDemandeur,
//         date_demande: new Date(),
//         commentaire,
//         qte_total_demande: quantite_demande,
//         nomenclature,
//         details_demande: JSON.stringify(detailsDemande),
//         details_demandeur: JSON.stringify(detailsDemandeur),
//         statut_demande: 'en_cours',
//         user_id: parseInt(userId),
//         stock_id: parseInt(selectedStock),
//         item_id: parseInt(itemId),
//         type_demande: parseInt(details.typeMouvement),
//         id_demandeur: parseInt(idDemandeur),
//         motif_demande: motif,
//         service_demandeur: parseInt(serviceDemandeur),
//         champs_autre: JSON.stringify(autres)
//       }
//     });


//     /************************** GESTION DES MAILS ********************************/
//     const service = await prisma.services.findUnique({
//       where: {
//         id: parseInt(serviceDemandeur)
//       }
//     })

//     const nomService = service.nom_service.toUpperCase()

//     const userService = await prisma.user_services.findMany({
//       where: {
//         service_id: parseInt(serviceDemandeur)
//       },
//       include: {
//         users: true
//       }
//     })

//     const userRole = await prisma.user_roles.findMany({
//       where: {
//         role_id: 4,
//       },
//       include: {
//         users: true
//       }
//     })
//     const mouvement = await prisma.type_mouvement_stock.findUnique({
//       where: {
//         id: details.typeMouvement
//       }
//     })

//     const service_users = userService.map(us => us.users)
//     const validateurs = userRole.map(us => us.users)

//     let nomPiece = piece.nom_piece.toUpperCase()

//     let quantiteDemande = quantite_demande;

//     let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

//     const url = GENERAL_URL
//     let demandeLink = `${url}/demande-details/${nouvelleDemande.id}`;

//     const sendMail = require("../../utils/emailSender");

//     if ((service_users && service_users.length > 0) || (validateurs && validateurs.length > 0)) {
//       const subject = `NOUVELLE DEMANDE POUR ${motif}`;
//       let html = `
//         <p>Bonjour,</p>
//         <p>Une nouvelle demande a été enregistrée.</p>
//         <ul>
//           <li><strong>Demande de :</strong> ${nomPiece}</li>
//           <li><strong>${mouvement.titre}</strong></li>
//           <li><strong>Nombre de produits:</strong> ${quantiteDemande}</li>
//         </ul>
//         <ul>
//           <li><strong>Service demandeur:</strong> ${nomService}</li>
//           <li><strong>Nom demandeur:</strong> ${nomDemandeur}</li>
//         </ul>
//         <br>
//         <p>Commentaire : ${commentaire_mail}<p>
//         <br>
//         <p>Retrouvez la demande à ce lien : 
//           <span>
//           <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
//             Cliquez ici !
//           </a>
//           </span>
//         </p>
//         <br><br>
//         <p>Green - Pay vous remercie.</p>
//         `;
//       for (const service_user of service_users) {
//         await sendMail({
//           to: service_user.email,
//           subject,
//           html,
//         });
//       }
//       for (const validateur of validateurs) {
//         await sendMail({
//           to: validateur.email,
//           subject,
//           html,
//         });
//       }
//     }

//     console.log("Succès ! ")
//     res.status(201).json({
//       message: "Demande enregistrée avec succès",
//       demandes: nouvelleDemande
//     });

//   } catch (error) {
//     console.log("Erreur serveur: ",error)
//     console.error("Erreur lors de la demande :", error);
//     res.status(500).json({ message: "Erreur interne", error });
//   }
// };

// const faireDemande = async (req, res) => {
//   try {
//     const {
//       detailsDemande,
//       userId,
//       quantite,
//       serviceUser,
//       selectedUser,
//       nomUser,
//       motif,
//       commentaire,
//       otherFields,
//     } = req.body;

//     const details = typeof detailsDemande === "string"
//       ? JSON.parse(detailsDemande)
//       : detailsDemande;

//     const autres = typeof otherFields === "string"
//       ? JSON.parse(otherFields)
//       : otherFields

//     const piece = await prisma.items.findUnique({
//       where: {
//         id_piece: parseInt(details.selectedPiece)
//       }
//     })

//     if (!piece) {
//       console.log("Erreur serveur 404: pièce introuvable ! ")
//       return res.status(404).json({ message: "Pièce introuvable !" })
//     }

//     // const stock = await prisma.stocks.findUnique({
//     //   where: {
//     //     id: parseInt(selectedStock)
//     //   }
//     // })

//     // if (!stock) {
//     //   console.log("Erreur serveur 404: stock introuvable ! ")
//     //   return res.status(404).json({ message: "Stock introuvable !" })
//     // }

//     let utilisateur = null;
//     utilisateur = await prisma.users.findUnique({
//       where: {
//         id_user: parseInt(userId)
//       }
//     });

//     if (!utilisateur) {
//       console.log("Erreur serveur 404: utilisateur introuvable ! ")
//       return res.status(404).json({ message: "Utilisateur non trouvé" });
//     }

//     const nouvelleDemande = await prisma.demandes.create({
//       data: {
//         nom_demandeur: nomUser,
//         date_demande: new Date(),
//         commentaire,
//         qte_total_demande: parseInt(quantite),
//         details_demande: JSON.stringify(detailsDemande),
//         // details_demandeur: JSON.stringify(detailsDemandeur),
//         statut_demande: 'en_cours',
//         user_id: parseInt(userId),
//         // stock_id: parseInt(selectedStock),
//         item_id: parseInt(details.selectedPiece),
//         // type_demande: parseInt(details.typeMouvement),
//         id_demandeur: parseInt(selectedUser),
//         motif_demande: motif,
//         service_demandeur: parseInt(serviceUser),
//         champs_autre: JSON.stringify(autres)
//       }
//     });


//     /************************** GESTION DES MAILS ********************************/
//     const service = await prisma.services.findUnique({
//       where: {
//         id: parseInt(serviceUser)
//       }
//     })

//     const nomService = service.nom_service.toUpperCase()

//     const userService = await prisma.user_services.findMany({
//       where: {
//         service_id: parseInt(serviceUser)
//       },
//       include: {
//         users: true
//       }
//     })

//     const userRole = await prisma.user_roles.findMany({
//       where: {
//         role_id: 4,
//       },
//       include: {
//         users: true
//       }
//     })
//     // const mouvement = await prisma.type_mouvement_stock.findUnique({
//     //   where: {
//     //     id: details.typeMouvement
//     //   }
//     // })

//     const service_users = userService.map(us => us.users)
//     const validateurs = userRole.map(us => us.users)

//     let nomPiece = piece.nom_piece.toUpperCase()

//     let quantiteDemande = quantite;

//     let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

//     const url = GENERAL_URL
//     let demandeLink = `${url}/demande-details/${nouvelleDemande.id}`;

//     const sendMail = require("../../utils/emailSender");

//     if ((service_users && service_users.length > 0) || (validateurs && validateurs.length > 0)) {
//       const subject = `MOUVEMENT DE STOCK DE ${nomPiece}`;
//       let html = `
//         <p>Bonjour,</p>
//         <p>Une nouvelle demande a été enregistrée.</p>
//         <ul>
//           <li><strong>Demande de :</strong> ${nomPiece}</li>
//           <li><strong>${details.typeDemande}</strong></li>
//           <li><strong>Nombre de produits:</strong> ${quantiteDemande}</li>
//         </ul>
//         <ul>
//           <li><strong>Service demandeur:</strong> ${nomService}</li>
//           <li><strong>Nom demandeur:</strong> ${nomUser}</li>
//         </ul>
//         <br>
//         <p>Commentaire : ${commentaire_mail}<p>
//         <br>
//         <p>Retrouvez la demande à ce lien : 
//           <span>
//           <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
//             Cliquez ici !
//           </a>
//           </span>
//         </p>
//         <br><br>
//         <p>Green - Pay vous remercie.</p>
//         `;
//       for (const service_user of service_users) {
//         await sendMail({
//           to: service_user.email,
//           subject,
//           html,
//         });
//       }
//       for (const validateur of validateurs) {
//         await sendMail({
//           to: validateur.email,
//           subject,
//           html,
//         });
//       }
//     }

//     console.log("Succès ! ")
//     res.status(201).json({
//       message: "Demande enregistrée avec succès",
//       demandes: nouvelleDemande
//     });

//   } catch (error) {
//     console.log("Erreur serveur: ", error)
//     console.error("Erreur lors de la demande :", error);
//     res.status(500).json({ message: "Erreur interne", error });
//   }
// };

const faireDemande = async (req, res) => {
  try {
    if (!(await appliquerSaisieDemande(req, res))) return

    const {
      detailsDemande,
      userId,
      quantite,
      serviceUser,
      selectedUser,
      nomUser,
      motif,
      commentaire,
      otherFields,
    } = req.body;

    const details = typeof detailsDemande === "string"
      ? JSON.parse(detailsDemande)
      : detailsDemande;

    // const details = detailsDemande

    const autres = typeof otherFields === "string"
      ? JSON.parse(otherFields)
      : otherFields

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(details.selectedPiece)
      }
    })

    if (!piece) {
      console.log("Erreur serveur 404: pièce introuvable ! ")
      return res.status(404).json({ message: "Pièce introuvable !" })
    }

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(userId)
      }
    });

    if (!utilisateur) {
      console.log("Erreur serveur 404: utilisateur introuvable ! ")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const files = req.files?.files || [];

    const files_content = files.length
      ? files.map(file => ({
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size
      }))
      : [];

    const dateAction = new Date()

    const nouvelleDemande = await prisma.$transaction(async (tx) => {

      const demandeForm = await tx.forms.create({
        data: {
          type: 'demande_stock',
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
        }
      })
      const demande = await tx.demandes.create({
        data: {
          nom_demandeur: nomUser,
          date_demande: dateAction,
          commentaire,
          qte_total_demande: parseInt(quantite),
          details_demande: JSON.stringify(details),
          statut_demande: 'en_cours',
          user_id: parseInt(userId),
          item_id: parseInt(details.selectedPiece),
          id_demandeur: parseInt(selectedUser),
          motif_demande: motif,
          service_demandeur: parseInt(serviceUser),
          champs_autre: JSON.stringify(autres),
          form_id: demandeForm.id,
        }
      });
      if (files_content.length > 0) {
        await tx.fichiers.createMany({
          data: files_content.map(fichier => ({
            path: fichier.path,
            filename: fichier.name,
            originalName: fichier.name,
            mimeType: fichier.type,
            size: fichier.size,
            uploaded_by: +userId,
            form_id: demandeForm.id,
            demande_id: demande.id,
            type_formulaire: 'demande',
            role: 'demandeur',
            created_at: dateAction,
          }))
        })
      }

      return {
        demandeForm,
        demande,
      }
    })

    /****************    GESTION DES MAILS     *****************/
    // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
    try {
      const service = await prisma.services.findUnique({
        where: { id: parseInt(serviceUser) }
      })

      const nomService = service.nom_service.toUpperCase()

      const userService = await prisma.user_services.findMany({
        where: { service_id: parseInt(serviceUser) },
        include: { users: true }
      })

      const userRole = await prisma.user_roles.findMany({
        where: { role_id: 4 },
        include: { users: true }
      })

      const service_users = userService.map(us => us.users.email)
      const validateurs = userRole.map(us => us.users.email)

      const nomPiece = piece.nom_piece.toUpperCase()

      const quantiteDemande = quantite;

      const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

      const url = GENERAL_URL
      const demandeLink = `${url}/demande-details/${nouvelleDemande.demande.id}`;

      const subject = `SYSLIS - MOUVEMENT DE STOCK DE ${nomPiece}`;
      const html = `
      <p>Bonjour,</p>
      <p>Une nouvelle demande a été enregistrée.</p>
      <ul>
        <li><strong>Demande de :</strong> ${nomPiece}</li>
        <li><strong>${details.typeDemande}</strong></li>
        <li><strong>Nombre de produits:</strong> ${quantiteDemande}</li>
      </ul>
      <ul>
        <li><strong>Service demandeur:</strong> ${nomService}</li>
        <li><strong>Nom demandeur:</strong> ${nomUser}</li>
      </ul>
      <br>
      <p>Commentaire : ${commentaire_mail}<p>
      <br>
      <p>Retrouvez la demande à ce lien : 
        <span>
        <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
          Cliquez ici !
        </a>
        </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
      `;

      // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
      const destinataires = [...new Set([...service_users, ...validateurs].filter(Boolean))];
      await sendMail({
        to: configEmail,
        bcc: destinataires,
        subject,
        html,
      });
    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    console.log("Succès ! ")
    res.status(201).json({
      message: "Demande enregistrée avec succès",
      data: nouvelleDemande
    });

  } catch (error) {
    console.log("Erreur serveur: ", error)
    console.error("Erreur lors de la demande :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

// Liste des demandes : seulement ce que les listes affichent ou filtrent (pas de signatures, pas de détail des
// livraisons, pas des listes d'ids / de SN du contenu livré) — la fiche d'une demande passe par getOneDemande.
const FORM_LISTE = { select: { id: true, is_reg: true, created_at: true, last_modified_at: true, nom_user: true } }
const CLES_DETAILS_LOURDES = ['listeSn', 'contenuLivre', 'cartons', 'listeLots', 'livraison']

const getAllDemandes = async (req, res) => {
  try {
    const demandes = await prisma.demandes.findMany({
      orderBy: { date_demande: 'desc' },
      include: {
        forms: FORM_LISTE,
        items: { select: { id_piece: true, nom_piece: true, type: true } },
        validation_demande: {
          select: {
            id_validation_demande: true,
            nom_validateur: true,
            date_validation_demande: true,
            commentaire: true,
            statut_validation_demande: true,
            quantite_validee: true,
            id_user: true,
            id_demande: true,
            stock_id: true,
            form_id: true,
            forms: FORM_LISTE,
          },
        },
        livraison_piece: {
          select: { id: true, demande_id: true, form_id: true, stock_id: true, forms: FORM_LISTE },
        },
        reception_piece: {
          select: {
            id: true,
            demande_id: true,
            nom_recepteur: true,
            commentaire: true,
            created_at: true,
            action_stock: true,
            livraison_id: true,
            stock_id: true,
            form_id: true,
            forms: FORM_LISTE,
            stocks: { select: { id: true, code_stock: true } },
          },
        },
      }
    });

    // details_demande : on garde les champs de la demande (pièce, modèle, service, type...) sans les grosses listes
    const allegees = demandes.map((d) => {
      const details = parseJson(d.details_demande, null)
      if (!details || typeof details !== 'object') return d
      CLES_DETAILS_LOURDES.forEach((cle) => { delete details[cle] })
      return { ...d, details_demande: JSON.stringify(details) }
    })

    res.status(200).json(allegees);
  } catch (error) {
    console.log("Erreur serveur: ", error)
    console.error("Erreur :", error)
    res.status(500).json({ message: "Erreur lors de la récupération des demandes", error });
  }
};

const getOneDemande = async (req, res) => {
  const { id } = req.params;

  try {
    const demandes = await prisma.demandes.findUnique({
      where: { id: parseInt(id) },
      include: {
        forms: true,
        validation_demande: {
          include: {
            forms: true,
          },
        },
        livraison_piece: {
          include: {
            forms: true,
          },
        },
        reception_piece: {
          include: {
            forms: true,
            stocks: { select: { id: true, code_stock: true } },
          },
        },
      }
    });

    if (!demandes) {
      console.log("Demande introuvable pour l'id : ", id)
      return res.status(404).json({ message: "demande introuvable" });
    }

    // Suivi des livraisons (partielles) : validé / livré / reste dans l'unité de la demande, réception de chacune
    res.status(200).json({ ...demandes, suiviLivraison: suiviLivraisons(demandes) });
  } catch (error) {
    console.log('Error : ', error)
    console.error('Error : ', error)
    res.status(500).json({ message: "Erreur serveur", error });
  }
}

const validateDemande = async (req, res) => {
  try {
    const {
      demande_id,
      user_id,
      commentaire,
      quantiteValidee,
      owners,
    } = req.body;

    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demande_id) },
    });

    if (!demande) {
      console.error('Demande introuvable !')
      return res.status(404).json({ message: "Demande introuvable." });
    }

    if (demande.statut_demande !== "en_cours") {
      console.error('Demande non validable, statut : ', demande.statut_demande)
      return res.status(400).json({ message: demande.statut_demande === "valide" ? "Demande déjà validée." : "Seule une demande en cours peut être validée." });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(400).json({ message: "Signature introuvable !" });
    }

    if (!user_id) {
      console.error('Utilisateur non authentifié !')
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }

    const quantite = toInt(quantiteValidee)
    if (!quantite || quantite < 1) {
      return res.status(400).json({ message: "Quantité validée invalide." });
    }

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      console.error('Utilisateur introuvable !')
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }


    const dateAction = new Date()

    // Upload hors transaction (appel réseau)
    const uploadResult = await cloudinary.uploader.upload(signature.path, {
      folder: "greenpay/signatures",
    });
    const signatureCloud = uploadResult.secure_url;

    const validation = await prisma.$transaction(async (tx) => {
      const garde = await tx.demandes.updateMany({
        where: { id: demande.id, statut_demande: "en_cours" },
        data: {
          statut_demande: "valide",
        },
      });
      if (garde.count !== 1) {
        throw new HttpError(409, "La demande a déjà été traitée.")
      }

      const validationForm = await tx.forms.create({
        data: {
          type: 'validation_stock',
          created_by: user.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: user.fullname,
          commentaire,
        },
      })
      await tx.form_signatures.create({
        data: {
          form_id: validationForm.id,
          signature_url: signatureCloud,
          signed_by: user.id_user,
          signed_at: dateAction,
          role: 'validateur',
        },
      })

      const newValidation = await tx.validation_demande.create({
        data: {
          id_demande: parseInt(demande_id),
          commentaire,
          id_user: user_id ? parseInt(user_id) : null,
          nom_validateur: user.fullname,
          date_validation_demande: new Date(),
          signature: signatureCloud,
          statut_validation_demande: "valide",
          quantite_validee: quantite,
          form_id: validationForm.id
        },
      });

      return {
        validationForm,
        newValidation,
      }
    })

    /****************    GESTION DES MAILS     *****************/
    // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
    try {
      const stockOwners = await responsablesStocksDemande(demande)

      const piece = await prisma.items.findUnique({
        where: { id_piece: parseInt(demande.item_id) }
      });

      const service = await prisma.services.findUnique({
        where: { id: parseInt(demande.service_demandeur) }
      })

      const userService = await prisma.user_services.findMany({
        where: { service_id: parseInt(demande.service_demandeur) },
        include: { users: true }
      })

      const proprietaires = stockOwners.map(us => us.email)
      const service_users = userService.map(us => us.users.email)

      const motif = demande.motif_demande
      const nomPiece = piece.nom_piece.toUpperCase()

      const nomServiceDemandeur = service.nom_service.toUpperCase();

      const quantite = quantiteValidee;
      const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';
      const url = GENERAL_URL
      const demandeLink = `${url}/demande-details/${demande.id}`;
      const subject = `SYSLIS - VALIDATION DEMANDE DE ${nomPiece}`;
      const html = `
      <p>Bonjour,</p>
      <p>La demande ${demande.id} a été validée.</p>
      <ul>
        <li><strong>Motif :</strong> ${motif}</li>
        <li><strong>Quantité validée :</strong> ${quantite}</li>
      </ul>
      <ul>
        <li><strong>Service demandeur:</strong> ${nomServiceDemandeur}</li>
        <li><strong>Nom demandeur:</strong> ${demande.nom_demandeur}</li>
      </ul>
      <br>
      <p>Commentaire : ${commentaire_mail}<p>
      <br>
      <p>Retrouvez la demande à ce lien : 
          <span>
          <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
              Cliquez ici !
          </a>
          </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
      `;
      const html2 = `
      <p>Bonjour,</p>
      <p>La demande ${demande.id} a été validée.</p>
      <p><strong>Vous êtes propiétaire d'un stock de cette catégorie.</strong></p>
      <ul>
        <li><strong>Motif :</strong> ${motif}</li>
        <li><strong>Quantité validée :</strong> ${quantite}</li>
      </ul>
      <ul>
        <li><strong>Service demandeur:</strong> ${nomServiceDemandeur}</li>
        <li><strong>Nom demandeur:</strong> ${demande.nom_demandeur}</li>
      </ul>
      <br>
      <p>Commentaire : ${commentaire_mail}<p>
      <br>
      <p>Retrouvez la demande à ce lien : 
          <span>
          <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
              Cliquez ici !
          </a>
          </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
      `;

      // Contenu différent : les propriétaires de stock reçoivent html2, les utilisateurs du service html
      const destinatairesProprietaires = [...new Set(proprietaires.filter(Boolean))];
      if (destinatairesProprietaires.length > 0) {
        await sendMail({
          to: configEmail,
          bcc: destinatairesProprietaires,
          subject,
          html: html2,
        });
      }

      const destinataires = [...new Set(service_users.filter(Boolean))];
      await sendMail({
        to: configEmail,
        bcc: destinataires,
        subject,
        html,
      });
    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    console.log("Demande validée avec succès !")
    return res.status(201).json({
      message: "Demande validée avec succès !",
      data: validation,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

/************************************************************************************************
 *  LIVRAISON D'UNE DEMANDE DE STOCK
 *  Le livreur débite UNIQUEMENT son stock d'origine. Les lots / cartons / SN livrés sortent du stock ;
 *  leur mise en stock éventuelle chez le demandeur se fait à la réception (voir traiterReception).
 *  Les quantités sont recalculées côté serveur (utils/stockDemande.js).
 ************************************************************************************************/
// ReadCommitted : après le verrou (UPDATE), les lectures voient les données validées par une transaction concurrente
// (en RepeatableRead, Prisma lit avant de verrouiller et la transaction garderait une photo périmée).
const OPTIONS_TRANSACTION_STOCK = { maxWait: 10000, timeout: 30000, isolationLevel: 'ReadCommitted' }

const traiterLivraison = async (req, res, { isReg }) => {
  const libelle = isReg ? 'Régularisation de livraison' : 'Livraison de stock'
  try {
    const {
      demande_id,
      user_id,
      commentaire,
      stock_id,
      nomenclature,
      detailsDemande,
      date_livraison,
      cloturer,
    } = req.body;
    // Le livreur peut clôturer la demande avec cette livraison même si la quantité validée n'est pas atteinte
    const cloturerDemande = cloturer === true || cloturer === 'true'

    const idDemande = toInt(demande_id)
    const idUser = toInt(user_id)
    const idStock = toInt(stock_id)

    if (!idUser) {
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }
    if (!idDemande) {
      return res.status(400).json({ message: "Demande invalide." });
    }
    if (!idStock) {
      return res.status(400).json({ message: "Vous devez choisir le stock à livrer !" });
    }

    const demande = await prisma.demandes.findUnique({ where: { id: idDemande } });
    if (!demande || demande.is_deleted) {
      return res.status(404).json({ message: "Demande introuvable." });
    }
    if (!STATUTS_LIVRABLES.includes(demande.statut_demande)) {
      return res.status(400).json({ message: "La demande doit être validée avant d'être livrée." });
    }
    if (demande.demande_livree) {
      return res.status(400).json({ message: "Demande déjà entièrement livrée." });
    }

    const user = await prisma.users.findUnique({ where: { id_user: idUser } });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const stock = await prisma.stocks.findUnique({
      where: { id: idStock },
      include: { stock_owners: true },
    });
    if (!stock || stock.is_deleted) {
      return res.status(404).json({ message: "Stock introuvable ou supprimé." });
    }
    if (stock.piece_id !== demande.item_id) {
      return res.status(400).json({ message: "Le stock choisi ne correspond pas à la pièce demandée." });
    }
    if (!estResponsableStock(stock, user.id_user)) {
      return res.status(403).json({ message: "Vous n'êtes ni propriétaire, ni co-propriétaire, ni créateur de ce stock." });
    }

    const selection = parseJson(detailsDemande, {}) || {}
    const typeMouvement = toInt(selection.typeMouvement)
    if (!TYPES_MOUVEMENT.includes(typeMouvement)) {
      return res.status(400).json({ message: "Type de mouvement invalide !" });
    }

    let dateAction = new Date()
    if (isReg) {
      dateAction = new Date(date_livraison)
      if (!date_livraison || isNaN(dateAction.getTime())) {
        return res.status(400).json({ message: "Date de livraison invalide !" });
      }
    }

    // Détails de la demande sans les clés écrites par une livraison précédente
    const detailsDemandeOrigine = detailsSansLivraison(parseJson(demande.details_demande, {}) || {})

    const resultat = await prisma.$transaction(async (tx) => {
      // Verrou sur la demande (UPDATE en premier) puis relecture : deux livraisons simultanées passent l'une après l'autre
      await tx.demandes.update({ where: { id: demande.id }, data: { type_demande: typeMouvement } })
      const demandeVerrouillee = await tx.demandes.findUnique({ where: { id: demande.id } })
      if (demandeVerrouillee.demande_livree || !STATUTS_LIVRABLES.includes(demandeVerrouillee.statut_demande)) {
        throw new HttpError(409, "La demande a déjà été livrée ou son statut a changé.")
      }

      const sortie = await debiterStockLivraison(tx, {
        stockId: stock.id,
        typeMouvement,
        selection,
        userId: user.id_user,
        dateAction,
      })

      // Quantité livrée dans l'unité de la demande, comparée à la quantité validée
      const validation = await tx.validation_demande.findFirst({
        where: { id_demande: demande.id, statut_validation_demande: 'valide' },
        orderBy: { id_validation_demande: 'desc' },
      })
      const livraisonsPrecedentes = await tx.livraison_piece.findMany({
        where: { demande_id: demande.id },
        select: { details_demande: true },
      })
      const bilanAvant = bilanLivraisons({
        detailsDemande: detailsDemandeOrigine,
        quantiteValidee: validation ? validation.quantite_validee : null,
        livraisons: livraisonsPrecedentes,
      })
      const quantiteUnite = quantiteDansUnite(sortie.contenuLivre, bilanAvant.unite)
      const mesurable = bilanAvant.unite !== null && bilanAvant.quantiteValidee !== null && quantiteUnite !== null
      if (mesurable && quantiteUnite > bilanAvant.reste) {
        throw new HttpError(409, `Quantité supérieure au reste à livrer : ${bilanAvant.reste} ${bilanAvant.libelleUnite} sur ${bilanAvant.quantiteValidee} validé(s), cette livraison en compte ${quantiteUnite}.`)
      }
      const quantiteLivreeApres = bilanAvant.quantiteLivree + (quantiteUnite ?? 0)
      const quantiteAtteinte = mesurable && quantiteLivreeApres >= bilanAvant.quantiteValidee
      const livraisonFinale = quantiteAtteinte || cloturerDemande
      const bilan = {
        unite: bilanAvant.unite,
        libelleUnite: bilanAvant.libelleUnite,
        quantiteValidee: bilanAvant.quantiteValidee,
        quantiteCetteLivraison: quantiteUnite,
        quantiteLivree: quantiteLivreeApres,
        reste: bilanAvant.quantiteValidee !== null && bilanAvant.unite ? Math.max(0, bilanAvant.quantiteValidee - quantiteLivreeApres) : null,
        mesurable,
        livraisonFinale,
        cloturee: !quantiteAtteinte && cloturerDemande,
        numero: livraisonsPrecedentes.length + 1,
      }
      Object.assign(sortie.contenuLivre, { unite: bilanAvant.unite, quantiteUnite })

      const details = construireDetailsLivraison({
        detailsDemande: detailsDemandeOrigine,
        typeMouvement,
        selection,
        ...sortie,
      })
      details.livraison = bilan

      const mouvement = await tx.mouvement_stock.create({
        data: {
          type: 'sortie',
          mouvement: typeMouvement,
          demande_id: demande.id,
          created_at: dateAction,
          stock_id: stock.id,
          piece_id: stock.piece_id,
          service_origine: stock.service_id,
          service_destination: demande.service_demandeur,
          model_id: stock.model_id,
          stock_initial: sortie.unites.initial,
          quantite: sortie.unites.quantite,
          stock_final: sortie.unites.final,
          quantite_totale_piece: sortie.stockApres.quantite_piece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(details),
          created_by: user.id_user,
        }
      })

      // Livraison partielle : statut « partiel », la demande reste ouverte à d'autres livraisons
      await tx.demandes.update({
        where: { id: demande.id },
        data: {
          stock_id: stock.id,
          nomenclature,
          type_demande: typeMouvement,
          details_demande: JSON.stringify(details),
          details_demandeur: null,
          statut_demande: livraisonFinale ? 'valide' : 'partiel',
          demande_livree: livraisonFinale,
        },
      });

      const livraisonForm = await tx.forms.create({
        data: {
          type: 'livraison_stock',
          created_by: user.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: user.fullname,
          commentaire,
          ...(isReg ? { is_reg: true } : {}),
        }
      })

      const livraison = await tx.livraison_piece.create({
        data: {
          demande_id: demande.id,
          details_demande: JSON.stringify(details),
          form_id: livraisonForm.id,
          stock_id: stock.id,
        }
      })

      return {
        livraisonForm,
        livraison,
        mouvement,
        contenuLivre: sortie.contenuLivre,
        serialNumbers: sortie.serialNumbers,
        quantite: sortie.unites.quantite,
        bilan,
      }
    }, OPTIONS_TRANSACTION_STOCK)

    /*****************      GESTION PARC TPE       *****************/
    // Terminaux livrés par lot / carton : statut 4 + historique.
    // Régularisation antidatée : le statut n'est changé que pour les TPE dont le dernier changement est plus ancien
    // (sinon historique seul), comme pour le décommissionnement.
    let allTpes = null
    const piece = await prisma.items.findUnique({ where: { id_piece: stock.piece_id } })
    const estTerminal = String(piece?.type || '').toUpperCase() == 'TERMINAL'
    if (estTerminal && resultat.serialNumbers.length > 0) {
      const parc = await prisma.$transaction((tx) => appliquerStatutParc(tx, {
        items: resultat.serialNumbers.map((item) => ({
          serial: item.serial_number,
          modelId: toModelId(item.model_id) || toModelId(stock.model_id),
        })),
        statutId: 4,
        userId: user.id_user,
        dateAction,
        formId: resultat.livraisonForm.id,
      }))
      allTpes = parc.tpes
    }

    /****************    GESTION DES MAILS     *****************/
    // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
    try {
      const userService = await prisma.user_services.findMany({
        where: { service_id: demande.service_demandeur },
        include: { users: true }
      })
      const service = await prisma.services.findUnique({ where: { id: demande.service_demandeur } })
      const mouvement = await prisma.type_mouvement_stock.findUnique({ where: { id: typeMouvement } })

      const service_users = userService.map(us => us.users.email)
      const nomPiece = String(piece?.nom_piece || '').toUpperCase()
      const nomServiceDemandeur = String(service?.nom_service || '').toUpperCase();
      const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';
      const demandeLink = `${GENERAL_URL}/demande-details/${demande.id}`;
      const subject = isReg ? `SYSLIS - REGULARISATION LIVRAISON STOCK DE ${nomPiece}` : `SYSLIS - LIVRAISON STOCK DE ${nomPiece}`;
      const html = `
        <p>Bonjour,</p>
        <p>La demande ${demande.id} a été livrée${resultat.bilan.livraisonFinale ? '' : ' partiellement'}.</p>
        <ul>
          <li><strong>Motif :</strong> ${demande.motif_demande}</li>
          <li><strong>${mouvement ? mouvement.titre : ''}</strong></li>
          <li><strong>Quantité :</strong> ${resultat.quantite} (${resultat.contenuLivre.quantitePiece} pièce(s))</li>
          ${resultat.bilan.livraisonFinale
            ? `<li><strong>Livraison finale${resultat.bilan.numero > 1 ? ` (livraison n°${resultat.bilan.numero})` : ''}</strong>${resultat.bilan.cloturee ? ' : demande clôturée par le livreur' : ''}</li>`
            : `<li><strong>Livraison partielle n°${resultat.bilan.numero}</strong>${resultat.bilan.reste !== null ? ` : reste ${resultat.bilan.reste} ${resultat.bilan.libelleUnite} à livrer` : ''}</li>`}
        </ul>
        <ul>
          <li><strong>Service demandeur:</strong> ${nomServiceDemandeur}</li>
          <li><strong>Nom demandeur:</strong> ${demande.nom_demandeur}</li>
        </ul>
        <br>
        <p>Commentaire : ${commentaire_mail}<p>
        <p>À la réception, vous pourrez créer un nouveau stock, alimenter un de vos stocks ou ne pas mettre les pièces en stock.</p>
        <br>
        <p>Retrouvez la demande à ce lien :
            <span>
            <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                Cliquez ici !
            </a>
            </span>
        </p>
        <br><br>
        <p>Green - Pay vous remercie.</p>
        `;

      const destinataires = [...new Set(service_users.filter(Boolean))];
      if (destinataires.length > 0) {
        await sendMail({
          to: configEmail,
          bcc: destinataires,
          subject,
          html,
        });
      }
    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    console.log(`${libelle} effectuée avec succès !`)
    return res.status(201).json({
      message: `${libelle} effectuée avec succès !`,
      data: {
        livraisonForm: resultat.livraisonForm,
        livraison: resultat.livraison,
        mouvement: resultat.mouvement,
        contenuLivre: resultat.contenuLivre,
        bilan: resultat.bilan,
        tpe: allTpes,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

const livraisonDemande = (req, res) => traiterLivraison(req, res, { isReg: false })
const regLivraisonDemande = (req, res) => traiterLivraison(req, res, { isReg: true })

// Stocks depuis lesquels l'utilisateur peut livrer une demande :
// même pièce, même service (et même modèle si la demande en précise un), non vides, dont il est owner / sub-owner / créateur.
const getStocksLivraison = async (req, res) => {
  try {
    const idDemande = toInt(req.params.demandeId)
    const idUser = toInt(req.params.userId)
    if (!idDemande || !idUser) {
      return res.status(400).json({ message: "Paramètres invalides." });
    }
    const demande = await prisma.demandes.findUnique({ where: { id: idDemande } })
    if (!demande) {
      return res.status(404).json({ message: "Demande introuvable." });
    }
    const details = parseJson(demande.details_demande, {}) || {}
    const modelId = toInt(details.selectedModel ?? details.model)
    const serviceId = toInt(details.selectedServicePiece ?? details.service)

    const stocks = await prisma.stocks.findMany({
      where: {
        piece_id: demande.item_id,
        is_deleted: false,
        quantite_piece: { gt: 0 },
        ...(modelId ? { model_id: modelId } : {}),
        ...(serviceId ? { service_id: serviceId } : {}),
        OR: [
          { owner: idUser },
          { owner: null, created_by: idUser }, // créateur : seulement pour un stock sans propriétaire
          { stock_owners: { some: { user_id: idUser } } },
        ],
      },
      include: {
        services: true,
        model_piece: true,
      },
      orderBy: { id: 'desc' },
    })
    return res.status(200).json(stocks)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Erreur lors de la récupération des stocks de livraison." })
  }
}

const returnDemande = async (req, res) => {
  const {
    demande_id,
    commentaire_return,
    user_id,
  } = req.body;
  try {
    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demande_id) },
    });

    if (!demande) return res.status(404).json({ message: "Demande introuvable." });

    if (demande.statut_demande !== "en_cours") {
      return res.status(400).json({ message: demande.statut_demande === "valide" ? "Demande déjà validée." : "Seule une demande en cours peut être retournée." });
    }

    if (!commentaire_return) {
      return res.status(400).json({ message: "Commentaire de retour requis." });
    }

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const newValidation = await prisma.$transaction(async (tx) => {
      const garde = await tx.demandes.updateMany({
        where: { id: demande.id, statut_demande: 'en_cours' },
        data: { statut_demande: 'retourne' },
      });
      if (garde.count !== 1) {
        throw new HttpError(409, "La demande a déjà été traitée.")
      }
      return tx.validation_demande.create({
        data: {
          id_demande: demande.id,
          commentaire: commentaire_return,
          id_user: parseInt(user_id),
          nom_validateur: user.fullname,
          date_validation_demande: new Date(),
          signature: 'retournée',
          statut_validation_demande: "retourne",
        },
      });
    });

    // Mail au demandeur et à son service : une erreur ici ne doit pas faire échouer l'opération
    try {

    /************************************     GESTION MAILS     **************************************/

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: demande.item_id,
      },
    });

    const service = await prisma.services.findUnique({
      where: {
        id: demande.service_demandeur,
      },
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: demande.service_demandeur,
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const demandeur = await prisma.users.findUnique({
      where: {
        id_user: demande.user_id
      }
    })

    let motif = demande.motif_demande
    let demandeTypeName = piece.nom_piece.toUpperCase()

    let serviceDemandeur = service.nom_service.toUpperCase();

    let quantite = demande.qte_total_demande;
    let commentaire_mail = commentaire_return ? commentaire_return : '(sans commentaire)';
    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${demande.id}`;
    if ((service_users && service_users.length > 0) || demandeur) {
      const subject = `SYSLIS - DEMANDE RETOURNÉE`;
      const html = `
      <p>Bonjour,</p>
      <p>La demande ${demande.id} pour ${motif} a été retournée.</p>
      <ul>
        <li><strong>Type de demande:</strong> ${demandeTypeName}</li>
        <li><strong>Nombre de produits:</strong> ${quantite}</li>
      </ul>
      <ul>
        <li><strong>Service demandeur:</strong> ${serviceDemandeur}</li>
        <li><strong>Nom demandeur:</strong> ${demande.nom_demandeur}</li>
      </ul>
      <br>
      <p>Commentaire : ${commentaire_mail}<p>
      <br>
      <p>Retrouvez la demande à ce lien : 
        <span>
        <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
          Cliquez ici !
        </a>
        </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
      `;
      // Demandeur + utilisateurs du service demandeur, en CCI (dédoublonnés)
      const destinataires = [...new Set([demandeur?.email, ...service_users.map((us) => us?.email)].filter(Boolean))];
      if (destinataires.length > 0) {
        await sendMail({
          to: configEmail,
          bcc: destinataires,
          subject,
          html,
        });
      }
    }

    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    return res.status(201).json({
      message: "demande retournée avec succès.",
      newValidation,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

const cancelDemande = async (req, res) => {
  const {
    demande_id,
    commentaire_refus,
    user_id,
  } = req.body;
  try {
    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demande_id) },
    });

    if (!demande) return res.status(404).json({ message: "Demande introuvable." });

    if (demande.statut_demande !== "en_cours") {
      return res.status(400).json({ message: demande.statut_demande === "valide" ? "Demande déjà validée." : "Seule une demande en cours peut être refusée." });
    }

    if (!commentaire_refus) {
      return res.status(400).json({ message: "Commentaire d'annulation requis." });
    }

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const newValidation = await prisma.$transaction(async (tx) => {
      const garde = await tx.demandes.updateMany({
        where: { id: demande.id, statut_demande: 'en_cours' },
        data: { statut_demande: 'refuse' },
      });
      if (garde.count !== 1) {
        throw new HttpError(409, "La demande a déjà été traitée.")
      }
      return tx.validation_demande.create({
        data: {
          id_demande: demande.id,
          commentaire: commentaire_refus,
          id_user: parseInt(user_id),
          nom_validateur: user.fullname,
          date_validation_demande: new Date(),
          signature: 'refusée',
          statut_validation_demande: "refuse",
        },
      });
    });

    // Mail au demandeur et à son service : une erreur ici ne doit pas faire échouer l'opération
    try {


    /************************************     GESTION MAILS     **************************************/

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: demande.item_id
      }
    });

    const service = await prisma.services.findUnique({
      where: {
        id: demande.service_demandeur
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: demande.service_demandeur
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const demandeur = await prisma.users.findUnique({
      where: {
        id_user: demande.user_id
      }
    })

    let motif = demande.motif_demande
    let demandeTypeName = piece.nom_piece.toUpperCase()

    let serviceDemandeur = service.nom_service.toUpperCase();

    let quantite = demande.qte_total_demande;
    let commentaire_mail = commentaire_refus ? commentaire_refus : '(sans commentaire)';
    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${demande.id}`;
    // const demandeLink = `https://livraisons.greenpayci.com/formulaire-recu/${nouvelleLivraison.id_demande}`
    if ((service_users && service_users.length > 0) || demandeur) {
      const subject = `SYSLIS - DEMANDE REFUSÉE`;
      const html = `
      <p>Bonjour,</p>
      <p>La demande ${demande.id} pour ${motif} a été refusée.</p>
      <ul>
        <li><strong>Type de demande:</strong> ${demandeTypeName}</li>
        <li><strong>Nombre de produits:</strong> ${quantite}</li>
      </ul>
      <ul>
        <li><strong>Service demandeur:</strong> ${serviceDemandeur}</li>
        <li><strong>Nom demandeur:</strong> ${demande.nom_demandeur}</li>
      </ul>
      <br>
      <p>Commentaire : ${commentaire_mail}<p>
      <br>
      <p>Retrouvez la demande à ce lien : 
          <span>
          <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
              Cliquez ici !
          </a>
          </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
      `;
      // Demandeur + utilisateurs du service demandeur, en CCI (dédoublonnés)
      const destinataires = [...new Set([demandeur?.email, ...service_users.map((us) => us?.email)].filter(Boolean))];
      if (destinataires.length > 0) {
        await sendMail({
          to: configEmail,
          bcc: destinataires,
          subject,
          html,
        });
      }
    }

    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    return res.status(201).json({
      message: "demande refusée avec succès.",
      newValidation,
    });


  } catch (error) {
    if (error instanceof HttpError) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

const updateDemande = async (req, res) => {
  try {
    if (!(await appliquerSaisieDemande(req, res))) return

    const { id } = req.params
    const {
      detailsDemande,
      userId,
      quantite,
      serviceUser,
      selectedUser,
      nomUser,
      motif,
      commentaire,
      otherFields,
    } = req.body;

    const details = typeof detailsDemande === "string"
      ? JSON.parse(detailsDemande)
      : detailsDemande;

    const autres = typeof otherFields === "string"
      ? JSON.parse(otherFields)
      : otherFields

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(details.selectedPiece)
      }
    })

    const files = req.files?.files || [];

    const files_content = files.length
      ? files.map(file => ({
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size
      }))
      : [];

    if (!piece) {
      console.error("Pièce introuvable pour l'ID :", details.selectedPiece);
      return res.status(404).json({ message: "Pièce introuvable !" })
    }

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(userId)
      }
    });

    if (!utilisateur) {
      console.error("Utilisateur non trouvé pour l'ID :", userId);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const demande = await prisma.demandes.findUnique({
      where: {
        id: parseInt(id)
      }
    })
    if (!demande) {
      console.error("Demande non trouvée pour l'ID :", id);
      return res.status(404).json({ message: "Demande non trouvée" });
    }
    if (demande.demande_livree || !['en_cours', 'retourne'].includes(demande.statut_demande)) {
      console.error("Demande non modifiable, statut :", demande.statut_demande);
      return res.status(400).json({ message: "Seule une demande en cours ou retournée peut être modifiée." });
    }

    // Droits : créateur, demandeur, membre du service demandeur, ou super administrateur
    const membreService = demande.service_demandeur
      ? await prisma.user_services.findFirst({ where: { user_id: utilisateur.id_user, service_id: demande.service_demandeur } })
      : null
    const autorise = [demande.user_id, demande.id_demandeur].includes(utilisateur.id_user) ||
      !!membreService ||
      await estSuperAdmin(prisma, utilisateur.id_user)
    if (!autorise) {
      return res.status(403).json({ message: "Vous ne pouvez modifier que les demandes de votre service." });
    }

    const demandeForm = demande.form_id ? await prisma.forms.findUnique({
      where: {
        id: demande.form_id
      }
    }) : null
    if (!demandeForm) {
      console.error("Formulaire de demande non trouvé pour l'ID :", demande.form_id);
    }

    const dateAction = new Date();

    const updateDemande = await prisma.$transaction(async (tx) => {
      // Update du formulaire lié à la demande s'il existe
      const updatedForm = !demandeForm ? null : await tx.forms.update({
        where: {
          id: demande.form_id,
        },
        data: {
          nom_user: nomUser,
          last_modified_at: dateAction,
          updated_at: dateAction,
          updated_by: parseInt(userId),
        }
      });

      // Update de la demande
      const updatedDemande = await tx.demandes.update({
        where: {
          id: demande.id,
        },
        data: {
          // date_demande et user_id (créateur) sont conservés : la modification est tracée dans forms (updated_at / updated_by)
          nom_demandeur: nomUser,
          commentaire,
          qte_total_demande: +quantite,
          details_demande: JSON.stringify(details),
          statut_demande: 'en_cours',
          item_id: piece.id_piece,
          id_demandeur: parseInt(selectedUser),
          motif_demande: motif,
          service_demandeur: parseInt(serviceUser),
          champs_autre: JSON.stringify(autres)
        }
      });

      // Ajout de nouveaux fichiers liés à la demande
      if (files_content.length > 0) {
        await tx.fichiers.createMany({
          data: files_content.map(fichier => ({
            path: fichier.path,
            filename: fichier.name,
            originalName: fichier.name,
            mimeType: fichier.type,
            size: fichier.size,
            uploaded_by: +userId,
            form_id: demandeForm ? demandeForm.id : null,
            demande_id: demande.id,
            type_formulaire: 'demande',
            role: 'demandeur',
            created_at: dateAction,
          }))
        })
      }

      return {
        updatedForm,
        updatedDemande,
      }
    })
    /****************    GESTION DES MAILS     *****************/
    // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
    try {
      const service = await prisma.services.findUnique({
        where: { id: parseInt(serviceUser) }
      })

      const nomService = service.nom_service.toUpperCase()

      const userService = await prisma.user_services.findMany({
        where: { service_id: parseInt(serviceUser) },
        include: { users: true }
      })

      const userRole = await prisma.user_roles.findMany({
        where: { role_id: 4 },
        include: { users: true }
      })

      const service_users = userService.map(us => us.users.email)
      const validateurs = userRole.map(us => us.users.email)

      const nomPiece = piece.nom_piece.toUpperCase()

      const quantiteDemande = quantite;

      const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

      const url = GENERAL_URL
      const demandeLink = `${url}/demande-details/${demande.id}`;

      const subject = `SYSLIS - MODIFICATION DEMANDE POUR ${motif}`;
      const html = `
      <p>Bonjour,</p>
      <p>La demande ${demande.id} a été modifiée.</p>
      <ul>
        <li><strong>Demande de :</strong> ${nomPiece}</li>
        <li><strong>${details.typeDemande}</strong></li>
        <li><strong>Nombre de produits:</strong> ${quantiteDemande}</li>
      </ul>
      <ul>
        <li><strong>Service demandeur:</strong> ${nomService}</li>
        <li><strong>Nom demandeur:</strong> ${nomUser}</li>
      </ul>
      <br>
      <p>Commentaire : ${commentaire_mail}<p>
      <br>
      <p>Retrouvez la demande à ce lien : 
        <span>
        <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
          Cliquez ici !
        </a>
        </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
      `;

      // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
      const destinataires = [...new Set([...service_users, ...validateurs].filter(Boolean))];
      await sendMail({
        to: configEmail,
        bcc: destinataires,
        subject,
        html,
      });
    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    console.log("Demande de stock modifiée avec succès !");
    res.status(201).json({
      message: "Demande modifiée avec succès",
      data: updateDemande
    });

  } catch (error) {
    console.error("Erreur lors de la demande :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

/************************************************************************************************
 *  RÉCEPTION D'UNE DEMANDE DE STOCK
 *  Le demandeur choisit : créer un nouveau stock, alimenter un de ses stocks existants
 *  (même pièce, même modèle, même service) ou ne pas mettre les pièces en stock.
 ************************************************************************************************/
const LIBELLES_ACTION_RECEPTION = {
  nouveau_stock: 'Nouveau stock créé',
  stock_existant: 'Stock existant alimenté',
  ignore: 'Pièces non mises en stock',
}

// Livraisons d'une demande pas encore réceptionnées (la plus ancienne d'abord).
// Demande déjà marquée reçue (anciennes réceptions sans livraison_id) : plus rien à réceptionner.
const livraisonsAReceptionner = (db, demande) => demande.demande_recue
  ? Promise.resolve([])
  : db.livraison_piece.findMany({
    where: { demande_id: demande.id, reception_piece: { is: null } },
    orderBy: { id: 'asc' },
    include: { forms: true },
  })

const traiterReception = async (req, res, { isReg }) => {
  const libelle = isReg ? 'Réception régularisée' : 'Stock réceptionné'
  try {
    const {
      demandeId,
      commentaire,
      user_id,
      date_reception,
      actionStock,
      stockId,
      codeStock,
      livraisonId,
    } = req.body;

    const idDemande = toInt(demandeId)
    const idUser = toInt(user_id)
    if (!idUser) {
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }
    if (!idDemande) {
      return res.status(400).json({ message: "Demande invalide." });
    }

    const demande = await prisma.demandes.findUnique({ where: { id: idDemande } })
    if (!demande || demande.is_deleted) {
      return res.status(404).json({ message: "Demande introuvable." });
    }
    if (!STATUTS_LIVRABLES.includes(demande.statut_demande)) {
      return res.status(400).json({ message: "La demande n'a pas encore été livrée." });
    }
    if (demande.demande_recue) {
      return res.status(400).json({ message: "Demande déjà réceptionnée." });
    }

    // Livraison à réceptionner : celle choisie, sinon la plus ancienne en attente
    const enAttente = await livraisonsAReceptionner(prisma, demande)
    if (enAttente.length === 0) {
      return res.status(400).json({ message: "Aucune livraison en attente de réception pour cette demande." });
    }
    const idLivraison = toInt(livraisonId)
    const livraison = idLivraison ? enAttente.find((l) => l.id === idLivraison) : enAttente[0]
    if (!livraison) {
      return res.status(400).json({ message: "Cette livraison est déjà réceptionnée ou n'appartient pas à la demande." });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      return res.status(400).json({ message: "Signature introuvable !" });
    }

    const utilisateur = await prisma.users.findUnique({ where: { id_user: idUser } });
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const action = actionStock || 'ignore'
    if (!ACTIONS_RECEPTION.includes(action)) {
      return res.status(400).json({ message: "Choix de mise en stock invalide." });
    }

    const contenu = lireContenuLivre(livraison)
    if (action !== 'ignore' && !contenu) {
      return res.status(400).json({
        message: "Cette demande a été livrée avant la mise en place de la mise en stock à la réception : seule l'option « ne pas mettre en stock » est possible."
      });
    }

    let dateAction = new Date()
    if (isReg) {
      dateAction = new Date(date_reception)
      if (!date_reception || isNaN(dateAction.getTime())) {
        return res.status(400).json({ message: "Date de réception invalide !" });
      }
    }

    // Upload hors transaction (appel réseau)
    const uploadResult = await cloudinary.uploader.upload(signature.path, {
      folder: "greenpay/signatures",
    });
    const signatureCloud = uploadResult.secure_url;

    const piece = await prisma.items.findUnique({ where: { id_piece: demande.item_id } })
    const estTerminal = String(piece?.type || '').toUpperCase() == 'TERMINAL'

    const reception = await prisma.$transaction(async (tx) => {
      // Verrou sur la demande puis relecture (réceptions simultanées de deux livraisons)
      await tx.demandes.update({ where: { id: demande.id }, data: { demande_recue: false } })
      const dejaRecue = await tx.reception_piece.findFirst({ where: { livraison_id: livraison.id } })
      if (dejaRecue) {
        throw new HttpError(409, "Cette livraison a déjà été réceptionnée.")
      }

      let miseEnStock = null
      if (action !== 'ignore') {
        miseEnStock = await mettreEnStockReception(tx, {
          demande,
          contenu,
          action,
          stockId,
          codeStock,
          user: utilisateur,
          dateAction,
          commentaire,
        })
      }

      const receptionForm = await tx.forms.create({
        data: {
          type: 'reception_stock',
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
          ...(isReg ? { is_reg: true } : {}),
        }
      })

      const newReception = await tx.reception_piece.create({
        data: {
          item_id: demande.item_id,
          user_id: utilisateur.id_user,
          demande_id: demande.id,
          created_at: dateAction,
          signature_recepteur: signatureCloud,
          nom_recepteur: utilisateur.fullname,
          commentaire,
          form_id: receptionForm.id,
          action_stock: action,
          stock_id: miseEnStock ? miseEnStock.stock.id : null,
          livraison_id: livraison.id,
        }
      })

      // Demande entièrement livrée et toutes ses livraisons réceptionnées : demande reçue
      const demandeVerrouillee = await tx.demandes.findUnique({ where: { id: demande.id } })
      const restantes = await tx.livraison_piece.count({
        where: { demande_id: demande.id, reception_piece: { is: null } },
      })
      const demandeRecue = demandeVerrouillee.demande_livree && restantes === 0
      if (demandeRecue) {
        await tx.demandes.update({ where: { id: demande.id }, data: { demande_recue: true } })
      }

      // Terminaux mis en stock : retour au statut 1 au parc (régularisation antidatée : historique seul si besoin)
      if (miseEnStock && estTerminal && (contenu.snIds || []).length > 0) {
        const sns = await tx.serial_numbers.findMany({
          where: { id: { in: contenu.snIds } },
          select: { serial_number: true, model_id: true },
        })
        await appliquerStatutParc(tx, {
          items: sns.map((sn) => ({ serial: sn.serial_number, modelId: sn.model_id })),
          statutId: 1,
          userId: utilisateur.id_user,
          dateAction,
          formId: receptionForm.id,
        })
      }

      await tx.form_signatures.create({
        data: {
          form_id: receptionForm.id,
          signature_url: signatureCloud,
          signed_by: utilisateur.id_user,
          signed_at: dateAction,
          role: 'receveur',
        },
      })

      return {
        receptionForm,
        newReception,
        stock: miseEnStock ? miseEnStock.stock : null,
        mouvement: miseEnStock ? miseEnStock.mouvement : null,
        demandeRecue,
        livraisonsRestantes: restantes,
      }
    }, OPTIONS_TRANSACTION_STOCK)

    /****************    GESTION DES MAILS     *****************/
    try {
      const livreur = livraison?.forms?.created_by
        ? await prisma.users.findUnique({ where: { id_user: livraison.forms.created_by } })
        : null
      const service = await prisma.services.findUnique({ where: { id: demande.service_demandeur } })
      const typeMouvement = demande.type_demande
        ? await prisma.type_mouvement_stock.findUnique({ where: { id: demande.type_demande } })
        : null
      const piece = await prisma.items.findUnique({ where: { id_piece: demande.item_id } })

      const commentaire_mail = commentaire ? commentaire : "(Sans commentaire)"
      const deliveryLink = `${GENERAL_URL}/demande-details/${demande.id}`;
      const ligneStock = reception.stock
        ? `${LIBELLES_ACTION_RECEPTION[action]} : ${reception.stock.code_stock}`
        : LIBELLES_ACTION_RECEPTION[action]
      const subject = `SYSLIS - RECEPTION DE STOCK`;
      const html = `
      <p>Bonjour,</p>
      <p>La demande de stock ${demande.id} a été réceptionnée.</p>
      <ul>
        <li><strong>Pièce demandée:</strong> ${piece ? piece.nom_piece : ''}</li>
        <li><strong>Livraison:</strong> ${contenu ? contenu.quantitePiece + ' pièce(s)' : demande.qte_total_demande} ${typeMouvement ? '- ' + typeMouvement.titre : ''}</li>
        <li><strong>Service:</strong> ${service ? service.nom_service : ''}</li>
        <li><strong>Mise en stock:</strong> ${ligneStock}</li>
      </ul>
      <br>
        <p>Commentaire : ${commentaire_mail}</p>
      <br>
      <p>Retrouvez la demande à ce lien :
        <span>
          <a href="${deliveryLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
            Cliquez ici !
          </a>
        </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
    `;

      const destinataires = [...new Set([livreur?.email].filter(Boolean))];
      if (destinataires.length > 0) {
        await sendMail({
          to: configEmail,
          bcc: destinataires,
          subject,
          html,
        });
      }
    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    console.log(`${libelle} avec succès !`)
    return res.status(201).json({
      message: `${libelle} avec succès`,
      data: reception,
    });

  } catch (error) {
    if (error instanceof HttpError) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

const receivePiece = (req, res) => traiterReception(req, res, { isReg: false })
const regReceptionDemande = (req, res) => traiterReception(req, res, { isReg: true })

// Informations pour la modale de réception : contenu livré, stocks alimentables, choix possibles
const getOptionsReception = async (req, res) => {
  try {
    const idDemande = toInt(req.params.demandeId)
    const idUser = toInt(req.params.userId)
    if (!idDemande || !idUser) {
      return res.status(400).json({ message: "Paramètres invalides." });
    }
    const demande = await prisma.demandes.findUnique({ where: { id: idDemande } })
    if (!demande) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    const service = demande.service_demandeur
      ? await prisma.services.findUnique({ where: { id: demande.service_demandeur } })
      : null

    // Une entrée par livraison en attente de réception (la plus ancienne d'abord)
    const enAttente = await livraisonsAReceptionner(prisma, demande)
    const modeles = new Map()
    const stocksParModele = new Map()
    const livraisons = []
    for (const livraison of enAttente) {
      const contenu = lireContenuLivre(livraison)
      let stocks = []
      let nomModel = null
      if (contenu && demande.service_demandeur) {
        if (!modeles.has(contenu.modelId)) {
          const model = await prisma.model_piece.findUnique({ where: { id_model: contenu.modelId } })
          modeles.set(contenu.modelId, model ? model.nom_model : null)
          stocksParModele.set(contenu.modelId, await prisma.stocks.findMany({
            where: whereStocksAlimentables({
              pieceId: contenu.pieceId,
              modelId: contenu.modelId,
              serviceId: demande.service_demandeur,
              userId: idUser,
            }),
            select: {
              id: true,
              code_stock: true,
              quantite_piece: true,
              quantite_carton: true,
              quantite_lot: true,
              service_id: true,
              model_id: true,
            },
            orderBy: { id: 'desc' },
          }))
        }
        nomModel = modeles.get(contenu.modelId)
        stocks = stocksParModele.get(contenu.modelId)
      }
      livraisons.push({
        id: livraison.id,
        date: livraison.forms ? livraison.forms.created_at : null,
        miseEnStockPossible: !!contenu && !!demande.service_demandeur,
        contenu: contenu ? {
          typeMouvement: contenu.typeMouvement,
          quantitePiece: contenu.quantitePiece,
          quantiteCarton: contenu.quantiteCarton,
          quantiteLot: contenu.quantiteLot,
          quantiteSn: (contenu.snIds || []).length,
          codeStockOrigine: contenu.codeStockOrigine,
          modelId: contenu.modelId,
          nomModel,
        } : null,
        stocks,
      })
    }

    // Champs de premier niveau = livraison la plus ancienne (compatibilité)
    const premiere = livraisons[0] || null
    return res.status(200).json({
      livraisons,
      miseEnStockPossible: premiere ? premiere.miseEnStockPossible : false,
      contenu: premiere ? premiere.contenu : null,
      stocks: premiere ? premiere.stocks : [],
      serviceDemandeur: service ? { id: service.id, nom_service: service.nom_service } : null,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Erreur lors de la récupération des options de réception." })
  }
}

const getAllReceptionsPiece = async (req, res) => {
  try {
    const receptions = await prisma.reception_piece.findMany({
      orderBy: { date: 'desc' },
    });

    res.status(200).json(receptions);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des receptions", error });
  }
}

// Échappement HTML des textes insérés dans les PDF
const echapperHtml = (valeur) => String(valeur ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// Tableau des livraisons d'une demande pour le PDF (une ligne par livraison, avec sa réception)
const construireTableauLivraisonsPdf = (demande, suivi) => {
  if (!suivi.livraisons.length) return ''
  const e = echapperHtml
  const libelleContenu = (c) => c ? [
    c.quantiteLot ? `${c.quantiteLot} lot(s)` : null,
    c.quantiteCarton ? `${c.quantiteCarton} carton(s)` : null,
    `${c.quantitePiece ?? 0} pièce(s)`,
    c.quantiteSn ? `${c.quantiteSn} SN` : null,
  ].filter(Boolean).join(' - ') : '—'
  const libelleMiseEnStock = (r) => {
    if (!r || !r.actionStock) return ''
    if (r.actionStock === 'nouveau_stock') return ` - nouveau stock ${r.codeStock || ''}`
    if (r.actionStock === 'stock_existant') return ` - ajout au stock ${r.codeStock || ''}`
    return ' - non mis en stock'
  }
  const lignes = suivi.livraisons.map((l) => {
    const livraison = (demande.livraison_piece || []).find((x) => x.id === l.id)
    const livreur = livraison && livraison.forms ? livraison.forms.nom_user : null
    const reception = l.reception ? (demande.reception_piece || []).find((x) => x.id === l.reception.id) : null
    const texteReception = l.reception
      ? `Reçue le ${l.reception.date ? formatDate(l.reception.date) : '—'}${reception && reception.nom_recepteur ? ` par ${reception.nom_recepteur}` : ''}${libelleMiseEnStock(l.reception)}`
      : (l.enAttenteReception ? 'En attente de réception' : '—')
    return `<tr><td>${l.numero}</td><td>${l.date ? formatDate(l.date) : '—'}</td><td>${e(livreur || '—')}</td>` +
      `<td>${e(libelleContenu(l.contenu))}</td><td>${e((l.contenu && l.contenu.codeStockOrigine) || '—')}</td><td>${e(texteReception)}</td></tr>`
  }).join('\n')
  let bilan = ''
  if (suivi.unite && suivi.quantiteValidee !== null) {
    bilan = `Validé : ${suivi.quantiteValidee} ${suivi.libelleUnite} - livré : ${suivi.quantiteLivree} - reste : ${suivi.reste}`
    if (demande.demande_livree && suivi.reste > 0) bilan += ' (demande clôturée)'
  }
  return `<div class="livraisons"><strong>Livraisons (${suivi.livraisons.length})</strong>${bilan ? `<div>${e(bilan)}</div>` : ''}` +
    `<table class="tableau-livraisons"><thead><tr><th>N°</th><th>Date</th><th>Livreur</th><th>Contenu</th><th>Stock d'origine</th><th>Réception</th></tr></thead>` +
    `<tbody>${lignes}</tbody></table></div>`
}

const generateDemandePDF = async (req, res) => {
  const { id } = req.params;

  try {
    const demande_data = await prisma.demandes.findUnique({
      where: { id: parseInt(id) },
      include: {
        validation_demande: true,
        livraison_piece: { include: { forms: true }, orderBy: { id: 'asc' } },
        reception_piece: { include: { forms: true, stocks: { select: { code_stock: true } } }, orderBy: { id: 'asc' } },
      }
    });

    // console.log("demande data: ", demande_data)


    if (!demande_data) return res.status(404).json({ message: "Demande introuvable" });
    if (demande_data.validation_demande.length < 1) return res.status(400).json({ message: "Aucune validation trouvée" });

    const demande = {
      ...demande_data,
      produitsDemandes: typeof demande_data.produit_demande === "string"
        ? JSON.parse(demande_data.produit_demande)
        : demande_data.produit_demande,
    };
    const indexReception = demande_data.reception_piece.length - 1
    const demandeLivraison = demande_data.reception_piece[indexReception]
    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(demande.item_id)
      }
    })

    // champs_autre peut être vide (demande sans champ supplémentaire)
    let champsAutres = []
    try {
      const valeur = JSON.parse(demande_data.champs_autre || '[]')
      champsAutres = Array.isArray(valeur) ? valeur : []
    } catch (e) {
      champsAutres = []
    }

    // 🔎 Récupération de l'agent qui a fait la demande (si user_id défini)
    let nomDemandeur = "N/A";
    if (demande.nom_demandeur) {
      nomDemandeur = demande.nom_demandeur;
    } else if (demande.user_id) {
      const user = await prisma.users.findUnique({
        where: { id_user: demande.user_id }
      });
      nomDemandeur = user.fullname
    }

    let details = JSON.parse(demande_data.details_demande)

    let service_demandeur = "N/A"
    let service_donneur = "N/A"
    const serviceDemandeur = await prisma.services.findUnique({
      where: {
        id: parseInt(demande.service_demandeur)
      }
    })
    if (serviceDemandeur) {
      service_demandeur = serviceDemandeur.nom_service.toUpperCase()
    }

    // const serviceDonneur = await prisma.services.findUnique({
    //   where: {
    //     id: parseInt(details.service)
    //   }
    // })
    // if (serviceDonneur) {
    //   service_donneur = serviceDonneur.nom_service.toUpperCase()
    // }
    // console.log(serviceDonneur)

    const autresChamps = champsAutres.map((data, index) => {
      let row = ""
      row = `<tr><th>${echapperHtml(data.titre)}</th><th>${echapperHtml(data.information)}</th></tr>`

      if ((index + 1) % 20 === 0) {
        row += `<tr class="page-break"></tr>`;
      }

      return row
    }).join("\n");

    let autresChampsLivraison = []

    // 🗺️ Sélection du template
    const templatesMap = {
      1: "demande_DT.html",
      2: "demande_livraison.html"
    };

    let templateFile = templatesMap[1];

    let index = demande.validation_demande.length - 1

    let quantite = demande_data.qte_total_demande

    let quantite_livree = 0

    let mouvement = null
    let type_demande = null
    let typeMouvement = ''
    let stock_depart = 0
    let stock_final = 0
    if (demande.demande_livree) {
      type_demande = details.typeMouvement
      mouvement = await prisma.type_mouvement_stock.findUnique({
        where: {
          id: +type_demande
        }
      })
      typeMouvement = mouvement.titre
      stock_depart = type_demande == 1 ? details.stockInitialLot : type_demande == 2 ?
        details.stockInitialCartonLot : type_demande == 3 ?
          details.stockInitialPieceCarton : type_demande == 4 ?
            details.stockInitialCarton : type_demande == 5 ?
              details.stockInitialPiece : 0

      stock_final = type_demande == 1 ? details.stockFinalLot : type_demande == 2 ?
        details.stockFinalCartonLot : type_demande == 3 ?
          details.stockFinalPieceCarton : type_demande == 4 ?
            details.stockFinalCarton : type_demande == 5 ?
              details.stockFinalPiece : 0
      quantite_livree = type_demande == 1 ? details.quantiteMouvementLot : type_demande == 2 ?
        details.quantiteMouvementCartonLot : type_demande == 3 ?
          details.quantiteMouvementPieceCarton : type_demande == 4 ?
            details.quantiteMouvementCarton : type_demande == 5 ?
              details.quantiteMouvement : 0
    } else {
      typeMouvement = details.typeDemande
    }


    const validation = demande.validation_demande[index]

    let nomValidateur = validation.nom_validateur
    let signature_validation = validation.signature
    let date_validation = validation.date_validation_demande
    let commentaire_validation = validation.commentaire
    const quantite_validee = validation.quantite_validee

    let signature_livraison = 'N/A'
    let date_livraison = 'N/A'
    let signature_reception = 'N/A'
    let date_reception = 'N/A'
    let nom_livreur = 'N/A'
    let nom_recepteur = 'N/A'
    let commentaire_livraison = 'N/A'
    let commentaire_reception = 'N/A'
    let quantite_livraison = 'N/A'

    // Suivi des livraisons (une ou plusieurs) : tableau détaillé + quantité livrée cumulée
    const suivi = suiviLivraisons(demande_data)
    const nbLivraisons = suivi.livraisons.length
    if (nbLivraisons > 0) {
      templateFile = templatesMap[2]
    }
    if (nbLivraisons > 1) {
      // Les stocks initial / final n'ont de sens que pour une livraison : le détail est dans le tableau
      stock_depart = '—'
      stock_final = '—'
    }
    if (suivi.unite && nbLivraisons > 0) {
      quantite_livree = `${suivi.quantiteLivree} ${suivi.libelleUnite}${nbLivraisons > 1 ? ` (${nbLivraisons} livraisons)` : ''}`
    } else if (nbLivraisons > 1) {
      quantite_livree = `${quantite_livree} (dernière des ${nbLivraisons} livraisons)`
    }
    const tableauLivraisons = construireTableauLivraisonsPdf(demande_data, suivi)

    if (demandeLivraison) {
      templateFile = templatesMap[2]
      date_reception = demandeLivraison.created_at
      signature_reception = demandeLivraison.signature_recepteur
      nom_recepteur = demandeLivraison.nom_recepteur
      commentaire_reception = demandeLivraison.commentaire
    }

    const filePath = path.join(__dirname, "../../statics/templates/", templateFile);
    let html = fs.readFileSync(filePath, "utf8");

    // Textes saisis par les utilisateurs échappés (ils sont insérés dans le HTML du PDF) ; dates absentes -> vide
    const e = echapperHtml
    const dateOuVide = (d) => (d && d !== 'N/A' ? formatDate(d) : '')
    html = html
      .replaceAll("{{commentaire}}", e(demande.commentaire || ''))
      .replaceAll("{{commentaire_validation}}", e(commentaire_validation || ''))
      .replaceAll("{{commentaire_livraison}}", e(commentaire_livraison))
      .replaceAll("{{commentaire_reception}}", e(commentaire_reception || ''))
      .replaceAll("{{date_demande}}", dateOuVide(demande.date_demande))
      .replaceAll("{{pieces_demandees}}", e(piece.nom_piece.toUpperCase()))
      .replaceAll("{{motif_demande}}", e(demande.motif_demande || ''))
      .replaceAll("{{service_donneur}}", e(service_donneur))
      .replaceAll("{{mouvement}}", e(typeMouvement || ''))
      .replaceAll("{{nom_validateur}}", e(nomValidateur || ''))
      .replaceAll("{{nom_demandeur}}", e(nomDemandeur))
      .replaceAll("{{service_demandeur}}", e(service_demandeur))
      .replaceAll("{{quantite}}", e(quantite))
      .replaceAll("{{quantite_validee}}", e(quantite_validee))
      .replaceAll("{{quantite_livree}}", e(quantite_livree))
      .replaceAll("{{quantite_livraison}}", e(quantite_livraison))
      .replaceAll("{{stock_initial}}", e(stock_depart ?? ''))
      .replaceAll("{{stock_final}}", e(stock_final ?? ''))
      .replaceAll("{{signature}}", signature_validation ? e(signature_validation) : '#')
      .replaceAll("{{date_validation_demande}}", dateOuVide(date_validation))
      .replaceAll("{{nom_livreur}}", e(nom_livreur))
      .replaceAll("{{signature_livraison}}", signature_livraison && signature_livraison !== 'N/A' ? e(signature_livraison) : '#')
      .replaceAll("{{date_livraison}}", dateOuVide(date_livraison))
      .replaceAll("{{nom_recepteur}}", e(nom_recepteur || ''))
      .replaceAll("{{signature_reception}}", signature_reception && signature_reception !== 'N/A' ? e(signature_reception) : '#')
      .replaceAll("{{date_reception}}", dateOuVide(date_reception))
      .replace("{{autre_champs}}", autresChamps ? autresChamps : '')
      .replace("{{autre_champs_livraison}}", '')
      .replace("{{tableau_livraisons}}", tableauLivraisons)

    // 🖨️ Génération PDF
    // Le navigateur est toujours fermé, même si la génération échoue (sinon un process Chrome reste ouvert à chaque erreur)
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    let pdfBuffer
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
      });
    } finally {
      await browser.close();
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=demande_${demande.id}.pdf`
    });

    return res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la génération du PDF" });
  }
};

const getAllDemandeFiles = async (req, res) => {
  const {
    idDemande
  } = req.params

  try {

    const demandeId = parseInt(idDemande, 10);

    if (isNaN(demandeId)) {
      return res.status(400).json({ message: "Invalid demande ID" });
    }
    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demandeId) }
    })
    if (!demande) {
      console.log('Demande introuvable')
      return res.status(404).json({ message: "Demande introuvable" });
    }
    const files = await prisma.fichiers.findMany({
      where: {
        demande_id: demandeId,
      },
      orderBy: {
        created_at: "asc"
      },
    });

    console.log('Succès !')
    res.status(200).json(files);
  } catch (error) {
    console.log("Erreur serveur: ", error)
    console.error("Erreur :", error)
    res.status(500).json({ message: "Erreur lors de la récupération des fichiers", error });
  }
}

const downloadFile = async (req, res) => {
  const { id } = req.params;

  const fileId = parseInt(id, 10);

  if (isNaN(fileId)) {
    console.log("Invalid file ID")
    return res.status(400).json({ message: "Invalid file ID" });
  }

  try {
    const file = await prisma.fichiers.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      console.log("File not found")
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.resolve(file.path);

    if (!fs.existsSync(filePath)) {
      console.log("File missing on server")
      return res.status(404).json({ message: "File missing on server" });
    }

    console.log('File downloaded !')
    return res.download(filePath, file.filename);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getDemandesEnAttente = async (req, res) => {
  try {
    const demandes = await prisma.demandes.findMany({
      where: {
        statut_demande: 'en_cours',
      },
      orderBy: { date_demande: 'desc' },
      include: {
        items: true,
        services: true,
      }
    });

    res.status(200).json(demandes);
  } catch (error) {
    console.log("Erreur serveur: ", error)
    res.status(500).json({ message: "Erreur lors de la récupération des demandes en attente", error });
  }
};

// Récupérer les demandes validées et non livrées (statut: valide, demande_livree: false)
const getDemandesValideesNonLivrees = async (req, res) => {
  try {
    const demandes = await prisma.demandes.findMany({
      where: {
        statut_demande: { in: STATUTS_LIVRABLES },
        demande_livree: false,
      },
      orderBy: { date_demande: 'desc' },
      include: {
        items: true,
        services: true,
        validation_demande: true,
      }
    });

    res.status(200).json(demandes);
  } catch (error) {
    console.log("Erreur serveur: ", error)
    res.status(500).json({ message: "Erreur lors de la récupération des demandes validées non livrées", error });
  }
};

// Fonction de régularisation des demandes de stock: faire une demande de stock en précisant la date.
const regularisationDemande = async (req, res) => {
  try {
    if (!(await appliquerSaisieDemande(req, res))) return
    const dateDemandeReg = new Date(req.body.date_demande)
    if (!req.body.date_demande || isNaN(dateDemandeReg.getTime())) {
      return res.status(400).json({ message: "Date de la demande invalide !" })
    }
    if (dateDemandeReg.getTime() > Date.now()) {
      return res.status(400).json({ message: "La date de la demande ne peut pas être dans le futur." })
    }

    const {
      detailsDemande,
      userId,
      quantite,
      serviceUser,
      selectedUser,
      nomUser,
      motif,
      commentaire,
      otherFields,
      date_demande,
    } = req.body;

    const details = typeof detailsDemande === "string"
      ? JSON.parse(detailsDemande)
      : detailsDemande;

    const autres = typeof otherFields === "string"
      ? JSON.parse(otherFields)
      : otherFields

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(details.selectedPiece)
      }
    })

    if (!piece) {
      console.log("Erreur serveur 404: pièce introuvable ! ")
      return res.status(404).json({ message: "Pièce introuvable !" })
    }

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(userId)
      }
    });

    if (!utilisateur) {
      console.log("Erreur serveur 404: utilisateur introuvable ! ")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const files = req.files?.files || [];

    const files_content = files.length
      ? files.map(file => ({
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size
      }))
      : [];


    // Nouvelle transaction pour créer la régularisation de demande de stock, le formulaire associé et les fichiers liés
    const newRegularisation = await prisma.$transaction(async (tx) => {
      const demandeForm = await tx.forms.create({
        data: {
          type: 'demande_stock',
          created_by: utilisateur.id_user,
          created_at: new Date(date_demande),
          last_modified_at: new Date(date_demande),
          nom_user: nomUser,
          commentaire,
          is_reg: true,
        }
      })
      const nouvelleDemande = await tx.demandes.create({
        data: {
          nom_demandeur: nomUser,
          date_demande: new Date(date_demande),
          commentaire,
          qte_total_demande: parseInt(quantite),
          details_demande: JSON.stringify(details),
          statut_demande: 'en_cours',
          user_id: parseInt(userId),
          item_id: parseInt(details.selectedPiece),
          id_demandeur: parseInt(selectedUser),
          motif_demande: motif,
          service_demandeur: parseInt(serviceUser),
          champs_autre: JSON.stringify(autres),
          form_id: demandeForm.id,
        }
      });

      if (files_content.length > 0) {
        await tx.fichiers.createMany({
          data: files_content.map(fichier => ({
            path: fichier.path,
            filename: fichier.name,
            originalName: fichier.name,
            mimeType: fichier.type,
            size: fichier.size,
            uploaded_by: +userId,
            form_id: demandeForm.id,
            demande_id: nouvelleDemande.id,
            type_formulaire: 'demande',
            role: 'demandeur',
            created_at: new Date(),
          }))
        })
      }
      return {
        demandeForm,
        nouvelleDemande,
      }
    });

    /****************    GESTION DES MAILS     *****************/
    // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
    try {
      const service = await prisma.services.findUnique({
        where: { id: parseInt(serviceUser) }
      })

      const nomService = service.nom_service.toUpperCase()

      const userService = await prisma.user_services.findMany({
        where: { service_id: parseInt(serviceUser) },
        include: { users: true }
      })

      const userRole = await prisma.user_roles.findMany({
        where: { role_id: 4 },
        include: { users: true }
      })

      const service_users = userService.map(us => us.users.email)
      const validateurs = userRole.map(us => us.users.email)

      const nomPiece = piece.nom_piece.toUpperCase()

      const quantiteDemande = quantite;

      const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

      const url = GENERAL_URL
      const demandeLink = `${url}/demande-details/${newRegularisation.nouvelleDemande.id}`;

      const subject = `SYSLIS - REGULARISATION MOUVEMENT DE STOCK DE ${nomPiece}`;
      const html = `
        <p>Bonjour,</p>
        <p>Une nouvelle demande a été enregistrée.</p>
        <ul>
          <li><strong>Demande de :</strong> ${nomPiece}</li>
          <li><strong>${details.typeDemande}</strong></li>
          <li><strong>Nombre de produits:</strong> ${quantiteDemande}</li>
        </ul>
        <ul>
          <li><strong>Service demandeur:</strong> ${nomService}</li>
          <li><strong>Nom demandeur:</strong> ${nomUser}</li>
        </ul>
        <br>
        <p>Commentaire : ${commentaire_mail}<p>
        <br>
        <p>Retrouvez la demande à ce lien : 
          <span>
          <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
            Cliquez ici !
          </a>
          </span>
        </p>
        <br><br>
        <p>Green - Pay vous remercie.</p>
        `;

      // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
      const destinataires = [...new Set([...service_users, ...validateurs].filter(Boolean))];
      await sendMail({
        to: configEmail,
        bcc: destinataires,
        subject,
        html,
      });
    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    console.log("Régularisation de demande de stock enregistrée avec succès")
    res.status(201).json({
      message: "Régularisation de demande de stock enregistrée avec succès",
      data: newRegularisation
    });

  } catch (error) {
    console.log("Erreur serveur: ", error)
    console.error("Erreur lors de la demande :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

// Fonction de régularisation de validation de demande de stock. La date est précisée et le mail est modifié.
const regValidateDemande = async (req, res) => {
  try {
    const {
      demande_id,
      user_id,
      commentaire,
      quantiteValidee,
      owners,
      date_validation,
    } = req.body;
    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demande_id) },
    });

    if (!demande) return res.status(404).json({ message: "Demande introuvable." });

    if (demande.statut_demande !== "en_cours") {
      return res.status(400).json({ message: demande.statut_demande === "valide" ? "Demande déjà validée." : "Seule une demande en cours peut être validée." });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(400).json({ message: "Signature introuvable !" });
    }

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const quantite = toInt(quantiteValidee)
    if (!quantite || quantite < 1) {
      return res.status(400).json({ message: "Quantité validée invalide." });
    }

    const dateValidation = new Date(date_validation)
    if (!date_validation || isNaN(dateValidation.getTime())) {
      return res.status(400).json({ message: "Date de validation invalide !" });
    }

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Upload hors transaction (appel réseau)
    const uploadResult = await cloudinary.uploader.upload(signature.path, {
      folder: "greenpay/signatures",
    });
    const signatureCloud = uploadResult.secure_url;

    const validation = await prisma.$transaction(async (tx) => {
      const garde = await tx.demandes.updateMany({
        where: { id: demande.id, statut_demande: "en_cours" },
        data: {
          statut_demande: "valide",
        },
      });
      if (garde.count !== 1) {
        throw new HttpError(409, "La demande a déjà été traitée.")
      }

      const validationForm = await tx.forms.create({
        data: {
          type: 'validation_stock',
          created_by: user.id_user,
          created_at: dateValidation,
          last_modified_at: dateValidation,
          nom_user: user.fullname,
          commentaire,
          is_reg: true,
        },
      })
      await tx.form_signatures.create({
        data: {
          form_id: validationForm.id,
          signature_url: signatureCloud,
          signed_by: user.id_user,
          signed_at: new Date(),
          role: 'validateur',
        },
      })

      const newValidation = await tx.validation_demande.create({
        data: {
          id_demande: parseInt(demande_id),
          commentaire,
          id_user: user_id ? parseInt(user_id) : null,
          nom_validateur: user.fullname,
          date_validation_demande: dateValidation,
          signature: signatureCloud,
          statut_validation_demande: "valide",
          quantite_validee: quantite,
          form_id: validationForm.id
        },
      });

      return {
        validationForm,
        newValidation,
      }
    })

    /****************    GESTION DES MAILS     *****************/
    // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
    try {
      const piece = await prisma.items.findUnique({
        where: { id_piece: parseInt(demande.item_id) }
      });

      const service = await prisma.services.findUnique({
        where: { id: parseInt(demande.service_demandeur) }
      })

      const userService = await prisma.user_services.findMany({
        where: { service_id: parseInt(demande.service_demandeur) },
        include: { users: true }
      })

      const stockOwners = await responsablesStocksDemande(demande)

      const proprietaires = stockOwners.map(us => us.email)
      const service_users = userService.map(us => us.users.email)

      const motif = demande.motif_demande
      const nomPiece = piece.nom_piece.toUpperCase()

      const nomServiceDemandeur = service.nom_service.toUpperCase();

      const quantite = quantiteValidee;
      const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';
      const url = GENERAL_URL
      const demandeLink = `${url}/demande-details/${demande.id}`;
      const subject = `SYSLIS - REGULARISATION VALIDATION DEMANDE DE ${nomPiece}`;
      const html = `
      <p>Bonjour,</p>
      <p>La régularisation de la validation de la demande ${demande.id} a été éffectuée.</p>
      <ul>
        <li><strong>Motif :</strong> ${motif}</li>
        <li><strong>Quantité validée :</strong> ${quantite}</li>
      </ul>
      <ul>
        <li><strong>Service demandeur:</strong> ${nomServiceDemandeur}</li>
        <li><strong>Nom demandeur:</strong> ${demande.nom_demandeur}</li>
      </ul>
      <br>
      <p>Commentaire : ${commentaire_mail}<p>
      <br>
      <p>Retrouvez la demande à ce lien : 
          <span>
          <a href="${demandeLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
              Cliquez ici !
          </a>
          </span>
      </p>
      <br><br>
      <p>Green - Pay vous remercie.</p>
      `;

      // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
      const destinataires = [...new Set([...proprietaires, ...service_users].filter(Boolean))];
      await sendMail({
        to: configEmail,
        bcc: destinataires,
        subject,
        html,
      });
    } catch (mailError) {
      console.error("Erreur lors de l'envoi des mails :", mailError);
    }

    console.log("Validation régularisée avec succès !")
    return res.status(201).json({
      message: "Validation régularisée avec succès !",
      data: validation,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = {
  faireDemande,
  getAllDemandes,
  getOneDemande,
  livraisonDemande,
  returnDemande,
  cancelDemande,
  updateDemande,
  generateDemandePDF,
  receivePiece,
  validateDemande,
  getAllDemandeFiles,
  downloadFile,
  getDemandesEnAttente,
  getDemandesValideesNonLivrees,
  regularisationDemande,
  regValidateDemande,
  regLivraisonDemande,
  regReceptionDemande,
  getStocksLivraison,
  getOptionsReception,
}
