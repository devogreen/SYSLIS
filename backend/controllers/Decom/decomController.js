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

const faireDecom = async (req, res) => {
    try {
        const {
            commentaire,
            listeDecom,
            quantite,
            userId,
        } = req.body

        const files = req.files?.files || [];
        const files_content = files.length ? files.map(file => ({
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

        const details = typeof listeDecom === "string" ? JSON.parse(listeDecom) : listeDecom;

        const dateAction = new Date()

        const decom = await prisma.$transaction(async (tx) => {
            const decomForm = await tx.forms.create({
                data: {
                    type: 'decom',
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                    created_by: utilisateur.id_user,
                }
            })
            const nouveauDecom = await tx.form_decom.create({
                data: {
                    statut: 'en_cours',
                    quantite: parseInt(quantite),
                    liste_decom: JSON.stringify(details),
                    form_id: decomForm.id,
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
                        form_id: decomForm.id,
                        type_formulaire: 'decom',
                        role: 'livreur',
                        created_at: dateAction,
                    }))
                })
            }

            return {
                decomForm,
                nouveauDecom,
            }
        })

        /****************    GESTION DES MAILS     *****************/

        console.log("Décommissionnement enregistré avec succès ! ")
        res.status(201).json({
            message: "Décommissionnement enregistré avec succès !",
            data: decom,
        });
    } catch (error) {
        console.error("Erreur lors du décommissionnement :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const getAllDecoms = async (req, res) => {
    try {
        const decoms = await prisma.form_decom.findMany({
            include: {
                forms: true,
                reception_decom: {
                    include: {
                        forms: true,
                    },
                },
                retour_technique: {
                    include: {
                        forms: true,
                    },
                },
            },
            orderBy: {
                forms: {
                    last_modified_at: 'desc',
                }
            },
        });

        res.status(200).json(decoms);
    } catch (error) {
        console.error("Erreur lors de la récupération des décoms :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des décoms", error });
    }
}

const getOneDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params

        const decom = await prisma.form_decom.findUnique({
            where: {
                id: parseInt(id)
            }, include: {
                forms: true,
                reception_decom: {
                    include: {
                        forms: true,
                    },
                },
                retour_technique: {
                    include: {
                        forms: true,
                    },
                },
            },
        })
        console.log(`Décommissionnement ${id}`)
        res.status(200).json(decom);
    } catch (error) {
        console.error("Erreur lors de la récupération du décommissionnement : ", error)
        res.status(500).json({ message: "Erreur lors de la récupération du décommissionnement : ", error });
    }
}

const modifyDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            commentaire,
            listeDecom,
            quantite,
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

        const details = typeof listeDecom === "string"
            ? JSON.parse(listeDecom)
            : listeDecom;

        const dateAction = new Date()

        const updatedDecom = await prisma.$transaction(async (tx) => {
            const decom = await tx.form_decom.findUnique({
                where: {
                    id: parseInt(id)
                }
            })
            const decomForm = await tx.forms.findUnique({
                where: {
                    id: decom.form_id
                }
            })
            await tx.forms.update({
                where: {
                    id: decomForm.id
                },
                data: {
                    updated_by: utilisateur.id_user,
                    updated_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            })
            await tx.form_decom.update({
                where: {
                    id: parseInt(id)
                },
                data: {
                    statut: 'en_cours',
                    quantite: Number(quantite),
                    liste_decom: JSON.stringify(details),
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
                        form_id: decomForm.id,
                        type_formulaire: 'decom',
                        role: 'livreur',
                        created_at: dateAction,
                    }))
                })
            }

            return {
                decomForm, decom
            }
        })

        /*****************          GESTION MAIL             *****************/


        console.log("Décommissionnement modifié avec succès ! ")
        res.status(201).json({
            message: "Décommissionnement modifié avec succès",
            data: updatedDecom,
        });

    } catch (error) {
        console.error("Erreur lors de la modification du décommissionnement :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const cancelDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
        } = req.body

        const dateAction = new Date()

        const canceledDecom = await prisma.$transaction(async (tx) => {
            const decom = await tx.form_decom.findUnique({
                where: {
                    id: parseInt(id)
                }
            })
            if (!decom) {
                console.error('Décommissionnement introuvable !')
                return res.status(404).json({ message: "decom introuvable !" });
            }
            const decomForm = await tx.forms.findUnique({
                where: {
                    id: decom.form_id
                }
            })
            if (decomForm.is_deleted) {
                console.error('Décommissionnement déjà annulé !')
                return res.status(400).json({ message: "Décommissionnement déjà annulé !" });
            }
            await tx.forms.update({
                where: {
                    id: decom.form_id
                },
                data: {
                    updated_by: parseInt(userId),
                    updated_at: dateAction,
                    last_modified_at: dateAction,
                    is_deleted: true
                }
            });
            await tx.fichiers.updateMany({
                where: {
                    form_id: decom.form_id,
                },
                data: {
                    is_deleted: true,
                }
            })
            return {
                decom,
                decomForm,
            }
        })

        /*****************          GESTION MAIL             *****************/

        console.log(`Décommissionnement annulé avec succès par : ${userId}! `)
        res.status(201).json({
            message: "Décommissionnement annulé avec succès",
            data: canceledDecom,
        });
    } catch (error) {
        console.error("Erreur lors de l'annulation du décommissionnement :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const receptionDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
            commentaire,
        } = req.body

        const decom = await prisma.form_decom.findUnique({
            where: {
                id: parseInt(id),
            },
        })
        if (!decom) {
            console.error('Erreur: décommissionnement introuvale !')
            return res.status(404).json({ message: "decom introuvable !" });
        }
        if (decom.statut != 'en_cours') {
            console.error('Statut de décommissionnement non conforme !')
            return res.status(400).json({ message: "Statut de décommissionnement non conforme !" });
        }
        const decomForm = await prisma.forms.findUnique({
            where: {
                id: decom.form_id
            }
        })
        if (decomForm.is_deleted) {
            console.error('Décommissionnement annulé !')
            return res.status(400).json({ message: "Décommissionnement annulé !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })
        if (!utilisateur) {
            console.error('Utilisateur non enregistré !')
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }

        const listeDecom = typeof decom.liste_decom === "string"
            ? JSON.parse(decom.liste_decom)
            : decom.liste_decom;
        
        const dateAction = new Date()

        const receptionDecom = await prisma.$transaction(async (tx) => {
            const receptionForm = await tx.forms.create({
                data: {
                    type: 'reception_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            })
            const reception = await tx.reception_decom.create({
                data: {
                    form_id: receptionForm.id,
                    decom_id: decom.id,
                    type: 'validation',
                }
            })
            await tx.form_decom.update({
                where: {
                    id: decom.id,
                },
                data: {
                    statut: 'recu',
                },
            })
            await tx.sn_decom.createMany({
                data: listeDecom.map((item) => ({
                    serial_number: item.terminalSN,
                    point_marchand: item.pointMarchand,
                    tid_gim: item.idGim,
                    tid_ecobank: item.idEcobank,
                    etat: item.etat,
                    ri: item.RI,
                    commercial: item.nomCommercial,
                    commentaire: item.commentaire,
                    created_at: dateAction,
                    decom_id: decom.id,
                }))
            })

            return {
                receptionForm, reception
            }
        })

        /************** GESTION DES MAILS  **************/
        
        console.log('Liste de décom réceptionnée avec succès !')
        res.status(201).json({
            message: 'Liste de décom réceptionnée avec succès !',
            data: receptionDecom,
        });

    } catch (error) {
        console.error("Erreur lors de la réception :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const returnDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
            commentaire,
        } = req.body

        const decom = await prisma.form_decom.findUnique({
            where: {
                id: parseInt(id),
            },
        })
        if (!decom) {
            console.error('Erreur: décommissionnement introuvale !')
            return res.status(404).json({ message: "decom introuvable !" });
        }
        if (decom.statut != 'en_cours') {
            console.error('Statut de décommissionnement non conforme !')
            return res.status(400).json({ message: "Statut de décommissionnement non conforme !" });
        }
        const decomForm = await prisma.forms.findUnique({
            where: {
                id: decom.form_id
            }
        })
        if (decomForm.is_deleted) {
            console.error('Décommissionnement annulé !')
            return res.status(400).json({ message: "Décommissionnement annulé !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })
        if (!utilisateur) {
            console.error('Utilisateur non enregistré !')
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        
        const dateAction = new Date()

        const receptionDecom = await prisma.$transaction(async (tx) => {
            const receptionForm = await tx.forms.create({
                data: {
                    type: 'reception_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            })
            const reception = await tx.reception_decom.create({
                data: {
                    form_id: receptionForm.id,
                    decom_id: decom.id,
                    type: 'retour',
                }
            })
            await tx.form_decom.update({
                where: {
                    id: decom.id,
                },
                data: {
                    statut: 'retourne',
                },
            })

            return {
                receptionForm, reception
            }
        })

        /************** GESTION DES MAILS  **************/
        
        console.log('Liste de décom retournée avec succès !')
        res.status(201).json({
            message: 'Liste de décom retournée avec succès !',
            data: receptionDecom,
        });

    } catch (error) {
        console.error("Erreur lors de la réception :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const getSnDecom = async (req, res) => {
    // try {
    //     const {
    //         id
    //     } = req.params

    //     const 
    // }
}

module.exports = {
    faireDecom,
    getAllDecoms,
    getOneDecom,
    modifyDecom,
    cancelDecom,
    receptionDecom,
    returnDecom,
}