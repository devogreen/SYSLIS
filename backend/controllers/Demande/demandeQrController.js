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
const configEmail = process.env.NODEMAILER_USER
const archiver = require("archiver");
const ExcelJS = require("exceljs");

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

// const regularisationDemandeQr = async (req, res) => {
//     try {
//         const {
//             date_demande,
//             date_generation,
//             date_impression,
//             date_livraison,
//             date_reception,
//             commentaire,
//             liste_demande,
//             quantite_marchand,
//             quantite_qr,
//             userId,
//         } = req.body

//         const signature = req.files?.signature?.[0] || null;

//         const files = req.files?.files || [];
//         const files_content = files.length
//             ? files.map(file => ({
//                 name: file.originalname,
//                 path: file.path,
//                 type: file.mimetype,
//                 size: file.size
//             }))
//             : [];
//         if (!signature) {
//             console.error('Signature manquante !')
//             return res.status(404).json({ message: "Signature introuvable !" });
//         }

//         const utilisateur = await prisma.users.findUnique({
//             where: {
//                 id_user: parseInt(userId)
//             }
//         })
//         if (!utilisateur) {
//             console.error('Utilisteur introuvable !')
//             return res.status(404).json({ message: "Utilisateur introuvable !" });
//         }

//         const quantiteQr = Number(quantite_qr)
//         const quantiteMarchand = Number(quantite_marchand)
//         const details = typeof liste_demande === "string"
//             ? JSON.parse(liste_demande)
//             : liste_demande;

//         const newRegularisation = await prisma.$transaction(async (tx) => {
//             const demandeForm = await tx.forms.create({
//                 data: {
//                     type: 'demande_qr',
//                     created_by: utilisateur.id_user,
//                     created_at: new Date(date_demande),
//                     last_modified_at: new Date(date_demande),
//                     nom_user: utilisateur.fullname,
//                     commentaire,
//                     form_signatures: {
//                         create: {
//                             role: 'regularisateur',
//                             signature_url: signature.path,
//                             signed_by: utilisateur.id_user,
//                             signed_at: new Date()
//                         }
//                     },
//                 },
//                 include: {
//                     form_signatures: true,
//                 }
//             })
//             const demande = await tx.demande_qr.create({
//                 data: {
//                     form_id: demandeForm.id,
//                     statut: 'recue',
//                     quantite_qr: quantiteQr,
//                     quantite_marchand: quantiteMarchand,
//                     liste_demande: JSON.stringify(details),
//                     is_reg: true,
//                 }
//             })
//             const generationForm = await tx.forms.create({
//                 data: {
//                     type: 'generation_qr',
//                     created_by: utilisateur.id_user,
//                     created_at: new Date(date_generation),
//                     last_modified_at: new Date(date_generation),
//                     nom_user: utilisateur.fullname,
//                 },
//             })
//             const generation = await tx.generation_qr.create({
//                 data: {
//                     form_id: generationForm.id,
//                     quantite_qr: quantiteQr,
//                     demande_id: demande.id,
//                 }
//             })
//             const impressionForm = await tx.forms.create({
//                 data: {
//                     type: 'impression_qr',
//                     created_by: utilisateur.id_user,
//                     created_at: new Date(date_impression),
//                     last_modified_at: new Date(date_impression),
//                     nom_user: utilisateur.fullname,
//                 },
//             })
//             const impression = await tx.impression_qr.create({
//                 data: {
//                     form_id: impressionForm.id,
//                     quantite_qr: quantiteQr,
//                     generation_id: generation.id,
//                     demande_id: demande.id,
//                 }
//             })
//             const livraisonForm = await tx.forms.create({
//                 data: {
//                     type: 'livraison_qr',
//                     created_by: utilisateur.id_user,
//                     created_at: new Date(date_livraison),
//                     last_modified_at: new Date(date_livraison),
//                     nom_user: utilisateur.fullname,
//                 },
//             })
//             const livraison = await tx.livraison_qr.create({
//                 data: {
//                     form_id: livraisonForm.id,
//                     quantite_qr: quantiteQr,
//                     demande_id: demande.id,
//                 }
//             })
//             const receptionForm = await tx.forms.create({
//                 data: {
//                     type: 'reception_qr',
//                     created_by: utilisateur.id_user,
//                     created_at: new Date(date_reception),
//                     last_modified_at: new Date(date_reception),
//                     nom_user: utilisateur.fullname,
//                 },
//             })
//             const reception = await tx.reception_qr.create({
//                 data: {
//                     form_id: receptionForm.id,
//                     quantite_qr: quantiteQr,
//                     demande_id: demande.id,
//                     livraison_id: livraison.id,
//                 }
//             })

//             await tx.marchands_qr.createMany({
//                 data: details.map((item) => ({
//                     chaine: item.chaine,
//                     nom_marchand: item.pointMarchand,
//                     quantite_sn: Number(item.quantiteTerminal),
//                     quantite_qr: Number(item.quantiteQr),
//                     type_qr: item.typeQr,
//                     type_id: Number(item.typeQrId),
//                     format_id: Number(item.formatId),
//                     format: item.format,
//                     demande_id: demande.id,
//                     created_at: new Date(date_demande),
//                 }))
//             })

//             if (files_content.length > 0) {
//                 await tx.fichiers.createMany({
//                     data: files_content.map(fichier => ({
//                         path: fichier.path,
//                         filename: fichier.name,
//                         originalName: fichier.name,
//                         mimeType: fichier.type,
//                         size: fichier.size,
//                         uploaded_by: +userId,
//                         form_id: demandeForm.id,
//                         type_formulaire: 'demande_qr',
//                         role: 'regularisateur',
//                         created_at: new Date(),
//                     }))
//                 })
//             }
//             return {
//                 demandeForm,
//                 demande,
//                 generationForm,
//                 generation,
//                 impressionForm,
//                 impression,
//                 livraisonForm,
//                 livraison,
//                 receptionForm,
//                 reception
//             }
//         })

//         console.log("Régularisation enregistrée avec succès ! ")
//         res.status(201).json({
//             message: "Régularisation enregistrée avec succès",
//             data: newRegularisation
//         });

//     } catch (error) {
//         console.error("Erreur lors de la régularisation :", error);
//         res.status(500).json({ message: "Erreur interne", error });
//     }
// }

const regularisationDemandeQrV2 = async (req, res) => {
    try {
        const {
            date_demande,
            commentaire,
            liste_demande,
            quantite_marchand,
            quantite_qr,
            userId,
        } = req.body

        const files = req.files?.files || [];
        const files_content = files.length
            ? files.map(file => ({
                name: file.originalname,
                path: file.path,
                type: file.mimetype,
                size: file.size
            }))
            : [];

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const quantiteQr = Number(quantite_qr)
        const quantiteMarchand = Number(quantite_marchand)
        const details = typeof liste_demande === "string"
            ? JSON.parse(liste_demande)
            : liste_demande;

        const newRegularisation = await prisma.$transaction(async (tx) => {
            const demandeForm = await tx.forms.create({
                data: {
                    type: 'demande_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(date_demande),
                    last_modified_at: new Date(date_demande),
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            })
            const demande = await tx.demande_qr.create({
                data: {
                    form_id: demandeForm.id,
                    statut: 'soumise',
                    quantite_qr: Number(quantiteQr),
                    quantite_marchand: Number(quantiteMarchand),
                    liste_demande: JSON.stringify(details),
                    is_reg: true,
                },
            })
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
                        type_formulaire: 'demande_qr',
                        role: 'demandeur',
                        created_at: new Date(),
                    }))
                })
            }
            return {
                demandeForm,
                demande,
            }
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleLivraison = await prisma.user_roles.findMany({
                where: { role_id: 18 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const livreurs = roleLivraison.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${newRegularisation.demande.id}`;

            const subject = `SYSLIS - REGULARISATION DEMANDE QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Une demande régularisée de QR Code a été soumise.</p>
                <ul>
                <li><strong>Nombre de QR Code :</strong> ${newRegularisation.demande.quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...livreurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Régularisation de demande enregistrée avec succès ! ")
        res.status(201).json({
            message: "Régularisation de demande enregistrée avec succès",
            data: newRegularisation,
        });

    } catch (error) {
        console.error("Erreur lors de la régularisation :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const faireDemandeQr = async (req, res) => {
    try {
        const {
            commentaire,
            liste_demande,
            quantite_marchand,
            quantite_qr,
            userId,
        } = req.body

        // const signature = req.files?.signature?.[0] || null;
        // if (!signature) {
        //     console.error('Signature manquante !')
        //     return res.status(404).json({ message: "Signature introuvable !" });
        // }
        const files = req.files?.files || [];
        const files_content = files.length
            ? files.map(file => ({
                name: file.originalname,
                path: file.path,
                type: file.mimetype,
                size: file.size
            }))
            : [];

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const details = typeof liste_demande === "string"
            ? JSON.parse(liste_demande)
            : liste_demande;


        const newDemandeQr = await prisma.$transaction(async (tx) => {
            const demandeForm = await tx.forms.create({
                data: {
                    type: 'demande_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(),
                    last_modified_at: new Date(),
                    nom_user: utilisateur.fullname,
                    commentaire,
                    // form_signatures: {
                    //     create: {
                    //         role : 'demandeur',
                    //         signature_url: signature.path,
                    //         signed_by: utilisateur.id_user
                    //     }
                    // },
                },
            })
            const demande = await tx.demande_qr.create({
                data: {
                    form_id: demandeForm.id,
                    statut: 'soumise',
                    quantite_qr: Number(quantite_qr),
                    quantite_marchand: Number(quantite_marchand),
                    liste_demande: JSON.stringify(details),
                }
            })

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
                        type_formulaire: 'demande_qr',
                        role: 'demandeur',
                        created_at: new Date(),
                    }))
                })
            }

            return {
                demandeForm, demande
            }
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const totalTypes = details.reduce((acc, item) => {
                acc[item.typeQr] = (acc[item.typeQr] || 0) + 1
                return acc;
            }, {});

            const strTypes = Object.entries(totalTypes)
                .map(([type, total]) => `${total} marchand(s) ${type}`)
                .join(", ");

            const roleGenerateur = await prisma.user_roles.findMany({
                where: { role_id: 16 },
                include: { users: true }
            })
            const roleImpression = await prisma.user_roles.findMany({
                where: { role_id: 17 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const generateurs = roleGenerateur.map(us => us.users.email)
            const imprimeurs = roleImpression.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${newDemandeQr.demande.id}`;

            const subject = `SYSLIS - NOUVELLE DEMANDE DE QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Une nouvelle demande de QR code(s) a été enregistrée par ${utilisateur.fullname}.</p>
                <ul>
                <li><strong>Nombre de marchands :</strong> ${quantite_marchand}</li>
                <li><strong>Nombre de QR Code :</strong> ${quantite_qr}</li>
                <li><strong>Cette liste comprend :</strong> ${strTypes}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...generateurs, ...imprimeurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Demande enregistrée avec succès ! ")
        res.status(201).json({
            message: "Demande enregistrée avec succès",
            demandeQr: newDemandeQr,
        });
    } catch (error) {
        console.error("Erreur lors de la demande :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const getAllTypePaiement = async (req, res) => {
    try {
        const typePaiement = await prisma.type_paiement.findMany({
            orderBy: { id: 'asc' },
            select: {
                id: true,
                nom: true,
                abrv: true,
                qr_code: true,
            },
        });

        console.log('Succès !')
        res.status(200).json(typePaiement);
    } catch (error) {
        console.error("Erreur lors de la récupération des types de paiements :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des types de paiements", error });
    }
}

const getAllDemandesQr = async (req, res) => {
    try {
        const demandes = await prisma.demande_qr.findMany({
            include: {
                forms: true,
                generation_qr: {
                    include: {
                        forms: true
                    },
                },
                impression_qr: {
                    include: {
                        forms: true
                    },
                },
                livraison_qr: {
                    include: {
                        forms: true
                    },
                },
                reception_qr: {
                    include: {
                        forms: true
                    },
                },
            },
            orderBy: {
                forms: {
                    last_modified_at: 'desc',
                }
            },
        });

        console.log('Succès !')
        res.status(200).json(demandes);
    } catch (error) {
        console.error("Erreur lors de la récupération des demandes de QR Codes :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des demandes de QR Codes", error });
    }
}

const getOneDemandeQr = async (req, res) => {
    try {
        const {
            id
        } = req.params

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(id)
            }, include: {
                forms: {
                    include: {
                        users_forms_created_byTousers: true,
                        users_forms_updated_byTousers: true,
                    },
                },
                generation_qr: {
                    include: {
                        forms: true
                    },
                },
                impression_qr: {
                    include: {
                        forms: true
                    },
                },
                livraison_qr: {
                    include: {
                        forms: true
                    },
                },
                reception_qr: {
                    include: {
                        forms: true
                    },
                },
                retour_demande_qr: {
                    include: {
                        forms: true
                    },
                },
            },
        })
        console.log('Succès !')
        res.status(200).json(demande);
    } catch (error) {
        console.error("Erreur lors de la récupération de la demande de QR Codes :", error)
        res.status(500).json({ message: "Erreur lors de la récupération de la demande de QR Codes", error });
    }

}

const uploadDemandeQr = async (req, res) => {
    try {
        const {
            id
        } = req.params

        const {
            userId,
            commentaire,
        } = req.body

        const qrCodes = req.files?.qrCodes || [];

        if (qrCodes.length == 0) {
            console.error("Erreur : Aucun QR CODE upload")
            return res.status(400).json({ message: "Aucun QR CODE upload !" });
        }

        const qrCodes_content = qrCodes.length
            ? qrCodes.map(file => ({
                name: file.originalname,
                path: file.path,
                type: file.mimetype,
                size: file.size
            }))
            : [];

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(id)
            }
        })

        if (!demande) {
            console.error("Erreur : demande introuvable")
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const newGenerationQr = await prisma.$transaction(async (tx) => {
            const generationForm = await tx.forms.create({
                data: {
                    type: 'generation_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(),
                    last_modified_at: new Date(),
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            });
            const generation = await tx.generation_qr.create({
                data: {
                    form_id: generationForm.id,
                    quantite_qr: demande.quantite_qr,
                    demande_id: demande.id,
                }
            })
            await tx.qr_codes.createMany({
                data: qrCodes_content.map(file => ({
                    path: file.path,
                    filename: file.name,
                    originalName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    created_at: new Date(),
                    uploaded_by: utilisateur.id_user,
                    demande_id: demande.id,
                    generation_id: generation.id,
                }))
            })

            await tx.demande_qr.update({
                where: {
                    id: demande.id
                },
                data: {
                    statut: 'generee'
                }
            })

            return (generationForm, generation)
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleImpression = await prisma.user_roles.findMany({
                where: { role_id: 17 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })
            // NOTE: les livreurs (role 18) ne sont pas notifiés de la génération.

            const imprimeurs = roleImpression.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${demande.id}`;

            const subject = `SYSLIS - QR CODE(S) GÉNÉNÉRÉ(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été générés par ${utilisateur.fullname}.</p>
                <ul>
                <li><strong>Nombre de marchands :</strong> ${demande.quantite_marchand}</li>
                <li><strong>Nombre de QR Code :</strong> ${demande.quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...imprimeurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Génération QR Code éffectué avec succès ! ")
        res.status(201).json({
            message: "Génération QR Code éffectué avec succès !",
            GenerationQr: newGenerationQr,
        });
    } catch (error) {
        console.error("Erreur lors de la génération :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const downloadQrCodes = async (req, res) => {
    const { idDemande, idGeneration } = req.params;

    try {
        const files = await prisma.qr_codes.findMany({
            where: {
                demande_id: parseInt(idDemande),
                generation_id: parseInt(idGeneration),
                is_deleted: false,
            },
        });

        if (files.length === 0) {
            return res.status(404).json({ message: "Aucun QR Codes trouvés" });
        }

        // Set ZIP headers
        res.setHeader("Content-Type", "application/zip");

        const archive = archiver("zip", {
            zlib: { level: 9 },
        });

        archive.pipe(res);

        for (const file of files) {
            const filePath = path.resolve(file.path);

            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file.filename });
            }
        }

        await archive.finalize();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

const impressionDemandeQr = async (req, res) => {
    try {
        const {
            idDemande,
            idGeneration,
        } = req.params

        const {
            userId,
            commentaire,
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(idDemande)
            }
        })
        if (!demande) {
            console.error("Erreur : demande introuvable")
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const generation = await prisma.generation_qr.findUnique({
            where: {
                id: parseInt(idGeneration)
            }
        })
        if (!generation) {
            console.error("Erreur : generation introuvable")
            return res.status(404).json({ message: "Génération introuvable !" });
        }

        const newImpressionQr = await prisma.$transaction(async (tx) => {
            const impressionForm = await tx.forms.create({
                data: {
                    type: 'impression_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(),
                    last_modified_at: new Date(),
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            });
            await tx.impression_qr.create({
                data: {
                    form_id: impressionForm.id,
                    quantite_qr: demande.quantite_qr,
                    demande_id: demande.id,
                    generation_id: generation.id,
                }
            })

            const impression = await tx.demande_qr.update({
                where: {
                    id: demande.id
                },
                data: {
                    statut: 'imprimee'
                }
            })

            return (impressionForm, impression)
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleLivraison = await prisma.user_roles.findMany({
                where: { role_id: 18 },
                include: { users: true }
            })
            const roleGenerateur = await prisma.user_roles.findMany({
                where: { role_id: 16 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const livreurs = roleLivraison.map(us => us.users.email)
            const generateurs = roleGenerateur.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${demande.id}`;

            const subject = `SYSLIS - IMPRESSION QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été imprimés par ${utilisateur.fullname}.</p>
                <ul>
                <li><strong>Nombre de QR Code :</strong> ${demande.quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...livreurs, ...generateurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Impression QR Code éffectuée avec succès ! ")
        res.status(201).json({
            message: "Impression QR Code éffectuée avec succès !",
            ImpressionQr: newImpressionQr,
        });
    } catch (error) {
        console.error("Erreur lors de l'impression :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const livraisonDemandeQr = async (req, res) => {
    try {
        const {
            idDemande
        } = req.params

        const {
            userId,
            commentaire,
        } = req.body

        const signature = req.files?.signature?.[0] || null;
        if (!signature) {
            console.error('Signature manquante !')
            return res.status(404).json({ message: "Signature introuvable !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(idDemande)
            }
        })
        if (!demande) {
            console.error("Erreur : demande introuvable")
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const newLivraisonQr = await prisma.$transaction(async (tx) => {
            const livraisonForm = await tx.forms.create({
                data: {
                    type: 'livraison_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(),
                    last_modified_at: new Date(),
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            });
            const livraison = await tx.livraison_qr.create({
                data: {
                    form_id: livraisonForm.id,
                    quantite_qr: demande.quantite_qr,
                    demande_id: demande.id,
                }
            })
            await tx.form_signatures.create({
                data: {
                    form_id: livraisonForm.id,
                    signature_url: signature.path,
                    signed_by: utilisateur.id_user,
                    signed_at: new Date(),
                    role: 'livreur'
                },
            })

            await tx.demande_qr.update({
                where: {
                    id: demande.id
                },
                data: {
                    statut: 'livree'
                }
            })

            return (livraisonForm, livraison)
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleReception = await prisma.user_roles.findMany({
                where: { role_id: 19 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const recepteurs = roleReception.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${demande.id}`;

            const subject = `SYSLIS - LIVRAISON QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été livrés par ${utilisateur.fullname}.</p>
                <ul>
                <li><strong>Nombre de QR Code :</strong> ${demande.quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...recepteurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Livraison QR Code éffectuée avec succès ! ")
        res.status(201).json({
            message: "Livraison QR Code éffectuée avec succès !",
            livraisonQr: newLivraisonQr,
        });

    } catch (error) {
        console.error("Erreur lors de la livraison :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const receptionDemandeQr = async (req, res) => {
    try {
        const {
            idDemande,
            idLivraison,
        } = req.params

        const {
            userId,
            commentaire,
        } = req.body

        const signature = req.files?.signature?.[0] || null;
        if (!signature) {
            console.error('Signature manquante !')
            return res.status(404).json({ message: "Signature introuvable !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(idDemande)
            }
        })
        if (!demande) {
            console.error("Erreur : demande introuvable")
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const livraison = await prisma.livraison_qr.findUnique({
            where: {
                id: parseInt(idLivraison)
            }
        })
        if (!livraison) {
            console.error("Erreur : livraison introuvable")
            return res.status(404).json({ message: "Livraison introuvable !" });
        }

        const listeDemande = typeof demande.liste_demande === "string"
            ? JSON.parse(demande.liste_demande)
            : demande.liste_demande;

        const newReceptionQr = await prisma.$transaction(async (tx) => {
            const receptionForm = await tx.forms.create({
                data: {
                    type: 'reception_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(),
                    last_modified_at: new Date(),
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            });
            const reception = await tx.reception_qr.create({
                data: {
                    form_id: receptionForm.id,
                    quantite_qr: demande.quantite_qr,
                    demande_id: demande.id,
                    livraison_id: livraison.id
                }
            })
            await tx.form_signatures.create({
                data: {
                    form_id: receptionForm.id,
                    signature_url: signature.path,
                    signed_by: utilisateur.id_user,
                    signed_at: new Date(),
                    role: 'receveur',
                },
            })
            await tx.demande_qr.update({
                where: {
                    id: demande.id
                },
                data: {
                    statut: 'recue'
                }
            })
            await tx.marchands_qr.createMany({
                data: listeDemande.map((item) => ({
                    chaine: item.chaine,
                    nom_marchand: item.pointMarchand,
                    quantite_sn: Number(item.quantiteTerminal),
                    quantite_qr: Number(item.quantiteQr),
                    type_qr: item.typeQr,
                    type_id: Number(item.typeQrId),
                    format_id: Number(item.formatId),
                    format: item.format,
                    demande_id: demande.id,
                    created_at: new Date(),
                }))
            })

            return (receptionForm, reception)
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleLivraison = await prisma.user_roles.findMany({
                where: { role_id: 18 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const livreurs = roleLivraison.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${demande.id}`;

            const subject = `SYSLIS - RECEPTION QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été réceptionnés par ${utilisateur.fullname}.</p>
                <ul>
                <li><strong>Nombre de QR Code :</strong> ${demande.quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...livreurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("QR Codes réceptionnés avec succès ! ")
        res.status(201).json({
            message: "QR Codes réceptionnés avec succès !",
            receptionQr: newReceptionQr,
        });

    } catch (error) {
        console.error("Erreur lors de la réception :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const getAllFormatsQr = async (req, res) => {
    try {
        const formats = await prisma.format_qr.findMany({
            orderBy: { format: 'asc' },
        });

        console.log('Succès !')
        res.status(200).json(formats);
    } catch (error) {
        console.error("Erreur lors de la récupération des formats de QR Codes :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des formats de QR Codes :", error });
    }
}

const getAllFormFiles = async (req, res) => {
    const {
        id
    } = req.params

    try {

        const formId = parseInt(id, 10);

        if (isNaN(formId)) {
            return res.status(400).json({ message: "Invalid demande ID" });
        }
        const form = await prisma.forms.findUnique({
            where: { id: parseInt(formId) }
        })
        if (!form) {
            console.log('Formulaire introuvable')
            return res.status(404).json({ message: "Formulaire introuvable" });
        }
        const files = await prisma.fichiers.findMany({
            where: {
                form_id: formId,
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

const modifyDemandeQr = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            commentaire,
            liste_demande,
            quantite_marchand,
            quantite_qr,
            userId,
        } = req.body

        const files = req.files?.files || [];
        const files_content = files.length
            ? files.map(file => ({
                name: file.originalname,
                path: file.path,
                type: file.mimetype,
                size: file.size
            }))
            : [];

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error('Utilisteur introuvable !')
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const details = typeof liste_demande === "string"
            ? JSON.parse(liste_demande)
            : liste_demande;

        const updatedDemandeQr = await prisma.$transaction(async (tx) => {
            const demande = await tx.demande_qr.findUnique({
                where: {
                    id: parseInt(id)
                }
            })
            const demandeForm = await tx.forms.findUnique({
                where: {
                    id: demande.form_id
                }
            })
            await tx.forms.update({
                where: {
                    id: demandeForm.id
                },
                data: {
                    updated_by: utilisateur.id_user,
                    updated_at: new Date(),
                    last_modified_at: new Date(),
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            })
            await tx.demande_qr.update({
                where: {
                    id: parseInt(id)
                },
                data: {
                    quantite_qr: Number(quantite_qr),
                    quantite_marchand: Number(quantite_marchand),
                    liste_demande: JSON.stringify(details),
                }
            })

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
                        type_formulaire: 'demande_qr',
                        role: 'demandeur',
                        created_at: new Date(),
                    }))
                })
            }

            return {
                demandeForm, demande
            }
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleGenerateur = await prisma.user_roles.findMany({
                where: { role_id: 16 },
                include: { users: true }
            })
            const roleImpression = await prisma.user_roles.findMany({
                where: { role_id: 17 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const generateurs = roleGenerateur.map(us => us.users.email)
            const imprimeurs = roleImpression.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${updatedDemandeQr.demande.id}`;

            const subject = `SYSLIS - MODIFICATION DEMANDE DE QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>la demande de QR code(s) ${updatedDemandeQr.demande.id} a été modifiée.</p>
                <ul>
                <li><strong>Nombre de marchands :</strong> ${quantite_marchand}</li>
                <li><strong>Nombre de QR Code :</strong> ${quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...generateurs, ...imprimeurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Demande modifiée avec succès ! ")
        res.status(201).json({
            message: "Demande modifiée avec succès",
            demandeQr: updatedDemandeQr,
        });

    } catch (error) {
        console.error("Erreur lors de la modification de la demande de QR Codes :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const cancelDemandeQr = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
            messageCancel,
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })

        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(id)
            }
        })
        if (!demande) {
            console.error('Demande introuvable !')
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const dateAction = new Date()

        const canceledDemande = await prisma.$transaction(async (tx) => {

            const retourForm = await tx.forms.create({
                data: {
                    type: 'retour_demande_qr',
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                    commentaire: messageCancel,
                }
            })

            const retour = await tx.retour_demande_qr.create({
                data: {
                    form_id: retourForm.id,
                    demande_id: demande.id,
                    type: 'annulation',
                },
            })

            // await tx.forms.update({
            //     where: {
            //         id: demande.form_id
            //     },
            //     data: {
            //         updated_by: parseInt(userId),
            //         updated_at: dateAction,
            //         last_modified_at: dateAction,
            //     }
            // });

            await tx.demande_qr.update({
                where: {
                    id: demande.id,
                },
                data: {
                    statut: 'annulee',
                }
            })
            // await tx.fichiers.updateMany({
            //     where: {
            //         form_id: demande.form_id,
            //     },
            //     data: {
            //         is_deleted: true,
            //     }
            // })
            return {
                retourForm, retour,
            }
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleGenerateur = await prisma.user_roles.findMany({
                where: { role_id: 16 },
                include: { users: true }
            })
            const roleImpression = await prisma.user_roles.findMany({
                where: { role_id: 17 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const generateurs = roleGenerateur.map(us => us.users.email)
            const imprimeurs = roleImpression.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const subject = `SYSLIS - ANNULATION DEMANDE DE QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>la demande de QR code(s) ${demande.id} a été annulée par ${utilisateur.fullname}.</p>
                <p>Commentaire : <strong>${messageCancel}</strong</p>
                <br>
                <br>
                <br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...generateurs, ...imprimeurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Demande annulée avec succès ! ")
        res.status(201).json({
            message: "Demande annulée avec succès",
            demandeQr: canceledDemande.demande,
        });
    } catch (error) {
        console.error("Erreur lors de l'annulation de la demande de QR Codes :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const regularisationLivraisonDemandeQr = async (req, res) => {
    try {
        const {
            idDemande
        } = req.params

        const {
            userId,
            commentaire,
            date_livraison,
        } = req.body

        const signature = req.files?.signature?.[0] || null;
        if (!signature) {
            console.error('Signature manquante !')
            return res.status(404).json({ message: "Signature introuvable !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(idDemande)
            }
        })
        if (!demande) {
            console.error("Erreur : demande introuvable")
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const newLivraisonQr = await prisma.$transaction(async (tx) => {
            const livraisonForm = await tx.forms.create({
                data: {
                    type: 'livraison_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(date_livraison),
                    last_modified_at: new Date(date_livraison),
                    nom_user: utilisateur.fullname,
                    commentaire,
                    livraison_qr: {
                        create: {
                            quantite_qr: demande.quantite_qr,
                            demande_id: demande.id,
                        }
                    },
                    form_signatures: {
                        create: {
                            signature_url: signature.path,
                            signed_by: utilisateur.id_user,
                            signed_at: new Date(),
                            role: 'livreur'
                        }
                    }
                },
                include: {
                    livraison_qr: true,
                    form_signatures: true,
                },
            });

            await tx.demande_qr.update({
                where: {
                    id: demande.id
                },
                data: {
                    statut: 'livree'
                }
            })

            return (livraisonForm)
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleReception = await prisma.user_roles.findMany({
                where: { role_id: 19 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const recepteurs = roleReception.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${demande.id}`;

            const subject = `SYSLIS - REGULARISATION LIVRAISON QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Une livraison régularisée pour la demande ${demande.id} de QR Code(s) a été faite.</p>
                <ul>
                <li><strong>Nombre de QR Code :</strong> ${demande.quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...recepteurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Livraison régularisée de QR Code éffectuée avec succès ! ")
        res.status(201).json({
            message: "Livraison régularisée de QR Code éffectuée avec succès !",
            livraisonQr: newLivraisonQr,
        });

    } catch (error) {
        console.error("Erreur lors de la livraison :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const regularisationReceptionDemandeQr = async (req, res) => {
    try {
        const {
            idDemande,
            idLivraison,
        } = req.params

        const {
            userId,
            commentaire,
            date_reception,
        } = req.body

        const signature = req.files?.signature?.[0] || null;
        if (!signature) {
            console.error('Signature manquante !')
            return res.status(404).json({ message: "Signature introuvable !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId)
            }
        })
        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(idDemande)
            }
        })
        if (!demande) {
            console.error("Erreur : demande introuvable")
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const livraison = await prisma.livraison_qr.findUnique({
            where: {
                id: parseInt(idLivraison)
            }
        })
        if (!livraison) {
            console.error("Erreur : livraison introuvable")
            return res.status(404).json({ message: "Livraison introuvable !" });
        }

        const listeDemande = typeof demande.liste_demande === "string"
            ? JSON.parse(demande.liste_demande)
            : demande.liste_demande;

        const newReceptionQr = await prisma.$transaction(async (tx) => {
            const receptionForm = await tx.forms.create({
                data: {
                    type: 'reception_qr',
                    created_by: utilisateur.id_user,
                    created_at: new Date(date_reception),
                    last_modified_at: new Date(date_reception),
                    nom_user: utilisateur.fullname,
                    commentaire,
                    reception_qr: {
                        create: {
                            quantite_qr: demande.quantite_qr,
                            demande_id: demande.id,
                            livraison_id: livraison.id
                        }
                    },
                    form_signatures: {
                        create: {
                            signature_url: signature.path,
                            signed_by: utilisateur.id_user,
                            signed_at: new Date(),
                            role: 'receveur',
                        }
                    }
                },
                include: {
                    reception_qr: true,
                    form_signatures: true,
                }
            })
            await tx.demande_qr.update({
                where: {
                    id: demande.id
                },
                data: {
                    statut: 'recue'
                }
            })
            await tx.marchands_qr.createMany({
                data: listeDemande.map((item) => ({
                    chaine: item.chaine,
                    nom_marchand: item.pointMarchand,
                    quantite_sn: Number(item.quantiteTerminal),
                    quantite_qr: Number(item.quantiteQr),
                    type_qr: item.typeQr,
                    type_id: Number(item.typeQrId),
                    format_id: Number(item.formatId),
                    format: item.format,
                    demande_id: demande.id,
                    created_at: new Date(date_reception),
                }))
            })

            return (receptionForm)
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleLivraison = await prisma.user_roles.findMany({
                where: { role_id: 18 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const livreurs = roleLivraison.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/demande-qr-details/${demande.id}`;

            const subject = `SYSLIS - REGULARISATION RECEPTION QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>Une réception régularisée de la demande ${demande.id} de QR CODE(S) a été faite.</p>
                <ul>
                <li><strong>Nombre de QR Code :</strong> ${demande.quantite_qr}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la demande à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...livreurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Réception régularisée de QR Codes effectuée avec succès !")
        res.status(201).json({
            message: "Réception régularisée de QR Codes effectuée avec succès !",
            receptionQr: newReceptionQr,
        });

    } catch (error) {
        console.error("Erreur lors de la réception :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour extraire la valeur d'une cellule, en gérant les différents types de contenu (texte simple, texte enrichi, etc.)
function getCellValue(cell) {
    if (!cell || cell.value == null) return "";

    // Gestion du rich text
    if (typeof cell.value === "object" && cell.value.richText) {
        return cell.value.richText.map(t => t.text).join("").trim();
    }

    // Gestion des formules Excel
    if (typeof cell.value === "object" && cell.value.formula) {
        return cell.value.result ?? "";
    }

    return String(cell.value).trim();
}
// Fonction d'extraction de fichier excel pour régularisation des demandes QR CODES.
const extractMarchandsQr = async (req, res) => {
    try {
        const {
            userId,
        } = req.body

        // Le fichier excel est récupéré ici
        const file = req.file
        // console.log("Fichier reçu : ", file)

        if (!file) {
            console.log("Aucun fichier reçu")
            return res.status(400).json({ message: "Excel file is required" });
        }

        // JAVASCRIPT utilise ExcelJS pour lire comme il faut les fichiers excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            console.log("Aucune feuille trouvée dans le fichier Excel")
            return res.status(400).json({ message: "Invalid Excel file" });
        }

        // Récupération des en-têtes 
        const headers = {};
        worksheet.getRow(1).eachCell((cell, col) => {
            headers[String(cell.value).trim().toUpperCase()] = col;
        });

        const requiredHeaders = [
            "POINT MARCHAND",
            "FORMAT",
            "TYPE",
            "NBRE COPIE",
        ];

        for (const header of requiredHeaders) {
            if (!headers[header]) {
                console.log(`Colonne requise manquante : ${header}`)
                return res.status(400).json({
                    message: `Missing required column: ${header}`
                });
            }
        }

        const formats = await prisma.format_qr.findMany({
            select: {
                format: true,
            },
            orderBy: {
                format: 'asc',
            },
        })
        const formatsQr = formats.map((item) => { return item.format })

        const types = await prisma.type_paiement.findMany({
            where: {
                qr_code: true,
            },
            select: {
                abrv: true,
            },
            orderBy: {
                nom: 'asc',
            },
        })
        const typesQr = types.map((item) => { return item.abrv })

        const marchands = [];
        const uniqueKeys = new Set();
        let duplicateError = null;
        let marchandError = null;
        let typeQrError = null;
        let formatQrError = null;

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const typeQr = String(getCellValue(row.getCell(headers["TYPE"])) || "").trim();
            const format = String(getCellValue(row.getCell(headers["FORMAT"])) || "").trim();
            const marchandName = String(getCellValue(row.getCell(headers["POINT MARCHAND"])) || "").trim();
            const nbreCopie = Number(getCellValue(row.getCell(headers["NBRE COPIE"])) || 0);

            // Ignore les lignes vides ou inutiles
            if (
                !typeQr ||
                !format ||
                !marchandName ||
                nbreCopie === 0
            ) {
                return;
            }

            const marchand = {
                marchand: marchandName,
                typeQr,
                format,
                nbreCopie,
                rowNumber,
            };

            if (!formatsQr.includes(format)) {
                formatQrError = {
                    rowNumber,
                    marchand,
                }
                return;
            }

            if (!typesQr.includes(typeQr)) {
                typeQrError = {
                    rowNumber,
                    marchand,
                }
                return;
            }

            const key = `${marchand.typeQr}-${marchand.format}-${marchand.marchand}`;
            if (uniqueKeys.has(key)) {
                duplicateError = {
                    rowNumber,
                    marchand
                };
                return;
            }
            uniqueKeys.add(key);
            marchands.push(marchand);

            // console.log("Données extraites ligne", rowNumber, marchand);
        })

        if (duplicateError) {
            return res.status(400).json({
                message: `Doublon trouvé à la ligne ${duplicateError.rowNumber} pour le marchand ${duplicateError.marchand.marchand} avec le type ${duplicateError.marchand.typeQr} et le format ${duplicateError.marchand.format}.`,
            });
        }

        if (formatQrError) {
            return res.status(400).json({
                message: `Format de QR code inconnu à la ligne ${formatQrError.rowNumber} pour le marchand ${formatQrError.marchand.marchand} avec le format « ${formatQrError.marchand.format} ». Les formats existants sont : ${formatsQr.join(', ')}.`,
            });
        }

        if (typeQrError) {
            return res.status(400).json({
                message: `Type de QR code inconnu à la ligne ${typeQrError.rowNumber} pour le marchand ${typeQrError.marchand.marchand} avec le type « ${typeQrError.marchand.typeQr} ». Les types existants sont : ${typesQr.join(', ')}.`,
            });
        }

        console.log(`Extraction complète par utilisateur ${userId} !`)
        return res.status(201).json({
            message: "Extraction complète",
            data: marchands,
        });
    } catch (error) {
        console.error("Erreur lors de l'extraction du fichier Excel :", error);
        return res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour obternir tous les marchands et leur QR Codes livrés.
const getAllMarchandsQr = async (req, res) => {
    try {
        const marchandsQr = await prisma.marchands_qr.findMany({
            select: {
                id: true,
                nom_marchand: true,
                chaine: true,
                quantite_qr: true,
                quantite_sn: true,
                type_qr: true,
                format: true,
                created_at: true,
                type_id: true,
                format_id: true,
                created_at: true,
                is_deleted: true,
                demande_id: true,
                type_paiement: {
                    select: {
                        nom: true
                    },
                },
                format_qr: {
                    select: {
                        format: true,
                    }
                },
                demande_qr: {
                    select: {
                        id: true,
                        forms: {
                            select: {
                                created_at: true,
                                nom_user: true,
                            },
                        },
                        livraison_qr: {
                            select: {
                                id: true,
                                demande_id: true,
                                forms: {
                                    select: {
                                        last_modified_at: true,
                                        nom_user: true,
                                    },
                                }
                            },
                        },
                        reception_qr: {
                            select: {
                                id: true,
                                demande_id: true,
                                forms: {
                                    select: {
                                        last_modified_at: true,
                                        nom_user: true,
                                    },
                                }
                            },
                        },
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        console.log('Succès !')
        res.status(200).json(marchandsQr);
    } catch (error) {
        console.error("Erreur lors de la récupération des QR Codes de marchands :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des QR Codes de marchands", error });
    }
}

// Fonction pour obtenir le cumul des QR Codes par étape (soumis, générés, imprimés, livrés, reçus) sur une période donnée.
const getCumulQrCodes = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Si une des dates manque, on calcule "depuis toujours" (sans filtre date)
        const hasDates = Boolean(startDate && endDate);

        const dateFilter = hasDates
            ? {
                gte: new Date(startDate + 'T00:00:00'),
                lte: new Date(endDate + 'T23:59:59')
            }
            : null;

        const buildWhere = () => {
            // toutes les requêtes filtrent is_deleted=false et (optionnellement) par last_modified_at
            return {
                forms: {
                    is_deleted: false,
                    ...(dateFilter ? { last_modified_at: dateFilter } : {})
                }
            };
        };

        const soumis = await prisma.demande_qr.aggregate({
            where: buildWhere(),
            _sum: {
                quantite_qr: true
            }
        });

        const genere = await prisma.generation_qr.aggregate({
            where: buildWhere(),
            _sum: {
                quantite_qr: true
            }
        });

        const imprime = await prisma.impression_qr.aggregate({
            where: buildWhere(),
            _sum: {
                quantite_qr: true
            }
        });

        const livree = await prisma.livraison_qr.aggregate({
            where: buildWhere(),
            _sum: {
                quantite_qr: true
            }
        });

        const recue = await prisma.reception_qr.aggregate({
            where: buildWhere(),
            _sum: {
                quantite_qr: true
            }
        });

        res.status(200).json({
            message: 'Cumul QR codes par étape',
            data: {
                soumis: soumis._sum.quantite_qr || 0,
                genere: genere._sum.quantite_qr || 0,
                imprime: imprime._sum.quantite_qr || 0,
                livree: livree._sum.quantite_qr || 0,
                recue: recue._sum.quantite_qr || 0,
            }
        });

    } catch (error) {
        console.error('Erreur getCumulQrCodes:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Fonction pour télécharger le template de demande de QR Codes au format Excel.
const downloadTemplateQr = async (req, res) => {
    try {
        const {
            userId
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
            select: {
                id_user: true,
                username: true,
            },
        })

        const workbook = new ExcelJS.Workbook();

        const demandeQrSheet = workbook.addWorksheet('Demande QR');
        const demandeQrHeaders = [
            "Point Marchand",
            "Format",
            "Type",
            "Nbre Copie",
        ];
        const demandeQrHeaderRow = demandeQrSheet.addRow(demandeQrHeaders);
        demandeQrHeaderRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=demandeQr_template.xlsx`
        );
        res.send(buffer);

        console.log(`Template de demande Qr téléchargé avec succès par ${utilisateur.username} ID ${utilisateur.id_user} !`);

    } catch (error) {
        console.error('Erreur downloadTemplateQr:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour extraire les données des demandes QR en format Excel, selon des filtres de date et de statut.
const exportTotalDemandesQrToExcel = async (req, res) => {
    try {
        const {
            listId,
        } = req.body

        const workbook = new ExcelJS.Workbook();

        const resumeSheet = workbook.addWorksheet("Résumé");

        const resumeHeaders = [
            "ID Demande",
            "Date demande",
            "Quantité QR Codes",
            "Quantité Marchands",
            "Statut",
            "Date Génération",
            "Date Impression",
            "Date Livraison",
            "Date Réception",
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
            "ID Demande",
            "Point Marchand",
            "Chaîne",
            "Format",
            "Type QR",
            "Nbre TPE",
            "Nbre de Copie",
            "Statut",
            "Date demande",
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
            const demande = await prisma.demande_qr.findUnique({
                where: {
                    id: parseInt(id)
                },
                include: {
                    forms: true,
                    generation_qr: {
                        include: {
                            forms: true
                        },
                    },
                    impression_qr: {
                        include: {
                            forms: true
                        },
                    },
                    livraison_qr: {
                        include: {
                            forms: true
                        },
                    },
                    reception_qr: {
                        include: {
                            forms: true
                        },
                    },
                },
            })
            const details = typeof demande.liste_demande === "string"
                ? JSON.parse(demande.liste_demande)
                : demande.liste_demande;

            resumeSheet.addRow([
                demande.id,
                demande.forms.last_modified_at ? demande.forms.last_modified_at.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "",
                demande.quantite_qr,
                demande.quantite_marchand,
                demande.statut,
                demande.generation_qr?.forms?.last_modified_at ? demande.generation_qr.forms.last_modified_at.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "",
                demande.impression_qr?.forms?.last_modified_at ? demande.impression_qr.forms.last_modified_at.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "",
                demande.livraison_qr?.forms?.last_modified_at ? demande.livraison_qr.forms.last_modified_at.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "",
                demande.reception_qr?.forms?.last_modified_at ? demande.reception_qr.forms.last_modified_at.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "",
            ])

            details.forEach((item) => {
                allDetailSheet.addRow([
                    demande.id,
                    item.pointMarchand,
                    item.chaine,
                    item.format,
                    item.typeQr,
                    item.quantiteTerminal,
                    item.quantiteQr,
                    demande.statut,
                    demande.last_modified_at ? demande.last_modified_at.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "",
                ])
            })
        }
    } catch (error) {
        console.error('Erreur exportTotalDemandesQrToExcel:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour extraire les données d'une demande QR spécifique en format Excel, avec tous les détails de la demande.
const exportOneDemandeQrToExcel = async (req, res) => {
    try {
        const {
            idDemande,
        } = req.params
        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(idDemande),
            },
        })

        if (!demande) {
            console.error('Demande introuvable !')
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const workbook = new ExcelJS.Workbook();

        const allDetailSheet = workbook.addWorksheet("Liste Demande")
        const allDetailHeader = [
            "Index",
            "Point Marchand",
            "Chaîne",
            "Format",
            "Type QR",
            "Nbre TPE",
            "Nbre de Copie",
            "Total QR",
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

        const listeDemande = typeof demande.liste_demande === "string"
            ? JSON.parse(demande.liste_demande)
            : demande.liste_demande;

        listeDemande.forEach((item, index) => {
            allDetailSheet.addRow([
                index + 1,
                item.pointMarchand,
                item.chaine,
                item.format,
                item.typeQr,
                item.quantiteTerminal,
                item.nbreCopie,
                item.quantiteQr,
            ])
        })

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=demandeQr_${idDemande}.xlsx`
        );
        res.send(buffer);

        console.log('Export de la demande de QR Codes téléchargé avec succès !');

    } catch (error) {
        console.error('Erreur exportOneDemandeQrToExcel:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour obtenir toutes les données des demandes de QR Codes (quantités, opérateurs, statuts, dates) selon des filtres de date, pour analyse et reporting.T1
const getAllDataDemandeQr = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const demandes = await prisma.demande_qr.findMany({
            where: {
                forms: {
                    last_modified_at: {
                        gte: new Date(startDate + 'T00:00:00'),
                        lte: new Date(endDate + 'T23:59:59')
                    },
                    is_deleted: false,
                },
            },
            select: {
                id: true,
                quantite_qr: true,
                liste_demande: true,
                statut: true,
                forms: {
                    select: {
                        last_modified_at: true,
                    },
                },
            },
        });

        const operateurs = await prisma.type_paiement.findMany({
            select: {
                id: true,
                nom: true,
            },
        });

        let total = []

        const generations = await prisma.generation_qr.findMany({
            select: {
                demande_id: true,
                quantite_qr: true,
            },
        });

        const generationMap = new Map(
            generations.map(g => [g.demande_id, g.quantite_qr])
        );

        const parsedDemandes = demandes.map(d => ({
            ...d,
            liste_demande:
                typeof d.liste_demande === "string"
                    ? JSON.parse(d.liste_demande)
                    : d.liste_demande || []
        }));

        for (const demande of parsedDemandes) {

            const statut = demande.statut;

            const total_genere =
                statut != "soumise"
                    ? generationMap.get(demande.id) || 0
                    : 0;

            const totals = operateurs.map((operateur) => {
                const total_qr = demande.liste_demande
                    .filter(item => item.typeQrId === operateur.id)
                    .reduce((sum, item) => sum + (item.quantiteQr || 0), 0);
                if (total_qr === 0) return null; // On ne retourne que les opérateurs concernés par la demande
                return {
                    demande_id: demande.id,
                    statut,
                    total_qr,
                    operateur: operateur.nom,
                    date_demande: demande.forms.last_modified_at,
                    total_genere: total_genere != 0 ? total_qr : 0,
                };
            });

            total.push(...totals);
        }

        res.status(200).json({
            data: total.filter(item => item !== null), // On filtre les opérateurs non concernés
            message: 'Données des demandes de QR Codes récupérées avec succès !',
        })

    } catch (error) {
        console.error('Erreur getAllDataDemandeQr:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour obtenir les données d'impression des demandes de QR Codes (quantités imprimées, opérateurs, dates) selon des filtres de date, pour analyse et reporting.T2
const getDataImpressionQr = async (req, res) => {
    try {

        const { startDate, endDate } = req.query;

        const demandes = await prisma.demande_qr.findMany({
            where: {
                forms: {
                    last_modified_at: {
                        gte: new Date(startDate + 'T00:00:00'),
                        lte: new Date(endDate + 'T23:59:59')
                    },
                    is_deleted: false,
                },
                statut: {
                    not: 'soumise',
                },
            },
            select: {
                id: true,
                quantite_qr: true,
                liste_demande: true,
                statut: true,
                forms: {
                    select: {
                        last_modified_at: true,
                    },
                },
            },
        });

        const formats = await prisma.format_qr.findMany({
            select: {
                id: true,
                format: true,
            },
        });

        const operateurs = await prisma.type_paiement.findMany({
            select: {
                id: true,
                nom: true,
            },
        });

        const parsedDemandes = demandes.map(d => ({
            ...d,
            liste_demande:
                typeof d.liste_demande === "string"
                    ? JSON.parse(d.liste_demande)
                    : d.liste_demande || []
        }));

        const total = formats.map((format) => {
            const listeOperateurs = operateurs.map((operateur) => {

                let total_genere = 0;
                let total_imprime = 0;
                let total_demandes = 0;

                // Récupérer le total des demandes qui contiennent l'opérateur et le format
                parsedDemandes.forEach((demande) => {
                    const quantite = demande.liste_demande
                        .filter(
                            item =>
                                item.typeQrId === operateur.id &&
                                item.formatId === format.id
                        )
                        .reduce(
                            (sum, item) => sum + (item.quantiteQr || 0),
                            0
                        );

                    // This demande contains this operator/format
                    if (quantite > 0) {
                        total_demandes++;
                    }

                    // Accumuler le total des qr codes pour chaque demande avec le format et l'opérateur
                    total_genere += quantite;

                    if (demande.statut === "imprimee" || demande.statut === "livree" || demande.statut === "recue") {
                        total_imprime += quantite;
                    }
                });

                return {
                    operateur_id: operateur.id,
                    operateur: operateur.nom,
                    total_demandes,
                    total_genere,
                    total_imprime,
                };
            })

            return {
                format_id: format.id,
                format: format.format,
                operateurs: listeOperateurs,
            };
        })

        res.status(200).json({
            data: total, // On filtre les opérateurs non concernés
            message: 'Données des impressions des demandes de QR Codes récupérées avec succès !',
        })

    } catch (error) {
        console.error('Erreur getDataImpressionQr:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour suspendre une demande de QR code
const suspendreDemandeQr = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
            messageSuspension,
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })

        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(id)
            }
        })
        if (!demande) {
            console.error('Demande introuvable !')
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {

            const retourForm = await tx.forms.create({
                data: {
                    type: 'retour_demande_qr',
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                    commentaire: messageSuspension,
                }
            })

            const retour = await tx.retour_demande_qr.create({
                data: {
                    form_id: retourForm.id,
                    demande_id: demande.id,
                    type: 'suspension',
                },
            })

            await tx.demande_qr.update({
                where: {
                    id: demande.id,
                },
                data: {
                    statut: 'suspendue',
                }
            })

            return {
                retourForm, retour,
            }
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleDemandeur = await prisma.user_roles.findMany({
                where: { role_id: 15 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const demandeurs = roleDemandeur.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const subject = `SYSLIS - SUSPENSION DEMANDE DE QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>La demande de QR code(s) ${demande.id} a été suspendue par ${utilisateur.fullname}.</p>
                <p>Commentaire : <strong>${messageSuspension}</strong></p>
                <br>
                <br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...demandeurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Demande suspendue avec succès ! ")
        res.status(201).json({
            message: "Demande suspendue avec succès",
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la suspension de la demande de QR Codes :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour annuler la suspension d'une demande de QR code
const annulationSuspensionQr = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })

        if (!utilisateur) {
            console.error("Erreur : Utilisateur introuvable")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        const demande = await prisma.demande_qr.findUnique({
            where: {
                id: parseInt(id)
            }
        })
        if (!demande) {
            console.error('Demande introuvable !')
            return res.status(404).json({ message: "Demande introuvable !" });
        }

        const dateAction = new Date()

        const operation = await prisma.$transaction(async (tx) => {

            const retourForm = await tx.forms.create({
                data: {
                    type: 'retour_demande_qr',
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                }
            })

            const retour = await tx.retour_demande_qr.create({
                data: {
                    form_id: retourForm.id,
                    demande_id: demande.id,
                    type: 'annulation_suspension',
                },
            })

            await tx.demande_qr.update({
                where: {
                    id: demande.id,
                },
                data: {
                    statut: 'soumise',
                }
            })

            return {
                retourForm, retour,
            }
        })

        /*****************          GESTION MAIL             *****************/
        // Le mail est envoyé après la transaction : un échec d'envoi ne doit pas annuler l'opération.
        try {
            const roleDemandeur = await prisma.user_roles.findMany({
                where: { role_id: 15 },
                include: { users: true }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: { role_id: 22 },
                include: { users: true }
            })

            const demandeurs = roleDemandeur.map(us => us.users.email)
            const superviseurs = roleSupervision.map(us => us.users.email)

            const subject = `SYSLIS - ANNULATION SUSPENSION DEMANDE DE QR CODE(S)`;
            const html = `
                <p>Bonjour,</p>
                <p>La suspension de la demande de QR code(s) ${demande.id} a été annulée par ${utilisateur.fullname}.</p>
                <p><strong>La demande reprend son statut initial.</strong></p>
                <br>
                <br>
                <p>Green - Pay vous remercie.</p>
            `;

            // Dédoublonnage : un utilisateur peut avoir plusieurs rôles
            const destinataires = [...new Set([...demandeurs, ...superviseurs].filter(Boolean))];
            await sendMail({
                to: configEmail,
                bcc: destinataires,
                subject,
                html,
            });
        } catch (mailError) {
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log("Suspension annulée avec succès ! ")
        res.status(201).json({
            message: "Suspension annulée avec succès",
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de l'annulation de la suspension de la demande de QR Codes :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

module.exports = {
    getAllTypePaiement,
    faireDemandeQr,
    getAllDemandesQr,
    getOneDemandeQr,
    uploadDemandeQr,
    downloadQrCodes,
    impressionDemandeQr,
    livraisonDemandeQr,
    receptionDemandeQr,
    getAllFormatsQr,
    regularisationDemandeQrV2,
    getAllFormFiles,
    modifyDemandeQr,
    cancelDemandeQr,
    regularisationLivraisonDemandeQr,
    regularisationReceptionDemandeQr,
    extractMarchandsQr,
    getAllMarchandsQr,
    getCumulQrCodes,
    downloadTemplateQr,
    exportTotalDemandesQrToExcel,
    exportOneDemandeQrToExcel,
    getAllDataDemandeQr,
    getDataImpressionQr,
    suspendreDemandeQr,
    annulationSuspensionQr,
}