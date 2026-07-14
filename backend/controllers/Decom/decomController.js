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
                    quantite: Number(quantite),
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

        let subject = `SYSLIS - NOUVEAU DECOMMISSIONNEMENT`;
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
            subject = `SYSLIS - RÉGULARISATION DECOMMISSIONNEMENT`;
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
        }, {
            timeout: 20000,
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

        const subject = `SYSLIS - RECEPTION DECOMMISSIONNEMENT`;
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
            // include: {
            //     retour_technique: {
            //         include: {
            //             forms: true,
            //         },
            //     },
            // },
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
            a_reparer: 'a_reparer',
        };

        // const dataUpdate = []

        // for (terminal of listeVerified) {
        //     dataUpdate.push({
        //         id: terminal.id,
        //         commentaire_retour: terminal.retour,
        //         pieces_recuperees: terminal.pieces_recuperees,
        //         pieces_defectueuses: terminal.pieces_defectueuses,
        //         is_ok: terminal.is_ok,
        //         statut: statutMap[terminal.statut],
        //         updated_at: dateAction,
        //         last_modified_at: dateAction,
        //     })
        // }

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

            // const retourTechPromises = listeVerified.map(item =>
            //     tx.forms.create({
            //         data: {
            //             type: 'retour_technique',
            //             created_by: utilisateur.id_user,
            //             created_at: dateAction,
            //             last_modified_at: dateAction,
            //             nom_user: utilisateur.fullname,
            //         }
            //     })
            // );

            // const retourTechForms = await Promise.all(retourTechPromises);

            // await Promise.all(
            //     retourTechForms.map((form, index) => {
            //         const item = listeVerified[index];

            //         return tx.retour_technique.create({
            //             data: {
            //                 form_id: form.id,
            //                 decom_id: decom.id,
            //                 retour_id: retourDecom.id,
            //                 sn_id: item.id,
            //                 commentaire_retour: item.retour,
            //                 pieces_recuperees: item.pieces_recuperees,
            //                 pieces_defectueuses: item.pieces_defectueuses,
            //                 is_ok: item.is_ok,
            //                 statut: statutMap[item.statut],
            //             }
            //         });
            //     })
            // );

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
        }, {
            timeout: 20000,
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

        const subject = `SYSLIS - NOUVELLE VERIFICATION DE DECOMMISSIONNEMENT`;
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
            a_reparer: 'a_reparer',
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

            // const retourTechPromises = listeVerified.map(item =>
            //     tx.forms.create({
            //         data: {
            //             type: 'retour_technique',
            //             created_by: utilisateur.id_user,
            //             created_at: dateAction,
            //             last_modified_at: dateAction,
            //             nom_user: utilisateur.fullname,
            //         }
            //     })
            // );

            // const retourTechForms = await Promise.all(retourTechPromises);

            // await Promise.all(
            //     retourTechForms.map((form, index) => {
            //         const item = listeVerified[index];

            //         return tx.retour_technique.create({
            //             data: {
            //                 form_id: form.id,
            //                 decom_id: decom.id,
            //                 retour_id: retourDecom.id,
            //                 sn_id: item.id,
            //                 commentaire_retour: item.retour,
            //                 pieces_recuperees: item.pieces_recuperees,
            //                 pieces_defectueuses: item.pieces_defectueuses,
            //                 is_ok: item.is_ok,
            //                 statut: statutMap[item.statut],
            //             }
            //         });
            //     })
            // );

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

        const subject = `SYSLIS - REGULARISATION DE VERIFICATION DE DECOMMISSIONNEMENT`;
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

// Clôture d'un décommissionnement.
// Gère plusieurs statuts + la régularisation : si un SN a déjà un statut courant
// et que la date de régularisation est antérieure, on crée UNIQUEMENT un historique
// de statut ; sinon le process complet se déroule (incl. le process rebut, identique
// à cloturerDemandeRebut, quand le statut vaut 'rebut'/'rebus').
//
// CONFIRM markers = à vérifier contre votre schéma Prisma.
const clotureDecom = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, commentaire, listeDecom, isReg } = req.body;

        const REBUT_STATUT_ID = 5;
        const A_REPARER_STATUT_ID = 11;
        const statutMap = {
            parametrage: 4,
            rebus: 5,
            rebut: 5,
            a_reparer: 11,
        };

        const reg = isReg === true || isReg === "true"; // normalise le booléen

        // ---- Validation ----
        const decom = await prisma.form_decom.findUnique({
            where: { id: parseInt(id, 10) },
        });
        if (!decom) {
            console.error("Décommissionnement introuvable !")
            return res.status(404).json({ message: "Décommissionnement introuvable !" });
        }
        if (decom.statut === "clos") {
            console.error("Décommissionnement déjà clôturé !")
            return res.status(400).json({ message: "Décommissionnement déjà clôturé !" });
        }
        if (decom.statut !== "recu") {
            console.error("Statut de décommissionnement non conforme !")
            return res.status(400).json({ message: "Statut de décommissionnement non conforme !" });
        }

        const decomForm = await prisma.forms.findUnique({
            where: { id: decom.form_id },
        });
        if (!decomForm) {
            console.error("Formulaire de décommissionnement introuvable !")
            return res.status(404).json({ message: "Formulaire de décommissionnement introuvable !" });
        }
        if (decomForm.is_deleted) {
            console.error("Décommissionnement annulé !")
            return res.status(400).json({ message: "Décommissionnement annulé !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId, 10) },
        });
        if (!utilisateur) {
            console.error("Utilisateur non enregistré !")
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }

        const listeVerified =
            typeof listeDecom === "string" ? JSON.parse(listeDecom) : listeDecom;
        if (!Array.isArray(listeVerified) || listeVerified.length === 0) {
            console.error("Liste de décommissionnement vide ou invalide.")
            return res.status(400).json({ message: "Liste de décommissionnement vide ou invalide." });
        }

        const dateAction = new Date();

        // ATTENTION : ajoute 5 secondes (et non 1). Conservé tel quel — à renommer si non voulu.
        const addOneSecond = (date) => new Date(new Date(date).getTime() + 5000);

        // CONFIRM : source de la date de régularisation d'une ligne.
        // C'est elle qui sert à décider si une régularisation est antérieure au statut courant.
        const getRegDate = (item) =>
            item.last_modified_at ? new Date(item.last_modified_at) : dateAction;

        // Dédoublonnage par SN (dernière occurrence gagne)
        const uniqueMap = new Map();
        listeVerified.forEach((item) => uniqueMap.set(item.serial_number, item));
        const uniqueItems = [...uniqueMap.values()];

        // ---- Validations métier AVANT la transaction ----
        const statutInconnu = uniqueItems.find((item) => statutMap[item.statut] === undefined);
        if (statutInconnu) {
            console.error(`Statut inconnu pour le terminal ${statutInconnu.serial_number} : ${statutInconnu.statut}`)
            return res.status(400).json({
                message: `Statut inconnu pour le terminal ${statutInconnu.serial_number} : ${statutInconnu.statut}`,
            });
        }

        // Pour les lignes 'rebut' : une pièce ne peut pas être à la fois fonctionnelle et défectueuse
        for (const item of uniqueItems) {
            if (statutMap[item.statut] !== REBUT_STATUT_ID) continue;
            const piecesRecup = typeof item.pieces_recuperees === "string" ? JSON.parse(item.pieces_recuperees) : item.pieces_recuperees;
            const piecesDef = typeof item.pieces_defectueuses === "string" ? JSON.parse(item.pieces_defectueuses) : item.pieces_defectueuses;
            const fonc = Array.isArray(piecesRecup) ? piecesRecup : [];
            const def = Array.isArray(piecesDef) ? piecesDef : [];
            const duplicates = fonc.filter((pieceId) => def.includes(pieceId));
            if (duplicates.length) {
                console.error(`Le terminal ${item.serial_number} présente des pièces à la fois fonctionnelles et défectueuses.`)
                return res.status(400).json({
                    message: `Le terminal ${item.serial_number} présente des pièces à la fois fonctionnelles et défectueuses.`,
                });
            }
        }

        // ---- Transaction (tout en séquentiel) ----
        const cloturation = await prisma.$transaction(async (tx) => {
            const retourDecomForm = await tx.forms.create({
                data: {
                    type: "retour_decom",
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                    commentaire,
                },
            });

            const retourDecom = await tx.retour_decom.create({
                data: {
                    form_id: retourDecomForm.id,
                    decom_id: decom.id,
                    type: "cloture",
                },
            });

            await tx.form_decom.update({
                where: { id: decom.id },
                data: { statut: "clos" },
            });

            /***********      GESTION DES TPE     ************/

            const serials = uniqueItems.map((item) => item.serial_number);

            // TPE déjà présents dans le parc, avec leur date de statut courant
            const existingTpes = await tx.parc_tpe.findMany({
                where: { serial_number: { in: serials } },
                select: { id: true, serial_number: true, last_modified_at: true },
            });
            const existingMap = new Map(existingTpes.map((e) => [e.serial_number, e]));

            // Partition : à créer / à mettre à jour (process complet) / historique seul (régul. antérieure)
            const proceedCreate = [];
            const proceedUpdate = [];
            const historyOnly = []; // régularisation antérieure au statut courant

            for (const item of uniqueItems) {
                const existing = existingMap.get(item.serial_number);
                if (!existing) {
                    proceedCreate.push(item); // pas encore au parc -> on crée, rien à comparer
                    continue;
                }
                const isBackdated =
                    reg &&
                    existing.last_modified_at &&
                    getRegDate(item) < new Date(existing.last_modified_at);

                if (isBackdated) historyOnly.push(item);
                else proceedUpdate.push(item);
            }

            // 1. Créer les nouveaux TPE
            if (proceedCreate.length) {
                await tx.parc_tpe.createMany({
                    data: proceedCreate.map((item) => ({
                        serial_number: item.serial_number,
                        created_by: utilisateur.id_user,
                        created_at: item.created_at ? addOneSecond(item.created_at) : addOneSecond(dateAction),
                        last_modified_at: item.last_modified_at
                            ? addOneSecond(item.last_modified_at)
                            : addOneSecond(dateAction),
                        statut_id: statutMap[item.statut],
                    })),
                });
            }

            // 2. Mettre à jour le statut courant des TPE existants non concernés par une régul. antérieure
            //    (update requiert serial_number @unique dans le schéma — CONFIRM)
            for (const item of proceedUpdate) {
                await tx.parc_tpe.update({
                    where: { serial_number: item.serial_number },
                    data: {
                        updated_by: utilisateur.id_user,
                        updated_at: dateAction,
                        last_modified_at: dateAction,
                        statut_id: statutMap[item.statut],
                    },
                });
            }

            // 3. Récupérer les ids de TOUS les SN (créés, mis à jour, ou historique seul)
            const allTpes = await tx.parc_tpe.findMany({
                where: { serial_number: { in: serials } },
                select: { id: true, serial_number: true },
            });
            const idBySerial = new Map(allTpes.map((t) => [t.serial_number, t.id]));

            // 4. Historique de statut pour TOUS (y compris les régularisations antérieures)
            await tx.history_tpe.createMany({
                data: uniqueItems.map((item) => ({
                    id_tpe: idBySerial.get(item.serial_number),
                    created_by: utilisateur.id_user,
                    created_at: item.created_at
                        ? addOneSecond(item.created_at)
                        : addOneSecond(getRegDate(item)),
                    statut_id: statutMap[item.statut],
                    form_id: decomForm.id,
                })),
            });

            // 5. Process REBUT — uniquement pour les lignes qui "proceed" (jamais les régul. antérieures)
            const rebutItems = [...proceedCreate, ...proceedUpdate].filter(
                (item) => statutMap[item.statut] === REBUT_STATUT_ID
            );

            // Process A_REPARER — idem, uniquement pour les lignes qui "proceed"
            const aReparerItems = [...proceedCreate, ...proceedUpdate].filter(
                (item) => statutMap[item.statut] === A_REPARER_STATUT_ID
            );

            for (const item of rebutItems) {
                const tpeId = idBySerial.get(item.serial_number);
                if (!tpeId) continue;

                const piecesRecup = typeof item.pieces_recuperees === "string" ? JSON.parse(item.pieces_recuperees) : item.pieces_recuperees;
                const piecesDef = typeof item.pieces_defectueuses === "string" ? JSON.parse(item.pieces_defectueuses) : item.pieces_defectueuses;
                const fonc = Array.isArray(piecesRecup) ? piecesRecup : [];
                const def = Array.isArray(piecesDef) ? piecesDef : [];
                const pieces = [
                    ...fonc.map((pieceId) => ({ piece_id: pieceId, etat: "fonctionnel" })),
                    ...def.map((pieceId) => ({ piece_id: pieceId, etat: "defectueux" })),
                ];

                // create() (pas createMany) car on a besoin des ids générés
                const session = await tx.sn_rebut.create({
                    data: {
                        sn_id: tpeId,
                        created_at: dateAction,
                        last_modified_at: dateAction,
                        created_by: utilisateur.id_user,
                    },
                });

                const snapshot = await tx.history_snapshot_piece_rebut.create({
                    data: {
                        rebut_id: session.id,
                        created_by: utilisateur.id_user,
                        created_at: dateAction,
                    },
                });

                if (pieces.length) {
                    await tx.pieces_rebut.createMany({
                        data: pieces.map((p) => ({
                            piece_id: p.piece_id,
                            etat: p.etat,
                            sn_id: tpeId,
                            created_by: utilisateur.id_user,
                            created_at: dateAction,
                        })),
                    });

                    await tx.history_piece_rebut.createMany({
                        data: pieces.map((p) => ({
                            piece_id: p.piece_id,
                            etat: p.etat,
                            snap_id: snapshot.id,
                        })),
                    });
                }
            }

            for (const item of aReparerItems) {
                const tpeId = idBySerial.get(item.serial_number);
                if (!tpeId) continue;

                const piecesDef = typeof item.pieces_defectueuses === "string" ? JSON.parse(item.pieces_defectueuses) : item.pieces_defectueuses;
                const def = Array.isArray(piecesDef) ? piecesDef : [];
                const pieces = [
                    ...def.map((pieceId) => ({ piece_id: pieceId, etat: "defectueux" })),
                ];

                const tpeAreparer = await tx.tpe_a_reparer.create({
                    data: {
                        tpe_id: tpeId,
                        nom_marchand: item.point_marchand,
                        decom_id: decom.id,
                        etat: "defectueux",
                        created_at: dateAction,
                        created_by: utilisateur.id_user,
                    },
                });

                if (pieces.length) {
                    await tx.pieces_a_reparer.createMany({
                        data: pieces.map((p) => ({
                            sn_id: tpeAreparer.id,
                            piece_id: p.piece_id,
                            etat: p.etat,
                            created_by: utilisateur.id_user,
                            created_at: dateAction,
                        })),
                    });
                }
            }

            return {
                retourDecomForm,
                retourDecom,
                tpe_traites: proceedCreate.length + proceedUpdate.length,
                tpe_historique_seul: historyOnly.length,
                tpe_rebut: rebutItems.length,
                tpe_a_reparer: aReparerItems.length,
            };
        }, {
            timeout: 20000,
        });

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

        const subject = `SYSLIS - CLOTURE DE DECOMMISSIONNEMENT`;
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

        console.log(`Décommissionnement clôturé avec succès par ${utilisateur.username}`)
        return res.status(200).json({
            message: "Décommissionnement clôturé avec succès.",
            ...cloturation,
        });
    } catch (error) {
        console.error("Erreur lors de la clôture du décommissionnement :", error);
        return res
            .status(500)
            .json({ message: "Erreur interne lors de la clôture du décommissionnement." });
    }
};

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

// Fonction pour avoir la liste de tous les TPE avec le statut 'a_reparer' et 'repare' provenant d'une vérification de décommissionnement
const getAllTpeRepare = async (req, res) => {
    try {
        const tpe = await prisma.tpe_a_reparer.findMany({
            where: {
                is_deleted: false,
            },
            select: {
                id: true,
                etat: true,
                nom_marchand: true,
                decom_id: true,
                created_by: true,
                created_at: true,
                last_modified_at: true,
                parc_tpe: {
                    select: {
                        serial_number: true,
                        model_id: true,
                        model_piece: true,
                    }
                },
                pieces_a_reparer: {
                    select: {
                        piece_id: true,
                        etat: true,
                        items: {
                            select: {
                                nom_piece: true,
                            }
                        },
                    },
                },
            },
            orderBy: {
                last_modified_at: 'desc',
            },
        });

        res.status(200).json(tpe);
    } catch (error) {
        console.error("Erreur lors de la récupération des TPE à réparer :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des TPE à réparer", error });
    }
}

// const reparerTpe = async (req, res) => {
//     try {
//         const {
//             sn: terminalSn,
//         } = req.params
//         const {
//             userId,
//         } = req.body

//         const utilisateur = await prisma.users.findUnique({
//             where: {
//                 id_user: parseInt(userId),
//             },
//         })
//         if (!utilisateur) {
//             console.error('Utilisateur non enregistré !')
//             return res.status(404).json({ message: "Utilisateur non enregistré !" });
//         }
//         const dateAction = new Date()

//         const modification = await prisma.$transaction(async (tx) => {
//             const tpe = await tx.parc_tpe.upsert({
//                 where: {
//                     serial_number: terminalSn,
//                 },
//                 update: {
//                     updated_at: dateAction,
//                     updated_by: utilisateur.id_user,
//                     last_modified_at: dateAction,
//                     statut_id: 10,
//                 },
//                 create: {
//                     serial_number: terminalSn,
//                     created_at: dateAction,
//                     created_by: utilisateur.id_user,
//                     last_modified_at: dateAction,
//                     statut_id: 10,
//                 }
//             })

//             await tx.history_tpe.create({
//                 data: {
//                     id_tpe: tpe.id,
//                     created_at: dateAction,
//                     created_by: utilisateur.id_user,
//                     statut_id: 10,
//                 }
//             })

//             const reparationForm = await tx.forms.create({
//                 data: {
//                     created_at: dateAction,
//                     last_modified_at: dateAction,
//                     created_by: utilisateur.id_user,
//                     nom_user: utilisateur.fullname,
//                     type: 'reparation_tpe',
//                     commentaire,
//                 }
//             })

//             const reparation = await tx.reparation_tpe.create({
//                 data: {
//                     form_id: reparationForm.id,
//                     quantite: 1,
//                 }
//             })

//             return {
//                 tpe,
//             }
//         })

//         console.log('Opération effectuée avec succès !')
//         res.status(201).json({
//             message: 'Opération effectuée avec succès !',
//             data: modification,
//         });
//     } catch (error) {
//         console.error("Erreur lors de l'opération :", error);
//         res.status(500).json({ message: "Erreur interne", error });
//     }
// }

function getCellValue(cell) {
    if (!cell || cell.value == null) return "";
    if (typeof cell.value === "object" && cell.value.richText) {
        return cell.value.richText.map(t => t.text).join("");
    }
    return String(cell.value).trim();
}
const normalize = (value) => {
    if (value === null || value === undefined) return null;
    return String(value).trim();
};

const extractSnReparation = async (req, res) => {
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

        const requireHeader = "SERIAL NUMBER"

        if (!headers[requireHeader]) {
            console.log(`Colonne requise manquante : ${requireHeader}`)
            return res.status(400).json({
                message: `Missing required column: ${requireHeader}`
            });
        }

        const serials = [];
        const snSet = new Set()
        let duplicateError = null;
        let formatError = null;
        let statutError = null;
        const isOnlyDigits = (str) => /^\d+$/.test(str);

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const sn = normalize(row.getCell(headers[requireHeader]).value);
            if (!sn) return;

            if (snSet.has(sn)) {
                duplicateError = {
                    rowNumber,
                    sn,
                };
                return;
            }
            if (sn.length != 10 || !isOnlyDigits(sn)) {
                formatError = {
                    rowNumber,
                    sn,
                };
                return;
            }

            snSet.add(sn)
            // console.log("Données extraites ligne", rowNumber, marchand);
        })

        if (formatError) {
            return res.status(400).json({
                message: `SN invalide à la ligne ${formatError.rowNumber} pour le SN ${formatError.sn}`,
            });
        }
        if (duplicateError) {
            return res.status(400).json({
                message: `Doublon trouvé à la ligne ${duplicateError.rowNumber} pour le SN ${duplicateError.sn}`,
            });
        }

        let statut = 'non enregistré'
        const listeSn = [...snSet]
        for (let sn of listeSn) {
            const serial_number = await prisma.parc_tpe.findUnique({
                where: {
                    serial_number: sn
                },
                include: {
                    statut_tpe: true
                }
            })
            if (serial_number.statut_tpe.statut != 'a_reparer') {
                console.error(`Statut invalide pour le S/N ${serial_number.serial_number} avec le statut ${serial_number.statut_tpe.statut}`)
                return res.status(400).json({
                    message: `Statut invalide pour le S/N ${serial_number.serial_number} avec le statut ${serial_number.statut_tpe.statut}`,
                });
            }
            if (serial_number) {
                statut = serial_number.statut_tpe.statut
            }

            const tpeAreparer = await prisma.tpe_a_reparer.findFirst({
                where: {
                    tpe_id: serial_number.id,
                    is_deleted: false,
                    etat: 'defectueux',
                },
                orderBy: {
                    id: 'desc',
                },
            });
            const pieces_a_reparer = await prisma.pieces_a_reparer.findMany({
                where: {
                    sn_id: tpeAreparer.id,
                },
                select: {
                    piece_id: true,
                },
            })
            const listePiece = new Array(...pieces_a_reparer)
            const element = {
                sn,
                statut,
                listePiece,
                marchand: tpeAreparer.nom_marchand,
            }
            serials.push(element)
        }
        // const serialList = [...serials]
        // console.log(serials)
        console.log(`Extraction complète par utilisateur ${userId} !`)
        return res.status(201).json({
            message: "Extraction complète",
            data: serials,
        });
    } catch (error) {
        console.error("Erreur lors de l'extraction du fichier Excel :", error);
        return res.status(500).json({ message: "Erreur interne", error });
    }
}

const reparerListeTpe = async (req, res) => {
    try {
        const {
            userId,
            listeSn,
            commentaire,
        } = req.body

        const utilisateur = await prisma.users.findUnique({
            where: {
                id_user: parseInt(userId),
            },
        })
        if (!utilisateur) {
            console.error('Utilisateur non enregistré !')
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }
        const detailsListe =
            typeof listeSn === "string" ? JSON.parse(listeSn) : listeSn;
        if (!Array.isArray(detailsListe) || detailsListe.length === 0) {
            console.error("Liste S/N vide ou invalide.")
            return res.status(400).json({ message: "Liste S/N vide ou invalide." });
        }

        const dateAction = new Date()

        const STATUT_REPARE_ID = 10
        const terminaux = detailsListe.map((terminal) => {
            const piecesDef = Array.isArray(terminal.listePiece)
                ? terminal.listePiece
                : [];

            const pieces = piecesDef.map((item) => ({
                piece_id: item.piece_id,
                etat: "repare",
                updated_by: utilisateur.id_user,
                updated_at: dateAction,
            }));

            return { serial: terminal.sn, pieces };
        });

        const serials = terminaux.map((t) => t.serial);

        const operation = await prisma.$transaction(async (tx) => {
            // ---- Forms + reparation + livraison --------------------------
            const reparationForm = await tx.forms.create({
                data: {
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                    type: "reparation_tpe",
                    commentaire,
                },
            });

            const reparation = await tx.reparation_tpe.create({
                data: {
                    form_id: reparationForm.id,
                    quantite: terminaux.length,
                    liste_sn: JSON.stringify(detailsListe),
                },
            });

            const livraisonForm = await tx.forms.create({
                data: {
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                    type: "livraison_tpe_repare",
                    commentaire,
                },
            });

            const livraison = await tx.livraison_tpe_repare.create({
                data: {
                    form_id: livraisonForm.id,
                    reparation_id: reparation.id,
                    statut: "en_cours",
                    quantite: terminaux.length,
                    liste_sn: JSON.stringify(detailsListe),
                },
            });

            // ---- parc_tpe: upsert-ish (create missing, then update all) --
            await tx.parc_tpe.createMany({
                data: serials.map((item) => ({
                    serial_number: item,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: STATUT_REPARE_ID,
                })),
                skipDuplicates: true,
            });

            await tx.parc_tpe.updateMany({
                where: { serial_number: { in: serials } },
                data: {
                    updated_by: utilisateur.id_user,
                    updated_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: STATUT_REPARE_ID,
                },
            });

            const allTpes = await tx.parc_tpe.findMany({
                where: { serial_number: { in: serials } },
                select: { id: true, serial_number: true },
            });

            // ---- history_tpe: one row per TPE ----------------------------
            await tx.history_tpe.createMany({
                data: allTpes.map((tpe) => ({
                    id_tpe: tpe.id,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    statut_id: STATUT_REPARE_ID,
                    form_id: reparationForm.id,
                })),
            });

            // ============================================================
            // FIX #3 (round-trips): fetch every tpe_a_reparer row ONCE
            // before the loop instead of one findFirst per terminal.
            // ============================================================
            const tpeIds = allTpes.map((t) => t.id);

            const aReparerRows = await tx.tpe_a_reparer.findMany({
                where: {
                    tpe_id: { in: tpeIds },
                    is_deleted: false,
                    etat: "defectueux",
                },
            });

            // Map for O(1) lookup by tpe_id inside the loop.
            const aReparerByTpeId = new Map(
                aReparerRows.map((r) => [r.tpe_id, r])
            );
            // And a quick lookup from serial -> tpe row.
            const tpeBySerial = new Map(
                allTpes.map((t) => [t.serial_number, t])
            );

            // ============================================================
            // FIX #1 (the actual P2028 cause): guard BEFORE any write, so
            // we never call `update` with a non-existent id (which throws
            // P2025 and aborts the whole transaction).
            // FIX #3 cont.: collect ids + mouvements to flush in bulk.
            // ============================================================
            const tpeAreparerIdsToUpdate = [];
            const mouvements = [];

            for (const t of terminaux) {
                const tpe = tpeBySerial.get(t.serial);
                if (!tpe) continue;

                const tpeAreparer = aReparerByTpeId.get(tpe.id);
                if (!tpeAreparer) continue; // nothing to repair for this TPE

                tpeAreparerIdsToUpdate.push(tpeAreparer.id);

                if (t.pieces.length) {
                    // Kept per-terminal: `where` is scoped to THIS terminal's
                    // sn_id, so it can't be safely merged across terminals.
                    await tx.pieces_a_reparer.updateMany({
                        where: {
                            sn_id: tpeAreparer.id,
                            piece_id: { in: t.pieces.map((p) => p.piece_id) },
                        },
                        data: {
                            etat: "repare",
                            updated_by: utilisateur.id_user,
                            updated_at: dateAction,
                        },
                    });

                    for (const p of t.pieces) {
                        mouvements.push({
                            piece_id: p.piece_id,
                            reparation_id: reparation.id,
                            ancien_etat: "defectueux",
                            nouvel_etat: "repare",
                            created_at: dateAction,
                            created_by: utilisateur.id_user,
                        });
                    }
                }
            }

            // Single updateMany for all tpe_a_reparer rows (same data for all).
            if (tpeAreparerIdsToUpdate.length) {
                await tx.tpe_a_reparer.updateMany({
                    where: { id: { in: tpeAreparerIdsToUpdate } },
                    data: {
                        reparation_id: reparation.id,
                        updated_by: utilisateur.id_user,
                        updated_at: dateAction,
                        last_modified_at: dateAction,
                        etat: "repare",
                    },
                });
            }

            // Single insert for all mouvement rows.
            if (mouvements.length) {
                await tx.mouvement_piece_a_reparer.createMany({
                    data: mouvements,
                });
            }

            return { allTpes, livraisonForm, livraison };
        },
            {
                // FIX #2: the default interactive-transaction timeout is 5s,
                // which a long liste_sn will blow past. Raise both limits.
                maxWait: 10000, // max time to wait for a pooled connection
                timeout: 30000, // max time the transaction may run
            }
        );

        /************ GESTION MAIL  ************/
        // FIX #4: mail sending is wrapped in its own try/catch. The transaction has
        // already committed successfully at this point, so a mail failure must NOT
        // turn into a 500 that makes the caller think the operation failed.
        try {
            const rolesSupervision = await prisma.user_roles.findMany({
                where: { role_id: 37 },
                include: { users: true }
            })
            const rolesReception = await prisma.user_roles.findMany({
                where: { role_id: 36 },
                include: { users: true }
            })
            // NOTE: removed the role_id 25 (verificateurs) query — it was fetched but
            // never used. Re-add it here and include it in the mail loop if needed.

            const superviseurs = rolesSupervision.map(us => us.users)
            const demandeurs = rolesReception.map(us => us.users)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/livraison-tpe-repare/${operation.livraison.id}`;

            const subject = `SYSLIS - LIVRAISON TPE REPARE`;
            // FIX #1: was ${quantite} (undefined in this scope → ReferenceError).
            const html = `
                <p>Bonjour,</p>
                <p>Un lot de TPE réparés on été livrés par ${utilisateur.fullname}.</p>
                <ul>
                <li><strong>Nombre de TPE :</strong> ${terminaux.length}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la livraison à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            const destinataires = [...superviseurs, ...demandeurs];
            for (const destinataire of destinataires) {
                if (!destinataire?.email) continue;
                await sendMail({
                    to: destinataire.email,
                    subject,
                    html,
                });
            }
        } catch (mailError) {
            // Log but do not fail the request — the repair/delivery already succeeded.
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log('TPE réparés avec succès !')
        res.status(201).json({
            message: 'TPE réparés avec succès !',
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de l'opération :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const getAllLivraisonReparation = async (req, res) => {
    try {
        const livraisons = await prisma.livraison_tpe_repare.findMany({
            include: {
                forms: true,
                reception_tpe_repare: {
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

        res.status(200).json(livraisons);
    } catch (error) {
        console.error("Erreur lors de la récupération des livraisons de TPE réparés :", error)
        res.status(500).json({ message: "Erreur lors de la récupération des livraisons de TPE réparés", error });
    }
}

const getOneLivraisonReparation = async (req, res) => {
    try {
        const {
            id
        } = req.params

        const livraison = await prisma.livraison_tpe_repare.findUnique({
            where: {
                id: parseInt(id)
            }, include: {
                forms: {
                    include: {
                        users_forms_created_byTousers: true,
                        users_forms_updated_byTousers: true,
                    },
                },
                reception_tpe_repare: {
                    include: {
                        forms: true,
                    },
                },
            },
        })
        console.log(`Livraison des réparations ${id}`)
        res.status(200).json(livraison);
    } catch (error) {
        console.error("Erreur lors de la récupération de la livraison : ", error)
        res.status(500).json({ message: "Erreur lors de la récupération de la livraison : ", error });
    }
}

const receptionLivraisonReparation = async (req, res) => {
    try {
        const {
            id
        } = req.params
        const {
            commentaire,
            listeReparation,
            listeValidee,
            quantite,
            userId,
            dateReception,
            isReg,
        } = req.body

        const livraison = await prisma.livraison_tpe_repare.findUnique({
            where: {
                id: parseInt(id)
            },
        })

        const livraisonForm = await prisma.forms.findUnique({
            where: {
                id: parseInt(livraison.form_id)
            },
        })

        if (!livraison) {
            console.error('Livraison des TPE réparés introuvable !')
            return res.status(404).json({ message: "Livraison des TPE réparés introuvable !" });
        }
        if (livraison.statut == 'valide') {
            console.error('Livraison des TPE réparés déjà réceptionnée !')
            return res.status(400).json({ message: "Livraison des TPE réparés déjà réceptionnée !" });
        }
        if (livraison.statut != 'en_cours') {
            console.error('Statut de la livraison des TPE réparés invalide !')
            return res.status(400).json({ message: "Statut de la livraison des TPE réparés invalide !" });
        }
        if (livraisonForm.is_deleted) {
            console.error('Livraison des TPE réparés déjà supprimée !')
            return res.status(400).json({ message: "Livraison des TPE réparés déjà supprimée !" });
        }

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

        const details = typeof listeReparation === "string" ? JSON.parse(listeReparation) : listeReparation;
        const detailsValidee = typeof listeValidee === "string" ? JSON.parse(listeValidee) : listeValidee;

        const reg = isReg == "false" ? false : true
        let dateAction = new Date()
        const dateVer = new Date(dateReception)
        if (!isNaN(dateVer.valueOf())) {
            dateAction = new Date(dateReception)
        }

        const operation = await prisma.$transaction(async (tx) => {
            const receptionForm = await tx.forms.create({
                data: {
                    type: 'reception_tpe_repare',
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    commentaire,
                }
            })

            const reception = await tx.reception_tpe_repare.create({
                data: {
                    form_id: receptionForm.id,
                    livraison_id: livraison.id,
                    type: 'reception',
                    quantite: Number(quantite),
                    liste_sn: JSON.stringify(detailsValidee),
                }
            })

            const livraisonReparation = await tx.livraison_tpe_repare.update({
                where: {
                    id: livraison.id
                },
                data: {
                    statut: 'livre',
                    liste_sn: JSON.stringify(details),
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
                        uploaded_by: utilisateur.id_user,
                        form_id: livraisonForm.id,
                        type_formulaire: 'livraison',
                        role: 'receveur',
                        created_at: dateAction,
                    }))
                })
            }

            return {
                receptionForm,
                reception,
                livraisonReparation,
            }
        })

        /****************    GESTION DES MAILS     *****************/

        try {
            const rolesSupervision = await prisma.user_roles.findMany({
                where: { role_id: 37 },
                include: { users: true }
            })
            const rolesLivraison = await prisma.user_roles.findMany({
                where: { role_id: 35 },
                include: { users: true }
            })
            // NOTE: removed the role_id 25 (verificateurs) query — it was fetched but
            // never used. Re-add it here and include it in the mail loop if needed.

            const superviseurs = rolesSupervision.map(us => us.users)
            const livreurs = rolesLivraison.map(us => us.users)

            const commentaire_mail = commentaire ? commentaire : '(sans commentaire)';

            const url = GENERAL_URL
            const link = `${url}/livraison-tpe-repare/${operation.livraison.id}`;

            const subject = `SYSLIS - RECEPTION TPE REPARE`;
            // FIX #1: was ${quantite} (undefined in this scope → ReferenceError).
            const html = `
                <p>Bonjour,</p>
                <p>La livraison ${id} des TPEs réparés a été réceptionné par ${utilisateur.fullname}.</p>
                <ul>
                <li><strong>Nombre de TPE :</strong> ${detailsValidee.length}</li>
                </ul>
                <br>
                <p>Commentaire : ${commentaire_mail}<p>
                <br>
                <p>Retrouvez la livraison à ce lien : 
                <span>
                <a href="${link}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">
                    Cliquez ici !
                </a>
                </span>
                </p>
                <br><br>
                <p>Green - Pay vous remercie.</p>
            `;

            const destinataires = [...superviseurs, ...livreurs];
            for (const destinataire of destinataires) {
                if (!destinataire?.email) continue;
                await sendMail({
                    to: destinataire.email,
                    subject,
                    html,
                });
            }
        } catch (mailError) {
            // Log but do not fail the request — the repair/delivery already succeeded.
            console.error("Erreur lors de l'envoi des mails :", mailError);
        }

        console.log(`Livraison de TPE réparés ${id} réceptionnée avec succès par ${utilisateur.username}`)
        res.status(201).json({
            message: `Livraison de TPE réparés ${id} réceptionnée avec succès par ${utilisateur.username}`,
            data: operation,
        });
    } catch (error) {
        console.error("Erreur lors de la validation de la demande de mise au rebut :", error);
        res.status(500).json({ message: "Erreur interne", error });
    }
}

const cloturerLivraisonReparation = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            commentaire,
            listeValidee,
            quantite,
            userId,
            dateValidation,
            // isReg,
        } = req.body;

        const PARAM_STATUT_ID = 4; // statut "parametrage"

        const livraisonId = parseInt(id, 10);
        if (Number.isNaN(livraisonId)) {
            console.error("Identifiant de livraison invalide.")
            return res.status(400).json({ message: "Identifiant de livraison invalide." });
        }

        // 1. Charger et valider la demande AVANT d'accéder à ses champs
        const livraison = await prisma.livraison_tpe_repare.findUnique({
            where: { id: livraisonId },
        });
        if (!livraison) {
            console.error("Livraison de TPE réparés introuvable !")
            return res.status(404).json({ message: "Livraison de TPE réparés introuvable !" });
        }
        if (livraison.statut !== "livre") {
            console.error("Statut de la livraison de TPE réparés invalide !")
            return res.status(400).json({ message: "Statut de la livraison de TPE réparés invalide !" });
        }

        const livraisonForm = await prisma.forms.findUnique({
            where: { id: parseInt(livraison.form_id, 10) },
        });
        if (!livraisonForm) {
            console.error("Formulaire de livraison de TPE réparés introuvable !")
            return res.status(404).json({ message: "Formulaire de livraison de TPE réparés introuvable !" });
        }
        if (livraisonForm.is_deleted) {
            console.error("Livraison de TPE réparés déjà supprimée !")
            return res.status(400).json({ message: "Livraison de TPE réparés déjà supprimée !" });
        }

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId, 10) },
        });
        if (!utilisateur) {
            console.error("Utilisateur introuvable !")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        // Date d'action
        let dateAction = new Date();
        const dateVer = new Date(dateValidation);
        if (!Number.isNaN(dateVer.valueOf())) {
            dateAction = dateVer;
        }

        // 2. Parser et valider la liste AVANT la transaction
        const detailsValidee =
            typeof listeValidee === "string" ? JSON.parse(listeValidee) : listeValidee;
        if (!Array.isArray(detailsValidee) || detailsValidee.length === 0) {
            return res.status(400).json({ message: "Liste validée vide ou invalide." });
        }

        const serials = detailsValidee.map((t) => t.sn);

        // 3. Toutes les écritures dans UNE transaction, en séquentiel
        const operation = await prisma.$transaction(async (tx) => {

            const clotureForm = await tx.forms.create({
                data: {
                    commentaire,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    created_by: utilisateur.id_user,
                    nom_user: utilisateur.fullname,
                    type: 'reception_tpe_repare',
                }
            })
            const cloture = await tx.reception_tpe_repare.create({
                data: {
                    livraison_id: livraisonId,
                    form_id: clotureForm.id,
                    type: 'cloture',
                    quantite,
                    liste_sn: JSON.stringify(listeValidee),
                }
            })

            // Créer uniquement les parc_tpe manquants
            await tx.parc_tpe.createMany({
                data: serials.map((serial) => ({
                    serial_number: serial,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: PARAM_STATUT_ID,
                })),
                skipDuplicates: true,
            });

            // Mettre TOUS les TPE (existants + nouveaux) au statut paramétrage
            await tx.parc_tpe.updateMany({
                where: { serial_number: { in: serials } },
                data: {
                    updated_by: utilisateur.id_user,
                    updated_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: PARAM_STATUT_ID,
                },
            });

            // Récupérer les ids
            const allTpes = await tx.parc_tpe.findMany({
                where: { serial_number: { in: serials } },
                select: { id: true, serial_number: true },
            });
            const tpeBySerial = new Map(allTpes.map((tpe) => [tpe.serial_number, tpe]));

            // Historique du changement de statut parc
            await tx.history_tpe.createMany({
                data: allTpes.map((tpe) => ({
                    id_tpe: tpe.id,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    statut_id: PARAM_STATUT_ID,
                    form_id: clotureForm.id, // était "decomForm.id" (non défini)
                })),
            });

            // CONFIRM: clôturer la demande elle-même (valeur de statut à adapter)
            await tx.livraison_tpe_repare.update({
                where: { id: livraisonId },
                data: {
                    statut: 'clos', // CONFIRM: la valeur attendue par votre schéma
                },
            });

            return { tpe_traites: allTpes.length };
        });

        console.log(`Livraison des TPE réparés ${livraisonId} clôturée avec succès par ${utilisateur.username}.`)
        return res.status(200).json({
            message: `Livraison des TPE réparés ${livraisonId} clôturée avec succès par ${utilisateur.username}.`,
            ...operation,
        });
    } catch (error) {
        console.error("Erreur lors de la clôture de la livraison des TPE réparés :", error);
        return res
            .status(500)
            .json({ message: "Erreur interne lors de la clôture de la livraison des TPE réparés." });
    }
};

const miseEnReparationTpe = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            commentaire,
            listeReparation,
            quantite,
            userId,
            dateOperation,
            // isReg,
        } = req.body;

        const files = req.files?.files || [];
        const files_content = files.length ? files.map(file => ({
            name: file.originalname,
            path: file.path,
            type: file.mimetype,
            size: file.size
        }))
            : [];

        const A_REPARER_STATUT_ID = 11; // statut "à réparer"

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId, 10) },
        });
        if (!utilisateur) {
            console.error("Utilisateur introuvable !")
            return res.status(404).json({ message: "Utilisateur introuvable !" });
        }

        // Date d'action
        let dateAction = new Date();
        const dateVer = new Date(dateOperation);
        if (!Number.isNaN(dateVer.valueOf())) {
            dateAction = dateVer;
        }

        // 2. Parser et valider la liste AVANT la transaction
        const detailsListe =
            typeof listeReparation === "string" ? JSON.parse(listeReparation) : listeReparation;
        if (!Array.isArray(detailsListe) || detailsListe.length === 0) {
            return res.status(400).json({ message: "Liste de terminaux vide ou invalide." });
        }

        // On garde les pièces groupées PAR terminal pour pouvoir relier
        // chaque pièce à la bonne session / au bon snapshot plus tard.
        const terminaux = detailsListe.map((terminal) => {
            const piecesDef = Array.isArray(terminal.pieces_defectueuses)
                ? terminal.pieces_defectueuses
                : [];

            const pieces = piecesDef.map((pieceId) => ({ piece_id: pieceId, etat: "defectueux" }));

            return {
                serial: terminal.terminalSN,
                pieces,
                pointMarchand: terminal.pointMarchand,
                modele: Number(terminal.modele),
                commentaire: terminal.etatTpe,
            };
        });

        const serials = terminaux.map((t) => t.serial);

        // 3. Toutes les écritures dans UNE transaction, en séquentiel
        const operation = await prisma.$transaction(async (tx) => {

            const miseEnReparationForm = await tx.forms.create({
                data: {
                    commentaire,
                    type: "mise_en_reparation",
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    nom_user: utilisateur.fullname,
                },
            });

            const miseEnReparation = await tx.mise_en_reparation.create({
                data: {
                    form_id: miseEnReparationForm.id,
                    quantite: detailsListe.length,
                    liste_sn: JSON.stringify(detailsListe),
                },
            });

            if (files_content.length > 0) {
                await tx.fichiers.createMany({
                    data: files_content.map(fichier => ({
                        path: fichier.path,
                        filename: fichier.name,
                        originalName: fichier.name,
                        mimeType: fichier.type,
                        size: fichier.size,
                        uploaded_by: utilisateur.id_user,
                        form_id: miseEnReparationForm.id,
                        type_formulaire: 'mise_en_reparation_tpe',
                        role: 'demandeur',
                        created_at: dateAction,
                    }))
                })
            }

            /***********        GESTION DES TPE        ***********/

            // Créer uniquement les parc_tpe manquants
            await tx.parc_tpe.createMany({
                data: terminaux.map((t) => ({
                    serial_number: t.serial,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: A_REPARER_STATUT_ID,
                    model_id: t.modele,
                })),
                skipDuplicates: true,
            });

            // Mettre TOUS les TPE (existants + nouveaux) au statut a_reparer
            await tx.parc_tpe.updateMany({
                where: { serial_number: { in: serials } },
                data: {
                    updated_by: utilisateur.id_user,
                    updated_at: dateAction,
                    last_modified_at: dateAction,
                    statut_id: A_REPARER_STATUT_ID,
                },
            });

            // Récupérer les ids
            const allTpes = await tx.parc_tpe.findMany({
                where: { serial_number: { in: serials } },
                select: { id: true, serial_number: true },
            });
            const tpeBySerial = new Map(allTpes.map((tpe) => [tpe.serial_number, tpe]));

            // Historique du changement de statut parc
            await tx.history_tpe.createMany({
                data: allTpes.map((tpe) => ({
                    id_tpe: tpe.id,
                    created_by: utilisateur.id_user,
                    created_at: dateAction,
                    statut_id: A_REPARER_STATUT_ID,
                    form_id: miseEnReparationForm.id,
                })),
            });

            for (const t of terminaux) {
                const tpe = tpeBySerial.get(t.serial);
                if (!tpe) continue;

                const tpeAreparer = await tx.tpe_a_reparer.create({
                    data: {
                        tpe_id: tpe.id,
                        nom_marchand: t.pointMarchand,
                        mise_en_reparation_id: miseEnReparation.id,
                        etat: "defectueux",
                        commentaire: t.commentaire,
                        created_at: dateAction,
                        last_modified_at: dateAction,
                        created_by: utilisateur.id_user,
                    },
                });

                if (t.pieces.length) {
                    await tx.pieces_a_reparer.createMany({
                        data: t.pieces.map((p) => ({
                            sn_id: tpeAreparer.id,
                            piece_id: p.piece_id,
                            etat: p.etat,
                            created_by: utilisateur.id_user,
                            created_at: dateAction,
                        })),
                    });
                }
            }

            return { tpe_traites: allTpes.length };
        });

        console.log(`Mise en réparation de ${detailsListe.length} TPE(s) effectuée avec succès par ${utilisateur.username}.`)
        return res.status(200).json({
            message: `Mise en réparation de ${detailsListe.length} TPE(s) effectuée avec succès par ${utilisateur.username}.`,
            ...operation,
        });
    } catch (error) {
        console.error("Erreur lors de la mise en réparation :", error);
        return res
            .status(500)
            .json({ message: "Erreur interne lors de la mise en réparation." });
    }
};

// Fonction pour extraire les données excel pour la mise en réparation
const extractMiseEnReparation = async (req, res) => {
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

        const pieces = await prisma.items.findMany({
            where: {
                type: 'PIECE',
                is_deleted: false,
            }
        })
        const piecesMap = new Map(pieces.map(p => [p.nom_piece.toUpperCase(), p.id_piece]));

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

        const pieceColumns = [];

        Object.entries(headers).forEach(([header, colIndex]) => {
            const pieceId = piecesMap.get(header);

            if (pieceId) {
                pieceColumns.push({
                    colIndex,
                    pieceId,
                });
            }
        });

        const requiredHeaders = [
            "S/N",
            "MODELE",
        ];

        for (const header of requiredHeaders) {
            if (!headers[header]) {
                console.log(`Colonne requise manquante : ${header}`)
                return res.status(400).json({
                    message: `Missing required column: ${header}`
                });
            }
        }

        const terminals = [];
        const uniqueKeys = new Set();
        let duplicateError = null;
        let invalidSnRowError = null;
        let invalidModelRowError = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const pointMarchand = String(getCellValue(row.getCell(headers["POINT MARCHAND"])) || "").trim();
            const terminalSN = String(getCellValue(row.getCell(headers["S/N"])) || "").trim();
            const model = String(getCellValue(row.getCell(headers["MODELE"])) || "").trim();
            const etatTpe = String(getCellValue(row.getCell(headers["OBSERVATIONS"])) || "").trim();
            const listePieceRec = [];
            const listePieceDef = [];
            for (const { colIndex, pieceId } of pieceColumns) {
                const etat = String(
                    getCellValue(row.getCell(colIndex)) || ""
                ).trim().toUpperCase();

                if (etat === "NOK" || etat === "nok") {
                    listePieceDef.push(pieceId)
                }
            }

            // Ignore les lignes vides ou inutiles
            if (!terminalSN) {
                return;
            }
            if (terminalSN && (terminalSN.length != 10 || !isOnlyDigits(terminalSN))) {
                invalidSnRowError = {
                    rowNumber,
                    terminal: { terminalSN }
                };
                return;
            }
            if (terminalSN && !model) {
                invalidModelRowError = {
                    rowNumber,
                    terminal: { terminalSN }
                };
                return;
            }

            const terminal = {
                pointMarchand: pointMarchand ? pointMarchand : 'N/A',
                terminalSN,
                model,
                etatTpe,
                listePieceDef,
            };

            const key = `${terminal.terminalSN}`;
            if (uniqueKeys.has(key)) {
                duplicateError = {
                    rowNumber,
                    terminal,
                };
                return;
            }
            uniqueKeys.add(key);
            terminals.push(terminal);

            // console.log("Données extraites ligne", rowNumber, marchand);
        })

        if (duplicateError) {
            return res.status(400).json({
                message: `Doublon de SN trouvé à la ligne ${duplicateError.rowNumber} pour le marchand avec le SN ${duplicateError.terminal.terminalSN}`,
            });
        }

        if (invalidSnRowError) {
            return res.status(400).json({
                message: `S/N invalide à la ligne ${invalidSnRowError.rowNumber} pour le TPE ${invalidSnRowError.terminal.terminalSN}`,
            });
        }

        if (invalidModelRowError) {
            return res.status(400).json({
                message: `Modèle manquant à la ligne ${invalidModelRowError.rowNumber} pour le TPE ${invalidModelRowError.terminal.terminalSN}`,
            });
        }

        console.log(`Extraction complète par utilisateur ${userId} !`)
        return res.status(201).json({
            message: "Extraction complète",
            data: terminals,
        });
    } catch (error) {
        console.error("Erreur lors de l'extraction du fichier Excel :", error);
        return res.status(500).json({ message: "Erreur interne", error });
    }
}

// Fonction pour télécharger le template servant à l'import des mise au rebut ou réparation par excel
const downloadTemplateLiaisonTpePieces = async (req, res) => {
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

        const pieces = await prisma.items.findMany({
            where: {
                type: 'PIECE',
                is_deleted: false,
            }
        })
        const piecesMap = new Map(pieces.map(p => [p.id_piece, p.nom_piece]));

        const workbook = new ExcelJS.Workbook();

        const piecesHeaders = pieces.map((item) => {
            return item.nom_piece.toUpperCase()
        })

        const verificationSheet = workbook.addWorksheet('Liste Sn');
        const verificationHeaders = [
            "S/N",
            "Modele",
            "Statut",
            ...piecesHeaders,
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

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=template_rebut.xlsx`
        );
        res.send(buffer);

        console.log(`Template de mise au rebut téléchargé avec succès par ${utilisateur.username} ID ${utilisateur.id_user} !`);

    } catch (error) {
        console.error('Erreur downloadTemlateRebut:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Fonction pour extraire les données excel pour la liaison pièces TPE
const extractLiaisonTpePiecesData = async (req, res) => {
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

        const pieces = await prisma.items.findMany({
            where: {
                type: 'PIECE',
                is_deleted: false,
            }
        })
        const piecesMap = new Map(pieces.map(p => [p.nom_piece.toUpperCase(), p.id_piece]));

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

        const pieceColumns = [];

        Object.entries(headers).forEach(([header, colIndex]) => {
            const pieceId = piecesMap.get(header);

            if (pieceId) {
                pieceColumns.push({
                    colIndex,
                    pieceId,
                });
            }
        });

        const requiredHeaders = [
            "S/N",
        ];

        for (const header of requiredHeaders) {
            if (!headers[header]) {
                console.log(`Colonne requise manquante : ${header}`)
                return res.status(400).json({
                    message: `Missing required column: ${header}`
                });
            }
        }

        const terminals = [];
        const uniqueKeys = new Set();
        let duplicateError = null;
        let invalidSnRowError = null;
        let invalidModelRowError = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const terminalSN = String(getCellValue(row.getCell(headers["S/N"])) || "").trim();
            const modele = String(getCellValue(row.getCell(headers["MODELE"])) || "").trim();
            const statut = String(getCellValue(row.getCell(headers["STATUT"])) || "").trim();
            const listePieceRec = [];
            const listePieceDef = [];
            for (const { colIndex, pieceId } of pieceColumns) {
                const etat = String(
                    getCellValue(row.getCell(colIndex)) || ""
                ).trim().toUpperCase();

                if ((!etat ||etat === "1" || etat === "OK") && statut === "rebut") {
                    listePieceRec.push(pieceId);
                } else if (etat === "NOK" || etat === "0") {
                    listePieceDef.push(pieceId)
                }
            }

            // Ignore les lignes vides ou inutiles
            if (!terminalSN) {
                return;
            }
            if (terminalSN && (terminalSN.length != 10 || !isOnlyDigits(terminalSN))) {
                invalidSnRowError = {
                    rowNumber,
                    terminal: { terminalSN }
                };
                return;
            }
            // if (terminalSN && !) {
            //     invalidModelRowError = {
            //         rowNumber,
            //         terminal: { terminalSN }
            //     };
            //     return;
            // }

            const terminal = {
                terminalSN,
                modele,
                statut,
                listePieceRec,
                listePieceDef,
            };

            const key = `${terminal.terminalSN}`;
            if (uniqueKeys.has(key)) {
                duplicateError = {
                    rowNumber,
                    terminal,
                };
                return;
            }
            uniqueKeys.add(key);
            terminals.push(terminal);

            // console.log("Données extraites ligne", rowNumber, marchand);
        })

        if (duplicateError) {
            return res.status(400).json({
                message: `Doublon de SN trouvé à la ligne ${duplicateError.rowNumber} pour le marchand avec le SN ${duplicateError.terminal.terminalSN}`,
            });
        }

        if (invalidSnRowError) {
            return res.status(400).json({
                message: `S/N invalide à la ligne ${invalidSnRowError.rowNumber} pour le TPE ${invalidSnRowError.terminal.terminalSN}`,
            });
        }

        if (invalidModelRowError) {
            return res.status(400).json({
                message: `Modèle manquant à la ligne ${invalidModelRowError.rowNumber} pour le TPE ${invalidModelRowError.terminal.terminalSN}`,
            });
        }

        for (terminal of terminals) {
            const serial_number = await prisma.parc_tpe.findUnique({
                where: {
                    serial_number: terminal.terminalSN
                },
                include: {
                    statut_tpe: true
                }
            })
            if (serial_number.statut_tpe.statut != terminal.statut) {
                console.error(`Statut ${terminal.statut} invalide pour le S/N ${serial_number.serial_number} au statut ${serial_number.statut_tpe.statut}`)
                return res.status(400).json({
                    message: `Statut ${terminal.statut} invalide pour le S/N ${serial_number.serial_number} au statut ${serial_number.statut_tpe.statut}`,
                });
            }
        }

        console.log(`Extraction complète par utilisateur ${userId} !`)
        return res.status(201).json({
            message: "Extraction complète",
            data: terminals,
        });
    } catch (error) {
        console.error("Erreur lors de l'extraction du fichier Excel :", error);
        return res.status(500).json({ message: "Erreur interne", error });
    }
}

const liaisonTpePieces = async (req, res) => {
    try {
        // NOTE: on suppose ici que `id` (param de route) est l'id du decom concerné.
        // C'est la seule source possible dans la fonction d'origine (decom.id n'était jamais défini).
        const { userId, listeSn } = req.body;

        const REBUT_STATUT_ID = 5;
        const A_REPARER_STATUT_ID = 11;

        const utilisateur = await prisma.users.findUnique({
            where: { id_user: parseInt(userId, 10) },
        });
        if (!utilisateur) {
            console.error("Utilisateur non enregistré !");
            return res.status(404).json({ message: "Utilisateur non enregistré !" });
        }

        const listeVerified =
            typeof listeSn === "string" ? JSON.parse(listeSn) : listeSn;
        if (!Array.isArray(listeVerified) || listeVerified.length === 0) {
            console.error("Liste de sn vide ou invalide.");
            return res.status(400).json({ message: "Liste de sn vide ou invalide." });
        }

        const dateAction = new Date();

        // Parse + garantie tableau (factorisé, utilisé partout)
        const parseArray = (val) => {
            const parsed = typeof val === "string" ? JSON.parse(val) : val;
            return Array.isArray(parsed) ? parsed : [];
        };

        // Dédoublonnage par SN (dernière occurrence gagne)
        const uniqueMap = new Map();
        listeVerified.forEach((item) => uniqueMap.set(item.terminalSN, item));
        const uniqueItems = [...uniqueMap.values()];

        // Contrôle métier : une pièce ne peut être à la fois fonctionnelle ET défectueuse (rebut)
        for (const item of uniqueItems) {
            if (item.statut !== REBUT_STATUT_ID) continue;
            const fonc = parseArray(item.pieces_recuperees);
            const def = parseArray(item.pieces_defectueuses);
            const duplicates = fonc.filter((pieceId) => def.includes(pieceId));
            if (duplicates.length) {
                console.error(
                    `Le terminal ${item.terminalSN} présente des pièces à la fois fonctionnelles et défectueuses.`
                );
                return res.status(400).json({
                    message: `Le terminal ${item.terminalSN} présente des pièces à la fois fonctionnelles et défectueuses.`,
                });
            }
        }

        const serials = uniqueItems.map((item) => item.terminalSN);

        // Les SN existent déjà dans parc_tpe : on ne récupère que leurs ids.
        // (Lecture hors transaction : les ids ne changent pas, ça garde la transaction courte.)
        const tpes = await prisma.parc_tpe.findMany({
            where: { serial_number: { in: serials } },
            select: { id: true, serial_number: true },
        });
        const idBySerial = new Map(tpes.map((t) => [t.serial_number, t.id]));

        // Sécurité : on refuse si un SN annoncé est introuvable au parc,
        // plutôt que de le sauter silencieusement.
        const missing = serials.filter((sn) => !idBySerial.has(sn));
        if (missing.length) {
            console.error(`Serial number(s) introuvable(s) dans le parc : ${missing.join(", ")}`);
            return res.status(404).json({
                message: `Serial number(s) introuvable(s) dans le parc : ${missing.join(", ")}`,
            });
        }

        const rebutItems = uniqueItems.filter((i) => i.statut === REBUT_STATUT_ID);
        const aReparerItems = uniqueItems.filter((i) => i.statut === A_REPARER_STATUT_ID);

        // ---- Transaction (tout en séquentiel, pas de Promise.all) ----
        const operation = await prisma.$transaction(async (tx) => {

            /***********      REBUT     ************/
            for (const item of rebutItems) {
                const tpeId = idBySerial.get(item.terminalSN); // garanti présent (voir check missing)

                const fonc = parseArray(item.pieces_recuperees);
                const def = parseArray(item.pieces_defectueuses);
                const pieces = [
                    ...fonc.map((pieceId) => ({ piece_id: pieceId, etat: "fonctionnel" })),
                    ...def.map((pieceId) => ({ piece_id: pieceId, etat: "defectueux" })),
                ];

                // create() (et non createMany) car on a besoin des ids générés
                const session = await tx.sn_rebut.create({
                    data: {
                        sn_id: tpeId,
                        created_at: dateAction,
                        last_modified_at: dateAction,
                        created_by: utilisateur.id_user,
                    },
                });

                const snapshot = await tx.history_snapshot_piece_rebut.create({
                    data: {
                        rebut_id: session.id,
                        created_by: utilisateur.id_user,
                        created_at: dateAction,
                    },
                });

                if (pieces.length) {
                    await tx.pieces_rebut.createMany({
                        data: pieces.map((p) => ({
                            piece_id: p.piece_id,
                            etat: p.etat,
                            sn_id: tpeId,
                            created_by: utilisateur.id_user,
                            created_at: dateAction,
                        })),
                    });

                    await tx.history_piece_rebut.createMany({
                        data: pieces.map((p) => ({
                            piece_id: p.piece_id,
                            etat: p.etat,
                            snap_id: snapshot.id,
                        })),
                    });
                }
            }

            /***********      A_REPARER     ************/
            for (const item of aReparerItems) {
                const tpeId = idBySerial.get(item.terminalSN); // garanti présent

                const def = parseArray(item.pieces_defectueuses);
                const pieces = def.map((pieceId) => ({ piece_id: pieceId, etat: "defectueux" }));

                const tpeAreparer = await tx.tpe_a_reparer.create({
                    data: {
                        tpe_id: tpeId,
                        etat: "defectueux",
                        created_at: dateAction,
                        created_by: utilisateur.id_user,
                    },
                });

                if (pieces.length) {
                    await tx.pieces_a_reparer.createMany({
                        data: pieces.map((p) => ({
                            sn_id: tpeAreparer.id,
                            piece_id: p.piece_id,
                            etat: p.etat,
                            created_by: utilisateur.id_user,
                            created_at: dateAction,
                        })),
                    });
                }
            }

            return {
                tpe_rebut: rebutItems.length,
                tpe_a_reparer: aReparerItems.length,
            };
        }, {
            timeout: 20000,
        });

        console.log(`Liaison pièces TPE effectuée avec succès par ${utilisateur.username}`);
        return res.status(200).json({
            message: "Liaison pièces TPE effectuée avec succès.",
            ...operation,
        });
    } catch (error) {
        console.error("Erreur lors de la liaison des pièces TPE :", error);
        return res
            .status(500)
            .json({ message: "Erreur interne lors de la liaison des pièces TPE." });
    }
};

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
    getAllTpeRepare,
    // reparerTpe,
    extractSnReparation,
    reparerListeTpe,
    getAllLivraisonReparation,
    getOneLivraisonReparation,
    receptionLivraisonReparation,
    cloturerLivraisonReparation,
    miseEnReparationTpe,
    extractMiseEnReparation,
    downloadTemplateLiaisonTpePieces,
    extractLiaisonTpePiecesData,
    liaisonTpePieces,
}