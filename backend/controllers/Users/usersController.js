const TEST_ENV = require("../../utils/consts")
const { echapperHtml } = require("../../utils/securiteHtml");
const prisma = require('../../prisma/client');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { envoyerEmail } = require("../../config/emailConfig")
const cloudinary = require("../../config/clouddinaryConifg");
const crypto = require("crypto")
const { ROLE_SUPER_ADMIN } = require("../../middlewares/authMiddleware")
const sendMail = require("../../utils/emailSender")
const { poserCookieSession, effacerCookieSession } = require("../../utils/session")

/// baseUrl est l'addresse du site de livraison
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

/* ---------------------- Contrôles de la gestion des comptes ---------------------- */
// (routes réservées aux rôles 5 / 39 : voir routes/usersRoutes.js)

const estSuperAdmin = (req) => Array.isArray(req.user?.roles) && req.user.roles.includes(ROLE_SUPER_ADMIN)

// Liste d'identifiants entiers, sans doublon ; null si la valeur n'est pas une liste valide
const listeIds = (valeur) => {
    if (valeur === undefined || valeur === null) return []
    if (!Array.isArray(valeur)) return null
    const ids = valeur.map((v) => Number(v))
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return null
    return [...new Set(ids)]
}

// Vérifie les rôles et services demandés pour un compte. Retourne { erreur } ou { roles, services }.
// Seul un super administrateur peut attribuer le rôle super administrateur.
const controlerRolesServices = async (req, userRoles, userServices) => {
    const roles = listeIds(userRoles)
    const services = listeIds(userServices)
    if (roles === null) return { erreur: "Liste de rôles invalide." }
    if (services === null) return { erreur: "Liste de services invalide." }
    if (roles.includes(ROLE_SUPER_ADMIN) && !estSuperAdmin(req)) {
        return { status: 403, erreur: "Seul un super administrateur peut attribuer le rôle super administrateur." }
    }
    if (roles.length) {
        const existants = await prisma.roles.count({ where: { id_role: { in: roles } } })
        if (existants !== roles.length) return { erreur: "Un des rôles demandés n'existe pas." }
    }
    if (services.length) {
        const existants = await prisma.services.count({ where: { id: { in: services } } })
        if (existants !== services.length) return { erreur: "Un des services demandés n'existe pas." }
    }
    return { roles, services }
}

// Un compte super administrateur ne peut être modifié ou supprimé que par un super administrateur
const cibleProtegee = async (req, idCible) => {
    if (estSuperAdmin(req)) return false
    const role = await prisma.user_roles.findFirst({ where: { user_id: idCible, role_id: ROLE_SUPER_ADMIN } })
    return Boolean(role)
}

const texteValide = (v) => typeof v === 'string' && v.trim() !== ''

/* ------------------------- Mots de passe et sessions ------------------------- */

// Règle des mots de passe : 10 caractères minimum, au moins une lettre et un chiffre (128 max)
const MOT_DE_PASSE_MIN = 10
const motDePasseValide = (p) => typeof p === 'string' && p.length >= MOT_DE_PASSE_MIN && p.length <= 128
    && /[A-Za-z]/.test(p) && /[0-9]/.test(p)
const MESSAGE_MOT_DE_PASSE = `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères, dont une lettre et un chiffre.`

// Le token de lien (création de compte / réinitialisation) n'est stocké qu'haché : une fuite de la base ne donne pas de lien valide
const hacherToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

const DUREE_LIEN_CREATION = 24 * 60 * 60 * 1000 // 24 h
const DUREE_LIEN_REINITIALISATION = 60 * 60 * 1000 // 1 h

// Crée un lien à usage unique pour choisir son mot de passe (page /password/reset-password/:token du front)
const creerLienMotDePasse = async (idUser, dureeMs) => {
    const token = crypto.randomBytes(32).toString("hex")
    await prisma.users.update({
        where: { id_user: idUser },
        data: { reset_token: hacherToken(token), reset_expires: new Date(Date.now() + dureeMs) },
    })
    return `${GENERAL_URL}/password/reset-password/${token}`
}

// Le JWT contient la version de session du compte (users.token_version) : l'incrémenter déconnecte toutes les sessions
const signerToken = (user) => jwt.sign(
    { id_user: user.id_user, tv: user.token_version ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
)
const revoquerSessions = (idUser) => prisma.users.update({
    where: { id_user: idUser },
    data: { token_version: { increment: 1 } },
})


const register = async (req, res) => {
    // Le mot de passe n'est plus choisi par l'administrateur : l'utilisateur reçoit un lien pour le définir lui-même
    const { fullname, username, email, userServices, userRoles } = req.body;

    try {
        if (!texteValide(email)) {
            return res.status(400).json({ message: "E-mail obligatoire." });
        }
        const controle = await controlerRolesServices(req, userRoles, userServices)
        if (controle.erreur) {
            return res.status(controle.status || 400).json({ message: controle.erreur });
        }

        // Check if user already exists
        const exists = await prisma.users.findFirst({
            where: { email }
        });

        if (exists) {
            return res.status(400).json({ message: "L'email existe déjà" });
        }

        // Create user (sans mot de passe : la connexion est impossible tant que le lien n'a pas été utilisé)
        const newUser = await prisma.users.create({
            data: {
                fullname: fullname,
                username: username,
                email: email,
                password: null,
                created_at: new Date(),
            }
        });

        // Create user-services

        const userId = newUser.id_user

        if (controle.roles.length) {
            await prisma.user_roles.createMany({
                data: controle.roles.map(roleId => ({
                    user_id: userId,
                    role_id: roleId,
                })),
            });
        }

        if (controle.services.length) {
            await prisma.user_services.createMany({
                data: controle.services.map(serviceId => ({
                    user_id: userId,
                    service_id: serviceId,
                })),
            });
        }

        /* ********************* MAIL D'INVITATION À L'UTILISATEUR NOUVELLEMENT AJOUTÉ *********************** */
        // Lien à usage unique, valable 24 h, pour choisir son mot de passe. Aucun mot de passe n'est envoyé par mail.
        const lien = await creerLienMotDePasse(userId, DUREE_LIEN_CREATION)
        const subject = "SYSLIS - NOUVEAU COMPTE CRÉÉ"
        const html = `
        <p>Bonjour,</p>
        <p>Votre e-mail vient d'être enregistré dans l'application de livraison de GREEN-PAY.</p>
        <br>
        <p>Pour activer votre compte, choisissez votre mot de passe en cliquant sur ce lien :</p>
        <p><a href="${echapperHtml(lien)}" target="_blank" style="background-color: #73dced; color: white; padding: 7px 12px; text-decoration: none; border-radius: 5px;">Choisir mon mot de passe</a></p>
        <p>Ce lien est valable 24 heures et ne peut être utilisé qu'une fois.
        Passé ce délai, utilisez « Mot de passe oublié ? » sur la page de connexion.</p>
        <br>
        <p>Identifiant de connexion : votre e-mail Green - Pay.</p>
        <br>
        <p>En cas de soucis de connexion ou autre, veuillez vous référer au groupe support développement.</p>
        <br><br>
        <p>Green - Pay vous remercie.</p>
    `
        // Mail personnel : envoyé directement à l'utilisateur, pas en CCI. Toujours envoyé (c'est le seul moyen d'activer le compte).
        // Un échec d'envoi ne doit pas annuler la création : l'utilisateur pourra passer par « Mot de passe oublié ».
        let invitationEnvoyee = true
        try {
            await sendMail({
                to: newUser.email,
                subject,
                html,
            })
        } catch (mailError) {
            invitationEnvoyee = false
            console.error("Erreur lors de l'envoi du mail d'invitation :", mailError);
        }

        return res.status(201).json({ ...newUser, invitationEnvoyee });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ message: "Erreur serveur lors de l'inscription" });
    }
};

/** ✅ LOGIN (Connexion) */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!texteValide(email) || typeof password !== 'string' || password === '') {
            return res.status(400).json({ message: "E-mail et mot de passe obligatoires." });
        }
        const user = await prisma.users.findFirst({ where: { email }, omit: { password: false, token_version: false } });

        // Même réponse que pour un mauvais mot de passe : on ne révèle pas si l'e-mail existe
        if (!user) return res.status(401).json({ message: "Identifiants invalides." });
        // Compte supprimé : connexion refusée
        if (user.is_deleted) return res.status(401).json({ message: "Identifiants invalides." });
        if (!user.password) return res.status(401).json({ message: "Identifiants invalides." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Identifiants invalides." });

        // Le token est posé dans un cookie HttpOnly : il n'est plus renvoyé dans la réponse ni stocké par le front
        poserCookieSession(res, signerToken(user));

        // Le hash du mot de passe ne doit pas être renvoyé au navigateur
        const { password: _password, token_version: _tv, ...userSansMotDePasse } = user;
        res.status(200).json({ message: "Connexion réussie.", user: userSansMotDePasse });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Erreur serveur." });
    }
};

/** ✅ UPDATE USER */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullname, username, email, userServices, userRoles, mailChecked } = req.body;

        const idCible = parseInt(id)
        if (!Number.isInteger(idCible)) {
            return res.status(400).json({ message: "Identifiant invalide." });
        }

        const user = await prisma.users.findUnique({
            where: { id_user: idCible },
        });
        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }
        if (await cibleProtegee(req, idCible)) {
            return res.status(403).json({ message: "Seul un super administrateur peut modifier ce compte." });
        }
        const controle = await controlerRolesServices(req, userRoles, userServices)
        if (controle.erreur) {
            return res.status(controle.status || 400).json({ message: controle.erreur });
        }
        // L'e-mail sert d'identifiant de connexion : il ne doit pas déjà appartenir à un autre compte
        if (email !== undefined && email !== user.email) {
            if (!texteValide(email)) {
                return res.status(400).json({ message: "E-mail invalide." });
            }
            const doublon = await prisma.users.findFirst({ where: { email, id_user: { not: idCible } } })
            if (doublon) {
                return res.status(400).json({ message: "L'email existe déjà" });
            }
        }

        // Rôles actuels : si les droits ou l'e-mail changent, les sessions ouvertes du compte sont fermées
        const rolesAvant = (await prisma.user_roles.findMany({ where: { user_id: idCible } })).map((r) => r.role_id).sort((x, y) => x - y)
        const rolesApres = [...controle.roles].sort((x, y) => x - y)
        const droitsModifies = rolesAvant.join(',') !== rolesApres.join(',')
            || (email !== undefined && email !== user.email)

        const dataToUpdate = {
            fullname,
            username,
            email,
            ...(droitsModifies ? { token_version: { increment: 1 } } : {}),
        }

        const updatedUser = await prisma.users.update({
            where: { id_user: parseInt(id) },
            data: dataToUpdate
        })

        await prisma.user_roles.deleteMany({
            where: { user_id: parseInt(id) }
        })

        await prisma.user_services.deleteMany({
            where: { user_id: parseInt(id) }
        })

        if (controle.roles.length) {
            await prisma.user_roles.createMany({
                data: controle.roles.map(roleId => ({
                    user_id: idCible,
                    role_id: roleId,
                })),
            });
        }

        if (controle.services.length) {
            await prisma.user_services.createMany({
                data: controle.services.map(serviceId => ({
                    user_id: idCible,
                    service_id: serviceId,
                })),
            });
        }

        /* ********************* GESTION DE MAIL A L'UTILISATEUR NOUVELEMENT AJOUTE *********************** */
        const url = GENERAL_URL
        const subject = "SYSLIS - MODIFICATION DE PROFIL"
        const html = `
            <p>Bonjour,<p>
            <p>Votre profil vient d'être modifié dans l'application de livraison GREEN-PAY.<p>
            <br>
            <p>Retrouvez les modifications à ce lien : <p>
            <a href="${url}" target="_blank">${url}<a>
            <br>
            <p>En cas de soucis de connexion ou autre veuillez vous référer au groupe support développement.<p>
            <br><br>
            <p>Green - Pay vous remercie.</p>
        `
        // Mail personnel (contient des informations propres à l'utilisateur) : envoyé directement à l'utilisateur, pas en CCI.
        // Un échec d'envoi ne doit pas annuler l'opération.
        if (mailChecked) {
            try {
                await sendMail({
                    to: user.email,
                    subject,
                    html,
                })
            } catch (mailError) {
                console.error("Erreur lors de l'envoi des mails :", mailError);
            }
        }

        res.status(200).json({ message: "Utilisateur mis à jour.", updatedUser });
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Erreur serveur." });
    }
};

/** ✅ DELETE USER */
const deleteUser = async (req, res) => {
    try {
        const idCible = parseInt(req.params.id);
        if (!Number.isInteger(idCible)) {
            return res.status(400).json({ message: "Identifiant invalide." });
        }
        if (idCible === req.user.id_user) {
            return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
        }
        if (await cibleProtegee(req, idCible)) {
            return res.status(403).json({ message: "Seul un super administrateur peut supprimer ce compte." });
        }
        // Suppression logique : l'historique (livraisons, demandes, stocks...) référence l'utilisateur.
        // Un compte supprimé ne peut plus se connecter et ses sessions en cours sont refusées.
        const resultat = await prisma.users.updateMany({ where: { id_user: idCible }, data: { is_deleted: 1, token_version: { increment: 1 } } });
        if (resultat.count === 0) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }
        res.status(200).json({ message: "Utilisateur supprimé avec succès." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

/** ✅ FORGOT PASSWORD (Demander réinitialisation) */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!texteValide(email)) {
            return res.status(400).json({ message: "E-mail obligatoire." });
        }
        const trouve = await prisma.users.findFirst({ where: { email } })
        const users = trouve && !trouve.is_deleted ? trouve : null

        // Réponse identique que le compte existe ou non (pas d'énumération des e-mails)
        const reponseGenerique = { message: "Si un compte existe pour cet e-mail, un lien de réinitialisation vient d'être envoyé." }
        if (!users) return res.status(200).json(reponseGenerique);

        // 🔹 Lien à usage unique valable 1 h (token stocké haché en base)
        const resetURL = await creerLienMotDePasse(users.id_user, DUREE_LIEN_REINITIALISATION);

        // 🔹 Envoi de l'email
        const html = `
            <h3>Demande de réinitialisation de mot de passe</h3>
            <p>Bonjour ${echapperHtml(users.email)},</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
            <p>👉 <a href="${echapperHtml(resetURL)}">Cliquez ici pour réinitialiser votre mot de passe</a></p>
            <p>Ce lien expire dans 1 heure.</p>
            <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        `;

        await envoyerEmail(users.email, "Réinitialisation de votre mot de passe", html);

        res.status(200).json(reponseGenerique);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

/** ✅ RESET PASSWORD (Réinitialiser avec le token) */
const resetPassword = async (req, res) => {
    // console.table(req.params)
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!texteValide(token)) {
            return res.status(400).json({ message: "Token invalide ou expiré." });
        }
        if (!motDePasseValide(password)) {
            return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE });
        }
        // 🔹 Vérifier si le token existe et n'a pas expiré (comparaison sur le hash)
        const user = await prisma.users.findFirst({
            where: { reset_token: hacherToken(token), reset_expires: { gt: new Date() } }
        });

        // console.table(user)

        if (!user || user.is_deleted) return res.status(400).json({ message: "Token invalide ou expiré." });

        // 🔹 Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🔹 Mettre à jour l'utilisateur, supprimer le token (usage unique) et fermer les sessions ouvertes
        await prisma.users.update({
            where: { id_user: user.id_user },
            data: { password: hashedPassword, reset_token: null, reset_expires: null, token_version: { increment: 1 } }
        })

        effacerCookieSession(res);
        res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id_user; // posé par authentifier
        if (typeof currentPassword !== 'string' || !motDePasseValide(newPassword)) {
            return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE });
        }

        if (!userId) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }

        // 🔹 Find the user
        const user = await prisma.users.findUnique({
            where: { id_user: parseInt(userId) },
            omit: { password: false },
        });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }

        // 🔹 Compare current password with stored hash
        const isMatch = user.password ? await bcrypt.compare(currentPassword, user.password) : false;
        if (!isMatch) {
            return res.status(400).json({ message: "Mot de passe actuel incorrect." });
        }

        // 🔹 Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 🔹 Update password in DB ; toutes les sessions ouvertes (autres appareils compris) sont fermées
        await prisma.users.update({
            where: { id_user: parseInt(userId) },
            data: { password: hashedNewPassword, token_version: { increment: 1 } },
        });

        effacerCookieSession(res);
        res.status(200).json({ message: "Mot de passe changé avec succès." });

    } catch (error) {
        console.error("Erreur lors du changement de mot de passe:", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

/** Utilisateur connecté (lu dans la session) : identité et rôles. Remplace la lecture de tous les rôles côté front. */
const me = async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { id_user: req.user.id_user },
            select: {
                id_user: true, fullname: true, username: true, email: true,
                user_roles: { select: { roles: { select: { id_role: true, nom_role: true, description: true } } } },
                user_services: { select: { services: { select: { id: true, nom_service: true, code_service: true } } } },
            },
        });
        if (!user) return res.status(401).json({ message: "Session invalide, reconnectez-vous." });
        const { user_roles, user_services, ...identite } = user;
        res.status(200).json({
            ...identite,
            roles: (user_roles || []).map((r) => r.roles).filter(Boolean),
            services: (user_services || []).map((s) => s.services).filter(Boolean),
        });
    } catch (error) {
        console.error("Erreur lors de la lecture de la session :", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

/** Déconnexion : ferme toutes les sessions du compte (le token en cours et ceux des autres appareils) */
const logout = async (req, res) => {
    try {
        await revoquerSessions(req.user.id_user);
        effacerCookieSession(res);
        res.status(200).json({ message: "Déconnecté." });
    } catch (error) {
        console.error("Erreur lors de la déconnexion :", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const allUsers = await prisma.users.findMany({
            orderBy: { fullname: 'asc' },
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
                user_services: {
                    include: {
                        services: true,
                    },
                },
            },
        });

        res.status(200).json(allUsers);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
    }
}

const getUserRoles = async (req, res) => {
    try {
        const { id } = req.params;

        const user_roles = await prisma.user_roles.findMany({
            where: { user_id: parseInt(id) },
            include: { roles: true }
        })

        res.status(200).json({
            roles: user_roles.map(r => r.roles)
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
}

const getAllRoles = async (req, res) => {
    try {
        const AllRoles = await prisma.roles.findMany({
            orderBy: { nom_role: 'asc' }
        })

        res.status(200).json(AllRoles)
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des rôles " })
    }
}

const getAllUserRoles = async (req, res) => {
    try {
        const roles = await prisma.user_roles.findMany({
            orderBy: { user_id: 'asc' }
        })

        res.status(200).json(roles);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des rôles utilisateurs " });
    }
}

const getAllServices = async (req, res) => {
    try {
        const services = await prisma.services.findMany({
            orderBy: { nom_service: 'asc' }
        })

        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des services " })
    }
}

const getAllUserServices = async (req, res) => {
    try {
        const services = await prisma.user_services.findMany({
            orderBy: { user_id: 'asc' }
        })

        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des services utilisateurs " });
    }
}

const getUserServices = async (req, res) => {
    try {
        const { id } = req.params;

        const user_services = await prisma.user_services.findMany({
            where: { user_id: parseInt(id) },
            include: { services: true }
        })

        res.status(200).json({
            services: user_services.map(s => s.services)
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
}

const getOneUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await prisma.users.findUnique({
            where: { id_user: parseInt(id) },
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
                user_services: {
                    include: {
                        services: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        return res.status(200).json(user)
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
}

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    updateUser,
    deleteUser,
    changePassword,
    logout,
    me,
    getAllUsers,
    getUserRoles,
    getAllUserRoles,
    getAllRoles,
    getAllServices,
    getAllUserServices,
    getOneUser,
    getUserServices,
}