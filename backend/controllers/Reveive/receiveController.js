const TEST_ENV = require("../../utils/consts")
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require("../../config/clouddinaryConifg");

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

// ✅ Créer une validation (ancienne ou nouvelle)
const createValidation = async (req, res) => {
  const {
    livraison_id,
    commentaire,
    user_id,
  } = req.body;

  try {
    const livraison = await prisma.livraison.findUnique({
      where: { id_livraison: parseInt(livraison_id) },
    });

    if (!livraison) {
      console.error("Livraison introuvable.")
      return res.status(404).json({ message: "Livraison introuvable." });
    }

    if (livraison.statut_livraison === "livre") {
      console.error("Livraison déjà validée.")
      return res.status(400).json({ message: "Livraison déjà validée." });
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

    if (!user_id) {
      console.error("Utilisateur non authentifié.")
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }
    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    let produitsLivre = livraison.produitsLivre

    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

    if (!user) {
      console.error("Utilisateur non trouvé.")
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: livraison.type_livraison_id
      }
    })
    let livraisonTypeName = typeLivraison.nom_type_livraison.toUpperCase();

    const dateAction = new Date()

    const reception = await prisma.$transaction(async (tx) => {
      const receptionForm = await tx.forms.create({
        data: {
          type: 'reception_sn',
          created_by: user.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: user.fullname,
          commentaire,
        }
      })
      const newValidation = await tx.validations.create({
        data: {
          livraison_id: parseInt(livraison_id),
          date_validation: new Date(),
          commentaire,
          user_id: user_id ? parseInt(user_id) : null,
          nom_recepteur: user.fullname,
          signature: signatureCloud,
          form_id: receptionForm.id,
        },
      });

      await tx.livraison.update({
        where: { id_livraison: parseInt(livraison_id) },
        data: { statut_livraison: "livre" },
      });

      await tx.sn_livraison.createMany({
        data: produits.map((item) => ({
          serial_number: item.serialNumber,
          point_marchand: item.pointMarchand,
          caisse: item.caisse,
          mobile_money: JSON.stringify(item.mobile_money),
          banque: item.banque,
          commentaire: item.commentaireTPE,
          created_at: dateAction,
          livraison_id: livraison.id_livraison,
          last_modified_at: dateAction,
        }))
      })

      await tx.form_signatures.create({
        data: {
          form_id: receptionForm.id,
          signature_url: signature.path,
          signed_by: user.id_user,
          signed_at: dateAction,
          role: 'receveur',
        },
      })

      // ***************************************     GESTION STOCK CHARGEUR     *************************************

      if (livraison.stock_id) {
        const stockChargeur = await tx.stocks.findUnique({
          where: {
            id: livraison.stock_id,
          },
        })
        const piece = await tx.items.findUnique({
          where: {
            id_piece: stockChargeur.piece_id,
          },
        })
        if(piece && piece.nom_piece.toLowerCase().includes("chargeur")){
          const quantiteChargeur = stockChargeur.quantite_piece
          await tx.stocks.update({
            where: {
              id: stockChargeur.id,
            },
            data: {
              quantite_piece: quantiteChargeur - livraison.qte_totale_livraison,
              last_update: dateAction,
            }
          })
          const mouvementDetails = {
            typeMouvement: 5,
            stockInitialPiece: quantiteChargeur,
            quantiteMouvement: livraison.qte_totale_livraison,
            stockFinalPiece: quantiteChargeur - livraison.qte_totale_livraison,
          }
          await tx.mouvement_stock.create({
            data: {
              type: 'sortie',
              mouvement: 5,
              formulaire_id: livraison.id_livraison,
              stock_id: stockChargeur.id,
              piece_id: stockChargeur.piece_id,
              service_origine: 3,
              service_destination: livraison.service_id,
              model_id: stockChargeur.model_id,
              stock_initial: quantiteChargeur,
              quantite: livraison.qte_totale_livraison,
              stock_final: quantiteChargeur - livraison.qte_totale_livraison,
              quantite_totale_piece: quantiteChargeur - livraison.qte_totale_livraison,
              motif: livraisonTypeName,
              commentaire: livraison.commentaire,
              details_mouvement: JSON.stringify(mouvementDetails),
            }
          })
        }
      }

      return {
        receptionForm,
        newValidation,
      }
    })

    /******************************* GESTION DES MAILS  *******************************/

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })
    const superviseurs = supervisionRole.map(us => us.users)

    const roleLivraison = await prisma.user_roles.findMany({
      where: {
        role_id: 1
      },
      include: {
        users: true
      }
    })
    const livreurs = roleLivraison.map(us => us.users)

    const url = GENERAL_URL
    let deliveryLink = `${url}/formulaire/${livraison.id_livraison}`;
    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    const sendMail = require("../../utils/emailSender");

    if ((livreurs && livreurs.length > 0) || (superviseurs && superviseurs.length)) {
      const subject = `RECEPTION LIVRAISON (${livraisonTypeName})`;
      const html = `
        <p>Bonjour,</p>
        <p>La livraison ${livraison.id_livraison} a été réceptionnée.</p>
        <ul>
          <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
          <li><strong>Nombre de produits:</strong> ${produits.length}</li>
        </ul>
        <br>
          <p>Commentaire : ${commentaire_mail}<p>
        <br>
        <p>Retrouvez la livraison à ce lien : 
          <span>
            <a href="${deliveryLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
              Cliquez ici !
            </a>
          </span>
        </p>
        <br><br>
        <p>Green - Pay vous remercie.</p>
      `;

      for (const livreur of livreurs) {
        await sendMail({
          to: livreur.email,
          subject,
          html,
        });
      }
      if (superviseurs) {
        for (const superviseur of superviseurs) {
          await sendMail({
            to: superviseur.email,
            subject,
            html,
          });
        }
      }
    }

    console.log("Réception effectuée avec succès !")
    return res.status(201).json({
      message: "Réception effectuée avec succès",
      data: reception,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// ✅ Mettre à jour une validation existante, en incluant la signature
const updateValidation = async (req, res) => {
  const { id } = req.params;
  const { commentaire, nom_recepteur, is_old_validation = false, user_id, date_validation } = req.body;

  try {
    const validation = await prisma.validations.findUnique({
      where: { id_validation: parseInt(id) },
    });

    if (!validation) {
      return res.status(404).json({ message: "Validation non trouvée." });
    }

    let signature = validation.signature;

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "greenpay/signatures",
      });
      signature = uploadResult.secure_url;
    }

    if (!signature) {
      return res.status(400).json({ message: "La signature du récepteur est obligatoire." });
    }

    let final_date_validation = validation.date_validation;

    if (is_old_validation === 'true' || is_old_validation === true) {
      if (!nom_recepteur || !date_validation) {
        return res.status(400).json({ message: "Nom du récepteur et date de validation obligatoires pour une ancienne validation." });
      }
      final_date_validation = new Date(date_validation);
      if (isNaN(final_date_validation)) {
        return res.status(400).json({ message: "Date de validation invalide." });
      }
    } else {
      final_date_validation = new Date(); // Met à jour automatiquement
    }

    const updatedValidation = await prisma.validations.update({
      where: { id_validation: parseInt(id) },
      data: {
        commentaire,
        signature,
        nom_recepteur: nom_recepteur || validation.nom_recepteur,
        date_validation: final_date_validation,
        user_id: user_id ? parseInt(user_id) : validation.user_id,
      },
    });

    return res.status(200).json(updatedValidation);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

// ✅ Récupérer toutes les validations
const getAllValidations = async (req, res) => {
  try {
    const validations = await prisma.validations.findMany({
      orderBy: { date_validation: 'desc' },
    });
    return res.status(200).json(validations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// ✅ Récupérer une validation par ID
const getOneValidation = async (req, res) => {
  const { id } = req.params;
  try {
    const validation = await prisma.validations.findUnique({
      where: { id_validation: parseInt(id) },
    });

    if (!validation) {
      return res.status(404).json({ message: "Validation non trouvée." });
    }

    return res.status(200).json(validation);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// ✅ Supprimer une validation
const deleteValidation = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.validations.delete({
      where: { id_validation: parseInt(id) },
    });
    return res.status(200).json({ message: "Validation supprimée avec succès." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Retourner une livraison
const returnDelivery = async (req, res) => {
  const {
    livraison_id,
    commentaire_return,
    user_id,
  } = req.body;
  try {
    const livraison = await prisma.livraison.findUnique({
      where: { id_livraison: parseInt(livraison_id) },
    });

    if (!livraison) return res.status(404).json({ message: "Livraison introuvable." });

    if (livraison.statut_livraison === "livre") {
      return res.status(400).json({ message: "Livraison déjà validée." });
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

    const newValidation = await prisma.validations.create({
      data: {
        livraison_id: parseInt(livraison_id),
        etat_validation: 'retourne',
        commentaire: commentaire_return,
        user_id: user_id ? parseInt(user_id) : null,
        nom_recepteur: user.fullname,
        date_validation: new Date(),
        signature: 'retournée',
      },
    });

    await prisma.livraison.update({
      where: { id_livraison: parseInt(livraison_id) },
      data: { statut_livraison: 'en_attente' },
    });



    /******************************* GESTION DES MAILS  *******************************/



    let produitsLivre = livraison.produitsLivre

    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

    const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: livraison.type_livraison_id
      }
    })
    let livraisonTypeName = typeLivraison.nom_type_livraison.toUpperCase();

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })
    const superviseurs = supervisionRole.map(us => us.users)

    const roleLivraison = await prisma.user_roles.findMany({
      where: {
        role_id: 1
      },
      include: {
        users: true
      }
    })
    const livreurs = roleLivraison.map(us => us.users)

    const url = GENERAL_URL
    let deliveryLink = `${url}/formulaire/${livraison.id_livraison}`;
    let commentaire_mail = commentaire_return ? commentaire_return : '(sans commentaire)'
    const sendMail = require("../../utils/emailSender");

    if ((livreurs && livreurs.length > 0) || (superviseurs && superviseurs.length)) {
      const subject = `RETOUR DE LIVRAISON (${livraisonTypeName})`;
      const html = `
        <p>Bonjour,</p>
        <p>La livraison ${livraison.id_livraison} a été retournée.</p>
        <ul>
          <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
          <li><strong>Nombre de produits:</strong> ${produits.length}</li>
        </ul>
        <br>
          <p>Commentaire : ${commentaire_mail}<p>
        <br>
        <p>Retrouvez la livraison à ce lien : 
          <span>
            <a href="${deliveryLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
              Cliquez ici !
            </a>
          </span>
        </p>
        <br><br>
        <p>Green - Pay vous remercie.</p>
      `;

      for (const livreur of livreurs) {
        await sendMail({
          to: livreur.email,
          subject,
          html,
        });
      }
      if (superviseurs) {
        for (const superviseur of superviseurs) {
          await sendMail({
            to: superviseur.email,
            subject,
            html,
          });
        }
      }
    }

    return res.status(201).json({
      message: "Livraison retournée avec succès.",
      newValidation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// const createValidationDemande = async (req, res) => {
//   const {
//     livraison_id,
//     commentaire,
//     nom_validateur,
//     date_validation,
//     is_old_validation = false,
//     user_id,
//     demande_id,
//   } = req.body;

//   try {
//     const livraison = await prisma.livraison.findUnique({
//       where: { id_livraison: parseInt(livraison_id) },
//     });

//     if (!livraison) return res.status(404).json({ message: "Livraison introuvable." });

//     if (livraison.statut_livraison === "livre") {
//       return res.status(400).json({ message: "Livraison déjà validée." });
//     }

//     if (!req.file) {
//       return res.status(400).json({ message: "Signature du récepteur requise." });
//     }

//     const uploadResult = await cloudinary.uploader.upload(req.file.path, {
//       folder: "greenpay/signatures",
//     });
//     const signature = uploadResult.secure_url;

//     let final_nom_validateur;
//     let final_date_validation;

//     if (is_old_validation === 'true' || is_old_validation === true) {
//       if (!nom_validateur || !date_validation) {
//         return res.status(400).json({ message: "Nom du validateur et date de validation obligatoires pour une ancienne validation." });
//       }
//       final_nom_validateur = nom_validateur;
//       final_date_validation = new Date(date_validation);
//       if (isNaN(final_date_validation)) {
//         return res.status(400).json({ message: "Date de validation invalide." });
//       }
//     } else {
//       if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

//       const user = await prisma.users.findUnique({
//         where: { id_user: parseInt(user_id) },
//         include: { agents: true },
//       });

//       if (!user || !user.agents) {
//         return res.status(404).json({ message: "Utilisateur ou agent non trouvé." });
//       }

//       final_nom_validateur = user.agents.nom;
//       final_date_validation = new Date();
//     }

//     const newValidation = await prisma.validations.create({
//       data: {
//         livraison_id: parseInt(livraison_id),
//         commentaire,
//         user_id: user_id ? parseInt(user_id) : null,
//         nom_recepteur: final_nom_validateur,
//         date_validation: final_date_validation,
//         signature,
//       },
//     });

//     await prisma.livraison.update({
//       where: { id_livraison: parseInt(livraison_id) },
//       data: { statut_livraison: "livre" },
//     });

//     // const demande = await prisma.demandes.findUnique({
//     //   where: { id_demande: parseInt(demande_id) },
//     // });

//     await prisma.demandes.update({
//         where: { id_demande: parseInt(demande_id)},
//         data: { demande_livree : true},
//     })



//     // Gestion des mails

//     let produitsLivre = livraison.produitsLivre

//     const produits = typeof produitsLivre === "string"
//       ? JSON.parse(produitsLivre)
//       : produitsLivre;
//     let type_livraison_id = livraison.type_livraison_id
//     let livraisonTypeName = '';
//     switch (parseInt(type_livraison_id)) {
//       case 1:
//         livraisonTypeName = 'TPE GIM';
//         break;
//       case 2:
//         livraisonTypeName = 'TPE REPARE';
//         break;
//       case 3:
//         livraisonTypeName = 'TPE MAJ GIM';
//         break;
//       case 4:
//         livraisonTypeName = 'TPE MOBILE';
//         break;
//       case 5:
//         livraisonTypeName = 'CHARGEUR';
//         break;
//       case 6:
//         livraisonTypeName = 'TPE ECOBANK';
//         break;
//       case 7:
//         livraisonTypeName = 'CHARGEUR (TPE décommissionné RI OK)';
//         break;
//       case 8:
//         livraisonTypeName = 'CHARGEUR (TPE décommissionné RI NOK)';
//         break;
//     }
//     const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
//     const localUrl = "http://localhost:5173"
//     const url = GENERAL_URL
//     let deliveryLink = `${url}/formulaire/${livraison.id_livraison}`;
//     if(type_livraison_id == 5 || type_livraison_id == 7){
//       deliveryLink = `${url}/formulaire-chargeur/${livraison.id_livraison}`;
//     } else if(type_livraison_id == 8){
//       deliveryLink = `${url}/formulaire-chargeur-decom/${livraison.id_livraison}`;
//     }
//     // const deliveryLink = `https://livraisons.greenpayci.com/formulaire-recu/${nouvelleLivraison.id_livraison}`
//     const sendMail = require("../../utils/emailSender");
//     const delivers = await prisma.users.findMany({
//       where: { role_id: 4 },
//     });

//     if (delivers && delivers.length > 0) {
//       const subject = `NOUVELLE LIVRAISON ${livraisonTypeName}`;
//       const html = `
//         <p>Bonjour,</p>
//         <p>La livraison ${livraison.id_livraison} a été validée.</p>
//         <ul>
//           <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
//           <li><strong>Nombre de produits:</strong> ${produits.length}</li>
//         </ul>
//         <br>
//         <p>Retrouvez la livraison à ce lien : 
//           <span>
//             <a href="${deliveryLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
//               Cliquez ici !
//             </a>
//           </span>
//         </p>
//         <br><br>
//         <p>Green - Pay vous remercie.</p>
//       `;

//       for (const deliver of delivers) {
//         await sendMail({
//           to: deliver.email,
//           subject,
//           html,
//         });
//       }
//     }


//     // EMAIL AU SERVICE MAINTENANCE POUR LIVRAISON TPE REPARE ET CHARGEUR

//     if(type_livraison_id == 2 || type_livraison_id == 5){

//       const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
//       const localUrl = "http://localhost:5173"
//       const url = GENERAL_URL
//       const deliveryLink = `${url}/formulaire-vue/${livraison.id_livraison}`;
//       const maintenancers = await prisma.users.findMany({
//         where: { role_id: 4 },
//       });

//       if (maintenancers && maintenancers.length > 0) {
//         const subject = `NOUVELLE LIVRAISON ${livraisonTypeName}`;
//         const html = `
//           <p>Bonjour,</p>
//           <p>La livraison ${livraison.id_livraison} a été validée.</p>
//           <ul>
//             <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
//             <li><strong>Nombre de produits:</strong> ${produits.length}</li>
//           </ul>
//           <br>
//           <p>Retrouvez la livraison à ce lien : 
//             <span>
//               <a href="${deliveryLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
//                 Cliquez ici !
//               </a>
//             </span>
//           </p>
//           <br><br>
//           <p>Green - Pay vous remercie.</p>
//         `;

//         for (const maintenancer of maintenancers) {
//           await sendMail({
//             to: maintenancer.email,
//             subject,
//             html,
//           });
//         }
//       }
//     }


//     return res.status(201).json(newValidation);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Erreur serveur." });
//   }
// };

const returnDemandeDelivery = async (req, res) => {
  const {
    livraison_id,
    commentaire_return,
    user_id,
    type_livraison_id,
    demande_id,
  } = req.body;
  try {
    const livraison = await prisma.livraison.findUnique({
      where: { id_livraison: parseInt(livraison_id) },
    });

    if (!livraison) return res.status(404).json({ message: "Livraison introuvable." });

    if (livraison.statut_livraison === "livre") {
      return res.status(400).json({ message: "Livraison déjà validée." });
    }

    if (!commentaire_return) {
      return res.status(400).json({ message: "Commentaire de retour requis." });
    }

    let final_nom_validateur;
    let final_date_validation;

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
      include: { agents: true },
    });

    if (!user || !user.agents) {
      return res.status(404).json({ message: "Utilisateur ou agent non trouvé." });
    }

    final_nom_validateur = user.agents.nom;
    final_date_validation = new Date();

    await prisma.livraison.update({
      where: { id_livraison: parseInt(livraison_id) },
      data: { statut_livraison: 'en_attente' },
    });

    await prisma.demandes.update({
      where: { id_demande: parseInt(demande_id) },
      data: { demande_livree: false },
    })

    const livraisonProduits = await prisma.livraison.findUnique({
      where: {
        id_livraison: parseInt(livraison_id)
      }
    });

    const produits = typeof livraisonProduits.produitsLivre === "string"
      ? JSON.parse(livraisonProduits.produitsLivre)
      : livraisonProduits.produitsLivre;

    let livraisonTypeName = ''
    switch (type_livraison_id) {
      case 8:
        livraisonTypeName = 'CHARGEUR (TPE décommissionné RI NOK)';
        break;
    }

    // const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
    // const localUrl = "http://localhost:5173"
    const url = GENERAL_URL
    let deliveryLink = `${url}/formulaire/${livraison.id_livraison}`;
    if (type_livraison_id == 8) {
      deliveryLink = `${url}/formulaire-chargeur-decom/${livraison.id_livraison}`;
    }

    // Fonction de génération de mail
    const sendMail = require("../../utils/emailSender");
    const livreurs = await prisma.users.findMany({
      where: {
        role_id: livraison_role,
      },
    });
    if (livreurs && livreurs.length > 0) {
      // 2. Prepare email content
      const subject = `LIVRAISON RETOURNÉE ${livraisonTypeName}`;
      const html = `
      <p>Bonjour,</p>
      <p>La livraison ${livraison.id_livraison} a été retournée.</p>
      <ul>
        <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
        <li><strong>Nombre de produits:</strong> ${produits.length}</li>
      </ul>
      <p>Pour raison : <strong>${commentaire_return}</strong></p>
      </br>
      <p>Retrouvez la livraison à ce lien : 
        <span>
          <a href="${deliveryLink}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
            Cliquez ici !
          </a>
        </span>
      </p>
      </br>
      <p>Green - Pay vous remercie.</p>
    `;

      // 3. Send email to each receiver
      for (const livreur of livreurs) {
        await sendMail({
          to: livreur.email,
          subject,
          html,
        });
      }

    }

    return res.status(201).json({ message: "Livraison retournée avec succès." });;
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};



module.exports = {
  createValidation,
  updateValidation,
  getAllValidations,
  getOneValidation,
  deleteValidation,
  returnDelivery,
  returnDemandeDelivery,
};
