const TEST_ENV = require("../../utils/consts")

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const prisma = require('../../prisma/client');
const cloudinary = require("../../config/clouddinaryConifg");
const { get } = require("http");
const { urlToHttpOptions } = require("url");
const { type } = require("os");
const sendMail = require("../../utils/emailSender");


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

    /************************** GESTION DES MAILS ********************************/

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(serviceUser)
      }
    })

    const nomService = service.nom_service.toUpperCase()

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(serviceUser)
      },
      include: {
        users: true
      }
    })

    const userRole = await prisma.user_roles.findMany({
      where: {
        role_id: 4,
      },
      include: {
        users: true
      }
    })
    // const mouvement = await prisma.type_mouvement_stock.findUnique({
    //   where: {
    //     id: details.typeMouvement
    //   }
    // })

    const service_users = userService.map(us => us.users)
    const validateurs = userRole.map(us => us.users)

    let nomPiece = piece.nom_piece.toUpperCase()

    let quantiteDemande = quantite;

    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${nouvelleDemande.demande.id}`;

    const sendMail = require("../../utils/emailSender");

    const subject = `SYSLIS - MOUVEMENT DE STOCK DE ${nomPiece}`;
    let html = `
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
    if (service_users && service_users.length > 0) {
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }

    if ((validateurs && validateurs.length > 0)) {
      for (const validateur of validateurs) {
        await sendMail({
          to: validateur.email,
          subject,
          html,
        });
      }
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

const getAllDemandes = async (req, res) => {
  try {
    const demandes = await prisma.demandes.findMany({
      orderBy: { date_demande: 'desc' },
      include: {
        forms: true,
        items: true,
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
            forms: true
          },
        },
      }
    });

    res.status(200).json(demandes);
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
            forms: true
          },
        },
      }
    });

    if (!demandes) {
      console.log("Demande introuvable pour l'id : ", id)
      return res.status(404).json({ message: "demande introuvable" });
    }

    console.log("Succès !")
    res.status(200).json(demandes);
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

    if (demande.statut_demande === "valide") {
      console.error('Demande déjà validée !')
      return res.status(400).json({ message: "Demande déjà validée." });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    if (!user_id) {
      console.error('Utilisateur non authentifié !')
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      console.error('Utilisateur introuvable !')
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }


    const dateAction = new Date()

    const validation = await prisma.$transaction(async (tx) => {
      const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
        folder: "greenpay/signatures",
      });
      const signatureCloud = uploadResult.secure_url;

      await tx.demandes.update({
        where: { id: demande.id },
        data: {
          statut_demande: "valide",
        },
      });

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
          signature_url: signature.path,
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
          quantite_validee: +quantiteValidee,
          form_id: validationForm.id
        },
      });

      return {
        validationForm,
        newValidation,
      }
    })

    /************************************     GESTION MAILS     **************************************/

    let stockOwners = []
    if (owners && owners.length > 0) {
      ownersList = new Array(owners).map((item) => {
        return parseInt(item)
      })
      if (ownersList && ownersList.length > 0) {
        stockOwners = await prisma.users.findMany({
          where: {
            id_user: {
              in: ownersList,
            }
          }
        })
      }
    }

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(demande.item_id)
      }
    });

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(demande.service_demandeur)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(demande.service_demandeur)
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
    let nomPiece = piece.nom_piece.toUpperCase()

    let nomServiceDemandeur = service.nom_service.toUpperCase();

    let quantite = quantiteValidee;
    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';
    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${demande.id}`;
    const sendMail = require("../../utils/emailSender");
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

    if (stockOwners && stockOwners.length > 0) {
      for (const stockOwner of stockOwners) {
        await sendMail({
          to: stockOwner.email,
          subject,
          html: html2,
        });
      }
    }
    if (service_users && service_users.length > 0) {
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }

    console.log("Demande validée avec succès !")
    return res.status(201).json({
      message: "Demande validée avec succès !",
      data: validation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

const livraisonDemande = async (req, res) => {
  try {
    const {
      demande_id,
      user_id,
      commentaire,
      stock_id,
      nomenclature,
      detailsDemande,
      detailsDemandeur,
      itemId,
    } = req.body;
    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demande_id) },
    });

    if (!demande) {
      console.error('Demande introuvable !')
      return res.status(404).json({ message: "Demande introuvable." });
    }

    if (demande.demande_livree == true) {
      console.error('Demande déjà livrée !')
      return res.status(400).json({ message: "Demande déjà livrée." });
    }

    if (!user_id) {
      console.error('Utilisateur non authentifié !')
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      console.error('Utilisateur non trouvé !')
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    /************************************     GESTION MOUVEMENT DE STOCK     *****************************/

    const detailsMouvement = typeof detailsDemande === "string" ? JSON.parse(detailsDemande) : detailsDemande;
    const detailsEntree = typeof detailsDemandeur === "string" ? JSON.parse(detailsDemandeur) : detailsDemandeur;
    const typeMouvement = detailsMouvement.typeMouvement
    let dataMouvement = null
    let initial = 0
    let stock = 0
    let final = 0
    let finalPiece = Number(detailsMouvement.stockFinalPiece)
    let finalPieceLot = 0
    let mouvement_stock = null
    const modelPiece = parseInt(detailsMouvement.model)
    const servicePiece = parseInt(detailsMouvement.service)
    const pieceId = itemId

    let dataEntree = null
    let initialDemandeur = 0
    let finalDemandeur = 0
    const finalPieceDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)
    let mouvement_stock_demandeur = null
    const serviceDemandeur = demande.service_demandeur

    let updatedQuantiteDemandeur = null

    const selectedStock = await prisma.stocks.findUnique({
      where: {
        id: parseInt(stock_id)
      }
    })

    let mouvementStock = null

    const dateAction = new Date()

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(itemId)
      }
    })

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(demande.service_demandeur)
      }
    })

    const service_piece = await prisma.services.findUnique({
      where: {
        id: servicePiece,
      },
    })

    if (typeMouvement == 5) {
      mouvementStock = await prisma.$transaction(async (tx) => {
        initial = Number(detailsMouvement.stockInitialPiece)
        stock = Number(detailsMouvement.quantiteMouvement)
        final = Number(detailsMouvement.stockFinalPiece)
        dataMouvement = {
          type: 'sortie',
          mouvement: 5,
          demande_id: demande.id,
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: final,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await prisma.mouvement_stock.create({
          data: dataMouvement,
        })

        const dataStock = {
          quantite_piece: final,
          last_update: dateAction,
        }

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        // Si le stock sortant est un chargeur de la DIRECTION TECHNIQUE vers TECH ASSIST, on ne supprime pas le lot mais on le réaffecte au demandeur avec les quantités mises à jour
        if (piece.nom_piece.toUpperCase() == 'CHARGEUR' && service_piece.nom_service.toUpperCase() == 'DIRECTION TECHNIQUE' && service.nom_service.toUpperCase() == 'TECH ASSIST') {
          initialDemandeur = Number(detailsMouvement.stockInitialPieceDemandeur)
          finalDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: piece.id_piece,
              service_id: service.id,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                model_id: modelPiece,
                service_id: 3,
                quantite_lot: 0,
                quantite_carton: 0,
                quantite_piece: finalPieceDemandeur,
                created_at: dateAction,
                created_by: user.id_user,
                last_update: dateAction,
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
              },
              data: {
                quantite_piece: finalDemandeur,
                last_update: dateAction,
              },
            })
            idStock = updatedStockDemandeur.id
          }
          dataEntree = {
            type: 'entree',
            mouvement: 5,
            demande_id: demande.id,
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }

          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })
        }

        await tx.demandes.update({
          where: { id: parseInt(demande_id) },
          data: {
            stock_id: +stock_id,
            demande_livree: true,
            nomenclature,
            type_demande: typeMouvement,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
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
          }
        })

        const livraison = await tx.livraison_piece.create({
          data: {
            demande_id: demande.id,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
            form_id: livraisonForm.id,
            stock_id: parseInt(stock_id),
          }
        })

        return {
          livraisonForm,
          livraison,
        }
      })
    } else if (typeMouvement == 4) {
      mouvementStock = await prisma.$transaction(async (tx) => {
        initial = Number(detailsMouvement.stockInitialCarton)
        stock = Number(detailsMouvement.quantiteMouvementCarton)
        final = Number(detailsMouvement.stockFinalCarton)

        const listCarton = detailsMouvement.cartons

        const serialNumbers = await tx.serial_numbers.findMany({
          where: {
            carton_id: { in: listCarton }
          }
        })

        detailsMouvement.listeSn = serialNumbers ? serialNumbers : null

        dataMouvement = {
          type: 'sortie',
          mouvement: 4,
          demande_id: demande.id,
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const dataStock = {
          quantite_carton: final,
          quantite_piece: finalPiece,
          last_update: dateAction,
        }

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        // Si le stock sortant est un chargeur de la DIRECTION TECHNIQUE vers TECH ASSIST, on ne supprime pas le lot mais on le réaffecte au demandeur avec les quantités mises à jour
        if (piece.nom_piece.toUpperCase() == 'CHARGEUR' && service_piece.nom_service.toUpperCase() == 'DIRECTION TECHNIQUE' && service.nom_service.toUpperCase() == 'TECH ASSIST') {

          initialDemandeur = Number(detailsMouvement.stockInitialCartonDemandeur)
          finalDemandeur = Number(detailsMouvement.stockFinalCartonDemandeur)

          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: piece.id_piece,
              service_id: service.id,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                model_id: modelPiece,
                service_id: service.id,
                quantite_lot: 0,
                quantite_carton: finalDemandeur,
                quantite_piece: finalPieceDemandeur,
                created_at: dateAction,
                created_by: user.id_user,
                last_update: dateAction,
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                service_id: service.id,
                last_update: dateAction,
              },
              data: {
                quantite_piece: finalPieceDemandeur,
                quantite_carton: finalDemandeur
              },
            })
            idStock = updatedStockDemandeur.id
          }
          dataEntree = {
            type: 'entree',
            mouvement: 4,
            demande_id: demande.id,
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }

          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })

          await tx.stock_carton.updateMany({
            where: { id: { in: listCarton } },
            data: {
              stock_id: idStock,
              service_id: serviceDemandeur,
            }
          })
        } else {
          await tx.stock_carton.updateMany({
            where: { id: { in: listCarton } },
            data: {
              is_deleted: true,
            }
          })
          await tx.serial_numbers.updateMany({
            where: { carton_id: { in: listCarton } },
            data: {
              is_deleted: true,
            }
          })
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })

        await tx.demandes.update({
          where: { id: parseInt(demande_id) },
          data: {
            stock_id: +stock_id,
            demande_livree: true,
            nomenclature,
            type_demande: typeMouvement,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
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
          }
        })

        const livraison = await tx.livraison_piece.create({
          data: {
            demande_id: demande.id,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
            form_id: livraisonForm.id,
            stock_id: parseInt(stock_id),
          }
        })

        return {
          livraisonForm,
          livraison,
          serialNumbers
        }
      })
    } else if (typeMouvement == 3) {
      mouvementStock = await prisma.$transaction(async (tx) => {
        initial = Number(detailsMouvement.stockInitialPieceCarton)
        stock = Number(detailsMouvement.quantiteMouvementPieceCarton)
        final = Number(detailsMouvement.stockFinalPieceCarton)
        dataMouvement = {
          type: 'sortie',
          mouvement: 3,
          demande_id: demande.id,
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const dataStock = {
          quantite_piece: finalPiece,
          last_update: dateAction,
        }

        await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        await tx.stock_carton.update({
          where: { id: parseInt(detailsMouvement.selectedCarton) },
          data: {
            quantite_totale_piece: final
          },
        })

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        // Si le stock sortant est un chargeur de la DIRECTION TECHNIQUE vers TECH ASSIST, on ne supprime pas le lot mais on le réaffecte au demandeur avec les quantités mises à jour
        if (piece.nom_piece.toUpperCase() == 'CHARGEUR' && service_piece.nom_service.toUpperCase() == 'DIRECTION TECHNIQUE' && service.nom_service.toUpperCase() == 'TECH ASSIST') {
          initialDemandeur = Number(detailsMouvement.stockInitialPieceDemandeur)
          finalDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: piece.id_piece,
              service_id: service.id,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                model_id: modelPiece,
                service_id: service.id,
                quantite_lot: 0,
                quantite_carton: 0,
                quantite_piece: finalPieceDemandeur,
                created_at: dateAction,
                created_by: user.id_user,
                last_update: dateAction,
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                service_id: service.id,
              },
              data: {
                quantite_piece: finalPieceDemandeur,
                last_update: dateAction,
              },
            })
            idStock = updatedStockDemandeur.id
          }

          dataEntree = {
            type: 'entree',
            mouvement: 5,
            demande_id: demande.id,
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }
          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })
        }

        if (final == 0) {
          await tx.stock_carton.update({
            where: { id: parseInt(detailsMouvement.selectedCarton) },
            data: {
              quantite_totale_piece: final,
              is_deleted: true,
            },
          })
          const quantiteCartonStock = selectedStock.quantite_carton
          tx.stocks.update({
            where: {
              id: parseInt(stock_id),
            },
            data: {
              quantite_carton: quantiteCartonStock - 1
            }
          })
        }

        if (detailsMouvement.selectedLot) {
          const finalPieceLot = Number(detailsMouvement.stockFinalPieceLot)
          let updatedLot = await tx.stock_lot.update({
            where: {
              id: parseInt(detailsMouvement.selectedLot)
            },
            data: {
              quantite_piece: finalPieceLot,
            }
          })
          if (final == 0) {
            updatedLot = await tx.stock_lot.update({
              where: {
                id: parseInt(detailsMouvement.selectedLot)
              },
              data: {
                quantite_piece: finalPieceLot,
                quantite_carton: updatedLot.quantite_carton - 1,
              },
            })
          }
          if (updatedLot.quantite_carton == 0) {
            updatedLot = await tx.stock_lot.update({
              where: {
                id: parseInt(detailsMouvement.selectedLot)
              },
              data: {
                quantite_piece: finalPieceLot,
                quantite_carton: 0,
                is_deleted: true
              }
            })
            const quantiteLotStock = selectedStock.quantite_lot
            await tx.stocks.update({
              where: {
                id: parseInt(stock_id),
              },
              data: {
                quantite_lot: quantiteLotStock - 1
              }
            })
          }
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })

        await tx.demandes.update({
          where: { id: parseInt(demande_id) },
          data: {
            stock_id: +stock_id,
            demande_livree: true,
            nomenclature,
            type_demande: typeMouvement,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
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
          }
        })

        const livraison = await tx.livraison_piece.create({
          data: {
            demande_id: demande.id,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
            form_id: livraisonForm.id,
            stock_id: parseInt(stock_id),
          }
        })

        return {
          livraisonForm,
          livraison,
        }
      })
    } else if (typeMouvement == 2) {
      mouvementStock = await prisma.$transaction(async (tx) => {
        initial = Number(detailsMouvement.stockInitialCartonLot)
        stock = Number(detailsMouvement.quantiteMouvementCartonLot)
        final = Number(detailsMouvement.stockFinalCartonLot)
        finalPieceLot = Number(detailsMouvement.stockFinalPieceLot)

        const listCartonLot = detailsMouvement.cartons

        const serialNumbers = await tx.serial_numbers.findMany({
          where: {
            carton_id: { in: listCartonLot }
          }
        })

        detailsMouvement.listeSn = serialNumbers ? serialNumbers : null

        dataMouvement = {
          type: 'sortie',
          mouvement: 2,
          demande_id: demande.id,
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const quantiteCartonStock = selectedStock.quantite_carton
        const dataStock = {
          quantite_carton: quantiteCartonStock - stock,
          quantite_piece: finalPiece,
          last_update: dateAction,
        }

        let updatedLot = await tx.stock_lot.update({
          where: {
            id: parseInt(detailsMouvement.selectedLot),
          },
          data: {
            quantite_carton: final,
            quantite_piece: finalPieceLot,
          },
        })

        if (final == 0) {
          updatedLot = await tx.stock_lot.update({
            where: {
              id: parseInt(detailsMouvement.selectedLot),
            },
            data: {
              quantite_carton: final,
              quantite_piece: finalPieceLot,
              is_deleted: true,
            },
          })
          const quantiteLotStock = selectedStock.quantite_lot
          tx.stocks.update({
            where: {
              id: parseInt(stock_id),
            },
            data: {
              quantite_lot: quantiteLotStock - 1
            }
          })
        }

        // const listCartonLot = detailsMouvement.cartons

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        // Si le stock sortant est un chargeur de la DIRECTION TECHNIQUE vers TECH ASSIST, on ne supprime pas le lot mais on le réaffecte au demandeur avec les quantités mises à jour
        if (piece.nom_piece.toUpperCase() == 'CHARGEUR' && service_piece.nom_service.toUpperCase() == 'DIRECTION TECHNIQUE' && service.nom_service.toUpperCase() == 'TECH ASSIST') {
          initialDemandeur = Number(detailsMouvement.stockInitialCartonDemandeur)
          finalDemandeur = Number(detailsMouvement.stockFinalCartonDemandeur)
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: piece.id_piece,
              service_id: service.id,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                model_id: modelPiece,
                service_id: service.id,
                quantite_lot: 0,
                quantite_carton: finalDemandeur,
                quantite_piece: finalPieceDemandeur,
                created_at: dateAction,
                created_by: user.id_user,
                last_update: dateAction,
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                service_id: service.id,
              },
              data: {
                quantite_carton: finalDemandeur,
                quantite_piece: finalPieceDemandeur,
                last_update: dateAction,
              },
            })
            idStock = updatedStockDemandeur.id
          }

          await tx.stock_carton.updateMany({
            where: {
              id: { in: listCartonLot },
              lot_id: updatedLot.id,
            },
            data: {
              service_id: serviceDemandeur,
              lot_id: null
            }
          })

          dataEntree = {
            type: 'entree',
            mouvement: 4,
            demande_id: demande.id,
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }
          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })
        } else {
          await tx.stock_carton.updateMany({
            where: { id: { in: listCartonLot } },
            data: { is_deleted: true },
          });

          await tx.serial_numbers.updateMany({
            where: { carton_id: { in: listCartonLot } },
            data: { is_deleted: true },
          });
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })

        await tx.demandes.update({
          where: { id: parseInt(demande_id) },
          data: {
            stock_id: +stock_id,
            demande_livree: true,
            nomenclature,
            type_demande: typeMouvement,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
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
          }
        })

        const livraison = await tx.livraison_piece.create({
          data: {
            demande_id: demande.id,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
            form_id: livraisonForm.id,
            stock_id: parseInt(stock_id),
          }
        })

        return {
          livraisonForm,
          livraison,
          serialNumbers,
        }
      })

    } else if (typeMouvement == 1) {
      mouvementStock = await prisma.$transaction(async (tx) => {
        initial = Number(detailsMouvement.stockInitialLot)
        stock = Number(detailsMouvement.quantiteMouvementLot)
        final = Number(detailsMouvement.stockFinalLot)

        const listLot = detailsMouvement.listeLots

        const serialNumbers = await tx.serial_numbers.findMany({
          where: {
            lot_id: { in: listLot }
          }
        })

        detailsMouvement.listeSn = serialNumbers ? serialNumbers : null

        dataMouvement = {
          type: 'sortie',
          mouvement: 1,
          demande_id: demande.id,
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const quantiteCartonStock = selectedStock.quantite_carton
        const dataStock = {
          quantite_lot: final,
          quantite_carton: quantiteCartonStock - Number(detailsMouvement.quantiteMouvementCarton),
          quantite_piece: finalPiece,
          last_update: dateAction,
        }

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        // Si le stock sortant est un chargeur de la DIRECTION TECHNIQUE vers TECH ASSIST, on ne supprime pas le lot mais on le réaffecte au demandeur avec les quantités mises à jour
        if (piece.nom_piece.toUpperCase() == 'CHARGEUR' && service_piece.nom_service.toUpperCase() == 'DIRECTION TECHNIQUE' && service.nom_service.toUpperCase() == 'TECH ASSIST') {
          initialDemandeur = Number(detailsMouvement.stockInitialLotDemandeur)
          finalDemandeur = Number(detailsMouvement.stockFinalLotDemandeur)
          const finalCartonDemandeur = Number(detailsMouvement.quantiteMouvementCarton)
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: piece.id_piece,
              service_id: service.id,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                model_id: modelPiece,
                service_id: service.id,
                quantite_lot: finalDemandeur,
                quantite_carton: finalCartonDemandeur,
                quantite_piece: finalPieceDemandeur,
                created_at: dateAction,
                created_by: user.id_user,
                last_update: dateAction,
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: piece.id_piece,
                service_id: service.id,
              },
              data: {
                quantite_lot: finalDemandeur,
                quantite_carton: finalCartonDemandeur,
                quantite_piece: finalPieceDemandeur,
                last_update: dateAction,
              },
            })
            idStock = updatedStockDemandeur.id
          }

          await tx.stock_carton.updateMany({
            where: {
              id: { id: { in: listCartonLot } },
              lot_id: updatedLot.id,
            },
            data: {
              service_id: serviceDemandeur,
              lot_id: null
            }
          })

          dataEntree = {
            type: 'entree',
            mouvement: 1,
            stock_id: idStock,
            demande_id: demande.id,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }
          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })

          await tx.stock_lot.update({
            where: { id: { in: listLot } },
            data: {
              stock_id: idStock,
              service_id: serviceDemandeur,
            }
          })
          await tx.stock_carton.updateMany({
            where: { lot_id: { in: listLot } },
            data: {
              stock_id: idStock,
              service_id: serviceDemandeur,
            }
          })
        } else {
          await tx.stock_lot.updateMany({
            where: { id: { in: listLot }, },
            data: {
              is_deleted: true,
            }
          })
          await tx.stock_carton.updateMany({
            where: { lot_id: { in: listLot }, },
            data: {
              is_deleted: true,
            }
          })
          await tx.serial_numbers.updateMany({
            where: { lot_id: { in: listLot }, },
            data: {
              is_deleted: true,
            }
          })
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })

        await tx.demandes.update({
          where: { id: parseInt(demande_id) },
          data: {
            stock_id: +stock_id,
            demande_livree: true,
            nomenclature,
            type_demande: typeMouvement,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
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
          }
        })

        const livraison = await tx.livraison_piece.create({
          data: {
            demande_id: demande.id,
            details_demande: JSON.stringify(detailsMouvement),
            details_demandeur: JSON.stringify(detailsEntree),
            form_id: livraisonForm.id,
            stock_id: parseInt(stock_id),
          }
        })

        return {
          livraisonForm,
          livraison,
          serialNumbers,
        }
      })
    }

    /*****************      GESTION PARC TPE       *****************/
    let = allTpes = null
    if (piece.type.toUpperCase() == 'TERMINAL' && (typeMouvement == 1 || typeMouvement == 2 || typeMouvement == 4) && detailsMouvement.listeSn && detailsMouvement.listeSn.length > 0) {
      // Récupérer les SN de la liste
      const serials = mouvementStock.serialNumbers.map(item => item.serial_number);

      // 1. Create only missing ones
      await prisma.parc_tpe.createMany({
        data: serials.map(item => ({
          serial_number: item,
          created_by: user.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 4,
        })),
        skipDuplicates: true
      });

      // 2. Update ALL (existing + newly created)
      await prisma.parc_tpe.updateMany({
        where: {
          serial_number: { in: serials }
        },
        data: {
          updated_by: user.id_user,
          updated_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 4,
        }
      });

      // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
      allTpes = await prisma.parc_tpe.findMany({
        where: {
          serial_number: { in: serials }
        },
        select: {
          id: true,
          serial_number: true
        }
      });

      // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
      await prisma.history_tpe.createMany({
        data: allTpes.map(tpe => ({
          id_tpe: tpe.id,
          created_by: user.id_user,
          created_at: dateAction,
          statut_id: 4,
          form_id: mouvementStock.livraisonForm.id,
        }))
      });
    }

    /************************************     GESTION MAILS     **************************************/

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(demande.service_demandeur)
      },
      include: {
        users: true
      }
    })

    const mouvement = await prisma.type_mouvement_stock.findUnique({
      where: {
        id: detailsMouvement.typeMouvement
      }
    })

    const service_users = userService.map(us => us.users)
    const demandeur = await prisma.users.findUnique({
      where: {
        id_user: demande.user_id
      }
    })

    let motif = demande.motif_demande
    let nomPiece = piece.nom_piece.toUpperCase()

    let nomServiceDemandeur = service.nom_service.toUpperCase();

    let quantite = stock;
    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';
    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${demande.id}`;
    const sendMail = require("../../utils/emailSender");
    if ((service_users && service_users.length > 0) || demandeur) {
      const subject = `SYSLIS - LIVRAISON STOCK DE ${nomPiece}`;
      const html = `
        <p>Bonjour,</p>
        <p>La demande ${demande.id} a été livrée.</p>
        <ul>
          <li><strong>Motif :</strong> ${motif}</li>
          <li><strong>${mouvement.titre}</strong></li>
          <li><strong>Quantité :</strong> ${quantite}</li>
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
      // await sendMail({
      //   to: demandeur.email,
      //   subject,
      //   html,
      // });
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }

    console.log('Livraison de stock éffectuée avec succès !')
    return res.status(201).json({
      message: 'Livraison de stock éffectuée avec succès !',
      data: mouvementStock,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

const livraisonPiece = async (req, res) => {
  try {
    const {
      demande_id,
      user_id,
      commentaire,
      stock_id,
      nomenclature,
      detailsDemande,
      detailsDemandeur,
      itemId,
    } = req.body;
    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demande_id) },
    });

    if (!demande) {
      console.error(`Demande avec ID ${demande_id} non trouvée.`);
      return res.status(404).json({ message: "Demande introuvable." });
    }

    if (demande.demande_livree == true) {
      console.error(`Demande avec ID ${demande_id} a déjà été livrée.`);
      return res.status(400).json({ message: "Demande déjà livrée." });
    }

    if (!user_id) {
      console.error("ID utilisateur non fourni.");
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const detailsMouvement = typeof detailsDemande === "string" ? JSON.parse(detailsDemande) : detailsDemande;
    const detailsEntree = typeof detailsDemandeur === "string" ? JSON.parse(detailsDemandeur) : detailsDemandeur;
    const typeMouvement = detailsMouvement.typeMouvement
    let dataMouvement = null
    let initial = 0
    let stock = 0
    let final = 0
    let finalPiece = Number(detailsMouvement.stockFinalPiece)
    let finalPieceLot = 0
    let mouvement_stock = null
    const modelPiece = parseInt(detailsMouvement.model)
    const servicePiece = parseInt(detailsMouvement.service)
    const pieceId = itemId

    let dataEntree = null
    let initialDemandeur = 0
    let finalDemandeur = 0
    const finalPieceDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)
    let mouvement_stock_demandeur = null
    const serviceDemandeur = demande.service_demandeur

    let updatedQuantiteDemandeur = null

    const selectedStock = await prisma.stocks.findUnique({
      where: {
        id: parseInt(stock_id)
      }
    })

    const dateAction = new Date();

    const mouvementStock = await prisma.$transaction(async (tx) => {
      initial = Number(detailsMouvement.stockInitialPiece)
      stock = Number(detailsMouvement.quantiteMouvement)
      final = Number(detailsMouvement.stockFinalPiece)
      dataMouvement = {
        type: 'sortie',
        mouvement: 5,
        demande_id: demande.id,
        stock_id: parseInt(stock_id),
        piece_id: parseInt(itemId),
        service_origine: servicePiece,
        service_destination: parseInt(demande.service_demandeur),
        model_id: modelPiece,
        stock_initial: initial,
        quantite: stock,
        stock_final: final,
        quantite_totale_piece: final,
        motif: demande.motif_demande,
        commentaire,
        details_mouvement: JSON.stringify(detailsMouvement),
      }
      mouvement_stock = await prisma.mouvement_stock.create({
        data: dataMouvement,
      })

      const dataStock = {
        quantite_piece: final,
        last_update: dateAction,
      }

      const stockDonneur = await tx.stocks.update({
        where: {
          id: parseInt(stock_id),
        },
        data: dataStock,
      })

      initialDemandeur = Number(detailsMouvement.stockInitialPieceDemandeur)
      finalDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)
      const stockDemandeur = await tx.stocks.findFirst({
        where: {
          code_stock: stockDonneur.code_stock,
          piece_id: 1,
          service_id: 3,
        }
      })
      let idStock = stockDemandeur ? stockDemandeur.id : null
      if (!stockDemandeur) {
        const stockDemandeur = await tx.stocks.create({
          data: {
            code_stock: stockDonneur.code_stock,
            piece_id: 1,
            model_id: modelPiece,
            service_id: 3,
            quantite_lot: 0,
            quantite_carton: 0,
            quantite_piece: finalPieceDemandeur,
            created_at: dateAction,
            created_by: user.id_user,
            last_update: dateAction,
            updated_by: user.id_user,
          }
        })
        idStock = stockDemandeur.id
      } else {
        const updatedStockDemandeur = await tx.stocks.update({
          where: {
            id: idStock,
          },
          data: {
            quantite_piece: finalDemandeur,
            last_update: dateAction,
          },
        })
        idStock = updatedStockDemandeur.id
      }
      dataEntree = {
        type: 'entree',
        mouvement: 5,
        demande_id: demande.id,
        stock_id: idStock,
        piece_id: parseInt(itemId),
        service_origine: servicePiece,
        service_destination: parseInt(demande.service_demandeur),
        model_id: modelPiece,
        stock_initial: initialDemandeur,
        quantite: stock,
        stock_final: finalDemandeur,
        quantite_totale_piece: finalPieceDemandeur,
        motif: demande.motif_demande,
        commentaire,
        details_mouvement: JSON.stringify(detailsEntree),
      }

      mouvement_stock_demandeur = await tx.mouvement_stock.create({
        data: dataEntree,
      })

      await tx.demandes.update({
        where: { id: parseInt(demande_id) },
        data: {
          stock_id: +stock_id,
          demande_livree: true,
          nomenclature,
          type_demande: typeMouvement,
          details_demande: JSON.stringify(detailsMouvement),
          details_demandeur: JSON.stringify(detailsEntree),
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
        }
      })

      const livraison = await tx.livraison_piece.create({
        data: {
          demande_id: demande.id,
          details_demande: JSON.stringify(detailsMouvement),
          details_demandeur: JSON.stringify(detailsEntree),
          form_id: livraisonForm.id,
          stock_id: parseInt(stock_id),
        }
      })

      return {
        livraisonForm,
        livraison,
      }
    })

    console.log('Livraison de stock éffectuée avec succès !')
    return res.status(201).json({
      message: 'Livraison de stock éffectuée avec succès !',
      data: mouvementStock,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
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

    if (demande.statut_demande === "valide") {
      return res.status(400).json({ message: "Demande déjà validée." });
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

    const newValidation = await prisma.validation_demande.create({
      data: {
        id_demande: parseInt(demande_id),
        commentaire: commentaire_return,
        id_user: user_id ? parseInt(user_id) : null,
        nom_validateur: user.fullname,
        date_validation_demande: new Date(),
        signature: 'retournée',
        statut_validation_demande: "retourne",
      },
    });

    await prisma.demandes.update({
      where: { id: parseInt(demande_id) },
      data: { statut_demande: 'retourne' },
    });

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
    const sendMail = require("../../utils/emailSender");
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
      // await sendMail({
      //   to: demandeur.email,
      //   subject,
      //   html,
      // });
      // for (const service_user of service_users) {
      //   await sendMail({
      //     to: service_user.email,
      //     subject,
      //     html,
      //   });
      // }
    }

    return res.status(201).json({
      message: "demande retournée avec succès.",
      newValidation,
    });
  } catch (error) {
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

    if (demande.statut_demande === "valide") {
      return res.status(400).json({ message: "Demande déjà validée." });
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

    const newValidation = await prisma.validation_demande.create({
      data: {
        id_demande: parseInt(demande_id),
        commentaire: commentaire_refus,
        id_user: user_id ? parseInt(user_id) : null,
        nom_validateur: user.fullname,
        date_validation_demande: new Date(),
        signature: 'refusée',
        statut_validation_demande: "refuse",
      },
    });

    await prisma.demandes.update({
      where: { id: parseInt(demande_id) },
      data: { statut_demande: 'refuse' },
    });


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
    const sendMail = require("../../utils/emailSender");
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
      // await sendMail({
      //   to: demandeur.email,
      //   subject,
      //   html,
      // });
      // for (const service_user of service_users) {
      //   await sendMail({
      //     to: service_user.email,
      //     subject,
      //     html,
      //   });
      // }
    }

    return res.status(201).json({
      message: "demande refusée avec succès.",
      newValidation,
    });


  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

const updateDemande = async (req, res) => {
  try {
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

    const demandeForm = await prisma.forms.findUnique({
      where: {
        id: demande.form_id
      }
    })
    if (!demandeForm) {
      console.error("Formulaire de demande non trouvé pour l'ID :", demande.form_id);
    }

    const dateAction = new Date();

    const updateDemande = await prisma.$transaction(async (tx) => {
      // Update du formulaire lié à la demande s'il existe
      const updatedForm = await tx.forms.update({
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
          nom_demandeur: nomUser,
          date_demande: dateAction,
          commentaire,
          qte_total_demande: +quantite,
          details_demande: JSON.stringify(details),
          statut_demande: 'en_cours',
          user_id: parseInt(userId),
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
            form_id: demandeForm.id,
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


    /************************** GESTION DES MAILS ********************************/

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(serviceUser)
      }
    })

    const nomService = service.nom_service.toUpperCase()

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(serviceUser)
      },
      include: {
        users: true
      }
    })

    const userRole = await prisma.user_roles.findMany({
      where: {
        role_id: 4,
      },
      include: {
        users: true
      }
    })
    // const mouvement = await prisma.type_mouvement_stock.findUnique({
    //   where: {
    //     id: details.typeMouvement
    //   }
    // })

    const service_users = userService.map(us => us.users)
    const validateurs = userRole.map(us => us.users)

    let nomPiece = piece.nom_piece.toUpperCase()

    let quantiteDemande = quantite;

    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${demande.id}`;

    const sendMail = require("../../utils/emailSender");

    const subject = `SYSLIS - MODIFICATION DEMANDE POUR ${motif}`;
    let html = `
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

    if (service_users && service_users.length > 0) {
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }

    if ((validateurs && validateurs.length > 0)) {
      for (const validateur of validateurs) {
        await sendMail({
          to: validateur.email,
          subject,
          html,
        });
      }
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

const receivePiece = async (req, res) => {
  try {
    const {
      itemId,
      demandeId,
      commentaire,
      user_id,
    } = req.body;

    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demandeId) },
    })

    if (!demande) {
      console.log("Demande introuvable.")
      return res.status(404).json({ message: "Demande introuvable." });
    }
    if (demande.demande_recue == true) {
      console.log("Demande déjà réceptionnée")
      return res.status(400).json({ message: "Demande déjà réceptionnée." });
    }
    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
      folder: "greenpay/signatures",
    });
    const signatureCloud = uploadResult.secure_url;

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const utilisateur = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    let nom_recepteur = utilisateur.fullname

    const dateAction = new Date()

    const reception = await prisma.$transaction(async (tx) => {
      const receptionForm = await tx.forms.create({
        data: {
          type: 'reception_stock',
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
        }
      })
      const newReception = await tx.reception_piece.create({
        data: {
          item_id: parseInt(itemId),
          user_id: parseInt(user_id),
          demande_id: parseInt(demandeId),
          created_at: dateAction,
          signature_recepteur: signatureCloud ? signatureCloud : '',
          nom_recepteur,
          commentaire,
          form_id: receptionForm.id,
        }
      })

      await tx.form_signatures.create({
        data: {
          form_id: receptionForm.id,
          signature_url: signature.path,
          signed_by: utilisateur.id_user,
          signed_at: dateAction,
          role: 'receveur',
        },
      })

      await tx.demandes.update({
        where: { id: demande.id },
        data: { demande_recue: true },
      })

      return {
        receptionForm,
        newReception,
      }
    })

    // *********** GESTION DES MAILS ************

    const livraisonPiece = await prisma.livraison_piece.findFirst({
      where: {
        demande_id: demande.id,
      },
      include: {
        forms: true
      },
    })

    if (!livraisonPiece || !livraisonPiece.forms) {
      console.error("Livraison liée à la demande introuvable ou formulaire de livraison manquant.");
      return res.status(404).json({ message: "Livraison liée à la demande introuvable ou formulaire de livraison manquant." });
    }

    const livreurId = livraisonPiece.forms.created_by
    const livreur = await prisma.users.findUnique({
      where: {
        id_user: livreurId
      }
    })

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(demande.service_demandeur)
      }
    })

    const serviceReception = service.nom_service

    // const userRole = await prisma.user_roles.findMany({
    //   where: {
    //     role_id: 3
    //   },
    //   include: {
    //     users: true
    //   }
    // })

    const typeMouvement = await prisma.type_mouvement_stock.findUnique({
      where: {
        id: demande.type_demande
      }
    })

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: demande.item_id
      }
    })
    // let demandeurs = userRole.map(us => us.users)

    let quantiteProduits = demande.qte_total_demande
    let commentaire_mail = commentaire ? commentaire : "(Sans commentaire)"

    const url = GENERAL_URL
    const deliveryLink = `${url}/demande-details/${demande.id}`;
    const sendMail = require("../../utils/emailSender");
    const subject = `SYSLIS - RECEPTION DE STOCK`;
    const html = `
      <p>Bonjour,</p>
      <p>La demande de stock ${demande.id} a été réceptionnée.</p>
      <ul>
        <li><strong>Pièce demandée:</strong> ${piece.nom_piece}</li>
        <li><strong>Nombre de produits:</strong> ${quantiteProduits} ${typeMouvement.titre}</li>
        <li><strong>Service:</strong> ${serviceReception}</li>
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

    if (livreur?.email) {
      await sendMail({
        to: livreur.email,
        subject,
        html,
      });
    }

    console.log('Stock réceptionné avec succès !')
    return res.status(201).json({
      message: 'Stock réceptionné avec succès',
      data: reception,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
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

const generateDemandePDF = async (req, res) => {
  const { id } = req.params;

  try {
    const demande_data = await prisma.demandes.findUnique({
      where: { id: parseInt(id) },
      include: {
        validation_demande: true,
        reception_piece: true,
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

    const champsAutres = JSON.parse(demande_data.champs_autre)

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
      row = `<tr><th>${data.titre}</th><th>${data.information}</th></tr>`

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

    if (demandeLivraison) {
      templateFile = templatesMap[2]
      signature_livraison = demandeLivraison.signature_recepteur
      date_reception = demandeLivraison.created_at
      signature_reception = demandeLivraison.signature_recepteur
      nom_recepteur = demandeLivraison.nom_recepteur
      commentaire_reception = demandeLivraison.commentaire
    }

    const filePath = path.join(__dirname, "../../statics/templates/", templateFile);
    let html = fs.readFileSync(filePath, "utf8");

    html = html
      .replaceAll("{{commentaire}}", demande.commentaire)
      .replaceAll("{{commentaire_validation}}", commentaire_validation)
      .replaceAll("{{commentaire_livraison}}", commentaire_livraison)
      .replaceAll("{{commentaire_reception}}", commentaire_reception)
      .replaceAll("{{date_demande}}", formatDate(demande.date_demande))
      .replaceAll("{{pieces_demandees}}", piece.nom_piece.toUpperCase())
      .replaceAll("{{motif_demande}}", demande.motif_demande)
      .replaceAll("{{service_donneur}}", service_donneur)
      .replaceAll("{{mouvement}}", typeMouvement)
      .replaceAll("{{nom_validateur}}", nomValidateur)
      .replaceAll("{{nom_demandeur}}", nomDemandeur)
      .replaceAll("{{service_demandeur}}", service_demandeur)
      .replaceAll("{{quantite}}", quantite)
      .replaceAll("{{quantite_validee}}", quantite_validee)
      .replaceAll("{{quantite_livree}}", quantite_livree)
      .replaceAll("{{quantite_livraison}}", quantite_livraison)
      .replaceAll("{{stock_initial}}", stock_depart)
      .replaceAll("{{stock_final}}", stock_final)
      .replaceAll("{{signature}}", signature_validation ? signature_validation : '#')
      .replaceAll("{{date_validation_demande}}", formatDate(date_validation))
      .replaceAll("{{nom_livreur}}", nom_livreur)
      .replaceAll("{{signature_livraison}}", signature_livraison ? signature_livraison : '#')
      .replaceAll("{{date_livraison}}", formatDate(date_livraison))
      .replaceAll("{{nom_recepteur}}", nom_recepteur)
      .replaceAll("{{signature_reception}}", signature_reception ? signature_reception : '#')
      .replaceAll("{{date_reception}}", formatDate(date_reception))
      .replace("{{autre_champs}}", autresChamps ? autresChamps : '')
      .replace("{{autre_champs_livraison}}", autresChampsLivraison ? autresChampsLivraison : '')

    // 🖨️ Génération PDF
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

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
        statut_demande: 'valide',
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

    /************************** GESTION DES MAILS ********************************/
    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(serviceUser)
      }
    })

    const nomService = service.nom_service.toUpperCase()

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(serviceUser)
      },
      include: {
        users: true
      }
    })

    const userRole = await prisma.user_roles.findMany({
      where: {
        role_id: 4,
      },
      include: {
        users: true
      }
    })
    // const mouvement = await prisma.type_mouvement_stock.findUnique({
    //   where: {
    //     id: details.typeMouvement
    //   }
    // })

    const service_users = userService.map(us => us.users)
    const validateurs = userRole.map(us => us.users)

    let nomPiece = piece.nom_piece.toUpperCase()

    let quantiteDemande = quantite;

    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${newRegularisation.nouvelleDemande.id}`;

    const sendMail = require("../../utils/emailSender");

    if ((service_users && service_users.length > 0) || (validateurs && validateurs.length > 0)) {
      const subject = `SYSLIS - REGULARISATION MOUVEMENT DE STOCK DE ${nomPiece}`;
      let html = `
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
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
      for (const validateur of validateurs) {
        await sendMail({
          to: validateur.email,
          subject,
          html,
        });
      }
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

    if (demande.statut_demande === "valide") {
      return res.status(400).json({ message: "Demande déjà validée." });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const validation = await prisma.$transaction(async (tx) => {

      const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
        folder: "greenpay/signatures",
      });

      const signatureCloud = uploadResult.secure_url;
      await tx.demandes.update({
        where: { id: parseInt(demande_id) },
        data: {
          statut_demande: "valide",
        },
      });

      const validationForm = await tx.forms.create({
        data: {
          type: 'validation_stock',
          created_by: user.id_user,
          created_at: new Date(date_validation),
          last_modified_at: new Date(date_validation),
          nom_user: user.fullname,
          commentaire,
          is_reg: true,
        },
      })
      await tx.form_signatures.create({
        data: {
          form_id: validationForm.id,
          signature_url: signature.path,
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
          date_validation_demande: new Date(date_validation),
          signature: signatureCloud,
          statut_validation_demande: "valide",
          quantite_validee: +quantiteValidee,
          form_id: validationForm.id
        },
      });

      return {
        validationForm,
        newValidation,
      }
    })

    /************************************     GESTION MAILS     **************************************/

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(demande.item_id)
      }
    });

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(demande.service_demandeur)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(demande.service_demandeur)
      },
      include: {
        users: true
      }
    })

    ownersList = new Array(owners).map((item) => {
      return parseInt(item)
    })
    let stockOwners = []
    if (ownersList && ownersList.length > 0) {
      stockOwners = await prisma.users.findMany({
        where: {
          id_user: {
            in: ownersList,
          }
        }
      })
    }

    const service_users = userService.map(us => us.users)
    const demandeur = await prisma.users.findUnique({
      where: {
        id_user: demande.user_id
      }
    })

    let motif = demande.motif_demande
    let nomPiece = piece.nom_piece.toUpperCase()

    let nomServiceDemandeur = service.nom_service.toUpperCase();

    let quantite = quantiteValidee;
    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';
    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${demande.id}`;
    const sendMail = require("../../utils/emailSender");
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
    if (stockOwners && stockOwners.length > 0) {
      for (const stockOwner of stockOwners) {
        await sendMail({
          to: stockOwner.email,
          subject,
          html,
        });
      }
    }
    if (service_users && service_users.length > 0) {
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }

    console.log("Validation régularisée avec succès !")
    return res.status(201).json({
      message: "Validation régularisée avec succès !",
      data: validation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

const regLivraisonDemande = async (req, res) => {
  try {
    const {
      demande_id,
      user_id,
      commentaire,
      stock_id,
      nomenclature,
      detailsDemande,
      detailsDemandeur,
      itemId,
      date_livraison,
    } = req.body;
    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demande_id) },
    });

    if (!demande) return res.status(404).json({ message: "Demande introuvable." });

    if (demande.demande_livree == true) {
      return res.status(400).json({ message: "Demande déjà livrée." });
    }

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    /************************************     GESTION MOUVEMENT DE STOCK     *****************************/

    const detailsMouvement = typeof detailsDemande === "string" ? JSON.parse(detailsDemande) : detailsDemande;
    const detailsEntree = typeof detailsDemandeur === "string" ? JSON.parse(detailsDemandeur) : detailsDemandeur;
    const typeMouvement = detailsMouvement.typeMouvement
    let dataMouvement = null
    let initial = 0
    let stock = 0
    let final = 0
    let finalPiece = Number(detailsMouvement.stockFinalPiece)
    let finalPieceLot = 0
    let mouvement_stock = null
    const modelPiece = parseInt(detailsMouvement.model)
    const servicePiece = parseInt(detailsMouvement.service)
    const pieceId = itemId

    let dataEntree = null
    let initialDemandeur = 0
    let finalDemandeur = 0
    const finalPieceDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)
    let mouvement_stock_demandeur = null
    const serviceDemandeur = demande.service_demandeur

    let updatedQuantiteDemandeur = null

    const selectedStock = await prisma.stocks.findUnique({
      where: {
        id: parseInt(stock_id)
      }
    })

    const mouvementStock = await prisma.$transaction(async (tx) => {
      if (typeMouvement == 5) {
        initial = Number(detailsMouvement.stockInitialPiece)
        stock = Number(detailsMouvement.quantiteMouvement)
        final = Number(detailsMouvement.stockFinalPiece)
        dataMouvement = {
          type: 'sortie',
          mouvement: 5,
          demande_id: demande.id,
          created_at: new Date(date_livraison),
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: final,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await prisma.mouvement_stock.create({
          data: dataMouvement,
        })

        const dataStock = {
          quantite_piece: final,
          last_update: new Date(date_livraison),
        }

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        if (pieceId == 1 && servicePiece == 5 && demande.service_demandeur == 3) {
          initialDemandeur = Number(detailsMouvement.stockInitialPieceDemandeur)
          finalDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: 1,
              service_id: 3,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                model_id: modelPiece,
                service_id: 3,
                quantite_lot: 0,
                quantite_carton: 0,
                quantite_piece: finalPieceDemandeur,
                created_at: new Date(date_livraison),
                created_by: user.id_user,
                last_update: new Date(date_livraison),
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                service_id: 3,
                last_update: new Date(date_livraison),
              },
              data: {
                quantite_piece: finalDemandeur,
                last_update: new Date(date_livraison),
              },
            })
            idStock = updatedStockDemandeur.id
          }
          dataEntree = {
            type: 'entree',
            mouvement: 5,
            demande_id: demande.id,
            created_at: new Date(date_livraison),
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }

          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })
        }

      } else if (typeMouvement == 4) {
        initial = Number(detailsMouvement.stockInitialCarton)
        stock = Number(detailsMouvement.quantiteMouvementCarton)
        final = Number(detailsMouvement.stockFinalCarton)

        const listCarton = detailsMouvement.cartons

        let serialNumbers = null
        for (let id of listCarton) {
          serialNumbers = await tx.serial_numbers.findMany({
            where: {
              carton_id: parseInt(id)
            }
          })
        }
        detailsMouvement.listeSn = serialNumbers ? serialNumbers : null

        dataMouvement = {
          type: 'sortie',
          mouvement: 4,
          demande_id: demande.id,
          created_at: new Date(date_livraison),
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const dataStock = {
          quantite_carton: final,
          quantite_piece: finalPiece,
          last_update: new Date(date_livraison),
        }

        initialDemandeur = Number(detailsMouvement.stockInitialCartonDemandeur)
        finalDemandeur = Number(detailsMouvement.stockFinalCartonDemandeur)

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        if (pieceId == 1 && servicePiece == 5 && demande.service_demandeur == 3) {

          initialDemandeur = Number(detailsMouvement.stockInitialCartonDemandeur)
          finalDemandeur = Number(detailsMouvement.stockFinalCartonDemandeur)
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: 1,
              service_id: 3,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                model_id: modelPiece,
                service_id: 3,
                quantite_lot: 0,
                quantite_carton: finalDemandeur,
                quantite_piece: finalPieceDemandeur,
                created_at: new Date(date_livraison),
                created_by: user.id_user,
                last_update: new Date(date_livraison),
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                service_id: 3,
                last_update: new Date(date_livraison),
              },
              data: {
                quantite_piece: finalPieceDemandeur,
                quantite_carton: finalDemandeur
              },
            })
            idStock = updatedStockDemandeur.id
          }
          dataEntree = {
            type: 'entree',
            mouvement: 4,
            demande_id: demande.id,
            created_at: new Date(date_livraison),
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }

          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })

          for (let id of listCarton) {
            await tx.stock_carton.update({
              where: {
                id: parseInt(id)
              },
              data: {
                stock_id: idStock,
                service_id: serviceDemandeur,
              }
            })
          }
        } else {
          for (let id of listCarton) {
            await tx.stock_carton.update({
              where: {
                id: parseInt(id)
              },
              data: {
                is_deleted: true,
              }
            })
            await tx.serial_numbers.updateMany({
              where: {
                carton_id: parseInt(id),
              },
              data: {
                is_deleted: true,
              }
            })
          }
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })
      } else if (typeMouvement == 3) {
        initial = Number(detailsMouvement.stockInitialPieceCarton)
        stock = Number(detailsMouvement.quantiteMouvementPieceCarton)
        final = Number(detailsMouvement.stockFinalPieceCarton)
        dataMouvement = {
          type: 'sortie',
          mouvement: 3,
          demande_id: demande.id,
          created_at: new Date(date_livraison),
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const dataStock = {
          quantite_piece: finalPiece,
          last_update: new Date(date_livraison),
        }

        await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        await tx.stock_carton.update({
          where: { id: parseInt(detailsMouvement.selectedCarton) },
          data: {
            quantite_totale_piece: final
          },
        })

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        initialDemandeur = Number(detailsMouvement.stockInitialPieceDemandeur)
        finalDemandeur = Number(detailsMouvement.stockFinalPieceDemandeur)

        if (pieceId == 1 && servicePiece == 5 && demande.service_demandeur == 3) {
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: 1,
              service_id: 3,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                model_id: modelPiece,
                service_id: 3,
                quantite_lot: 0,
                quantite_carton: 0,
                quantite_piece: finalPieceDemandeur,
                created_at: new Date(date_livraison),
                created_by: user.id_user,
                last_update: new Date(date_livraison),
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                service_id: 3,
              },
              data: {
                quantite_piece: finalPieceDemandeur,
                last_update: new Date(date_livraison),
              },
            })
            idStock = updatedStockDemandeur.id
          }

          dataEntree = {
            type: 'entree',
            mouvement: 5,
            demande_id: demande.id,
            created_at: new Date(date_livraison),
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }
          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })
        }

        if (final == 0) {
          await tx.stock_carton.update({
            where: { id: parseInt(detailsMouvement.selectedCarton) },
            data: {
              quantite_totale_piece: final,
              is_deleted: true,
            },
          })
          const quantiteCartonStock = selectedStock.quantite_carton
          tx.stocks.update({
            where: {
              id: parseInt(stock_id),
            },
            data: {
              quantite_carton: quantiteCartonStock - 1
            }
          })
        }

        if (detailsMouvement.selectedLot) {
          const finalPieceLot = Number(detailsMouvement.stockFinalPieceLot)
          let updatedLot = await tx.stock_lot.update({
            where: {
              id: parseInt(detailsMouvement.selectedLot)
            },
            data: {
              quantite_piece: finalPieceLot,
            }
          })
          if (final == 0) {
            updatedLot = await tx.stock_lot.update({
              where: {
                id: parseInt(detailsMouvement.selectedLot)
              },
              data: {
                quantite_piece: finalPieceLot,
                quantite_carton: updatedLot.quantite_carton - 1,
              },
            })
          }
          if (updatedLot.quantite_carton == 0) {
            updatedLot = await tx.stock_lot.update({
              where: {
                id: parseInt(detailsMouvement.selectedLot)
              },
              data: {
                quantite_piece: finalPieceLot,
                quantite_carton: 0,
                is_deleted: true
              }
            })
            const quantiteLotStock = selectedStock.quantite_lot
            tx.stocks.update({
              where: {
                id: parseInt(stock_id),
              },
              data: {
                quantite_lot: quantiteLotStock - 1
              }
            })
          }
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })
      } else if (typeMouvement == 2) {
        initial = Number(detailsMouvement.stockInitialCartonLot)
        stock = Number(detailsMouvement.quantiteMouvementCartonLot)
        final = Number(detailsMouvement.stockFinalCartonLot)
        finalPieceLot = Number(detailsMouvement.stockFinalPieceLot)

        const listCartonLot = detailsMouvement.cartons

        let serialNumbers = null
        for (let id of listCartonLot) {
          serialNumbers = await tx.serial_numbers.findMany({
            where: {
              carton_id: parseInt(id)
            }
          })
        }
        detailsMouvement.listeSn = serialNumbers ? serialNumbers : null

        dataMouvement = {
          type: 'sortie',
          mouvement: 2,
          demande_id: demande.id,
          created_at: new Date(date_livraison),
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const quantiteCartonStock = selectedStock.quantite_carton
        const dataStock = {
          quantite_carton: quantiteCartonStock - stock,
          quantite_piece: finalPiece,
          last_update: new Date(date_livraison),
        }

        await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        let updatedLot = await tx.stock_lot.update({
          where: {
            id: parseInt(detailsMouvement.selectedLot),
          },
          data: {
            quantite_carton: final,
            quantite_piece: finalPieceLot,
          },
        })

        if (final == 0) {
          updatedLot = await tx.stock_lot.update({
            where: {
              id: parseInt(detailsMouvement.selectedLot),
            },
            data: {
              quantite_carton: final,
              quantite_piece: finalPieceLot,
              is_deleted: true,
            },
          })
          const quantiteLotStock = selectedStock.quantite_lot
          tx.stocks.update({
            where: {
              id: parseInt(stock_id),
            },
            data: {
              quantite_lot: quantiteLotStock - 1
            }
          })
        }

        // const listCartonLot = detailsMouvement.cartons

        initialDemandeur = Number(detailsMouvement.stockInitialCartonDemandeur)
        finalDemandeur = Number(detailsMouvement.stockFinalCartonDemandeur)

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        if (pieceId == 1 && servicePiece == 5 && demande.service_demandeur == 3) {
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: 1,
              service_id: 3,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                model_id: modelPiece,
                service_id: 3,
                quantite_lot: 0,
                quantite_carton: finalDemandeur,
                quantite_piece: finalPieceDemandeur,
                created_at: new Date(date_livraison),
                created_by: user.id_user,
                last_update: new Date(date_livraison),
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                service_id: 3,
              },
              data: {
                quantite_carton: finalDemandeur,
                quantite_piece: finalPieceDemandeur,
                last_update: new Date(date_livraison),
              },
            })
            idStock = updatedStockDemandeur.id
          }

          for (let id of listCartonLot) {
            await tx.stock_carton.update({
              where: {
                id: parseInt(id),
                lot_id: updatedLot.id,
              },
              data: {
                service_id: serviceDemandeur,
                lot_id: null
              }
            })
          }

          dataEntree = {
            type: 'entree',
            mouvement: 4,
            demande_id: demande.id,
            created_at: new Date(date_livraison),
            stock_id: idStock,
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }
          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })
        } else {
          for (let id of listCartonLot) {
            await tx.stock_carton.update({
              where: {
                id: parseInt(id),
              },
              data: {
                is_deleted: true,
              }
            })
            await tx.serial_numbers.updateMany({
              where: {
                carton_id: parseInt(id),
              },
              data: {
                is_deleted: true,
              }
            })
          }
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })

      } else if (typeMouvement == 1) {
        initial = Number(detailsMouvement.stockInitialLot)
        stock = Number(detailsMouvement.quantiteMouvementLot)
        final = Number(detailsMouvement.stockFinalLot)
        dataMouvement = {
          type: 'sortie',
          mouvement: 1,
          demande_id: demande.id,
          created_at: new Date(date_livraison),
          stock_id: parseInt(stock_id),
          piece_id: parseInt(itemId),
          service_origine: servicePiece,
          service_destination: parseInt(demande.service_demandeur),
          model_id: modelPiece,
          stock_initial: initial,
          quantite: stock,
          stock_final: final,
          quantite_totale_piece: finalPiece,
          motif: demande.motif_demande,
          commentaire,
          details_mouvement: JSON.stringify(detailsMouvement),
        }
        mouvement_stock = await tx.mouvement_stock.create({
          data: dataMouvement,
        })

        const quantiteCartonStock = selectedStock.quantite_carton
        const dataStock = {
          quantite_lot: final,
          quantite_carton: quantiteCartonStock - Number(detailsMouvement.quantiteMouvementCarton),
          quantite_piece: finalPiece,
          last_update: new Date(date_livraison),
        }

        await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        const listLot = detailsMouvement.listeLots

        initialDemandeur = Number(detailsMouvement.stockInitialLotDemandeur)
        finalDemandeur = Number(detailsMouvement.stockFinalLotDemandeur)
        const finalCartonDemandeur = Number(detailsMouvement.quantiteMouvementCarton)

        const stockDonneur = await tx.stocks.update({
          where: {
            id: parseInt(stock_id),
          },
          data: dataStock,
        })

        if (pieceId == 1 && servicePiece == 5 && demande.service_demandeur == 3) {
          const stockDemandeur = await tx.stocks.findFirst({
            where: {
              code_stock: stockDonneur.code_stock,
              piece_id: 1,
              service_id: 3,
            }
          })
          let idStock = stockDemandeur ? stockDemandeur.id : null
          if (!stockDemandeur) {
            const stockDemandeur = await tx.stocks.create({
              data: {
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                model_id: modelPiece,
                service_id: 3,
                quantite_lot: finalDemandeur,
                quantite_carton: finalCartonDemandeur,
                quantite_piece: finalPieceDemandeur,
                created_at: new Date(date_livraison),
                created_by: user.id_user,
                last_update: new Date(date_livraison),
                updated_by: user.id_user,
              }
            })
            idStock = stockDemandeur.id
          } else {
            const updatedStockDemandeur = await tx.stocks.update({
              where: {
                id: idStock,
                code_stock: stockDonneur.code_stock,
                piece_id: 1,
                service_id: 3,
              },
              data: {
                quantite_lot: finalDemandeur,
                quantite_carton: finalCartonDemandeur,
                quantite_piece: finalPieceDemandeur,
                last_update: new Date(date_livraison),
              },
            })
            idStock = updatedStockDemandeur.id
          }

          for (let id of listCartonLot) {
            await tx.stock_carton.update({
              where: {
                id: parseInt(id),
                lot_id: updatedLot.id,
              },
              data: {
                service_id: serviceDemandeur,
                lot_id: null
              }
            })
          }

          dataEntree = {
            type: 'entree',
            mouvement: 1,
            stock_id: idStock,
            demande_id: demande.id,
            created_at: new Date(date_livraison),
            piece_id: parseInt(itemId),
            service_origine: servicePiece,
            service_destination: parseInt(demande.service_demandeur),
            model_id: modelPiece,
            stock_initial: initialDemandeur,
            quantite: stock,
            stock_final: finalDemandeur,
            quantite_totale_piece: finalPieceDemandeur,
            motif: demande.motif_demande,
            commentaire,
            details_mouvement: JSON.stringify(detailsEntree),
          }
          mouvement_stock_demandeur = await tx.mouvement_stock.create({
            data: dataEntree,
          })

          for (let id of listLot) {
            await tx.stock_lot.update({
              where: {
                id: parseInt(id)
              },
              data: {
                stock_id: idStock,
                service_id: serviceDemandeur,
              }
            })
            await tx.stock_carton.updateMany({
              where: {
                lot_id: parseInt(id)
              },
              data: {
                stock_id: idStock,
                service_id: serviceDemandeur,
              }
            })
          }
        } else {
          for (let id of listLot) {
            await tx.stock_lot.update({
              where: {
                id: parseInt(id)
              },
              data: {
                is_deleted: true,
              }
            })
            await tx.stock_carton.updateMany({
              where: {
                lot_id: parseInt(id)
              },
              data: {
                is_deleted: true,
              }
            })
            await tx.serial_numbers.updateMany({
              where: {
                lot_id: parseInt(id),
              },
              data: {
                is_deleted: true,
              }
            })
          }
          // for (let id of listCartonLot) {
          //   await tx.stock_carton.update({
          //     where: {
          //       id: parseInt(id),
          //       lot_id: updatedLot.id,
          //     },
          //     data: {
          //       is_deleted: true,
          //     }
          //   })
          // }
        }

        // mouvement_stock_demandeur = await tx.mouvement_stock.create({
        //   data: dataEntree,
        // })
      }
      await tx.demandes.update({
        where: { id: parseInt(demande_id) },
        data: {
          stock_id: +stock_id,
          demande_livree: true,
          nomenclature,
          type_demande: typeMouvement,
          details_demande: JSON.stringify(detailsMouvement),
          details_demandeur: JSON.stringify(detailsEntree),
        },
      });

      const livraisonForm = await tx.forms.create({
        data: {
          type: 'livraison_stock',
          created_by: user.id_user,
          created_at: new Date(date_livraison),
          last_modified_at: new Date(date_livraison),
          nom_user: user.fullname,
          commentaire,
          is_reg: true,
        }
      })

      const livraison = await tx.livraison_piece.create({
        data: {
          demande_id: demande.id,
          details_demande: JSON.stringify(detailsMouvement),
          details_demandeur: JSON.stringify(detailsEntree),
          form_id: livraisonForm.id,
          stock_id: parseInt(stock_id),
        }
      })
      return {
        livraisonForm,
        livraison,
      }
      // {
      //   timeout: 10000 // 10 seconds instead of 5
      // }
    })


    /************************************     GESTION MAILS     **************************************/

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(demande.item_id)
      }
    });

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(demande.service_demandeur)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(demande.service_demandeur)
      },
      include: {
        users: true
      }
    })

    const mouvement = await prisma.type_mouvement_stock.findUnique({
      where: {
        id: detailsMouvement.typeMouvement
      }
    })

    const service_users = userService.map(us => us.users)
    const demandeur = await prisma.users.findUnique({
      where: {
        id_user: demande.user_id
      }
    })

    let motif = demande.motif_demande
    let nomPiece = piece.nom_piece.toUpperCase()

    let nomServiceDemandeur = service.nom_service.toUpperCase();

    let quantite = stock;
    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';
    const url = GENERAL_URL
    let demandeLink = `${url}/demande-details/${demande.id}`;
    const sendMail = require("../../utils/emailSender");
    if ((service_users && service_users.length > 0) || demandeur) {
      const subject = `SYSLIS - REGULARISATION LIVRAISON STOCK DE ${nomPiece}`;
      const html = `
        <p>Bonjour,</p>
        <p>La livraison pour la demande ${demande.id} a été régularisée.</p>
        <ul>
          <li><strong>Motif :</strong> ${motif}</li>
          <li><strong>${mouvement.titre}</strong></li>
          <li><strong>Quantité :</strong> ${quantite}</li>
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
      // await sendMail({
      //   to: demandeur.email,
      //   subject,
      //   html,
      // });
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }

    console.log('Livraison de stock éffectuée avec succès !')
    return res.status(201).json({
      message: 'Livraison de stock éffectuée avec succès !',
      data: mouvementStock,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

const regReceptionDemande = async (req, res) => {
  try {
    const {
      itemId,
      demandeId,
      commentaire,
      user_id,
      date_reception,
    } = req.body;

    const demande = await prisma.demandes.findUnique({
      where: { id: parseInt(demandeId) },
    })

    if (!demande) {
      console.log("Demande introuvable.")
      return res.status(404).json({ message: "Demande introuvable." });
    }
    if (demande.demande_recue == true) {
      console.log("Demande déjà réceptionnée")
      return res.status(400).json({ message: "Demande déjà réceptionnée." });
    }
    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
      folder: "greenpay/signatures",
    });
    const signatureCloud = uploadResult.secure_url;

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const utilisateur = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    let nom_recepteur = utilisateur.fullname

    const dateAction = new Date(date_reception)

    const reception = await prisma.$transaction(async (tx) => {
      const receptionForm = await tx.forms.create({
        data: {
          type: 'reception_stock',
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
        }
      })
      const newReception = await tx.reception_piece.create({
        data: {
          item_id: parseInt(itemId),
          user_id: parseInt(user_id),
          demande_id: parseInt(demandeId),
          created_at: dateAction,
          signature_recepteur: signatureCloud ? signatureCloud : '',
          nom_recepteur,
          commentaire,
          form_id: receptionForm.id,
        }
      })

      await tx.form_signatures.create({
        data: {
          form_id: receptionForm.id,
          signature_url: signature.path,
          signed_by: utilisateur.id_user,
          signed_at: dateAction,
          role: 'receveur',
        },
      })

      await tx.demandes.update({
        where: { id: demande.id },
        data: { demande_recue: true },
      })

      return {
        receptionForm,
        newReception,
      }
    })

    // *********** GESTION DES MAILS ************

    const livraisonPiece = await prisma.livraison_piece.findFirst({
      where: {
        demande_id: demande.id,
      },
      include: {
        forms: true
      },
    })

    const livreurId = livraisonPiece.forms.created_by
    const livreur = prisma.users.findUnique({
      where: {
        id_user: livreurId
      }
    })

    const typeMouvement = await prisma.type_mouvement_stock.findUnique({
      where: {
        id: demande.type_demande
      }
    })

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(demande.service_demandeur)
      }
    })

    const serviceReception = service.nom_service

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: demande.item_id
      }
    })
    // let demandeurs = userRole.map(us => us.users)

    let quantiteProduits = demande.qte_total_demande
    let commentaire_mail = commentaire ? commentaire : "(Sans commentaire)"

    const url = GENERAL_URL
    const deliveryLink = `${url}/demande-details/${demande.id}`;

    if (livreur) {
      const subject = `SYSLIS - REGULARISATION RECEPTION DE STOCK`;
      const html = `
        <p>Bonjour,</p>
        <p>La réception du stock de la ${demande.id} a été régularisée.</p>
        <ul>
          <li><strong>Pièce demandée:</strong> ${piece.nom_piece}</li>
          <li><strong>Nombre de produits:</strong> ${quantiteProduits} ${typeMouvement.titre}</li>
          <li><strong>Service:</strong> ${serviceReception}</li>
        </ul>
        <br>
          <p>Commentaire : ${commentaire_mail}<p>
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
      await sendMail({
        to: livreur.email,
        subject,
        html,
      });
    }

    console.log('Stock réceptionné avec succès !')
    return res.status(201).json({
      message: 'Stock réceptionné avec succès',
      data: reception,
    });

  } catch (error) {
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
  livraisonPiece,
}
