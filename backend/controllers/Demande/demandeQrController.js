const TEST_ENV = require("../../utils/consts")

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require("../../config/clouddinaryConifg");
const { get } = require("http");
const { urlToHttpOptions } = require("url");
const { type } = require("os");
const sendMail = require("../../utils/emailSender");
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
        if (newRegularisation) {
            const roleLivraison = await prisma.user_roles.findMany({
                where: {
                    role_id: 18,
                },
                include: {
                    users: true,
                }
            })
            const roleSupervision = await prisma.user_roles.findMany({
                where: {
                    role_id: 22,
                },
                include: {
                    users: true
                }
            })
            const livreurs = roleLivraison.map(us => us.users)
            const superviseurs = roleSupervision.map(us => us.users)

            let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            let link = `${url}/demande-qr-details/${newRegularisation.demande.id}`;

            if ((livreurs && livreurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
                const subject = `REGULARISATION DEMANDE QR CODE(S)`;
                let html = `
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
                for (const livreur of livreurs) {
                    await sendMail({
                        to: livreur.email,
                        subject,
                        html,
                    });
                }
                for (const superviseur of superviseurs) {
                    await sendMail({
                        to: superviseur.email,
                        subject,
                        html,
                    });
                }
            }
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

        const roleGenerateur = await prisma.user_roles.findMany({
            where: {
                role_id: 16,
            },
            include: {
                users: true
            }
        })

        const roleImpression = await prisma.user_roles.findMany({
            where: {
                role_id: 17,
            },
            include: {
                users: true
            }
        })

        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })

        const generateurs = roleGenerateur.map(us => us.users)
        const imprimeurs = roleImpression.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${newDemandeQr.demande.id}`;

        if ((generateurs && generateurs.length > 0) || (imprimeurs && imprimeurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `NOUVELLE DEMANDE DE QR CODE(S)`;
            let html = `
                <p>Bonjour,</p>
                <p>Une nouvelle demande de QR code(s) a été enregistrée.</p>
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
            for (const generateur of generateurs) {
                await sendMail({
                    to: generateur.email,
                    subject,
                    html,
                });
            }
            for (const imprimeur of imprimeurs) {
                await sendMail({
                    to: imprimeur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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

        const roleImpression = await prisma.user_roles.findMany({
            where: {
                role_id: 17,
            },
            include: {
                users: true
            }
        })
        const roleLivraison = await prisma.user_roles.findMany({
            where: {
                role_id: 18,
            },
            include: {
                users: true,
            }
        })
        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })
        const imprimeurs = roleImpression.map(us => us.users)
        const livreurs = roleLivraison.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${demande.id}`;

        if ((imprimeurs && imprimeurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `QR CODE(S) GÉNÉNÉRÉ(S)`;
            let html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été générés.</p>
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
            // for (const livreur of livreurs) {
            //     await sendMail({
            //         to: livreur.email,
            //         subject,
            //         html,
            //     });
            // }
            for (const imprimeur of imprimeurs) {
                await sendMail({
                    to: imprimeur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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

        const roleGenerateur = await prisma.user_roles.findMany({
            where: {
                role_id: 16,
            },
            include: {
                users: true
            }
        })
        const roleLivraison = await prisma.user_roles.findMany({
            where: {
                role_id: 18,
            },
            include: {
                users: true,
            }
        })
        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })
        const generateurs = roleGenerateur.map(us => us.users)
        const livreurs = roleLivraison.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${demande.id}`;

        if ((livreurs && livreurs.length > 0) || (generateurs && generateurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `IMPRESSION QR CODE(S)`;
            let html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été imprimés.</p>
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
            for (const livreur of livreurs) {
                await sendMail({
                    to: livreur.email,
                    subject,
                    html,
                });
            }
            for (const generateur of generateurs) {
                await sendMail({
                    to: generateur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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

        const roleReception = await prisma.user_roles.findMany({
            where: {
                role_id: 19,
            },
            include: {
                users: true
            }
        })
        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })
        const recepteurs = roleReception.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${demande.id}`;

        if ((recepteurs && recepteurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `LIVRAISON QR CODE(S)`;
            let html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été livrés.</p>
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
            for (const recepteur of recepteurs) {
                await sendMail({
                    to: recepteur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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

        const roleLivraison = await prisma.user_roles.findMany({
            where: {
                role_id: 18,
            },
            include: {
                users: true
            }
        })
        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })
        const livreurs = roleLivraison.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${demande.id}`;

        if ((livreurs && livreurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `RECEPTION QR CODE(S)`;
            let html = `
                <p>Bonjour,</p>
                <p>Les QR Codes de la demande ${demande.id} ont été réceptionnés.</p>
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
            for (const livreur of livreurs) {
                await sendMail({
                    to: livreur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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

        const roleGenerateur = await prisma.user_roles.findMany({
            where: {
                role_id: 16,
            },
            include: {
                users: true
            }
        })

        const roleImpression = await prisma.user_roles.findMany({
            where: {
                role_id: 17,
            },
            include: {
                users: true
            }
        })

        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })

        const generateurs = roleGenerateur.map(us => us.users)
        const imprimeurs = roleImpression.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${updatedDemandeQr.demande.id}`;

        if ((generateurs && generateurs.length > 0) || (imprimeurs && imprimeurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `MODIFICATION DEMANDE DE QR CODE(S)`;
            let html = `
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
            for (const generateur of generateurs) {
                await sendMail({
                    to: generateur.email,
                    subject,
                    html,
                });
            }
            for (const imprimeur of imprimeurs) {
                await sendMail({
                    to: imprimeur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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
        } = req.body

        const canceledDemande = await prisma.$transaction(async (tx) => {
            const demande = await tx.demande_qr.findUnique({
                where: {
                    id: parseInt(id)
                }
            })
            if (!demande) {
                console.error('Demande introuvable !')
                return res.status(404).json({ message: "Demande introuvable !" });
            }
            await tx.forms.update({
                where: {
                    id: demande.form_id
                },
                data: {
                    updated_by: parseInt(userId),
                    updated_at: new Date(),
                    last_modified_at: new Date(),
                    is_deleted: true
                }
            });
            await tx.fichiers.updateMany({
                where: {
                    form_id: demande.form_id,
                },
                data: {
                    is_deleted: true,
                }
            })
            return {
                demande
            }
        })

        /*****************          GESTION MAIL             *****************/

        const roleGenerateur = await prisma.user_roles.findMany({
            where: {
                role_id: 16,
            },
            include: {
                users: true
            }
        })

        const roleImpression = await prisma.user_roles.findMany({
            where: {
                role_id: 17,
            },
            include: {
                users: true
            }
        })

        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })

        const generateurs = roleGenerateur.map(us => us.users)
        const imprimeurs = roleImpression.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        if ((generateurs && generateurs.length > 0) || (imprimeurs && imprimeurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `ANNULATION DEMANDE DE QR CODE(S)`;
            let html = `
                <p>Bonjour,</p>
                <p>la demande de QR code(s) ${canceledDemande.demande.id} a été annulée.</p>
                <p><strong>Plus d'actions ne seront menées sur cette demande</strong</p>
                <br>
                <br>
                <br>
                <p>Green - Pay vous remercie.</p>
            `;
            for (const generateur of generateurs) {
                await sendMail({
                    to: generateur.email,
                    subject,
                    html,
                });
            }
            for (const imprimeur of imprimeurs) {
                await sendMail({
                    to: imprimeur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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

        const roleReception = await prisma.user_roles.findMany({
            where: {
                role_id: 19,
            },
            include: {
                users: true
            }
        })
        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })
        const recepteurs = roleReception.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${demande.id}`;

        if ((recepteurs && recepteurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `REGULARISATION LIVRAISON QR CODE(S)`;
            let html = `
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
            for (const recepteur of recepteurs) {
                await sendMail({
                    to: recepteur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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

        const roleLivraison = await prisma.user_roles.findMany({
            where: {
                role_id: 18,
            },
            include: {
                users: true
            }
        })
        const roleSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 22,
            },
            include: {
                users: true
            }
        })
        const livreurs = roleLivraison.map(us => us.users)
        const superviseurs = roleSupervision.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/demande-qr-details/${demande.id}`;

        if ((livreurs && livreurs.length > 0) || (superviseurs && superviseurs.length > 0)) {
            const subject = `REGULARISATION RECEPTION QR CODE(S)`;
            let html = `
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
            for (const livreur of livreurs) {
                await sendMail({
                    to: livreur.email,
                    subject,
                    html,
                });
            }
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
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
    if (typeof cell.value === "object" && cell.value.richText) {
        return cell.value.richText.map(t => t.text).join("");
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
        await workbook.xlsx.load(file.buffer);
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
            "TYPE",
            "FORMAT",
            "CHAINE",
            "POINT MARCHAND",
            "NBRE TPE",
            "NBRE COPIE"
        ];

        for (const header of requiredHeaders) {
            if (!headers[header]) {
                console.log(`Colonne requise manquante : ${header}`)
                return res.status(400).json({
                    message: `Missing required column: ${header}`
                });
            }
        }

        const marchands = [];
        const uniqueKeys = new Set();
        let duplicateError = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const marchand = {
                typeQr: String(getCellValue(row.getCell(headers["TYPE"]))),
                format: String(getCellValue(row.getCell(headers["FORMAT"]))),
                chaine: String(getCellValue(row.getCell(headers["CHAINE"]))),
                marchand: String(getCellValue(row.getCell(headers["POINT MARCHAND"]))),
                nbreTpe: Number(getCellValue(row.getCell(headers["NBRE TPE"]))),
                nbreCopie: Number(getCellValue(row.getCell(headers["NBRE COPIE"]))),
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
                message: `Doublon trouvé à la ligne ${duplicateError.rowNumber} pour le marchand ${duplicateError.marchand.marchand} avec le type ${duplicateError.marchand.typeQr} et le format ${duplicateError.marchand.format}`,
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
}