const TEST_ENV = require("../../utils/consts")
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require("../../config/clouddinaryConifg");
const { type } = require("os");
const { sign } = require("crypto");
const sendMail = require("../../utils/emailSender");
const JSZip = require("jszip");
const ExcelJS = require("exceljs");
const { allowedNodeEnvironmentFlags } = require("process");

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
// Fonction de regularisationReception
const regReception = async (req, res) => {
  const {
    date_reception,
    livraison_id,
    commentaire,
    user_id,
  } = req.body;

  try {
    const livraison = await prisma.livraison.findUnique({
      where: { id_livraison: parseInt(livraison_id) },
    });

    if (!livraison) {
      console.error("Livraison introuvable !")
      return res.status(404).json({ message: "Livraison introuvable." });
    }

    if (livraison.statut_livraison === "livre") {
      console.error("Livraison déjà validée !")
      return res.status(400).json({ message: "Livraison déjà validée." });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    // Gestion de l'upload Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
      folder: "greenpay/signatures",
    });

    const signatureCloud = uploadResult.secure_url;

    if (!signatureCloud) {
      console.error("Vous devez fournir la signature (cloudinary) !")
      return res.status(400).json({ message: "Vous devez fournir une signature d'expéditeur." });
    }

    if (!user_id) {
      console.error("Utilisateur non authentifié !")
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }
    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      console.error("Utilisateur non trouvé !")
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const typeLivraison = await tx.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: livraison.type_livraison_id
      }
    })
    let livraisonTypeName = typeLivraison.nom_type_livraison.toUpperCase();


    const dateAction = new Date(date_reception)

    const reception = await prisma.$transaction(async (tx) => {

      const receptionForm = await tx.forms.create({
        data: {
          type: 'reception_sn',
          created_by: user.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: user.fullname,
          commentaire,
          is_reg: true,
        }
      })
      const newValidation = await tx.validations.create({
        data: {
          livraison_id: parseInt(livraison_id),
          date_validation: dateAction,
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
        const quantiteChargeur = stockChargeur.quantite_piece
        // Mettre à jour le stock
        await tx.stocks.update({
          where: {
            id: stockChargeur.id,
          },
          data: {
            quantite_piece: quantiteChargeur - livraison.qte_totale_livraison,
            last_update: new Date(),
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
            created_at: dateAction,
            mouvement: 5,
            formulaire_id: livraison.id_livraison,
            stock_id: stockChargeur.id,
            piece_id: 1,
            service_origine: 3,
            service_destination: livraison.service_id,
            model_id: 1,
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

      return {
        receptionForm,
        newValidation,
      }
    })

    /******************************* GESTION DES MAILS  *******************************/

    let produitsLivre = livraison.produitsLivre

    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

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
      const subject = `REGULARISATION RECEPTION LIVRAISON (${livraisonTypeName})`;
      const html = `
        <p>Bonjour,</p>
        <p>La réception de la livraison ${livraison.id_livraison} a été régularisée.</p>
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

    console.log('Réception effectuée avec succès !')
    return res.status(201).json({
      message: 'Réception effectuée avec succès !',
      data: reception,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

const deliver = async (req, res) => {
  try {
    const {
      produitsLivre,
      commentaire,
      user_id,
      type_livraison_id,
      service_recepteur,
      role_recepteur,
      selected_model,
      selectedStock,
    } = req.body;

    // const files = req.files?.files || [];
    // const signatureFile = req.files?.signature_expediteur?.[0] || null;

    // const files_content = files.length
    //   ? files.map(file => ({
    //     name: file.originalname,
    //     path: file.path,
    //     type: file.mimetype,
    //     size: file.size
    //   }))
    //   : [];

    // let signature_expediteur = null;
    // if (!signatureFile) {
    //   console.log('La signature est requise!')
    //   return res.status(400).json({ message: "Signature requise" });
    // } else {
    //   signature_expediteur = signatureFile.path;
    // }

    // Correction ici : gestion de produitsLivre (string JSON venant de form-data)
    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

    const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: parseInt(type_livraison_id)
      }
    });

    if (!typeLivraison) {
      console.error("Type de livraison non trouvé !")
      return res.status(404).json({ message: "Type de livraison non trouvé" });
    }

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });
    if (!utilisateur) {
      console.error("Utilisateur non trouvé !")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    // Gestion de l'upload Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
      folder: "greenpay/signatures",
    });
    const signature_expediteur = uploadResult.secure_url;

    if (!signature_expediteur) {
      console.error("Vous devez fournir la signature (cloudinary) !")
      return res.status(400).json({ message: "Vous devez fournir une signature d'expéditeur." });
    }
    const dateAction = new Date()

    const livraison = await prisma.$transaction(async (tx) => {
      const livraisonForm = await tx.forms.create({
        data: {
          type: 'livraison_sn',
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
        }
      })
      const nouvelleLivraison = await tx.livraison.create({
        data: {
          statut_livraison: "en_cours",
          qte_totale_livraison: produits.length,
          produitsLivre: JSON.stringify(produits),
          commentaire,
          nom_livreur: utilisateur.fullname || null,
          date_livraison: dateAction,
          deleted: false,
          type_livraison_id: parseInt(type_livraison_id),
          user_id: utilisateur ? utilisateur.id_user : null,
          signature_expediteur,
          service_id: parseInt(service_recepteur),
          role_id: role_recepteur ? parseInt(role_recepteur) : null,
          model_id: selected_model ? parseInt(selected_model) : null,
          stock_id: selectedStock ? +selectedStock : null,
          form_id: livraisonForm.id,
        }
      });

      await tx.form_signatures.create({
        data: {
          form_id: livraisonForm.id,
          signature_url: signature.path,
          signed_by: utilisateur.id_user,
          signed_at: dateAction,
          role: 'livreur',
        },
      })

      /*******************     GESTION PARC TPE     *******************/

      let allTpes = null

      if (nouvelleLivraison.type_livraison_id != 5 && nouvelleLivraison.type_livraison_id != 7 && nouvelleLivraison.type_livraison_id != 8) {
        // Récupérer les SN de la liste
        const serials = produits.map(item => item.serialNumber);

        // 1. Create only missing ones
        await tx.parc_tpe.createMany({
          data: serials.map(item => ({
            serial_number: item,
            created_by: utilisateur.id_user,
            created_at: dateAction,
            last_modified_at: dateAction,
            statut_id: 6,
          })),
          skipDuplicates: true
        });

        // 2. Update ALL (existing + newly created)
        await tx.parc_tpe.updateMany({
          where: {
            serial_number: { in: serials }
          },
          data: {
            updated_by: utilisateur.id_user,
            updated_at: dateAction,
            last_modified_at: dateAction,
            statut_id: 6,
          }
        });

        // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
        allTpes = await tx.parc_tpe.findMany({
          where: {
            serial_number: { in: serials }
          },
          select: {
            id: true,
            serial_number: true
          }
        });

        // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
        await tx.history_tpe.createMany({
          data: allTpes.map(tpe => ({
            id_tpe: tpe.id,
            created_by: utilisateur.id_user,
            created_at: dateAction,
            statut_id: 6,
            form_id: livraisonForm.id,
          }))
        });
      }

      return {
        livraisonForm,
        nouvelleLivraison,
        allTpes,
      }
    })

    /******************************** GESTION DES MAILS  ***********************************/

    let livraisonTypeName = typeLivraison.nom_type_livraison.toUpperCase();

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(service_recepteur)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_recepteur)
      },
      include: {
        users: true
      }
    })

    let recepteurs
    if (role_recepteur) {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: parseInt(role_recepteur)
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    } else {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: 2
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    }

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const superviseurs = supervisionRole.map(us => us.users)

    let serviceDemandeur = service.nom_service.toUpperCase();

    const url = GENERAL_URL
    let deliveryLink = `${url}/formulaire/${livraison.nouvelleLivraison.id_livraison}`;

    const commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    if ((service_users && service_users.length > 0) || (recepteurs && recepteurs.length > 0)) {
      const subject = `NOUVELLE LIVRAISON (${livraisonTypeName})`;
      const html = `
        <p>Bonjour,</p>
        <p>Une nouvelle livraison a été enregistrée.</p>
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

      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
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

      // for (const recepteur of recepteurs) {
      //   await sendMail({
      //     to: recepteur.email,
      //     subject,
      //     html,
      //   });
      // }
    }

    res.status(201).json({
      message: "Livraison enregistrée avec succès",
      data: livraison,
    });

  } catch (error) {
    console.error("Erreur lors de la livraison :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

const regLivraison = async (req, res) => {
  try {
    const {
      date_livraison,
      produitsLivre,
      commentaire,
      user_id,
      type_livraison_id,
      service_recepteur,
      role_recepteur,
      selected_model,
      selectedStock,
    } = req.body;

    // const files = req.files?.files || [];
    // const signatureFile = req.files?.signature_expediteur?.[0] || null;

    // const files_content = files.length
    //   ? files.map(file => ({
    //     name: file.originalname,
    //     path: file.path,
    //     type: file.mimetype,
    //     size: file.size
    //   }))
    //   : [];

    // let signature_expediteur = null;
    // if (!signatureFile) {
    //   console.log('La signature est requise!')
    //   return res.status(400).json({ message: "Signature requise" });
    // } else {
    //   signature_expediteur = signatureFile.path;
    // }

    // Correction ici : gestion de produitsLivre (string JSON venant de form-data)
    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

    const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: parseInt(type_livraison_id)
      }
    });

    if (!typeLivraison) {
      return res.status(404).json({ message: "Type de livraison non trouvé" });
    }

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }
    // Gestion de l'upload Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
      folder: "greenpay/signatures",
    });
    const signature_expediteur = uploadResult.secure_url;

    if (!signature_expediteur) {
      return res.status(400).json({ message: "Vous devez fournir une signature d'expéditeur." });
    }

    const dateAction = new Date(date_livraison)

    const livraison = await prisma.$transaction(async (tx) => {

      const livraisonForm = await tx.forms.create({
        data: {
          type: 'livraison_sn',
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
          is_reg: true,
        }
      })
      const nouvelleLivraison = await tx.livraison.create({
        data: {
          statut_livraison: "en_cours",
          date_livraison: new Date(date_livraison),
          qte_totale_livraison: produits.length,
          produitsLivre: JSON.stringify(produits),
          commentaire,
          nom_livreur: utilisateur.fullname || null,
          date_livraison: new Date(dateAction),
          deleted: false,
          type_livraison_id: parseInt(type_livraison_id),
          user_id: utilisateur ? utilisateur.id_user : null,
          signature_expediteur,
          service_id: parseInt(service_recepteur),
          role_id: role_recepteur ? parseInt(role_recepteur) : null,
          model_id: selected_model ? parseInt(selected_model) : null,
          stock_id: selectedStock ? +selectedStock : null,
          form_id: livraisonForm.id,
        }
      });

      await tx.form_signatures.create({
        data: {
          form_id: livraisonForm.id,
          signature_url: signature.path,
          signed_by: utilisateur.id_user,
          signed_at: dateAction,
          role: 'livreur',
        },
      })

      return {
        livraisonForm,
        nouvelleLivraison,
      }
    })

    /******************************** GESTION DES MAILS  ***********************************/

    let livraisonTypeName = typeLivraison.nom_type_livraison.toUpperCase();

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(service_recepteur)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_recepteur)
      },
      include: {
        users: true
      }
    })

    let recepteurs
    if (role_recepteur) {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: parseInt(role_recepteur)
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    } else {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: 2
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    }

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const superviseurs = supervisionRole.map(us => us.users)

    let serviceDemandeur = service.nom_service.toUpperCase();

    const url = GENERAL_URL
    let deliveryLink = `${url}/formulaire/${livraison.nouvelleLivraison.id_livraison}`;

    const commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    const subject = `REGULARISATION LIVRAISON (${livraisonTypeName})`;
    const html = `
      <p>Bonjour,</p>
      <p>Une régularisation de livraison a été enregistrée.</p>
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

    if (service_users && service_users.length > 0) {
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }
    if (superviseurs && superviseurs.length > 0) {
      for (const superviseur of superviseurs) {
        await sendMail({
          to: superviseur.email,
          subject,
          html,
        });
      }
    }

    console.log("Livraison enregistrée avec succès")
    res.status(201).json({
      message: "Livraison enregistrée avec succès",
      data: livraison,
    });

  } catch (error) {
    console.error("Erreur lors de la livraison :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

const getAllLivraisons = async (req, res) => {
  try {
    const livraisons = await prisma.livraison.findMany({
      where: { deleted: false },
      orderBy: { date_livraison: 'desc' },
      include: {
        forms: true,
        validations: true,
        type_livraison_commerciale: true
      }
    });

    res.status(200).json(livraisons);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des livraisons", error });
  }
};

const getOneLivraison = async (req, res) => {
  const { id } = req.params;

  try {
    const livraison = await prisma.livraison.findUnique({
      where: { id_livraison: parseInt(id) },
      include: {
        forms: true,
        validations: true,
      }
    });

    if (!livraison || livraison.deleted) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    res.status(200).json(livraison);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

/* 
  Modification de la fonction updateLivraison. Les données à update: produitsLivre, commentaire, type_livraison_id, 
  date_livraison, qte_totale_livraison
*/
const updateLivraison = async (req, res) => {
  const { id } = req.params;
  const {
    produitsLivre,
    commentaire,
    type_livraison_id,
    user_id,
    service_recepteur,
    role_recepteur,
    selected_model,
    selectedStock,
  } = req.body;

  try {
    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

    let utilisateur = null;

    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    })

    if (!utilisateur) {
      console.error("Utilisateur non trouvé !")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: parseInt(type_livraison_id)
      }
    });

    if (!typeLivraison) {
      console.error("Type de livraison non trouvé !")
      return res.status(404).json({ message: "Type de livraison non trouvé" });
    }

    const existingLivraison = await prisma.livraison.findUnique({
      where: { id_livraison: parseInt(id) },
    });

    if (!existingLivraison) {
      console.error("Livraison non trouvée !")
      return res.status(404).json({ message: "Livraison non trouvée" });
    }

    if (existingLivraison.statut_livraison === "livre") {
      console.error("Impossible de modifier une livraison déjà validée !")
      return res.status(400).json({ message: "Impossible de modifier une livraison déjà validée." });
    }

    const dateAction = new Date()

    const livraison = await prisma.$transaction(async (tx) => {
      // Données à mettre à jour
      const dataToUpdate = {
        produitsLivre: typeof produitsLivre === "string" ? produitsLivre : JSON.stringify(produitsLivre),
        commentaire,
        statut_livraison: 'en_cours',
        type_livraison_id: parseInt(type_livraison_id),
        date_livraison: dateAction,
        qte_totale_livraison: produits.length,
        user_id: utilisateur ? utilisateur.id_user : null,
        nom_livreur: utilisateur.fullname,
        service_id: parseInt(service_recepteur),
        role_id: parseInt(role_recepteur),
        model_id: selected_model ? parseInt(selected_model) : null,
        stock_id: selectedStock ? +selectedStock : null,
      };

      // Mise à jour de la livraison
      const updated = await prisma.livraison.update({
        where: { id_livraison: parseInt(id) },
        data: dataToUpdate
      });

      const updatedForm = await tx.forms.update({
        where: {
          id: updated.form_id
        },
        data: {
          updated_at: dateAction,
          last_modified_at: dateAction,
          updated_by: utilisateur.id_user,
          nom_user: utilisateur.fullname,
          commentaire,
        }
      })

      /*******************     GESTION PARC TPE     *******************/

      let allTpes = null

      if (updated.type_livraison_id != 5 && updated.type_livraison_id != 7 && updated.type_livraison_id != 8) {
        // Récupérer les SN de la liste
        const serials = produits.map(item => item.serialNumber);

        // 1. Create only missing ones
        await tx.parc_tpe.createMany({
          data: serials.map(item => ({
            serial_number: item,
            created_by: utilisateur.id_user,
            created_at: dateAction,
            last_modified_at: dateAction,
            statut_id: 6,
          })),
          skipDuplicates: true
        });

        // 2. Update ALL (existing + newly created)
        await tx.parc_tpe.updateMany({
          where: {
            serial_number: { in: serials }
          },
          data: {
            updated_by: utilisateur.id_user,
            updated_at: dateAction,
            last_modified_at: dateAction,
            statut_id: 6,
          }
        });

        // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
        allTpes = await tx.parc_tpe.findMany({
          where: {
            serial_number: { in: serials }
          },
          select: {
            id: true,
            serial_number: true
          }
        });

        // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
        await tx.history_tpe.createMany({
          data: allTpes.map(tpe => ({
            id_tpe: tpe.id,
            created_by: utilisateur.id_user,
            created_at: dateAction,
            statut_id: 6,
            form_id: updatedForm.id,
          }))
        });
      }

      return {
        updated,
        updatedForm,
        allTpes,
      }
    })


    /********************************       GESTION DES MAILS       ***********************************/


    let livraisonTypeName = typeLivraison.nom_type_livraison.toUpperCase();

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(service_recepteur)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_recepteur)
      },
      include: {
        users: true
      }
    })

    let recepteurs
    if (role_recepteur) {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: parseInt(role_recepteur)
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    } else {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: 2
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    }

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const superviseurs = supervisionRole.map(us => us.users)

    let serviceDemandeur = service.nom_service.toUpperCase();

    const url = GENERAL_URL
    let deliveryLink = `${url}/formulaire/${livraison.updated.id_livraison}`;

    const commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    if ((service_users && service_users.length > 0) || (recepteurs && recepteurs.length > 0)) {
      const subject = `MODIFICATION LIVRAISON (${livraisonTypeName})`;
      const html = `
        <p>Bonjour,</p>
        <p>La livraison ${livraison.updated.id_livraison} a été modifiée.</p>
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

      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
      // for (const recepteur of recepteurs) {
      //   await sendMail({
      //     to: recepteur.email,
      //     subject,
      //     html,
      //   });
      // }
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

    return res.status(200).json({
      message: "Livraison effectuée avec succès",
      data: livraison,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
};

const deleteLivraison = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await prisma.livraison.update({
      where: { id_livraison: parseInt(id) },
      data: {
        deleted: true,
        date_deleted: new Date()
      }
    });

    res.status(200).json({ message: "Livraison supprimée (soft delete)", deleted });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
};

/* Ajout d'une fonction deliverOld specialement pour les livraisons anciennes */
const deliverOld = async (req, res) => {
  const {
    produitsLivre,
    commentaire,
    user_id,
    nom_livreur,
    nom_validateur,
    type_livraison_id,
    isAncienne,
    date_livraison
  } = req.body;

  try {

    // Verification de l'agent livreur
    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

    const typeLivraison = await prisma.typeLivraison.findUnique({
      where: {
        id_type_livraison: parseInt(type_livraison_id)
      }
    });

    if (!typeLivraison) {
      return res.status(404).json({ message: "Type de livraison non trouvé" });
    }
    let utilisateur = null;
    if (!isAncienne) {
      utilisateur = await prisma.users.findUnique({
        where: {
          id_user: parseInt(user_id)
        }
      });

      if (!utilisateur) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
    }

    const signature_expediteur = null

    const nouvelleLivraison = await prisma.livraison.create({
      data: {
        signature_expediteur: 'Validé',
        statut_livraison: "livre",
        qte_totale_livraison: produits.length,
        produitsLivre: JSON.stringify(produits),
        commentaire,
        nom_livreur: nom_livreur || null,
        date_livraison: isAncienne && date_livraison
          ? new Date(date_livraison)
          : new Date(),
        deleted: false,
        type_livraison_id: parseInt(type_livraison_id),
        user_id: utilisateur ? utilisateur.id_user : null,
      }
    });

    // Si c’est une livraison de chargeurs, on traite les transactions
    if (parseInt(type_livraison_id) === 5) {
      for (const item of produits) {
        const chargeur = await prisma.chargeurs.findUnique({
          where: {
            id_chargeur: parseInt(1)
          }
        });

        if (!chargeur) {
          continue; // on ignore les chargeurs non trouvés
        }

        const quantite = parseInt(item.quantite || 1);

        // Créer la transaction (type sortie)
        await prisma.transactions.create({
          data: {
            type_transaction: "sortie",
            quantite,
            date_transaction: new Date(),
            chargeurs: {
              connect: {
                id_chargeur: parseInt(1)
              }
            },
            users: utilisateur ? {
              connect: {
                id_user: parseInt(utilisateur.id_user)
              }
            } : null
          }
        }).then((resultats) => {
          console.log(resultats)
        }).catch(err => { console.log(err) })

        // Mettre à jour le stock
        await prisma.chargeurs.update({
          where: { id_chargeur: parseInt(1) },
          data: {
            stock: {
              decrement: quantite
            }
          }
        });
      }
    }

    let final_nom_validateur = nom_validateur;
    let final_date_validation = new Date(date_livraison);

    const newValidation = await prisma.validations.create({
      data: {
        livraison_id: parseInt(nouvelleLivraison.id_livraison),
        commentaire,
        user_id: null,
        nom_recepteur: final_nom_validateur,
        date_validation: final_date_validation,
        signature: null,
      },
    });

    res.status(201).json({
      message: "Livraison enregistrée avec succès",
      livraison: nouvelleLivraison,
      newValidation
    });

  } catch (error) {
    console.error("Erreur lors de la livraison :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

const deliverStock = async (req, res) => {
  try {
    const {
      commentaire,
      user_id,
      type_livraison_id,
      demande_id,
      quantite,
      service_reception,
      role_reception,
      otherFields,
    } = req.body;

    const typeLivraison = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(type_livraison_id)
      }
    });

    if (!typeLivraison) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    let nomLivreur = utilisateur.fullname

    // Gestion de l'upload Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "greenpay/signatures",
    });

    const signature_expediteur = uploadResult.secure_url;

    if (!signature_expediteur) {
      return res.status(400).json({ message: "Vous devez fournir une signature d'expéditeur." });
    }

    const autres = typeof otherFields === "string"
      ? JSON.parse(otherFields)
      : otherFields

    const nouvelleLivraison = await prisma.Livraisons.create({
      data: {
        user_id: utilisateur ? utilisateur.id_user : null,
        quantite_livraison: parseInt(quantite),
        nom_livreur: nomLivreur ? nomLivreur : null,
        commentaire_livraison: commentaire,
        signature_expediteur: signature_expediteur ? signature_expediteur : null,
        type: "livraison_piece",
        statut_livraison: "en_cours",
        role_id: role_reception ? parseInt(role_reception) : null,
        service_id: service_reception ? parseInt(service_reception) : null,
        date_livraison: new Date(),
        autres_champs_livraison: JSON.stringify(autres),

        livraison_piece: {
          create: {
            piece_id: parseInt(type_livraison_id),
            demande_id: parseInt(demande_id),
          }
        }
      },
      include: {
        livraison_piece: true
      }
    });

    await prisma.demandes.update({
      where: { id: parseInt(demande_id) },
      data: { demande_livree: true },
    })


    // *********** GESTION DES MAILS ************

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(type_livraison_id)
      }
    });

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(service_reception)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_reception)
      },
      include: {
        users: true
      }
    })

    const userRole = await prisma.user_roles.findMany({
      where: {
        role_id: 12
      },
      include: {
        users: true
      }
    })
    let recepteurs = userRole.map(us => us.users)
    const service_users = userService.map(us => us.users)

    let livraisonTypeName = piece.nom_piece.toUpperCase();
    let serviceReception = service.nom_service.toUpperCase();
    let quantiteProduits = quantite
    let commentaire_mail = commentaire ? commentaire : "(Sans commentaire)"

    const url = GENERAL_URL
    const deliveryLink = `${url}/demande-details/${demande_id}`;

    if ((recepteurs && recepteurs.length > 0) || (service_users && service_users.length > 0)) {
      const subject = `NOUVELLE LIVRAISON ${livraisonTypeName}`;
      const html = `
        <p>Bonjour,</p>
        <p>Une nouvelle livraison a été enregistrée.</p>
        <ul>
          <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
          <li><strong>Nombre de produits:</strong> ${quantiteProduits}</li>
          <li><strong>Service:</strong> ${serviceReception}</li>
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

      // for (const recepteur of recepteurs) {
      //   await sendMail({
      //     to: recepteur.email,
      //     subject,
      //     html,
      //   });
      // }
      // for (const service_user of service_users) {
      //   await sendMail({
      //     to: service_user.email,
      //     subject,
      //     html,
      //   });
      // }
    }

    res.status(201).json({
      message: "Livraison enregistrée avec succès",
      livraison: nouvelleLivraison
    });

  } catch (error) {
    console.error("Erreur lors de la livraison :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

const getAllTypeLivraisonCommerciale = async (req, res) => {
  try {
    const typeLivraison = await prisma.type_livraison_commerciale.findMany({
      orderBy: { nom_type_livraison: 'asc' },
    });

    res.status(200).json(typeLivraison);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des types de livraison", error });
  }
}

const getAllStockDeliveries = async (req, res) => {
  try {
    const stockDeliveries = await prisma.livraison_piece.findMany({
      include: {
        Livraisons: {
          include: {
            reception_livraison: true
          }
        }
      }
    })

    res.status(200).json(stockDeliveries);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de toutes les livraisons de pièces", error });
  }
}

const getOneLivraisonDemande = async (req, res) => {
  const { id } = req.params;
  try {
    const livraison = await prisma.livraison_piece.findFirst({
      where: { demande_id: parseInt(id) },
      include: {
        Livraisons: {
          include: {
            reception_livraison: true
          }
        }
      }
    });

    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    res.status(200).json(livraison);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
}

const receiveStock = async (req, res) => {
  const {
    livraison_id,
    commentaire,
    user_id,
  } = req.body;
  try {

    const livraison = await prisma.livraison_piece.findUnique({
      where: { id: parseInt(livraison_id) },
      include: {
        Livraisons: true
      }
    })

    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable." });
    }
    if (livraison.Livraisons.statut_livraison === "livre") {
      return res.status(400).json({ message: "Livraison déjà livrée." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Signature du récepteur requise." });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "greenpay/signatures",
    });
    const signature = uploadResult.secure_url;

    if (!user_id) return res.status(403).json({ message: "Utilisateur non authentifié." });

    const utilisateur = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    let nom_recepteur = utilisateur.fullname

    const newReception = await prisma.reception_livraison.create({
      data: {
        livraison_id: parseInt(livraison_id),
        date_reception: new Date(),
        user_id: parseInt(user_id),
        nom_recepteur,
        commentaire_reception: commentaire,
        signature_recepteur: signature ? signature : '',
        statut_reception: 'recu',
      }
    })

    await prisma.Livraisons.update({
      where: { id: livraison.id },
      data: { statut_livraison: "livre" },
      include: {
        livraison_piece: true
      }
    })

    const piece = await prisma.stock_dt.findUnique({
      where: {
        id_piece: livraison.piece_id
      }
    });

    await prisma.stock_dt.update({
      where: {
        id_piece: livraison.piece_id
      },
      data: {
        quantite: piece.quantite - livraison.Livraisons.quantite_livraison
      }
    })


    // *********** GESTION DES MAILS ************


    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(livraison.Livraisons.service_id)
      }
    })

    const userRole = await prisma.user_roles.findMany({
      where: {
        role_id: 1
      },
      include: {
        users: true
      }
    })
    let livreurs = userRole.map(us => us.users)

    let livraisonTypeName = piece.nom_piece.toUpperCase();
    let quantiteProduits = livraison.Livraisons.quantite_livraison
    let commentaire_mail = commentaire ? commentaire : "(Sans commentaire)"
    let serviceReception = service.nom_service.toUpperCase();

    const url = GENERAL_URL
    const deliveryLink = `${url}/demande-details/${livraison.demande_id}`;

    if ((livreurs && livreurs.length > 0)) {
      const subject = `NOUVELLE LIVRAISON ${livraisonTypeName}`;
      const html = `
        <p>Bonjour,</p>
        <p>La livraison de stock ${livraison.id} a été réceptionnée.</p>
        <ul>
          <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
          <li><strong>Nombre de produits:</strong> ${quantiteProduits}</li>
          <li><strong>Service:</strong> ${serviceReception}</li>
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
    }

    return res.status(201).json(newReception);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

const addDeliveryType = async (req, res) => {
  try {
    const {
      typeLivraison,
      user_id,
    } = req.body

    let existingType = await prisma.type_livraison_commerciale.findFirst({
      where: {
        nom_type_livraison: typeLivraison
      }
    })
    if (existingType) {
      console.log("Type de livraison déjà existant")
      return res.status(400).json({ message: "Type de livraison déjà existant" });
    }
    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });
    if (!utilisateur) {
      console.log("Utilisateur non trouvé")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    let nomUser = utilisateur.fullname

    const nouveauTypeLivraison = await prisma.type_livraison_commerciale.create({
      data: {
        nom_type_livraison: typeLivraison,
        created_by: nomUser,
      }
    })

    res.status(201).json({
      message: "Type de livraison enregistrée avec succès",
      type_livraison_commerciale: nouveauTypeLivraison
    });
  } catch (error) {
    console.log("Erreur lors de la création :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
}

const getOneTypeLivraison = async (req, res) => {
  const { id } = req.params;
  try {
    const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: parseInt(id)
      }
    })
    if (!typeLivraison) {
      console.log("Type Livraison introuvable")
      return res.status(404).json({ message: "Type Livraison introuvable" });
    }

    res.status(200).json(typeLivraison);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
}

const updateTypeLivraison = async (req, res) => {
  const { id } = req.params;
  const {
    typeLivraison,
    user_id,
  } = req.body

  try {
    let existingType = await prisma.type_livraison_commerciale.findFirst({
      where: {
        nom_type_livraison: typeLivraison
      }
    })
    if (existingType) {
      console.log("Type de livraison déjà existant")
      return res.status(400).json({ message: "Type de livraison déjà existant" });
    }
    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });
    if (!utilisateur) {
      console.log("Utilisateur non trouvé")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    let nomUser = utilisateur.fullname

    const dataToUpdate = {
      nom_type_livraison: typeLivraison,
      created_by: nomUser,
      user_id: parseInt(user_id),
    }

    const updatedType = await prisma.type_livraison_commerciale.update({
      where: {
        id_type_livraison: parseInt(id)
      },
      data: dataToUpdate
    })

    return res.status(200).json(updatedType);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

const deleteTypeLivraison = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_id
    } = req.body

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });
    if (!utilisateur) {
      console.log("Utilisateur non trouvé")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    let nomUser = utilisateur.fullname

    dataToUpdate = {
      created_by: nomUser,
      user_id: parseInt(user_id),
      is_deleted: true,
    }

    const updatedType = await prisma.type_livraison_commerciale.update({
      where: {
        id_type_livraison: parseInt(id)
      },
      data: dataToUpdate
    })

    return res.status(200).json(updatedType);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

const updateDeliveryStock = async (req, res) => {
  const { id } = req.params;
  const {
    commentaire,
    type_livraison_id,
    user_id,
    role_reception,
    quantite,
    service_reception,
    otherFields,
  } = req.body;

  try {

    let utilisateur = null;

    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    })

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    let nomLivreur = utilisateur.fullname

    const autres = typeof otherFields === "string"
      ? JSON.parse(otherFields)
      : otherFields

    // Données à mettre à jour
    const dataToUpdate = {
      user_id: utilisateur ? utilisateur.id_user : null,
      quantite_livraison: parseInt(quantite),
      nom_livreur: nomLivreur ? nomLivreur : null,
      commentaire_livraison: commentaire,
      type: "livraison_piece",
      statut_livraison: "en_cours",
      role_id: role_reception ? parseInt(role_reception) : null,
      service_id: service_reception ? parseInt(service_reception) : null,
      date_livraison: new Date(),
      autres_champs_livraison: JSON.stringify(autres),
    };

    // Mise à jour de la livraison
    const updated = await prisma.livraison_piece.update({
      where: { demande_id: parseInt(id) },
      data: {
        Livraisons: {
          update: {
            data: dataToUpdate,
          }
        }
      },
      include: {
        Livraisons: true
      }
    });


    // *********** GESTION DES MAILS ************

    const piece = await prisma.stock_dt.findUnique({
      where: {
        id_piece: parseInt(type_livraison_id)
      }
    });

    const service = await prisma.services.findUnique({
      where: {
        id: parseInt(service_reception)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_reception)
      },
      include: {
        users: true
      }
    })

    const userRole = await prisma.user_roles.findMany({
      where: {
        role_id: 12
      },
      include: {
        users: true
      }
    })
    let recepteurs = userRole.map(us => us.users)
    const service_users = userService.map(us => us.users)

    let livraisonTypeName = piece.nom_piece.toUpperCase();
    let serviceReception = service.nom_service.toUpperCase();
    let quantiteProduits = quantite
    let commentaire_mail = commentaire ? commentaire : "(Sans commentaire)"

    const url = GENERAL_URL
    const deliveryLink = `${url}/demande-details/${updated.demande_id}`;

    if ((recepteurs && recepteurs.length > 0) || (service_users && service_users.length > 0)) {
      const subject = `NOUVELLE LIVRAISON ${livraisonTypeName}`;
      const html = `
        <p>Bonjour,</p>
        <p>La livraison ${updated.id} a été modifiée.</p>
        <ul>
          <li><strong>Type de livraison:</strong> ${livraisonTypeName}</li>
          <li><strong>Nombre de produits:</strong> ${quantiteProduits}</li>
          <li><strong>Service:</strong> ${serviceReception}</li>
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

      for (const recepteur of recepteurs) {
        await sendMail({
          to: recepteur.email,
          subject,
          html,
        });
      }
      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

const generateLivraisonPDF = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await prisma.livraison.findUnique({
      where: { id_livraison: parseInt(id) },
      include: {
        validations: true,
      }
    });

    console.log(data)

    if (!data) return res.status(404).json({ message: "Livraison introuvable" });
    if (data.validations.length < 1) return res.status(400).json({ message: "Aucune validation trouvée" });

    const livraison = {
      ...data,
      produitsLivre: typeof data.produitsLivre === "string"
        ? JSON.parse(data.produitsLivre)
        : data.produitsLivre
    };

    // 🔎 Récupération de l'agent qui a fait la livraison (si user_id défini)
    let expediteurNom = "N/A";
    // console.log(livraison)
    if (livraison.nom_livreur) {
      expediteurNom = livraison.nom_livreur;
    } else if (livraison.user_id) {
      const user = await prisma.users.findUnique({
        where: { id_user: livraison.user_id }
      });
      if (user) {
        expediteurNom = user.fullname;
      }
    }

    // 🗺️ Sélection du template
    const templatesMap = {
      0: "livraison_base.html",
      1: "livraison_tpe_gim.html",
      2: "livraison_tpe_repare.html",
      3: "livraison_mj_gim.html",
      4: "livraison_tpe_mobile.html",
      5: "livraison_chargeur_tpe.html",
      6: "livraison_tpe_ecobank.html",
      7: "livraison_chargeur_tpe.html",
      8: "livraison_chargeur_decom.html",
    };

    const templateFile = templatesMap[0];
    // if (!templateFile) return res.status(400).json({ message: "Type de livraison inconnu" });

    const filePath = path.join(__dirname, "../../statics/templates/", templateFile);
    let html = fs.readFileSync(filePath, "utf8");

    // 🧱 Construction du tableau
    const produitsRows = livraison.produitsLivre.map((p, index) => {
      let row = "";
      const has = (m) => p.mobile_money?.includes(m) ? "✔" : "";
      row = `<tr><td>${p.pointMarchand || p.marchand}</td><td>${p.serialNumber || p.sn}</td><td>${p.caisse}</td><td>${p.banque}</td><td>${has("OM")}</td><td>${has("MTN")}</td><td>${has("MOOV")}</td><td>${has("RNE")}</td></tr>`;
      // ➕ Ajout du saut de page toutes les 20 lignes
      if ((index + 1) % 20 === 0) {
        row += `<tr class="page-break"></tr>`;
      }

      return row;
    }).join("\n");

    const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
      where: {
        id_type_livraison: livraison.type_livraison_id
      }
    })

    // console.log(livraison.validations[0].signature)
    // 🧩 Remplacement des balises HTML
    let index = livraison.validations.length - 1
    html = html
      .replaceAll("{{type_livraison}}", typeLivraison.nom_type_livraison.toUpperCase())
      .replace("{{commentaire}}", livraison.commentaire || "")
      .replace("{{commentaire_reception}}", livraison.validations[index].commentaire)
      .replace("{{date_livraison}}", formatDate(livraison.date_livraison))
      .replace("{{qte_totale_livraison}}", livraison.qte_totale_livraison || livraison.produitsLivre.length)
      .replace("{{nom_expediteur}}", expediteurNom)
      .replace("{{nom_recepteur}}", livraison.validations[index].nom_recepteur || "Receveur")
      .replace("{{produitsRows}}", produitsRows)
      .replace("{{signature}}", livraison.validations[index].signature || "Validé")
      .replace("{{date_validation}}", livraison.validations[index].date_validation ? formatDate(livraison.validations[index].date_validation) : "N/A")
      .replace("{{signature_expediteur}}", livraison.signature_expediteur || "Signé")
      .replace(/(\.title_type\s*\{)([\s\S]*?)(\})/gi, (match, open, content, close) => {
        let newContent = " background-color: white; color: black;";
        switch (livraison.type_livraison_id) {
          case 1:
            newContent = " background-color: #cda5f5; color: #ffff;"
            break;
          case 2:
            newContent = " background-color: #ee6060; color: #ffff;"
            break;
          case 3:
            newContent = " background-color: #a476d2; color: #ffff;"
            break;
          case 4:
            newContent = " background-color: #77ef83; color: #ffff;"
            break;
          case 5:
            newContent = " background-color: #eaee7f; color: #ffff;"
            break;
          case 6:
            newContent = " background-color: #80d8e6; color: #ffff;"
            break;
          default:
            newContent = " background-color: white; color: black;"
        }
        return open + newContent + close;
      })

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
      "Content-Disposition": `attachment; filename=livraison_${livraison.id_livraison}.pdf`
    });

    return res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la génération du PDF" });
  }
};

const generateTotalLivraisonPDF = async (req, res) => {
  const { listId } = req.body
  const zip = new JSZip();

  for (const id of listId) {
    try {
      livraison_data = await prisma.livraison.findUnique({
        where: {
          id_livraison: parseInt(id)
        },
        include: {
          validations: true,
        }
      })

      if (!livraison_data || livraison_data.validations.length < 1 || livraison_data.statut_livraison != 'livre') continue;

      const livraison = {
        ...livraison_data,
        produitsLivre: typeof livraison_data.produitsLivre === "string"
          ? JSON.parse(livraison_data.produitsLivre)
          : livraison_data.produitsLivre
      };

      let expediteurNom = livraison.nom_livreur || "N/A";
      if (!livraison.nom_livreur && livraison.user_id) {
        const user = await prisma.users.findUnique({
          where: { id_user: livraison.user_id },
        });
        if (user) expediteurNom = user.fullname;
      }

      const templateFile = "livraison_base.html";

      const filePath = path.join(__dirname, "../../statics/templates/", templateFile);
      let html = fs.readFileSync(filePath, "utf8");

      // 🧱 Construction du tableau
      const produitsRows = livraison.produitsLivre.map((p, index) => {
        let row = "";
        const has = (m) => p.mobile_money?.includes(m) ? "✔" : "";
        row = `<tr><td>${p.pointMarchand || p.marchand}</td><td>${p.serialNumber || p.sn}</td><td>${p.caisse}</td><td>${p.banque}</td><td>${has("OM")}</td><td>${has("MTN")}</td><td>${has("MOOV")}</td></tr>`;

        // ➕ Ajout du saut de page toutes les 20 lignes
        if ((index + 1) % 20 === 0) {
          row += `<tr class="page-break"></tr>`;
        }

        return row;
      }).join("\n");

      const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
        where: {
          id_type_livraison: livraison.type_livraison_id
        }
      })

      // console.log(livraison.validations[0].signature)
      // 🧩 Remplacement des balises HTML
      let index = livraison.validations.length - 1
      html = html
        .replaceAll("{{type_livraison}}", typeLivraison.nom_type_livraison.toUpperCase())
        .replace("{{commentaire}}", livraison.commentaire || "")
        .replace("{{commentaire_reception}}", livraison.validations[index].commentaire)
        .replace("{{date_livraison}}", formatDate(livraison.date_livraison))
        .replace("{{qte_totale_livraison}}", livraison.qte_totale_livraison || livraison.produitsLivre.length)
        .replace("{{nom_expediteur}}", expediteurNom)
        .replace("{{nom_recepteur}}", livraison.validations[index].nom_recepteur || "Receveur")
        .replace("{{produitsRows}}", produitsRows)
        .replace("{{signature}}", livraison.validations[index].signature || "Validé")
        .replace("{{date_validation}}", livraison.validations[index].date_validation ? formatDate(livraison.validations[index].date_validation) : "N/A")
        .replace("{{signature_expediteur}}", livraison.signature_expediteur || "Signé")
        .replace(/(\.title_type\s*\{)([\s\S]*?)(\})/gi, (match, open, content, close) => {
          let newContent = " background-color: white; color: black;";
          switch (livraison.type_livraison_id) {
            case 1:
              newContent = " background-color: #cda5f5; color: #ffff;"
              break;
            case 2:
              newContent = " background-color: #ee6060; color: #ffff;"
              break;
            case 3:
              newContent = " background-color: #a476d2; color: #ffff;"
              break;
            case 4:
              newContent = " background-color: #77ef83; color: #ffff;"
              break;
            case 5:
              newContent = " background-color: #eaee7f; color: #ffff;"
              break;
            case 6:
              newContent = " background-color: #80d8e6; color: #ffff;"
              break;
            default:
              newContent = " background-color: white; color: black;"
          }
          return open + newContent + close;
        })

      // 🖨️ Génération PDF
      const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
      });

      await browser.close();
      const date_text = new Date(livraison.validations[index].date_validation).toISOString().replace(/[:.]/g, "-")

      zip.file(`livraison_${livraison.id_livraison}_${typeLivraison.nom_type_livraison.toUpperCase()}_${date_text}.pdf`, pdfBuffer);

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erreur lors de la génération du PDF" });
    }
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const zipName = `livraisons_${timestamp}.zip`;

  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename=${zipName}`,
  });

  return res.send(zipBuffer);
}

const getAllTypeParametrage = async (req, res) => {
  try {
    const typeParametrage = await prisma.type_parametrage.findMany({
      orderBy: { id: 'asc' },
    });

    res.status(200).json(typeParametrage);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des types de paramétrage", error });
  }
}

const makeRemplacement = async (req, res) => {
  try {
    const {
      commentaire,
      user_id,
      detailsRemplacement,
      service_recepteur,
      role_recepteur,
      ancien_model,
      nouveau_model,
      detailsParametrage,
    } = req.body;

    const produits = typeof detailsRemplacement === "string"
      ? JSON.parse(detailsRemplacement)
      : detailsRemplacement;

    let utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });

    const detailsParams = typeof detailsParametrage === "string"
      ? JSON.parse(detailsParametrage)
      : detailsParametrage;

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    // Gestion de l'upload Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
      folder: "greenpay/signatures",
    });
    const signature_expediteur = uploadResult.secure_url;

    if (!signature_expediteur) {
      console.error("Vous devez fournir la signature (cloudinary) !")
      return res.status(400).json({ message: "Vous devez fournir une signature d'expéditeur." });
    }

    const dateAction = new Date()

    const remplacement = await prisma.$transaction(async (tx) => {
      const remplacementForm = await tx.forms.create({
        data: {
          type: 'remplacement_sn',
          created_at: dateAction,
          created_by: utilisateur.id_user,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
        }
      })
      const nouveauRemplacement = await tx.remplacements.create({
        data: {
          quantite: produits.length,
          details_remplacement: JSON.stringify(produits),
          commentaire,
          date_remplacement: dateAction,
          user_id: utilisateur ? utilisateur.id_user : null,
          old_model_id: parseInt(ancien_model),
          new_model_id: parseInt(nouveau_model),
          service_id: parseInt(service_recepteur),
          role_id: role_recepteur ? parseInt(role_recepteur) : null,
          deleted: false,
          nom_livreur: utilisateur.fullname || null,
          signature_expediteur: signature_expediteur || null,
          details_parametrage: JSON.stringify(detailsParams),
          statut: "en_cours",
          form_id: remplacementForm.id,
        }
      });

      await tx.form_signatures.create({
        data: {
          form_id: remplacementForm.id,
          signature_url: signature.path,
          signed_by: utilisateur.id_user,
          signed_at: dateAction,
          role: 'livreur',
        },
      })

      /*******************     GESTION PARC TPE     *******************/

      let allTpes = null
      let allOldTpes = null

      // Récupérer les SN de la liste
      const serials = produits.map(item => item.nouvelSN);
      const oldSerials = produits.map(item => item.ancienSN);

      /**NOUVEAU TPE**/

      // 1. Create only missing ones
      await tx.parc_tpe.createMany({
        data: serials.map(item => ({
          serial_number: item,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 7,
        })),
        skipDuplicates: true
      });

      // 2. Update ALL (existing + newly created)
      await tx.parc_tpe.updateMany({
        where: {
          serial_number: { in: serials }
        },
        data: {
          updated_by: utilisateur.id_user,
          updated_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 7,
        }
      });

      // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
      allTpes = await tx.parc_tpe.findMany({
        where: {
          serial_number: { in: serials }
        },
        select: {
          id: true,
          serial_number: true
        }
      });

      // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
      await tx.history_tpe.createMany({
        data: allTpes.map(tpe => ({
          id_tpe: tpe.id,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          statut_id: 7,
          form_id: remplacementForm.id,
        }))
      });


      /**ANCIEN SN**/

      // 1. Create only missing ones
      await tx.parc_tpe.createMany({
        data: oldSerials.map(item => ({
          serial_number: item,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 3,
        })),
        skipDuplicates: true
      });

      // 2. Update ALL (existing + newly created)
      await tx.parc_tpe.updateMany({
        where: {
          serial_number: { in: oldSerials }
        },
        data: {
          updated_by: utilisateur.id_user,
          updated_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 3,
        }
      });

      // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
      allOldTpes = await tx.parc_tpe.findMany({
        where: {
          serial_number: { in: oldSerials }
        },
        select: {
          id: true,
          serial_number: true
        }
      });

      // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
      await tx.history_tpe.createMany({
        data: allOldTpes.map(tpe => ({
          id_tpe: tpe.id,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          statut_id: 3,
          form_id: remplacementForm.id,
        }))
      });

      return {
        remplacementForm,
        nouveauRemplacement,
        allTpes,
        allOldTpes,
      }
    })

    /******************************** GESTION DES MAILS  ***********************************/

    const ancienModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(ancien_model)
      }
    })
    const nouveModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(nouveau_model)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_recepteur)
      },
      include: {
        users: true
      }
    })

    let recepteurs
    if (role_recepteur) {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: parseInt(role_recepteur)
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    } else {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: 2
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    }

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const superviseurs = supervisionRole.map(us => us.users)

    const url = GENERAL_URL
    let deliveryLink = `${url}/remplacement-details/${remplacement.nouveauRemplacement.id}`;


    const commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    if ((service_users && service_users.length > 0) || (recepteurs && recepteurs.length > 0)) {
      const subject = `NOUVEAU REMPLACEMENT TPE`;
      const html = `
        <p>Bonjour,</p>
        <p>Un nouveau remplacement a été enregistré.</p>
        <ul>
          <li><strong>Ancien model TPE:</strong> ${ancienModel.nom_model.toUpperCase()}</li>
          <li><strong>Nouveau model TPE:</strong> ${nouveModel.nom_model.toUpperCase()}</li>
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

      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
      for (const recepteur of recepteurs) {
        await sendMail({
          to: recepteur.email,
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

    res.status(201).json({
      message: "Remplacement enregistré avec succès",
      data: remplacement,
    });

  } catch (error) {
    console.error("Erreur lors de la livraison :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
}

const getAllRemplacements = async (req, res) => {
  try {
    const remplacements = await prisma.remplacements.findMany({
      where: { deleted: false },
      orderBy: { date_remplacement: 'desc' },
      include: {
        forms: true,
        validation_remplacement: {
          include: {
            forms: true,
          },
        },
      },
    });

    res.status(200).json(remplacements);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des remplacements", error });
  }
}

const getOneRemplacement = async (req, res) => {
  const { id } = req.params;

  try {
    const remplacement = await prisma.remplacements.findUnique({
      where: { id: parseInt(id) },
      include: {
        forms: true,
        validation_remplacement: {
          include: {
            forms: true,
          },
        },
      }
    });

    if (!remplacement || remplacement.deleted) {
      return res.status(404).json({ message: "Remplacement introuvable" });
    }

    res.status(200).json(remplacement);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
}

const validateRemplacement = async (req, res) => {
  const {
    remplacement_id,
    commentaire,
    user_id,
    date_validation,
  } = req.body;

  try {
    const remplacement = await prisma.remplacements.findUnique({
      where: { id: parseInt(remplacement_id) },
    });

    if (!remplacement) {
      console.error("Remplacement non trouvé !")
      return res.status(404).json({ message: "Remplacement introuvable." });
    }

    if (remplacement.statut_livraison === "livre") {
      console.error("Remplacement déjà validé !")
      return res.status(400).json({ message: "Remplacement déjà validée." });
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
      console.error("Utilisateur non authentifié !")
      return res.status(403).json({ message: "Utilisateur non authentifié." });
    }

    const user = await prisma.users.findUnique({
      where: { id_user: parseInt(user_id) },
    });

    if (!user) {
      console.error("Utilisateur non trouvé !")
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    let isReg = false
    let dateAction = new Date()
    const dateVer = new Date(date_validation)
    if (!isNaN(dateVer.valueOf())) {
      dateAction = new Date(date_validation)
      isReg = true
    }

    const validationRemplacement = await prisma.$transaction(async (tx) => {
      const validationForm = await tx.forms.create({
        data: {
          type: 'reception_remplacement',
          created_at: dateAction,
          created_by: user.id_user,
          last_modified_at: dateAction,
          is_reg: isReg,
          commentaire,
        },
      });
      const newValidation = await tx.validation_remplacement.create({
        data: {
          remplacement_id: parseInt(remplacement_id),
          date_validation: dateAction,
          user_id: user_id ? parseInt(user_id) : null,
          commentaire,
          nom_recepteur: user.fullname,
          signature: signatureCloud,
          form_id: validationForm.id,
        },
      });

      await tx.remplacements.update({
        where: { id: parseInt(remplacement_id) },
        data: { statut: "livre" },
      });

      await tx.form_signatures.create({
        data: {
          form_id: validationForm.id,
          signature_url: signature.path,
          signed_by: user.id_user,
          signed_at: dateAction,
          role: 'receveur',
        },
      })

      return {
        validationForm,
        newValidation,
      }

    })

    /******************************* GESTION DES MAILS  *******************************/

    const ancienModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(remplacement.old_model_id)
      }
    })
    const nouveModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(remplacement.new_model_id)
      }
    })

    let produitsLivre = remplacement.details_remplacement

    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

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
    let deliveryLink = `${url}/remplacement-details/${remplacement.id}`;
    let commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    const sendMail = require("../../utils/emailSender");

    if ((livreurs && livreurs.length > 0) || (superviseurs && superviseurs.length)) {
      const subject = `VALIDATION REMPLACEMENT TPE`;
      const html = `
        <p>Bonjour,</p>
        <p>Le remplacement ${remplacement.id} a été validé.</p>
        <ul>
          <li><strong>Ancien model TPE:</strong> ${ancienModel.nom_model.toUpperCase()}</li>
          <li><strong>Nouveau model TPE:</strong> ${nouveModel.nom_model.toUpperCase()}</li>
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

    console.log("Remplacement validé avec succès !")
    return res.status(201).json({
      message: "Remplacement validé avec succès.",
      data: validationRemplacement,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

const generateDeliveriesXLSX = async (req, res) => {
  const { listId } = req.body

  try {

    const workbook = new ExcelJS.Workbook();

    const resumeSheet = workbook.addWorksheet("Résumé");

    const resumeHeaders = [
      "ID Livraison",
      "Type Livraison",
      "Model",
      "Date Livraison",
      "Quantité produits",
      "Date Réception",
      "Nom Livreur",
      "Commentaire Livraison",
      "Nom Récepteur",
      "Commentaire Réception",
    ]
    const headerRow = resumeSheet.addRow(resumeHeaders);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const allDetailSheet = workbook.addWorksheet("Détails")
    const allDetailHeader = [
      "ID Livraison",
      "Point Marchand",
      "Caisse",
      "S/N",
      "Banque",
      "OM",
      "MTN",
      "MOOV",
      "RNE",
      "Commentaire TPE",
      "Model",
      "Type livraison",
      "Date Livraison",
      "Livraison",
      "Réception",
    ]

    const allDetailRow = allDetailSheet.addRow(allDetailHeader)

    allDetailRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    for (const id of listId) {
      const livraison_data = await prisma.livraison.findUnique({
        where: {
          id_livraison: parseInt(id)
        },
        include: {
          validations: true,
        }
      })

      if (!livraison_data || livraison_data.validations.length < 1 || livraison_data.statut_livraison != 'livre') continue;

      const livraison = {
        ...livraison_data,
        produitsLivre: typeof livraison_data.produitsLivre === "string"
          ? JSON.parse(livraison_data.produitsLivre)
          : livraison_data.produitsLivre
      };

      let expediteurNom = livraison.nom_livreur || "N/A";
      if (!livraison.nom_livreur && livraison.user_id) {
        const user = await prisma.users.findUnique({
          where: { id_user: livraison.user_id },
        });
        if (user) expediteurNom = user.fullname;
      }

      const index = livraison.validations.length - 1;

      const recepteurNom = livraison.validations[index]?.nom_recepteur || "Réception";

      const typeLivraison = await prisma.type_livraison_commerciale.findUnique({
        where: {
          id_type_livraison: livraison.type_livraison_id
        }
      })

      let typeModel = null
      if (livraison.model_id) {
        typeModel = await prisma.model_piece.findUnique({
          where: {
            id_model: livraison.model_id
          }
        })
      }

      resumeSheet.addRow([
        livraison.id_livraison,
        typeLivraison.nom_type_livraison.toUpperCase(),
        typeModel ? typeModel.nom_model.toUpperCase() : 'N/A',
        livraison.date_livraison,
        livraison.qte_totale_livraison,
        livraison.validations[index]?.date_validation,
        expediteurNom,
        livraison.commentaire,
        recepteurNom,
        livraison.validations[index]?.commentaire,
      ])

      livraison.produitsLivre.forEach((p) => {
        const has = (m) => (p.mobile_money?.includes(m) ? "OUI" : "");
        allDetailSheet.addRow([
          livraison.id_livraison,
          p.pointMarchand,
          p.caisse,
          p.serialNumber,
          p.banque || "",
          has("OM"),
          has("MTN"),
          has("MOOV"),
          has("RNE"),
          p.commentaireTPE,
          typeModel ? typeModel.nom_model.toUpperCase() : 'N/A',
          typeLivraison.nom_type_livraison.toUpperCase(),
          livraison.validations[index]?.date_validation,
          livraison.nom_livreur,
          livraison.validations[index]?.nom_recepteur,
        ])
      })

      const detailSheet = workbook.addWorksheet(`Livraison_${livraison.id_livraison}`)

      const title = `${typeLivraison.nom_type_livraison.toUpperCase()}(${livraison.id_livraison}) DU ${formatDate(livraison.validations[index]?.date_validation)}  `
      detailSheet.mergeCells("A1:H1")
      const titleCell = detailSheet.getCell("A1");
      titleCell.value = title;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };

      const detailHeaders = [
        "Point Marchand",
        "Caisse",
        "S/N",
        "Banque",
        "OM",
        "MTN",
        "MOOV",
        "RNE",
        "Commentaire TPE",
      ]

      const detailHeaderRow = detailSheet.addRow(detailHeaders)
      detailHeaderRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      livraison.produitsLivre.forEach((p) => {
        const has = (m) => (p.mobile_money?.includes(m) ? "OUI" : "");
        detailSheet.addRow([
          p.pointMarchand,
          p.caisse,
          p.serialNumber,
          p.banque || "",
          has("OM"),
          has("MTN"),
          has("MOOV"),
          has("RNE"),
          p.commentaireTPE,
        ])
      })
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `livraisons_${timestamp}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(buffer);

  } catch (err) {
    console.error("Erreur XLSX:", err);
    res.status(500).json({ message: "Erreur lors de la génération du XLSX" });
  }
}

const generateRemplacementsXLSX = async (req, res) => {
  const { listId } = req.body

  try {

    const workbook = new ExcelJS.Workbook();

    const resumeSheet = workbook.addWorksheet("Résumé");

    const parametrages = await prisma.type_parametrage.findMany({
      orderBy: {
        id: 'asc'
      }
    })
    const listParams = parametrages.map((item) => {
      return item.nom_parametrage.toUpperCase()
    })
    const resumeHeaders = [
      "ID",
      "Model TPE remplacé",
      "Model TPE remplaçant",
      "Date Livraison",
      "Quantité produits",
      "Date Réception",
      "Nom Livreur",
      "Commentaire Livraison",
      "Nom Récepteur",
      "Commentaire Réception",
    ]
    const finalHeaders = [...resumeHeaders, ...listParams];

    const headerRow = resumeSheet.addRow(finalHeaders);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const allDetailSheet = workbook.addWorksheet("Détails")
    const allDetailHeader = [
      "ID remplacement",
      "Point Marchand",
      "Caisse",
      "Ancien S/N",
      "Model remplacé",
      "Nouvel S/N",
      "Model remplaçant",
      "Banque",
      "OM",
      "MTN",
      "MOOV",
      "RNE",
      "Commentaire TPE",
      "Date Livraison",
      "Livraison",
      "Réception",
    ]

    const allDetailRow = allDetailSheet.addRow(allDetailHeader)

    allDetailRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    for (const id of listId) {
      const livraison_data = await prisma.remplacements.findUnique({
        where: {
          id: parseInt(id)
        },
        include: {
          validation_remplacement: true,
        }
      })

      if (!livraison_data || livraison_data.validation_remplacement.length < 1 || livraison_data.statut != 'livre') continue;

      const livraison = {
        ...livraison_data,
        details_remplacement: typeof livraison_data.details_remplacement === "string"
          ? JSON.parse(livraison_data.details_remplacement)
          : livraison_data.details_remplacement,
        details_parametrage: typeof livraison_data.details_parametrage === "string"
          ? JSON.parse(livraison_data.details_parametrage)
          : livraison_data.details_parametrage,
      };

      let expediteurNom = livraison.nom_livreur || "N/A";
      if (!livraison.nom_livreur && livraison.user_id) {
        const user = await prisma.users.findUnique({
          where: { id_user: livraison.user_id },
        });
        if (user) expediteurNom = user.fullname;
      }

      const index = livraison.validation_remplacement.length - 1;

      const recepteurNom = livraison.validation_remplacement[index]?.nom_recepteur || "Réception";

      const oldModel = await prisma.model_piece.findUnique({
        where: {
          id_model: livraison.old_model_id
        }
      })

      const newModel = await prisma.model_piece.findUnique({
        where: {
          id_model: livraison.new_model_id
        }
      })

      resumeSheet.addRow([
        livraison.id,
        oldModel ? oldModel.nom_model.toUpperCase() : 'N/A',
        newModel ? newModel.nom_model.toUpperCase() : 'N/A',
        livraison.date_remplacement,
        livraison.quantite,
        livraison.validation_remplacement[index]?.date_validation,
        expediteurNom,
        livraison.commentaire,
        recepteurNom,
        livraison.validation_remplacement[index]?.commentaire,
        ...livraison.details_parametrage.map((param) => param.quantite),
      ])

      livraison.details_remplacement.forEach((p) => {
        const has = (m) => (p.mobile_money?.includes(m) ? "OUI" : "");
        allDetailSheet.addRow([
          livraison.id,
          p.pointMarchand,
          p.caisse,
          p.ancienSN,
          oldModel ? oldModel.nom_model.toUpperCase() : 'N/A',
          p.nouvelSN,
          newModel ? newModel.nom_model.toUpperCase() : 'N/A',
          p.banque || "",
          has("OM"),
          has("MTN"),
          has("MOOV"),
          has("RNE"),
          p.commentaireTPE,
          livraison.validation_remplacement[index]?.date_validation,
          livraison.nom_livreur,
          livraison.validation_remplacement[index]?.nom_recepteur,
        ])
      })

      const detailSheet = workbook.addWorksheet(`Remplacement_${livraison.id}`)

      const title = `Remplacement(${livraison.id}) TPE ${oldModel.nom_model.toUpperCase()} pour ${newModel.nom_model.toUpperCase()} DU ${formatDate(livraison.validation_remplacement[index]?.date_validation)}`
      detailSheet.mergeCells("A1:J1")
      const titleCell = detailSheet.getCell("A1");
      titleCell.value = title;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };

      const detailHeaders = [
        "Point Marchand",
        "Caisse",
        "Ancien S/N",
        "Nouvel S/N",
        "Parametrage",
        "Banque",
        "OM",
        "MTN",
        "MOOV",
        "RNE",
        "Commentaire TPE",
      ]

      const detailHeaderRow = detailSheet.addRow(detailHeaders)
      detailHeaderRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      livraison.details_remplacement.forEach((p) => {
        const has = (m) => (p.mobile_money?.includes(m) ? "OUI" : "");
        detailSheet.addRow([
          p.pointMarchand,
          p.caisse,
          p.ancienSN,
          p.nouvelSN,
          p.parametrageTPE,
          p.banque || "",
          has("OM"),
          has("MTN"),
          has("MOOV"),
          has("RNE"),
          p.commentaireTPE,
        ])
      })
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `remplacements_${timestamp}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(buffer);

  } catch (err) {
    console.error("Erreur XLSX:", err);
    res.status(500).json({ message: "Erreur lors de la génération du XLSX" });
  }
}

const updateRemplacement = async (req, res) => {
  try {
    const { id } = req.params
    const {
      commentaire,
      user_id,
      detailsRemplacement,
      service_recepteur,
      role_recepteur,
      ancien_model,
      nouveau_model,
      detailsParametrage,
    } = req.body;

    const produits = typeof detailsRemplacement === "string"
      ? JSON.parse(detailsRemplacement)
      : detailsRemplacement;

    let utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });

    const detailsParams = typeof detailsParametrage === "string"
      ? JSON.parse(detailsParametrage)
      : detailsParametrage;

    if (!utilisateur) {
      console.error("Utilisateur non trouvé !")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const remplacement = await prisma.remplacements.findUnique({
      where: {
        id: parseInt(id)
      }
    });

    if (!remplacement) {
      console.error("Remplacement non trouvé !")
      return res.status(404).json({ message: "Remplacement introuvable." });
    }

    if (remplacement.statut === "livre") {
      console.error("Remplacement déjà validé !")
      return res.status(400).json({ message: "Remplacement déjà validée." });
    }

    const dateAction = new Date();

    const newRemplacement = await prisma.$transaction(async (tx) => {

      const remplacementForm = await tx.forms.update({
        where: {
          id: remplacement.form_id
        },
        data: {
          last_modified_at: dateAction,
          updated_at: dateAction,
          updated_by: utilisateur.id_user,
          commentaire,
          nom_user: utilisateur.fullname,
        }
      })

      const nouveauRemplacement = await tx.remplacements.update({
        where: {
          id: parseInt(id)
        },
        data: {
          quantite: produits.length,
          details_remplacement: JSON.stringify(produits),
          commentaire,
          date_remplacement: dateAction,
          user_id: utilisateur ? utilisateur.id_user : null,
          old_model_id: parseInt(ancien_model),
          new_model_id: parseInt(nouveau_model),
          service_id: parseInt(service_recepteur),
          role_id: role_recepteur ? parseInt(role_recepteur) : null,
          deleted: false,
          nom_livreur: utilisateur.fullname || null,
          details_parametrage: JSON.stringify(detailsParams),
          statut: "en_cours",
          form_id: remplacementForm.id,
        },

      })

      /*******************     GESTION PARC TPE     *******************/

      let allTpes = null
      let allOldTpes = null

      // Récupérer les SN de la liste
      const serials = produits.map(item => item.nouvelSN);
      const oldSerials = produits.map(item => item.ancienSN);

      /**NOUVEAU TPE**/

      // 1. Create only missing ones
      await tx.parc_tpe.createMany({
        data: serials.map(item => ({
          serial_number: item,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 7,
        })),
        skipDuplicates: true
      });

      // 2. Update ALL (existing + newly created)
      await tx.parc_tpe.updateMany({
        where: {
          serial_number: { in: serials }
        },
        data: {
          updated_by: utilisateur.id_user,
          updated_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 7,
        }
      });

      // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
      allTpes = await tx.parc_tpe.findMany({
        where: {
          serial_number: { in: serials }
        },
        select: {
          id: true,
          serial_number: true
        }
      });

      // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
      await tx.history_tpe.createMany({
        data: allTpes.map(tpe => ({
          id_tpe: tpe.id,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          statut_id: 7,
          form_id: remplacementForm.id,
        }))
      });

      /**ANCIEN SN**/

      // 1. Create only missing ones
      await tx.parc_tpe.createMany({
        data: oldSerials.map(item => ({
          serial_number: item,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 3,
        })),
        skipDuplicates: true
      });

      // 2. Update ALL (existing + newly created)
      await tx.parc_tpe.updateMany({
        where: {
          serial_number: { in: oldSerials }
        },
        data: {
          updated_by: utilisateur.id_user,
          updated_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 3,
        }
      });

      // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
      allOldTpes = await tx.parc_tpe.findMany({
        where: {
          serial_number: { in: oldSerials }
        },
        select: {
          id: true,
          serial_number: true
        }
      });

      // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
      await tx.history_tpe.createMany({
        data: allOldTpes.map(tpe => ({
          id_tpe: tpe.id,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          statut_id: 3,
          form_id: remplacementForm.id,
        }))
      });

      return {
        remplacementForm,
        nouveauRemplacement,
        allTpes,
        allOldTpes,
      }

    })

    /******************************** GESTION DES MAILS  ***********************************/

    const ancienModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(ancien_model)
      }
    })
    const nouveModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(nouveau_model)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_recepteur)
      },
      include: {
        users: true
      }
    })

    let recepteurs
    if (role_recepteur) {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: parseInt(role_recepteur)
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    } else {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: 2
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    }

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const superviseurs = supervisionRole.map(us => us.users)

    const url = GENERAL_URL
    let deliveryLink = `${url}/remplacement-details/${newRemplacement.nouveauRemplacement.id}`;


    const commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    if ((service_users && service_users.length > 0) || (recepteurs && recepteurs.length > 0)) {
      const subject = `MODIFICATION REMPLACEMENT TPE`;
      const html = `
        <p>Bonjour,</p>
        <p>Le formulaire de remplacement ${newRemplacement.nouveauRemplacement.id} a été modifié.</p>
        <ul>
          <li><strong>Ancien model TPE:</strong> ${ancienModel.nom_model.toUpperCase()}</li>
          <li><strong>Nouveau model TPE:</strong> ${nouveModel.nom_model.toUpperCase()}</li>
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

      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
      for (const recepteur of recepteurs) {
        await sendMail({
          to: recepteur.email,
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

    console.log("Remplacement modifié avec succès")
    res.status(201).json({
      message: "Remplacement modifié avec succès",
      data: newRemplacement,
    });

  } catch (error) {
    console.error("Erreur lors de la livraison :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
}

const returnRemplacement = async (req, res) => {
  const {
    remplacement_id,
    commentaire_return,
    user_id,
  } = req.body;
  try {
    const remplacement = await prisma.remplacements.findUnique({
      where: { id: parseInt(remplacement_id) },
    });

    if (!remplacement) return res.status(404).json({ message: "Remplacement introuvable." });

    if (remplacement.statut === "livre") {
      return res.status(400).json({ message: "Remplacement déjà validé." });
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

    const newValidation = await prisma.validation_remplacement.create({
      data: {
        remplacement_id: parseInt(remplacement_id),
        commentaire: commentaire_return,
        user_id: user_id ? parseInt(user_id) : null,
        nom_recepteur: user.fullname,
        date_validation: new Date(),
        signature: 'retournée',
      },
    });

    await prisma.remplacements.update({
      where: { id: parseInt(remplacement_id) },
      data: { statut: 'en_attente' },
    });

    /******************************* GESTION DES MAILS  *******************************/

    const ancienModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(remplacement.old_model_id)
      }
    })

    const nouveModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(remplacement.new_model_id)
      }
    })

    let produitsLivre = remplacement.produitsLivre

    const produits = typeof produitsLivre === "string"
      ? JSON.parse(produitsLivre)
      : produitsLivre;

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
    let deliveryLink = `${url}/remplacement-details/${remplacement.id}`;
    let commentaire_mail = commentaire_return ? commentaire_return : '(sans commentaire)'
    const sendMail = require("../../utils/emailSender");

    if ((livreurs && livreurs.length > 0) || (superviseurs && superviseurs.length)) {
      const subject = `RETOUR DE REMPLACEMENT`;
      const html = `
        <p>Bonjour,</p>
        <p>Le remplacement ${remplacement.id} a été retourné.</p>
        <ul>
          <li><strong>Ancien model TPE:</strong> ${ancienModel.nom_model.toUpperCase()}</li>
          <li><strong>Nouveau model TPE:</strong> ${nouveModel.nom_model.toUpperCase()}</li>
          <li><strong>Nombre de produits:</strong> ${remplacement.quantite}</li>
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
}

const generateRemplacementPDF = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await prisma.remplacements.findUnique({
      where: { id: parseInt(id) },
      include: {
        validation_remplacement: true,
      }
    });

    console.log(data)

    if (!data) return res.status(404).json({ message: "Remplacement introuvable" });
    if (data.validation_remplacement.length < 1) return res.status(400).json({ message: "Aucune validation trouvée" });

    const livraison = {
      ...data,
      details_remplacement: typeof data.details_remplacement === "string"
        ? JSON.parse(data.details_remplacement)
        : data.details_remplacement
    };

    // 🔎 Récupération de l'agent qui a fait la livraison (si user_id défini)
    let expediteurNom = "N/A";
    // console.log(livraison)
    if (livraison.nom_livreur) {
      expediteurNom = livraison.nom_livreur;
    } else if (livraison.user_id) {
      const user = await prisma.users.findUnique({
        where: { id_user: livraison.user_id }
      });
      if (user) {
        expediteurNom = user.fullname;
      }
    }

    const templateFile = "remplacement_TPE.html";
    // if (!templateFile) return res.status(400).json({ message: "Type de livraison inconnu" });

    const filePath = path.join(__dirname, "../../statics/templates/", templateFile);
    let html = fs.readFileSync(filePath, "utf8");

    // 🧱 Construction du tableau
    const produitsRows = livraison.details_remplacement.map((p, index) => {
      let row = "";
      const has = (m) => p.mobile_money?.includes(m) ? "✔" : "";
      row = `<tr><td>${p.pointMarchand}</td><td>${p.ancienSN}</td><td>${p.nouvelSN}</td><td>${p.caisse}</td><td>${p.banque}</td><td>${has("OM")}</td><td>${has("MTN")}</td><td>${has("MOOV")}</td><td>${has("RNE")}</td></tr>`;

      // ➕ Ajout du saut de page toutes les 20 lignes
      if ((index + 1) % 20 === 0) {
        row += `<tr class="page-break"></tr>`;
      }

      return row;
    }).join("\n");

    const ancien_model = await prisma.model_piece.findUnique({
      where: {
        id_model: livraison.old_model_id
      }
    })

    const nouveau_model = await prisma.model_piece.findUnique({
      where: {
        id_model: livraison.new_model_id
      }
    })

    // console.log(livraison.validations[0].signature)
    // 🧩 Remplacement des balises HTML
    let index = livraison.validation_remplacement.length - 1
    html = html
      .replace("{{ancien_tpe}}", ancien_model.nom_model.toUpperCase())
      .replace("{{nouveau_tpe}}", nouveau_model.nom_model.toUpperCase())
      .replace("{{commentaire}}", livraison.commentaire || "")
      .replace("{{commentaire_reception}}", livraison.validation_remplacement[index].commentaire)
      .replace("{{date_livraison}}", formatDate(livraison.date_remplacement))
      .replace("{{qte_totale_livraison}}", livraison.quantite)
      .replace("{{nom_expediteur}}", expediteurNom)
      .replace("{{nom_recepteur}}", livraison.validation_remplacement[index].nom_recepteur || "Receveur")
      .replace("{{produitsRows}}", produitsRows)
      .replace("{{signature}}", livraison.validation_remplacement[index].signature || "Validé")
      .replace("{{date_validation}}", livraison.validation_remplacement[index].date_validation ? formatDate(livraison.validation_remplacement[index].date_validation) : "N/A")
      .replace("{{signature_expediteur}}", livraison.signature_expediteur || "Signé")

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
      "Content-Disposition": `attachment; filename=remplacement_${livraison.id}.pdf`
    });

    return res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la génération du PDF" });
  }
};
// Récupérer les livraisons d’une semaine
const getLivraisonsByWeek = async (req, res) => {
  try {
    const { week, year } = req.query;

    const startDate = startOfWeek(new Date(year, 0, 1), { weekStartsOn: 1 });
    startDate.setDate(startDate.getDate() + (week - 1) * 7);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const livraisons = await prisma.livraison.findMany({
      where: {
        date_livraison: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    res.json(livraisons);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Récupérer les statistiques globales des livraisons (en attente, livrées, retours)

const getLivraisonsInRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const livraisons = await prisma.livraison.findMany({
      where: {
        date_livraison: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        type_livraison_commerciale: true,
      },
      orderBy: {
        date_livraison: 'desc',
      },
    });

    res.json(livraisons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
// Cartes statistiques des livraisons
const getStatsLivraisons = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date('2020-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    const livraisons = await prisma.livraison.findMany({
      where: {
        deleted: false,
        date_livraison: {
          gte: start,
          lte: end
        }
      }
    });
// console.log(livraisons);
    const stats = {
      attente: livraisons.filter(l => l.statut_livraison === 'en_cours' || l.statut_livraison === 'en_attente').length,
      livrees: livraisons.filter(l => l.statut_livraison === 'livre').length,
      returns: livraisons.filter(l => l.statut_livraison === 'retour').length,
      total: livraisons.length
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ message: 'Erreur serveur stats', error: error.message });
  } finally {
    await prisma.$disconnect();
  }


}

// Fonction pour régulariser les remplacements de TPE
const regRemplacement = async (req, res) => {
  try {
    const {
      commentaire,
      user_id,
      detailsRemplacement,
      service_recepteur,
      role_recepteur,
      ancien_model,
      nouveau_model,
      detailsParametrage,
      date_livraison,
    } = req.body;

    const produits = typeof detailsRemplacement === "string"
      ? JSON.parse(detailsRemplacement)
      : detailsRemplacement;

    let utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });

    const detailsParams = typeof detailsParametrage === "string"
      ? JSON.parse(detailsParametrage)
      : detailsParametrage;

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const signature = req.files?.signature?.[0] || null;
    if (!signature) {
      console.error('Signature manquante !')
      return res.status(404).json({ message: "Signature introuvable !" });
    }

    // Gestion de l'upload Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.files?.signature?.[0].path, {
      folder: "greenpay/signatures",
    });
    const signature_expediteur = uploadResult.secure_url;

    if (!signature_expediteur) {
      console.error("Vous devez fournir la signature (cloudinary) !")
      return res.status(400).json({ message: "Vous devez fournir une signature d'expéditeur." });
    }

    const dateAction = new Date(date_livraison);

    const remplacement = await prisma.$transaction(async (tx) => {
      const remplacementForm = await tx.forms.create({
        data: {
          type: 'remplacement_sn',
          created_at: dateAction,
          created_by: utilisateur.id_user,
          last_modified_at: dateAction,
          nom_user: utilisateur.fullname,
          commentaire,
          is_reg: true,
        }
      })
      const nouveauRemplacement = await tx.remplacements.create({
        data: {
          quantite: produits.length,
          details_remplacement: JSON.stringify(produits),
          commentaire,
          date_remplacement: dateAction,
          user_id: utilisateur ? utilisateur.id_user : null,
          old_model_id: parseInt(ancien_model),
          new_model_id: parseInt(nouveau_model),
          service_id: parseInt(service_recepteur),
          role_id: role_recepteur ? parseInt(role_recepteur) : null,
          deleted: false,
          nom_livreur: utilisateur.fullname || null,
          signature_expediteur: signature_expediteur || null,
          details_parametrage: JSON.stringify(detailsParams),
          statut: "en_cours",
          form_id: remplacementForm.id,
        }
      });

      await tx.form_signatures.create({
        data: {
          form_id: remplacementForm.id,
          signature_url: signature.path,
          signed_by: utilisateur.id_user,
          signed_at: dateAction,
          role: 'livreur',
        },
      })

      /*******************     GESTION PARC TPE     *******************/

      let allTpes = null
      let allOldTpes = null

      // Récupérer les SN de la liste
      const serials = produits.map(item => item.nouvelSN);
      const oldSerials = produits.map(item => item.ancienSN);

      /**NOUVEAU TPE**/

      // 1. Create only missing ones
      await tx.parc_tpe.createMany({
        data: serials.map(item => ({
          serial_number: item,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 7,
        })),
        skipDuplicates: true
      });

      // 2. Update ALL (existing + newly created)
      await tx.parc_tpe.updateMany({
        where: {
          serial_number: { in: serials }
        },
        data: {
          updated_by: utilisateur.id_user,
          updated_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 7,
        }
      });

      // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
      allTpes = await tx.parc_tpe.findMany({
        where: {
          serial_number: { in: serials }
        },
        select: {
          id: true,
          serial_number: true
        }
      });

      // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
      await tx.history_tpe.createMany({
        data: allTpes.map(tpe => ({
          id_tpe: tpe.id,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          statut_id: 7,
          form_id: remplacementForm.id,
        }))
      });


      /**ANCIEN SN**/

      // 1. Create only missing ones
      await tx.parc_tpe.createMany({
        data: oldSerials.map(item => ({
          serial_number: item,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 3,
        })),
        skipDuplicates: true
      });

      // 2. Update ALL (existing + newly created)
      await tx.parc_tpe.updateMany({
        where: {
          serial_number: { in: oldSerials }
        },
        data: {
          updated_by: utilisateur.id_user,
          updated_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 3,
        }
      });

      // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
      allOldTpes = await tx.parc_tpe.findMany({
        where: {
          serial_number: { in: oldSerials }
        },
        select: {
          id: true,
          serial_number: true
        }
      });

      // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
      await tx.history_tpe.createMany({
        data: allOldTpes.map(tpe => ({
          id_tpe: tpe.id,
          created_by: utilisateur.id_user,
          created_at: dateAction,
          statut_id: 3,
          form_id: remplacementForm.id,
        }))
      });

      return {
        remplacementForm,
        nouveauRemplacement,
        allTpes,
        allOldTpes,
      }
    })

    /******************************** GESTION DES MAILS  ***********************************/

    const ancienModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(ancien_model)
      }
    })
    const nouveModel = await prisma.model_piece.findUnique({
      where: {
        id_model: parseInt(nouveau_model)
      }
    })

    const userService = await prisma.user_services.findMany({
      where: {
        service_id: parseInt(service_recepteur)
      },
      include: {
        users: true
      }
    })

    let recepteurs
    if (role_recepteur) {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: parseInt(role_recepteur)
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    } else {
      const userRole = await prisma.user_roles.findMany({
        where: {
          role_id: 2
        },
        include: {
          users: true
        }
      })
      recepteurs = userRole.map(us => us.users)
    }

    const supervisionRole = await prisma.user_roles.findMany({
      where: {
        role_id: 13
      },
      include: {
        users: true
      }
    })

    const service_users = userService.map(us => us.users)
    const superviseurs = supervisionRole.map(us => us.users)

    const url = GENERAL_URL
    let deliveryLink = `${url}/remplacement-details/${remplacement.nouveauRemplacement.id}`;


    const commentaire_mail = commentaire ? commentaire : '(sans commentaire)'
    if ((service_users && service_users.length > 0) || (recepteurs && recepteurs.length > 0)) {
      const subject = `REGULARISATION REMPLACEMENT TPE`;
      const html = `
        <p>Bonjour,</p>
        <p>Une regularisation de remplacement a été enregistrée.</p>
        <ul>
          <li><strong>Ancien model TPE:</strong> ${ancienModel.nom_model.toUpperCase()}</li>
          <li><strong>Nouveau model TPE:</strong> ${nouveModel.nom_model.toUpperCase()}</li>
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

      for (const service_user of service_users) {
        await sendMail({
          to: service_user.email,
          subject,
          html,
        });
      }
      for (const recepteur of recepteurs) {
        await sendMail({
          to: recepteur.email,
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

    res.status(201).json({
      message: "Remplacement enregistré avec succès",
      data: remplacement,
    });

  } catch (error) {
    console.error("Erreur lors de la livraison :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
}


module.exports = {
  deliver,
  regLivraison,
  regReception,
  getAllLivraisons,
  getOneLivraison,
  updateLivraison,
  deleteLivraison,
  generateLivraisonPDF,
  deliverOld,
  deliverStock,
  getAllTypeLivraisonCommerciale,
  getAllStockDeliveries,
  getOneLivraisonDemande,
  receiveStock,
  addDeliveryType,
  getOneTypeLivraison,
  updateTypeLivraison,
  deleteTypeLivraison,
  updateDeliveryStock,
  generateTotalLivraisonPDF,
  getAllTypeParametrage,
  makeRemplacement,
  getAllRemplacements,
  getOneRemplacement,
  validateRemplacement,
  generateDeliveriesXLSX,
  generateRemplacementsXLSX,
  updateRemplacement,
  returnRemplacement,
  generateRemplacementPDF,
  getLivraisonsByWeek,
  getLivraisonsInRange,
  getStatsLivraisons,
  regRemplacement,
}