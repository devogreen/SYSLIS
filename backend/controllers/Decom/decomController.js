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
            dateDecom,
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

        let isReg = false
        let dateAction = new Date()
        const dateVer = new Date(dateDecom)
        if (!isNaN(dateVer.valueOf())) {
            dateAction = new Date(dateDecom)
            isReg = true
        }

        const decom = await prisma.$transaction(async (tx) => {
            const decomForm = await tx.forms.create({
                data: {
                    type: 'decom',
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                    created_by: utilisateur.id_user,
                    is_reg: isReg,
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

            /***************        GESTION DES TPE     *****************/

            let allTpes = null
            // Récupérer les SN de la liste
            const serials = details.map(item => item.terminalSN);

            // 1. Create only missing ones
            await tx.parc_tpe.createMany({
                data: serials.map(item => ({
                    serial_number: item,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: 8,
                })),
                skipDuplicates: true
            });

            if (isReg == false) {
                // 2. Update ALL (existing + newly created)
                await tx.parc_tpe.updateMany({
                    where: {
                        serial_number: { in: serials }
                    },
                    data: {
                        updated_by: utilisateur.id_user,
                        updated_at: dateAction,
                        last_modified_at: dateAction,
                        statut_id: 8,
                    }
                });
            } else {
                // Récupérer les TPE existants avec leur date de modification
                const existingTpesWithDates = await tx.parc_tpe.findMany({
                    where: {
                        serial_number: { in: serials }
                    },
                    select: {
                        serial_number: true,
                        last_modified_at: true,
                    }
                });

                // Créer une map pour accès rapide
                const tpeDateMap = new Map(
                    existingTpesWithDates.map(tpe => [
                        tpe.serial_number,
                        tpe.last_modified_at
                    ])
                );

                // Filtrer seulement ceux dont la date est plus ancienne
                const filteredToUpdate = serials.filter(item => {
                    const lastModified = tpeDateMap.get(item);

                    // Si aucune date existe, on autorise l'update
                    if (!lastModified) return true;

                    return new Date(lastModified) < new Date(dateAction);
                });

                // Faire les updates seulement pour ceux autorisés
                await Promise.all(
                    filteredToUpdate.map(item =>
                        tx.parc_tpe.update({
                            where: {
                                serial_number: item
                            },
                            data: {
                                updated_by: utilisateur.id_user,
                                updated_at: dateAction,
                                last_modified_at: dateAction,
                                statut_id: 8,
                            }
                        })
                    )
                );
            }

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
                    statut_id: 8,
                    form_id: decomForm.id,
                }))
            });

            return {
                decomForm,
                nouveauDecom,
                allTpes,
            }
        })

        /****************    GESTION DES MAILS     *****************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesReception = await prisma.user_roles.findMany({
            where: {
                role_id: 24,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const receveurs = rolesReception.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${decom.nouveauDecom.id}`;

        let subject = `NOUVEAU DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
            <p>Un nouveau décommissionnement a été soumis.</p>
            <ul>
            <li><strong>Nombre de TPE :</strong> ${quantite}</li>
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
        if (isReg) {
            subject = `RÉGULARISATION DECOMMISSIONNEMENT`;
            html = `
            <p>Bonjour,</p>
            <p>Une régularisation de décommissionnement a été soumise.</p>
            <ul>
            <li><strong>Nombre de TPE :</strong> ${quantite}</li>
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
        if (receveurs && receveurs.length > 0) {
            for (const receveur of receveurs) {
                await sendMail({
                    to: receveur.email,
                    subject,
                    html,
                });
            }
        }

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
                retour_decom: {
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
                retour_decom: {
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

            /***************        GESTION DES TPE     *****************/

            let allTpes = null
            // Récupérer les SN de la liste
            const serials = details.map(item => item.terminalSN);

            // 1. Create only missing ones
            await tx.parc_tpe.createMany({
                data: serials.map(item => ({
                    serial_number: item,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: 8,
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
                    statut_id: 8,
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
                    statut_id: 8,
                    form_id: decomForm.id,
                }))
            });

            return {
                decomForm, decom, allTpes
            }
        })

        /*****************          GESTION MAIL             *****************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesReception = await prisma.user_roles.findMany({
            where: {
                role_id: 24,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const receveurs = rolesReception.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${updatedDecom.decom.id}`;

        const subject = `MODIFICATION DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
            <p>Le décommissionnement ${updatedDecom.decom.id} a été modifié.</p>
            <ul>
            <li><strong>Nombre de TPE :</strong> ${quantite}</li>
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
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        if (receveurs && receveurs.length > 0) {
            for (const receveur of receveurs) {
                await sendMail({
                    to: receveur.email,
                    subject,
                    html,
                });
            }
        }

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

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesReception = await prisma.user_roles.findMany({
            where: {
                role_id: 24,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const receveurs = rolesReception.map(us => us.users)

        // let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${canceledDecom.decom.id}`;

        const subject = `ANNULATION DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
                <p>Le décommissionnement ${canceledDecom.decom.id} a été annulé.</p>
                <p><strong>Plus d'actions ne seront menées sur cette demande</strong</p>
                <br>
                <br>
                <br>
                <p>Green - Pay vous remercie.</p>
        `;
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        if (receveurs && receveurs.length > 0) {
            for (const receveur of receveurs) {
                await sendMail({
                    to: receveur.email,
                    subject,
                    html,
                });
            }
        }

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
            date_reception,
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

        const addOneSecond = (date) => new Date(new Date(date).getTime() + 2000);

        let isReg = false
        let dateAction = new Date()
        const dateVer = new Date(date_reception)
        if (!isNaN(dateVer.valueOf())) {
            dateAction = addOneSecond(date_reception)
            isReg = true
        }

        const receptionDecom = await prisma.$transaction(async (tx) => {
            const receptionForm = await tx.forms.create({
                data: {
                    type: 'reception_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                    is_reg: isReg,
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
                    banque: item.banque,
                    etat: item.etat,
                    ri: item.RI,
                    commercial: item.nomCommercial,
                    commentaire: item.commentaire,
                    created_at: dateAction,
                    decom_id: decom.id,
                    last_modified_at: dateAction,
                }))
            })

            // Récupérer les SN de la liste
            const serials = listeDecom.map(item => item.terminalSN);

            // Récupérer les TPE déjà enregistrés dans le PARC
            const existingTpes = await tx.parc_tpe.findMany({
                where: {
                    serial_number: { in: serials }
                },
                select: {
                    id: true,
                    serial_number: true
                }
            });
            // Faire une liste SN, ID pour les TPE déjà enregistrés
            const existingMap = new Map(
                existingTpes.map(e => [e.serial_number, e.id])
            );

            const toCreate = [];
            const toUpdate = [];

            // Ajouter aux différentes liste à créer si les SN n'existent pas et à update s'ils existent
            listeDecom.forEach(item => {
                if (existingMap.has(item.terminalSN)) {
                    toUpdate.push(item);
                } else {
                    toCreate.push(item);
                }
            });

            // Créer les nouveaux TPE dans le PARC avec le statut qu'il faut
            if (toCreate.length > 0) {
                await tx.parc_tpe.createMany({
                    data: toCreate.map(item => ({
                        serial_number: item.terminalSN,
                        created_by: utilisateur.id_user,
                        created_at: dateAction,
                        last_modified_at: dateAction,
                        statut_id: 9,
                    }))
                });
            }

            if (isReg == false) {
                // Mettre à jour les anciens TPE dans le PARC avec le nouveau statut
                await Promise.all(
                    toUpdate.map(item =>
                        tx.parc_tpe.update({
                            where: { serial_number: item.terminalSN },
                            data: {
                                updated_by: utilisateur.id_user,
                                updated_at: dateAction,
                                last_modified_at: dateAction,
                                statut_id: 9,
                            }
                        })
                    )
                );
            } else {
                // Récupérer les TPE existants avec leur date de modification
                const existingTpesWithDates = await tx.parc_tpe.findMany({
                    where: {
                        serial_number: {
                            in: toUpdate.map(item => item.terminalSN)
                        }
                    },
                    select: {
                        serial_number: true,
                        last_modified_at: true,
                    }
                });

                // Créer une map pour accès rapide
                const tpeDateMap = new Map(
                    existingTpesWithDates.map(tpe => [
                        tpe.serial_number,
                        tpe.last_modified_at
                    ])
                );

                // Filtrer seulement ceux dont la date est plus ancienne
                const filteredToUpdate = toUpdate.filter(item => {
                    const lastModified = tpeDateMap.get(item.terminalSN);

                    // Si aucune date existe, on autorise l'update
                    if (!lastModified) return true;

                    return new Date(lastModified) <= new Date(dateAction);
                });

                // Faire les updates seulement pour ceux autorisés
                await Promise.all(
                    filteredToUpdate.map(item =>
                        tx.parc_tpe.update({
                            where: {
                                serial_number: item.terminalSN
                            },
                            data: {
                                updated_by: utilisateur.id_user,
                                updated_at: dateAction,
                                last_modified_at: dateAction,
                                statut_id: 9,
                            }
                        })
                    )
                );
            }

            // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
            const allTpes = await tx.parc_tpe.findMany({
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
                    statut_id: 9,
                    form_id: decomForm.id,
                }))
            });

            return {
                receptionForm, reception
            }
        })

        /************** GESTION DES MAILS  **************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesVerification = await prisma.user_roles.findMany({
            where: {
                role_id: 25,
            },
            include: {
                users: true
            }
        })
        const rolesDecom = await prisma.user_roles.findMany({
            where: {
                role_id: 23,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const verificateurs = rolesVerification.map(us => us.users)
        const demandeurs = rolesDecom.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${decom.id}`;

        const subject = `RECEPTION DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
            <p>Le décommissionnement ${decom.id} a été réceptionné.</p>
            <ul>
            <li><strong>Nombre de TPE :</strong> ${decom.quantite}</li>
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
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        if (verificateurs && verificateurs.length > 0) {
            for (const verificateur of verificateurs) {
                await sendMail({
                    to: verificateur.email,
                    subject,
                    html,
                });
            }
        }
        if (demandeurs && demandeurs.length > 0) {
            for (const demandeur of demandeurs) {
                await sendMail({
                    to: demandeur.email,
                    subject,
                    html,
                });
            }
        }

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

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesVerification = await prisma.user_roles.findMany({
            where: {
                role_id: 25,
            },
            include: {
                users: true
            }
        })
        const rolesDecom = await prisma.user_roles.findMany({
            where: {
                role_id: 23,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const verificateurs = rolesVerification.map(us => us.users)
        const demandeurs = rolesDecom.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${decom.id}`;

        const subject = `RETOUR DE DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
            <p>Le décommissionnement ${decom.id} a été retourné pour modification ou annulation.</p>
            <ul>
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
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        // if (verificateurs && verificateurs.length > 0) {
        //     for (const verificateur of verificateurs) {
        //         await sendMail({
        //             to: verificateur.email,
        //             subject,
        //             html,
        //         });
        //     }
        // }
        if (demandeurs && demandeurs.length > 0) {
            for (const demandeur of demandeurs) {
                await sendMail({
                    to: demandeur.email,
                    subject,
                    html,
                });
            }
        }

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
    try {
        const {
            id
        } = req.params

        const decom = await prisma.form_decom.findUnique({
            where: {
                id: parseInt(id),
            },
        })
        if (!decom) {
            console.error('Erreur: décommissionnement introuvale !')
            return res.status(404).json({ message: "decom introuvable !" });
        }

        const listeSn = await prisma.sn_decom.findMany({
            where: {
                decom_id: parseInt(id),
            },
            include: {
                retour_technique: {
                    include: {
                        forms: true,
                    },
                },
            },
        })
        res.status(200).json(listeSn);
    } catch (error) {
        console.error("Erreur lors de la récupération des sn décom :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des sn décom", error });
    }
}

const verifyDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
            commentaire,
            checkMail,
            listeDecom,
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
        if (decom.statut != 'recu') {
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

        const listeVerified = typeof listeDecom === "string"
            ? JSON.parse(listeDecom)
            : listeDecom;

        const dateAction = new Date()

        const statutMap = {
            parametrage: 'parametrage',
            rebus: 'rebus',
            rebut: 'rebus',
            checking: 'checking',
        };

        const verification = await prisma.$transaction(async (tx) => {
            const retourDecomForm = await tx.forms.create({
                data: {
                    type: 'retour_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            })
            const retourDecom = await tx.retour_decom.create({
                data: {
                    form_id: retourDecomForm.id,
                    decom_id: decom.id,
                }
            })

            const retourTechPromises = listeVerified.map(item =>
                tx.forms.create({
                    data: {
                        type: 'retour_technique',
                        created_by: utilisateur.id_user,
                        created_at: dateAction,
                        last_modified_at: dateAction,
                        nom_user: utilisateur.fullname,
                    }
                })
            );

            const retourTechForms = await Promise.all(retourTechPromises);

            await Promise.all(
                retourTechForms.map((form, index) => {
                    const item = listeVerified[index];

                    return tx.retour_technique.create({
                        data: {
                            form_id: form.id,
                            decom_id: decom.id,
                            retour_id: retourDecom.id,
                            sn_id: item.id,
                            commentaire_retour: item.retour,
                            pieces_recuperees: item.pieces_recuperees,
                            pieces_defectueuses: item.pieces_defectueuses,
                            is_ok: item.is_ok,
                            statut: statutMap[item.statut],
                        }
                    });
                })
            );

            await Promise.all(
                listeVerified.map(item =>
                    tx.sn_decom.update({
                        where: { id: item.id },
                        data: {
                            commentaire_retour: item.retour,
                            pieces_recuperees: item.pieces_recuperees,
                            pieces_defectueuses: item.pieces_defectueuses,
                            is_ok: item.is_ok,
                            statut: statutMap[item.statut],
                            updated_at: dateAction,
                            last_modified_at: dateAction,
                        }
                    })
                )
            );

            return {
                retourDecomForm, retourDecom
            }
        })

        /***********      GESTION DES TPE     ************/

        // const statutMap = {
        //     parametrage: 4,
        //     rebus: 5,
        // };

        // // Récupérer les SN de la liste
        // const serials = listeVerified.map(item => item.serial_number);

        // // Récupérer les TPE déjà enregistrés dans le PARC
        // const existingTpes = await prisma.parc_tpe.findMany({
        //     where: {
        //         serial_number: { in: serials }
        //     },
        //     select: {
        //         id: true,
        //         serial_number: true
        //     }
        // });
        // // Faire une liste SN, ID pour les TPE déjà enregistrés
        // const existingMap = new Map(
        //     existingTpes.map(e => [e.serial_number, e.id])
        // );

        // const toCreate = [];
        // const toUpdate = [];

        // // Ajouter aux différentes liste à créer si les SN n'existent pas et à update s'ils existent
        // listeVerified.forEach(item => {
        //     if (existingMap.has(item.serial_number)) {
        //         toUpdate.push(item);
        //     } else {
        //         toCreate.push(item);
        //     }
        // });

        // // Créer les nouveaux TPE dans le PARC avec le statut qu'il faut
        // if (toCreate.length > 0) {
        //     await prisma.parc_tpe.createMany({
        //         data: toCreate.map(item => ({
        //             serial_number: item.serial_number,
        //             created_by: utilisateur.id_user,
        //             created_at: dateAction,
        //             last_modified_at: dateAction,
        //             statut_id: statutMap[item.statut],
        //         }))
        //     });
        // }

        // // Mettre à jour les anciens TPE dans le PARC avec le nouveau statut
        // await Promise.all(
        //     toUpdate.map(item =>
        //         prisma.parc_tpe.update({
        //             where: { serial_number: item.serial_number },
        //             data: {
        //                 updated_by: utilisateur.id_user,
        //                 updated_at: dateAction,
        //                 last_modified_at: dateAction,
        //                 statut_id: statutMap[item.statut],
        //             }
        //         })
        //     )
        // );

        // // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
        // const allTpes = await prisma.parc_tpe.findMany({
        //     where: {
        //         serial_number: { in: serials }
        //     },
        //     select: {
        //         id: true,
        //         serial_number: true
        //     }
        // });

        // // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
        // await prisma.history_tpe.createMany({
        //     data: allTpes.map(tpe => {
        //         const item = listeVerified.find(
        //             i => i.serial_number === tpe.serial_number
        //         );

        //         return {
        //             id_tpe: tpe.id,
        //             created_by: utilisateur.id_user,
        //             created_at: dateAction,
        //             statut_id: statutMap[item.statut],
        //             form_id: decomForm.id,
        //         };
        //     })
        // });

        /************** GESTION DES MAILS  **************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesVerification = await prisma.user_roles.findMany({
            where: {
                role_id: 25,
            },
            include: {
                users: true
            }
        })
        const rolesDecom = await prisma.user_roles.findMany({
            where: {
                role_id: 23,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const verificateurs = rolesVerification.map(us => us.users)
        const demandeurs = rolesDecom.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${decom.id}`;

        const subject = `NOUVELLE VERIFICATION DE DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
            <p>Des vérifications ont été faites sur le décommissionnement ${decom.id}.</p>
            <ul>
            <li><strong>Nombre de TPE :</strong> ${listeVerified.length}</li>
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
        if (checkMail) {
            if (superviseurs && superviseurs.length > 0) {
                for (const superviseur of superviseurs) {
                    await sendMail({
                        to: superviseur.email,
                        subject,
                        html,
                    });
                }
            }
            if (demandeurs && demandeurs.length > 0) {
                for (const demandeur of demandeurs) {
                    await sendMail({
                        to: demandeur.email,
                        subject,
                        html,
                    });
                }
            }
        }

        console.log(`${listeVerified.length} de la liste de décom vérifié(s) avec succès par ${utilisateur.id_user} !`)
        res.status(201).json({
            message: `${listeVerified.length} de la liste de décom vérifié(s) avec succès par ${utilisateur.id_user} !`,
            data: verification,
        });

    } catch (error) {
        console.error("Erreur lors de la vérification :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const clotureDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
            commentaire,
            listeDecom,
            isReg,
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
        if (decom.statut != 'recu') {
            console.error('Statut de décommissionnement non conforme !')
            return res.status(400).json({ message: "Statut de décommissionnement non conforme !" });
        }
        if (decom.statut == 'clos') {
            console.error('Décommissionnement déjà clôturé !')
            return res.status(400).json({ message: "Décommissionnement déjà clôturé !" });
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

        const listeVerified = typeof listeDecom === "string"
            ? JSON.parse(listeDecom)
            : listeDecom;

        const dateAction = new Date()

        const addOneSecond = (date) => new Date(new Date(date).getTime() + 5000);

        const statutMap = {
            parametrage: 4,
            rebus: 5,
            rebut: 5,
        };

        const cloturation = await prisma.$transaction(async (tx) => {
            const retourDecomForm = await tx.forms.create({
                data: {
                    type: 'retour_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            })
            const retourDecom = await tx.retour_decom.create({
                data: {
                    form_id: retourDecomForm.id,
                    decom_id: decom.id,
                    type: 'cloture',
                },
            })
            await tx.form_decom.update({
                where: {
                    id: decom.id,
                },
                data: {
                    statut: 'clos',
                },
            })

            /***********      GESTION DES TPE     ************/

            // Récupérer les SN de la liste
            const serials = listeVerified.map(item => item.serial_number);

            // Récupérer les TPE déjà enregistrés dans le PARC
            const existingTpes = await tx.parc_tpe.findMany({
                where: {
                    serial_number: { in: serials }
                },
                select: {
                    id: true,
                    serial_number: true
                }
            });
            // Faire une liste SN, ID pour les TPE déjà enregistrés
            const existingMap = new Map(
                existingTpes.map(e => [e.serial_number, e.id])
            );

            const toCreate = [];
            const toUpdate = [];

            // Ajouter aux différentes liste à créer si les SN n'existent pas et à update s'ils existent
            listeVerified.forEach(item => {
                if (existingMap.has(item.serial_number)) {
                    toUpdate.push(item);
                } else {
                    toCreate.push(item);
                }
            });

            // Créer les nouveaux TPE dans le PARC avec le statut qu'il faut
            if (toCreate.length > 0) {
                await tx.parc_tpe.createMany({
                    data: toCreate.map(item => ({
                        serial_number: item.serial_number,
                        created_by: utilisateur.id_user,
                        created_at: item.created_at ? addOneSecond(item.created_at) : addOneSecond(dateAction),
                        last_modified_at: item.last_modified_at ? addOneSecond(item.last_modified_at) : addOneSecond(dateAction),
                        statut_id: statutMap[item.statut],
                    }))
                });
            }

            if (isReg == false) {
                // Mettre à jour les anciens TPE dans le PARC avec le nouveau statut
                await Promise.all(
                    toUpdate.map(item =>
                        tx.parc_tpe.update({
                            where: { serial_number: item.serial_number },
                            data: {
                                updated_by: utilisateur.id_user,
                                updated_at: item.updated_at ? addOneSecond(item.updated_at) : addOneSecond(dateAction),
                                last_modified_at: item.last_modified_at ? addOneSecond(item.last_modified_at) : addOneSecond(dateAction),
                                statut_id: statutMap[item.statut],
                            }
                        })
                    )
                );
            } else {
                // Récupérer les TPE existants avec leur date de modification
                const existingTpesWithDates = await tx.parc_tpe.findMany({
                    where: {
                        serial_number: {
                            in: toUpdate.map(item => item.serial_number)
                        }
                    },
                    select: {
                        serial_number: true,
                        last_modified_at: true,
                    }
                });

                // Créer une map pour accès rapide
                const tpeDateMap = new Map(
                    existingTpesWithDates.map(tpe => [
                        tpe.serial_number,
                        tpe.last_modified_at
                    ])
                );

                // Filtrer seulement ceux dont la date est plus ancienne
                const filteredToUpdate = toUpdate.filter(item => {
                    const lastModified = tpeDateMap.get(item.serial_number);

                    // Si aucune date existe, on autorise l'update
                    if (!lastModified) return true;

                    return new Date(lastModified) <= new Date(dateAction);
                });

                // Faire les updates seulement pour ceux autorisés
                await Promise.all(
                    filteredToUpdate.map(item =>
                        tx.parc_tpe.update({
                            where: {
                                serial_number: item.serial_number
                            },
                            data: {
                                updated_by: utilisateur.id_user,
                                updated_at: dateAction,
                                last_modified_at: dateAction,
                                statut_id: statutMap[item.statut],
                            }
                        })
                    )
                );
            }

            // Récupérer tous les TPE du parc maintenant qu'ils sont créés ou updated
            const allTpes = await tx.parc_tpe.findMany({
                where: {
                    serial_number: { in: serials }
                },
                select: {
                    id: true,
                    serial_number: true,
                }
            });

            const uniqueMap = new Map();

            listeVerified.forEach(item => {
                uniqueMap.set(item.serial_number, item);
            });

            const uniqueListeVerified = [...uniqueMap.values()];
            // Créer les nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
            await tx.history_tpe.createMany({
                data: allTpes.map(tpe => {
                    const item = uniqueListeVerified.find(
                        i => i.serial_number === tpe.serial_number
                    );

                    return {
                        id_tpe: tpe.id,
                        created_by: utilisateur.id_user,
                        created_at: item.created_at ? addOneSecond(item.created_at) : addOneSecond(dateAction),
                        statut_id: statutMap[item.statut],
                        form_id: decomForm.id,
                    };
                })
            });

            return {
                retourDecomForm,
                retourDecom,
                allTpes,
            }
        })


        /************ GESTION MAIL  ************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesVerification = await prisma.user_roles.findMany({
            where: {
                role_id: 25,
            },
            include: {
                users: true
            }
        })
        const rolesDecom = await prisma.user_roles.findMany({
            where: {
                role_id: 23,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const verificateurs = rolesVerification.map(us => us.users)
        const demandeurs = rolesDecom.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${decom.id}`;

        const subject = `CLOTURE DE DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
            <p>Le décommissionnement ${decom.id} a été clôturé.</p>
            <ul>
            <li><strong>Nombre de TPE :</strong> ${decom.quantite}</li>
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
        if (superviseurs && superviseurs.length > 0) {
            for (const superviseur of superviseurs) {
                await sendMail({
                    to: superviseur.email,
                    subject,
                    html,
                });
            }
        }
        if (demandeurs && demandeurs.length > 0) {
            for (const demandeur of demandeurs) {
                await sendMail({
                    to: demandeur.email,
                    subject,
                    html,
                });
            }
        }

        console.log(`Utilisateur ${userId} a cloturé le décommissionnement avec succès !`)
        res.status(201).json({
            message: `Utilisateur ${userId} a cloturé le décommissionnement avec succès !`,
            data: cloturation,
        });

    } catch (error) {
        console.error("Erreur lors de la cloture :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const regVerifyDecom = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            userId,
            commentaire,
            checkMail,
            listeDecom,
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
        if (decom.statut != 'recu') {
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

        const listeVerified = typeof listeDecom === "string"
            ? JSON.parse(listeDecom)
            : listeDecom;

        const dateAction = new Date()

        const statutMap = {
            parametrage: 'parametrage',
            rebus: 'rebus',
            rebut: 'rebus',
            checking: 'checking',
        };

        const verification = await prisma.$transaction(async (tx) => {
            const retourDecomForm = await tx.forms.create({
                data: {
                    type: 'retour_decom',
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                }
            })
            const retourDecom = await tx.retour_decom.create({
                data: {
                    form_id: retourDecomForm.id,
                    decom_id: decom.id,
                }
            })

            const retourTechPromises = listeVerified.map(item =>
                tx.forms.create({
                    data: {
                        type: 'retour_technique',
                        created_by: utilisateur.id_user,
                        created_at: dateAction,
                        last_modified_at: dateAction,
                        nom_user: utilisateur.fullname,
                    }
                })
            );

            const retourTechForms = await Promise.all(retourTechPromises);

            await Promise.all(
                retourTechForms.map((form, index) => {
                    const item = listeVerified[index];

                    return tx.retour_technique.create({
                        data: {
                            form_id: form.id,
                            decom_id: decom.id,
                            retour_id: retourDecom.id,
                            sn_id: item.id,
                            commentaire_retour: item.retour,
                            pieces_recuperees: item.pieces_recuperees,
                            pieces_defectueuses: item.pieces_defectueuses,
                            is_ok: item.is_ok,
                            statut: statutMap[item.statut],
                        }
                    });
                })
            );

            await Promise.all(
                listeVerified.map(item =>
                    tx.sn_decom.update({
                        where: { id: item.id },
                        data: {
                            commentaire_retour: item.retour,
                            pieces_recuperees: item.pieces_recuperees,
                            pieces_defectueuses: item.pieces_defectueuses,
                            is_ok: item.is_ok,
                            statut: statutMap[item.statut],
                            updated_at: item.date ? new Date(item.date) : dateAction,
                            last_modified_at: item.date ? new Date(item.date) : dateAction,
                        }
                    })
                )
            );

            return {
                retourDecomForm, retourDecom
            }
        })

        /************** GESTION DES MAILS  **************/

        const rolesSupervision = await prisma.user_roles.findMany({
            where: {
                role_id: 26,
            },
            include: {
                users: true
            }
        })
        const rolesVerification = await prisma.user_roles.findMany({
            where: {
                role_id: 25,
            },
            include: {
                users: true
            }
        })
        const rolesDecom = await prisma.user_roles.findMany({
            where: {
                role_id: 23,
            },
            include: {
                users: true
            }
        })
        const superviseurs = rolesSupervision.map(us => us.users)
        const verificateurs = rolesVerification.map(us => us.users)
        const demandeurs = rolesDecom.map(us => us.users)

        let commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

        const url = GENERAL_URL
        let link = `${url}/decom-details/${decom.id}`;

        const subject = `REGULARISATION DE VERIFICATION DE DECOMMISSIONNEMENT`;
        let html = `
            <p>Bonjour,</p>
            <p>Des vérifications ont été faites sur le décommissionnement ${decom.id}.</p>
            <ul>
            <li><strong>Nombre de TPE :</strong> ${listeVerified.length}</li>
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
        if (checkMail) {
            if (superviseurs && superviseurs.length > 0) {
                for (const superviseur of superviseurs) {
                    await sendMail({
                        to: superviseur.email,
                        subject,
                        html,
                    });
                }
            }
            if (demandeurs && demandeurs.length > 0) {
                for (const demandeur of demandeurs) {
                    await sendMail({
                        to: demandeur.email,
                        subject,
                        html,
                    });
                }
            }
        }

        console.log(`${listeVerified.length} de la liste de décom vérifié(s) avec succès !`)
        res.status(201).json({
            message: `${listeVerified.length} de la liste de décom vérifié(s) avec succès !`,
            data: verification,
        });

    } catch (error) {
        console.error("Erreur lors de la vérification :", error);
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

const isOnlyDigits = (str) => /^\d+$/.test(str);

// Fonction d'extraction d'une liste de décommissionnement par fichier excel
const extractDecom = async (req, res) => {
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
            "PDV",
            "CAISSE",
            "SN",
            "ETAT",
            "RI",
            "BANQUE",
            "TID GIM",
            "TID ECOBANK",
            "COMMERCIAL",
            "COMMENTAIRE",
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
        let invalidRowError = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const pdv = String(getCellValue(row.getCell(headers["PDV"])) || "").trim();
            const caisse = String(getCellValue(row.getCell(headers["CAISSE"])) || "").trim();
            const sn = String(getCellValue(row.getCell(headers["SN"])) || "").trim();
            const etat = String(getCellValue(row.getCell(headers["ETAT"])) || "").trim();
            const ri = String(getCellValue(row.getCell(headers["RI"])) || "").trim();
            const banque = String(getCellValue(row.getCell(headers["BANQUE"])) || "").trim();
            const tid_gim = String(getCellValue(row.getCell(headers["TID GIM"])) || "").trim();
            const tid_ecobank = String(getCellValue(row.getCell(headers["TID ECOBANK"])) || "").trim();
            const commercial = String(getCellValue(row.getCell(headers["COMMERCIAL"])) || "").trim();
            const commentaire = String(getCellValue(row.getCell(headers["COMMENTAIRE"])) || "").trim();

            // Ignore les lignes vides ou inutiles
            if (!pdv || !sn || !caisse) {
                return;
            }
            if (sn && (sn.length != 10 || !isOnlyDigits(sn))) {
                invalidRowError = {
                    rowNumber,
                    marchand: { sn }
                };
                return;
            }

            const marchand = {
                pdv,
                caisse,
                sn,
                etat,
                ri: ri.toLowerCase() === "ok" ? "ok" : ri.toLowerCase() === "nok" ? "nok" : "",
                commercial,
                commentaire,
                banque,
                tid_gim,
                tid_ecobank,
            };

            const key = `${marchand.sn}`;
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
                message: `Doublon de SN trouvé à la ligne ${duplicateError.rowNumber} pour le marchand ${duplicateError.marchand.marchand} avec le SN ${duplicateError.marchand.sn}`,
            });
        }

        if (invalidRowError) {
            return res.status(400).json({
                message: `S/N invalide à la ligne ${invalidRowError.rowNumber} pour le TPE ${invalidRowError.marchand.sn}`,
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

// Fonction pour télécharger le template de décommissionnement au format Excel.
const downloadTemplateDecom = async (req, res) => {
    try {
        const templateFile = 'template_decommissionnement.xlsx';
        const filePath = path.join(__dirname, "../../statics/templates/", templateFile);
        return res.download(filePath);

        console.log('Template de décommissionnement téléchargé avec succès !');
    } catch (error) {
        console.error('Erreur downloadTemplateDecom:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour télécharger un export excel d'une demande de décommissionnement et des vérifications techniques
const exportOneDecomToExcel = async (req, res) => {
    try {
        const { id } = req.params;

        const decom = await prisma.form_decom.findUnique({
            where: {
                id: parseInt(id)
            },
            include: {
                forms: true,
                sn_decom: true,
            }
        })

        if (!decom) {
            console.error('Décommissionnement introuvable !')
            return res.status(404).json({ message: "Décommissionnement introuvable !" });
        }

        if (decom.forms.is_deleted) {
            console.error('Décommissionnement annulé !')
            return res.status(400).json({ message: "Décommissionnement annulé !" });
        }

        const listeDecom = typeof decom.liste_decom === "string"
            ? JSON.parse(decom.liste_decom)
            : decom.liste_decom;

        const pieces = await prisma.items.findMany({
            where: {
                type: 'PIECE',
                is_deleted: false,
            }
        })
        const piecesMap = new Map(pieces.map(p => [p.id_piece, p.nom_piece]));

        const workbook = new ExcelJS.Workbook();

        const decomSheet = workbook.addWorksheet('Décommissionnement');
        const decomHeaders = [
            "Index",
            "Point Marchand",
            "Caisse",
            "S/N",
            "Banque",
            "TID GIM",
            "TID ECOBANK",
            "Etat",
            "RI",
            "Commercial",
            "Commentaire",
        ];
        const decomHeaderRow = decomSheet.addRow(decomHeaders);
        decomHeaderRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        const piecesHeaders = pieces.map((item) => {
            return item.nom_piece.toUpperCase()
        })

        const verificationSheet = workbook.addWorksheet('Vérifications');
        const verificationHeaders = [
            "Index",
            "Point Marchand",
            "S/N",
            "Commentaire de retour",
            ...piecesHeaders,
            "Statut",
        ];
        const verificationHeaderRow = verificationSheet.addRow(verificationHeaders);
        verificationHeaderRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        listeDecom.forEach((item, index) => {
            decomSheet.addRow([
                index + 1,
                item.pointMarchand,
                item.caisse,
                item.terminalSN,
                item.banque,
                item.idGim,
                item.idEcobank,
                item.etat,
                item.RI,
                item.nomCommercial,
                item.commentaire,
            ])
        });


        decom.sn_decom?.forEach((item, index) => {

            const listePiecesRecup = typeof item.pieces_recuperees === "string"
                ? JSON.parse(item.pieces_recuperees)
                : item.pieces_recuperees || [];

            const listePiecesDef = typeof item.pieces_defectueuses === "string"
                ? JSON.parse(item.pieces_defectueuses)
                : item.pieces_defectueuses || [];

            const piecesStatus = pieces.map(piece => {

                if (item.statut === "checking") {
                    return "";
                }

                if (listePiecesRecup.includes(piece.id_piece)) {
                    return "OK";
                }

                if (listePiecesDef.includes(piece.id_piece)) {
                    return "NOK";
                }

                return "";
            });

            const statut = item.statut == 'rebus' || item.statut == 'rebut' ? 'rebut' : item.statut

            verificationSheet.addRow([
                index + 1,
                item.point_marchand,
                item.serial_number,
                item.commentaire_retour,
                ...piecesStatus,
                statut,
            ]);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=decom_${id}.xlsx`
        );
        res.send(buffer);

        console.log('Export du décommissionnement téléchargé avec succès !');

    } catch (error) {
        console.error('Erreur exportOneDecomToExcel:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

module.exports = {
    faireDecom,
    getAllDecoms,
    getOneDecom,
    modifyDecom,
    cancelDecom,
    receptionDecom,
    returnDecom,
    getSnDecom,
    verifyDecom,
    clotureDecom,
    regVerifyDecom,
    extractDecom,
    downloadTemplateDecom,
    exportOneDecomToExcel,
}