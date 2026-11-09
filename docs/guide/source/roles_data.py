# -*- coding: utf-8 -*-
"""Contenu du chapitre « Rôles et droits » du guide utilisateur SYSLIS.

Sources : table `roles` (export du 06/11/2026), AppSidebar.tsx (menus),
pages de détail (boutons d'action par rôle et par statut),
notificationsController (actions en attente).
"""

# Menus visibles par tous les utilisateurs connectés
MENUS_COMMUNS = [
    "Dashboard → Semaine en cours, QRcode, Mouvement Stock, Statistiques Parc TPE",
    "Gestion des Livraisons → Toutes les livraisons, Tous les remplacements",
]

FAMILLES = [
    {
        "id": "livraisons",
        "titre": "Livraisons et remplacements de TPE",
        "chapitre": "5",
        "flux": ["Livreur (1) crée la livraison",
                 "Réceptionnaire (2, 8, 9 ou 10) valide ou retourne",
                 "Si retour : le livreur corrige et renvoie"],
        "intro": "Ces rôles couvrent la remise de TPE, de chargeurs et les remplacements de TPE. "
                 "Le type de livraison choisi détermine quel rôle de réception doit confirmer. "
                 "Le rôle 13 est tenu informé par mail, le rôle 14 paramètre les types de livraison.",
        "roles": [
            {
                "ids": [1], "nom": "livraison", "libelle": "Livreur TPE",
                "but": "Enregistrer les livraisons de TPE paramétrés (bancaires ou mobiles) et de chargeurs aux "
                       "services internes, ainsi que les remplacements de TPE, puis les corriger tant qu'elles ne sont "
                       "pas réceptionnées ou lorsqu'elles ont été retournées.",
                "menus": ["Dashboard → Livraison TPE, Remplacement TPE, Sorties Chargeurs",
                          "Gestion des Livraisons → Nouvelle Livraison, Nouveau Remplacement",
                          "Gestion Régularisation → REG Livraison, REG Remplacement"],
                "actions": ["Créer une livraison ou un remplacement.",
                            "<b>Modifier Livraison</b> / <b>Modifier Remplacement</b> depuis la fiche, "
                            "tant qu'elle est en cours ou après un retour.",
                            "Saisir une régularisation (REG) pour une livraison déjà faite hors application."],
                "attente": ["Livraisons et remplacements au statut « Retourné » : à corriger puis renvoyer."],
                "voir": ["5", "12"],
            },
            {
                "ids": [2], "nom": "reception", "libelle": "Réceptionnaire (toutes livraisons)",
                "but": "Confirmer ou retourner n'importe quelle livraison ou n'importe quel remplacement en cours, "
                       "quel que soit le service destinataire.",
                "menus": ["Aucun menu propre : les listes Toutes les livraisons et Tous les remplacements "
                          "sont ouvertes à tous."],
                "actions": ["Sur une fiche « en cours » : valider la réception ou retourner la livraison avec un "
                            "commentaire.",
                            "<b>Reg Réception</b> pour une livraison saisie en régularisation."],
                "attente": ["Pas de bulle de notification pour ce rôle : consultez la liste filtrée sur le "
                            "statut « en cours »."],
                "voir": ["5"],
            },
            {
                "ids": [8, 9, 10], "nom": "reception_commerciale · reception_support · reception_maintenance",
                "libelle": "Réceptionnaire d'un service",
                "but": "Même action que le rôle 2, limitée aux livraisons et remplacements dont le type de "
                       "livraison est attribué à votre service (commercial, support ou maintenance).",
                "menus": ["Aucun menu propre : Toutes les livraisons, Tous les remplacements."],
                "actions": ["Valider la réception ou retourner une livraison / un remplacement de votre service.",
                            "<b>Reg Réception</b> pour une régularisation."],
                "attente": ["Pas de bulle de notification : filtrez la liste sur le statut « en cours »."],
                "voir": ["5", "13"],
            },
            {
                "ids": [13], "nom": "supervision_livraisons", "libelle": "Superviseur des livraisons",
                "but": "Être informé par mail de chaque action sur une livraison : émission, réception, retour, "
                       "modification.",
                "menus": ["Aucun menu propre ; consultation des listes ouvertes à tous."],
                "actions": ["Aucune action : rôle d'information."],
                "attente": ["Rien à traiter ; les mails arrivent automatiquement."],
                "voir": ["5"],
            },
            {
                "ids": [14], "nom": "gestion_livraisons", "libelle": "Paramétreur des types de livraison",
                "but": "Créer et modifier les types de livraison proposés dans le formulaire de livraison "
                       "(LIVRAISON TPE GIM, LIVRAISON TPE MOBILE, LIVRAISON CHARGEUR…).",
                "menus": ["Parametrage Livraison → Ajouter type livraison, Voir types livraison"],
                "actions": ["Ajouter un type de livraison.", "Modifier un type existant."],
                "attente": ["Rien à traiter."],
                "voir": ["13"],
            },
        ],
    },
    {
        "id": "stocks",
        "titre": "Stocks et demandes de stock",
        "chapitre": "6",
        "flux": ["Demandeur (3) crée la demande",
                 "Validateur (4) valide, retourne ou refuse",
                 "Responsable d'un stock livre (en une ou plusieurs fois)",
                 "Réceptionnaire (12) confirme et choisit la mise en stock"],
        "intro": "Une demande porte sur une pièce, un chargeur ou un TPE, pour un modèle et un service. "
                 "La livraison n'est pas liée à un rôle : elle est faite par le propriétaire ou un "
                 "sous-propriétaire d'un stock qui contient l'élément demandé.",
        "roles": [
            {
                "ids": [3], "nom": "demande", "libelle": "Demandeur de stock",
                "but": "Demander des pièces détachées, des chargeurs ou des TPE pour son service.",
                "menus": ["Gestion des Stocks → Nouvelle Demande Stock, Toutes les demandes Stock",
                          "Gestion Régularisation → REG Demande Stock"],
                "actions": ["Créer une demande : élément, modèle, service, quantité, motif.",
                            "<b>Modifier demande</b> tant qu'elle est en cours ou après un retour (si vous êtes "
                            "le créateur, le demandeur ou membre du service demandeur).",
                            "Saisir une régularisation pour un mouvement déjà fait hors application."],
                "attente": ["Demandes retournées par le validateur (bulle sur Toutes les demandes Stock)."],
                "voir": ["6", "12"],
            },
            {
                "ids": [4], "nom": "validation", "libelle": "Validateur de demandes de stock",
                "but": "Décider de la suite d'une demande : la valider (avec la quantité accordée), la retourner "
                       "au demandeur pour correction, ou la refuser.",
                "menus": ["Gestion des Stocks (le sous-menu Toutes les demandes Stock apparaît quand une "
                          "demande vous attend)"],
                "actions": ["<b>Valider demande</b> : quantité validée et commentaire. Les responsables des "
                            "stocks concernés sont prévenus par mail.",
                            "Retourner ou refuser la demande.",
                            "<b>REG validation</b> sur une demande saisie en régularisation."],
                "attente": ["Demandes « en cours » (bulle + cloche)."],
                "voir": ["6"],
                "note": "Le sous-menu « Toutes les demandes Stock » n'est pas attribué au rôle 4 : un validateur "
                        "sans demande en attente ne voit pas la liste. Ajouter 4 aux rôles du sous-menu ?",
            },
            {
                "ids": [7], "nom": "gestion_stock", "libelle": "Gestionnaire de stock",
                "but": "Tenir le catalogue des éléments (pièces, terminaux), créer les stocks et suivre les "
                       "entrées et sorties.",
                "menus": ["Gestion des Stocks → Voir Elements Stock, Créer Nouveau Stock, Voir tous les Stocks, "
                          "Entrées Sorties"],
                "actions": ["Ajouter ou modifier une pièce ou un terminal (nom, type, modèles, services).",
                            "Créer un stock (code unique, propriétaire, sous-propriétaires, quantités ou import "
                            "de numéros de série).",
                            "<b>Créer nouveau stock</b> depuis une demande validée quand aucun stock ne "
                            "contient l'élément demandé.",
                            "Consulter tous les stocks et l'historique des mouvements."],
                "attente": ["Rien de spécifique ; les livraisons se font comme responsable de stock."],
                "voir": ["6"],
            },
            {
                "ids": [11], "nom": "voir_demande", "libelle": "Lecteur des demandes de stock",
                "but": "Consulter toutes les demandes de stock et leur suivi, sans pouvoir agir.",
                "menus": ["Gestion des Stocks → Toutes les demandes Stock"],
                "actions": ["Consultation, filtres et export."],
                "attente": ["Rien à traiter."],
                "voir": ["6"],
            },
            {
                "ids": [12], "nom": "reception_piece", "libelle": "Réceptionnaire de stock",
                "but": "Confirmer, pour son service, la réception de ce qui a été livré sur une demande, et "
                       "décider de la mise en stock.",
                "menus": ["Gestion des Stocks (Toutes les demandes Stock apparaît quand une réception vous "
                          "attend)"],
                "actions": ["Confirmer la réception d'une livraison et choisir : créer un nouveau stock, "
                            "ajouter à un stock existant, ou ne pas mettre en stock.",
                            "<b>Reg Réception</b> pour une régularisation."],
                "attente": ["Livraisons non encore reçues sur les demandes de votre service."],
                "voir": ["6"],
            },
            {
                "ids": [], "nom": "(sans rôle dédié)", "libelle": "Responsable d'un stock",
                "but": "Le propriétaire et les sous-propriétaires d'un stock en ont la charge. Ce n'est pas un "
                       "rôle : c'est la fiche du stock qui les désigne.",
                "menus": ["Toutes les demandes Stock apparaît quand une demande validée peut être livrée depuis "
                          "un de vos stocks."],
                "actions": ["<b>Livraison Stock</b> : livrer une demande validée, en une ou plusieurs fois.",
                            "<b>Faire une entrée/sortie</b> sur le stock (propriétaire et sous-propriétaires).",
                            "<b>Modifier stock</b>, <b>Associer stocks</b>, <b>Supprimer stock</b> : "
                            "propriétaire uniquement (ou super administrateur)."],
                "attente": ["Demandes validées ou partiellement livrées que vous pouvez servir."],
                "voir": ["6"],
            },
        ],
    },
    {
        "id": "qr",
        "titre": "QR codes",
        "chapitre": "7",
        "flux": ["Demande (15)", "Génération (16)", "Impression (17)", "Livraison (18)",
                 "Réception (19) : demande close"],
        "intro": "Tous les rôles 15 à 22 voient le menu Gestion des QRcodes (Toutes les demandes QRC, "
                 "Tous les Marchands QRC). Chaque rôle agit à une étape précise.",
        "roles": [
            {
                "ids": [15], "nom": "demande_qr", "libelle": "Demandeur de QR codes",
                "but": "Demander des QR codes pour des marchands et suivre ses demandes.",
                "menus": ["Gestion des QRcodes → Nouvelle Demande QRC"],
                "actions": ["Créer une demande (saisie ou import Excel des marchands).",
                            "<b>Modifier la demande</b> ou <b>Annuler la demande</b> tant qu'elle est soumise.",
                            "Modifier une demande suspendue pour la débloquer."],
                "attente": ["Vos demandes suspendues par le générateur."],
                "voir": ["7"],
            },
            {
                "ids": [16], "nom": "generateur_qr", "libelle": "Générateur de QR codes",
                "but": "Générer les QR codes et les déposer sur la demande.",
                "menus": ["Gestion des QRcodes"],
                "actions": ["<b>Upload QR Codes</b> sur une demande soumise.",
                            "<b>Suspendre Demande</b> avec un motif ; <b>Annuler Suspension</b> si vous "
                            "l'avez suspendue."],
                "attente": ["Demandes soumises (hors régularisation)."],
                "voir": ["7"],
            },
            {
                "ids": [17], "nom": "impression_qr", "libelle": "Valideur d'impression",
                "but": "Confirmer que les QR codes générés ont été imprimés.",
                "menus": ["Gestion des QRcodes"],
                "actions": ["<b>Confirmer Impression</b>.", "<b>Retourner QR Codes</b> en cas de problème."],
                "attente": ["Demandes au statut « générée »."],
                "voir": ["7"],
            },
            {
                "ids": [18], "nom": "livraison_qr", "libelle": "Livreur de QR codes",
                "but": "Livrer les QR codes imprimés.",
                "menus": ["Gestion des QRcodes"],
                "actions": ["<b>Livraison QR Codes</b> sur une demande imprimée.",
                            "<b>Reg Livraison QR Codes</b> sur une demande saisie en régularisation."],
                "attente": ["Demandes imprimées et régularisations soumises."],
                "voir": ["7", "12"],
            },
            {
                "ids": [19], "nom": "reception_qr", "libelle": "Réceptionnaire de QR codes",
                "but": "Confirmer la réception des QR codes ; cette étape clôt la demande.",
                "menus": ["Gestion des QRcodes"],
                "actions": ["<b>Réception QR Codes</b>.", "<b>Reg Réception QR Codes</b> pour une régularisation."],
                "attente": ["Demandes livrées."],
                "voir": ["7"],
            },
            {
                "ids": [20], "nom": "telecharger_qr", "libelle": "Téléchargement des QR codes",
                "but": "Récupérer les fichiers de QR codes déposés sur une demande.",
                "menus": ["Gestion des QRcodes"],
                "actions": ["<b>Télécharger QR Codes</b> dès que la demande est générée (et aux étapes "
                            "suivantes)."],
                "attente": ["Rien à traiter."],
                "voir": ["7"],
            },
            {
                "ids": [21], "nom": "admin_qr", "libelle": "Administrateur QR codes",
                "but": "Saisir après coup, en régularisation, une demande de QR codes traitée hors application.",
                "menus": ["Gestion Régularisation → REG Demande QRC"],
                "actions": ["Créer une demande de régularisation ; la livraison et la réception sont ensuite "
                            "confirmées par les rôles 18 et 19."],
                "attente": ["Rien à traiter."],
                "voir": ["7", "12"],
            },
            {
                "ids": [22], "nom": "supervision_qr", "libelle": "Superviseur QR codes",
                "but": "Suivre toutes les demandes de QR codes et recevoir les mails de suivi.",
                "menus": ["Gestion des QRcodes"],
                "actions": ["Consultation, filtres et export."],
                "attente": ["Rien à traiter."],
                "voir": ["7", "4"],
            },
        ],
    },
    {
        "id": "decom",
        "titre": "Décommissionnement",
        "chapitre": "8",
        "flux": ["Création (23)", "Réception (24)", "Validation de la liste et transmission (38)",
                 "Réception maintenance, vérification technique, diagnostic (25)", "Clôture (29)",
                 "Suite : paramétrage, réparation ou rebut"],
        "intro": "Un décommissionnement (décom) ramène une liste de TPE de chez les marchands vers la "
                 "maintenance. À la clôture, chaque TPE part vers le paramétrage, la réparation ou le rebut "
                 "selon son diagnostic.",
        "roles": [
            {
                "ids": [23], "nom": "decom", "libelle": "Initiateur de décom",
                "but": "Saisir la liste des TPE à décommissionner, la corriger ou annuler le décom.",
                "menus": ["Gestion des décomm → Nouveau décomm, Tous les décomm, Tableau de bord",
                          "Gestion Régularisation → REG Décommissionnement"],
                "actions": ["Créer un décom : saisie ou import du modèle Excel (S/N, point marchand, modèle "
                            "obligatoire, chargeur, carte SIM, carton).",
                            "<b>Modifier la liste</b> tant que le décom est soumis ou après un retour ; annuler "
                            "le décom.",
                            "Saisir une régularisation."],
                "attente": ["Décoms retournés par la réception."],
                "voir": ["8", "12"],
            },
            {
                "ids": [24], "nom": "reception_decom", "libelle": "Réceptionnaire de décom",
                "but": "Attester que les TPE du décom ont été récupérés, ou retourner le décom.",
                "menus": ["Gestion des décomm → Tous les décomm, Tableau de bord"],
                "actions": ["<b>Confirmer réception</b> ou retourner le décom avec un commentaire."],
                "attente": ["Décoms soumis (statut « en cours »)."],
                "voir": ["8"],
            },
            {
                "ids": [38], "nom": "validation_decom", "libelle": "Valideur de décom",
                "but": "Valider la liste des TPE retenus après réception, puis transmettre le décom à la "
                       "maintenance.",
                "menus": ["Pas de menu propre : Tous les décomm apparaît quand un décom vous attend."],
                "actions": ["<b>Valider liste</b> : choisir les TPE retenus. Les TPE validés sont ajoutés au parc "
                            "(statut « attente décom », ou « décom remplacement »).",
                            "<b>Transmettre à la maintenance</b>."],
                "attente": ["Décoms reçus (à valider) et validés (à transmettre)."],
                "voir": ["8"],
            },
            {
                "ids": [25], "nom": "verification_decom", "libelle": "Maintenance — vérification technique",
                "but": "Réceptionner le décom à la maintenance, diagnostiquer chaque TPE et décider de son "
                       "nouveau statut ; livrer ensuite les TPE à paramétrer et organiser leur réparation.",
                "menus": ["Gestion des décomm → Tous les décomm, Livraison TPE param, Livraisons TPE param, "
                          "Tableau de bord",
                          "Gestion Maintenances → Réparation TPE, Lots de réparation"],
                "actions": ["<b>Valider réception maintenance</b> (TPE réellement reçus).",
                            "<b>Vérification technique</b> : pour chaque TPE, paramétrage, à réparer ou rebut ; "
                            "puis confirmer le diagnostic (ou <b>Annuler diagnostic</b> avec un motif).",
                            "<b>Livraison Param</b> : livrer les TPE à paramétrer après la clôture.",
                            "Créer un lot de réparation et <b>Livrer les TPE réparés</b> une fois le lot validé."],
                "attente": ["Décoms transmis et en vérification, TPE à paramétrer à livrer, TPE à réparer, "
                            "lots validés à livrer."],
                "voir": ["8", "10"],
            },
            {
                "ids": [29], "nom": "cloture_decom", "libelle": "Clôture de décom",
                "but": "Clôturer le décom en validant les diagnostics attribués aux TPE.",
                "menus": ["Pas de menu propre : Tous les décomm apparaît quand un décom vous attend."],
                "actions": ["<b>Cloturer décomm</b> sur un décom « complet ». Les TPE passent au parc en "
                            "paramétrage maintenance, à réparer ou rebut."],
                "attente": ["Décoms complets (diagnostic confirmé)."],
                "voir": ["8", "11"],
            },
            {
                "ids": [26], "nom": "supervision_decom", "libelle": "Superviseur décom",
                "but": "Suivre les étapes des décoms et recevoir les mails.",
                "menus": ["Gestion des décomm → Tous les décomm, Livraisons TPE param, Tableau de bord"],
                "actions": ["Consultation, tableau de bord, extractions."],
                "attente": ["Rien à traiter."],
                "voir": ["8", "4"],
            },
        ],
    },
    {
        "id": "rebut",
        "titre": "Maintenance — mise au rebut",
        "chapitre": "9",
        "flux": ["Demande de mise au rebut (30 ou 32)", "Validation (31)", "Clôture (30)",
                 "Récupération des pièces fonctionnelles (32)", "Mise en stock des pièces"],
        "intro": "Une demande de mise au rebut liste des TPE en indiquant leurs pièces défectueuses et "
                 "fonctionnelles. Les pièces fonctionnelles peuvent ensuite être récupérées et remises en stock.",
        "roles": [
            {
                "ids": [30], "nom": "demande_rebut", "libelle": "Demandeur de mise au rebut",
                "but": "Soumettre une liste de TPE à mettre au rebut avec l'état de leurs pièces.",
                "menus": ["Gestion Maintenances → Mise au rebut, Toutes les mises au rebut, Tous les TPE au "
                          "rebut, Toutes les pièces au rebut"],
                "actions": ["Créer une demande (TPE, pièces défectueuses / fonctionnelles).",
                            "<b>Annuler la demande</b> tant qu'elle est en cours.",
                            "<b>Cloturer la demande</b> une fois validée."],
                "attente": ["Demandes validées à clôturer."],
                "voir": ["9"],
            },
            {
                "ids": [31], "nom": "validation_rebut", "libelle": "Valideur de mise au rebut",
                "but": "Valider ou retourner une demande de mise au rebut.",
                "menus": ["Gestion Maintenances → Toutes les mises au rebut, Tous les TPE au rebut, Toutes les "
                          "pièces au rebut"],
                "actions": ["<b>Valider demande</b> : retenir tout ou partie des TPE de la liste ; seuls les TPE "
                            "retenus passent au statut « rebut ».",
                            "<b>Retourner demande</b> au demandeur avec un commentaire."],
                "attente": ["Demandes en cours."],
                "voir": ["9"],
                "note": "une demande peut être refusée, mais la fiche n'a pas de bouton « Refuser » : le refus "
                        "consiste-t-il à ne retenir aucun TPE à la validation ? À préciser pour le guide.",
            },
            {
                "ids": [32], "nom": "gestion_rebut", "libelle": "Gestionnaire du rebut",
                "but": "Participer à la mise au rebut et gérer les pièces récupérées.",
                "menus": ["Gestion Maintenances → Mise au rebut, Toutes les mises au rebut, Tous les TPE au "
                          "rebut, Toutes les pièces au rebut"],
                "actions": ["Créer une demande ; <b>Modifier la liste</b> tant qu'elle est en cours.",
                            "<b>Récupérer pièces fonctionnelles</b> sur la fiche d'un TPE au rebut.",
                            "<b>Créer Stock</b> depuis Toutes les pièces au rebut : nouveau stock ou stock "
                            "existant dont vous êtes responsable."],
                "attente": ["Rien de signalé par les bulles."],
                "voir": ["9", "6"],
            },
            {
                "ids": [33], "nom": "supervision_rebut", "libelle": "Superviseur du rebut",
                "but": "Suivre les mises au rebut et les mouvements des pièces fonctionnelles.",
                "menus": ["Gestion Maintenances → Toutes les mises au rebut, Tous les TPE au rebut, Toutes les "
                          "pièces au rebut"],
                "actions": ["Consultation et export."],
                "attente": ["Rien à traiter."],
                "voir": ["9"],
            },
            {
                "ids": [34], "nom": "admin_rebut", "libelle": "Administrateur du rebut",
                "but": "Corriger la liste des pièces fonctionnelles et défectueuses d'un TPE au rebut.",
                "menus": ["Aucun menu."],
                "actions": ["<b>Modifier lots de pièces</b> et <b>Récupérer pièces fonctionnelles</b> sur la "
                            "fiche d'un TPE au rebut."],
                "attente": ["Rien à traiter."],
                "voir": ["9"],
                "note": "Le rôle 34 n'est pas dans les rôles du menu Gestion Maintenances : seul, il ne peut pas "
                        "atteindre la liste des TPE au rebut. L'ajouter au menu ?",
            },
        ],
    },
    {
        "id": "reparation",
        "titre": "Maintenance — réparation des TPE",
        "chapitre": "10",
        "flux": ["Lot de réparation (25 ou 35)", "Validation du lot (37)", "Livraison des TPE réparés (25 ou 35)",
                 "Réception et clôture (36)"],
        "intro": "Les TPE diagnostiqués « à réparer » lors d'un décom sont réparés par lots. Le même rôle 36 "
                 "réceptionne aussi les livraisons de TPE à paramétrer.",
        "roles": [
            {
                "ids": [35], "nom": "reparation", "libelle": "Réparateur",
                "but": "Réparer les TPE par lots et livrer les TPE réparés.",
                "menus": ["Gestion Maintenances → Mise en réparation, TPE à réparer, Réparation TPE, Lots de "
                          "réparation, Livraisons TPE réparés"],
                "actions": ["<b>Mise en réparation</b> : déclarer des TPE à réparer (statut « à réparer »), "
                            "en dehors d'un décom.",
                            "<b>Réparation TPE</b> : créer un lot avec les TPE à réparer (depuis le décom ou la liste).",
                            "<b>Livrer les TPE réparés</b> d'un lot validé.",
                            "<b>Modifier la liste</b> d'une livraison retournée."],
                "attente": ["TPE à réparer, lots validés à livrer, livraisons retournées."],
                "voir": ["10"],
            },
            {
                "ids": [36], "nom": "reception_reparation", "libelle": "Réceptionnaire maintenance",
                "but": "Réceptionner les TPE réparés et les TPE à paramétrer livrés par la maintenance.",
                "menus": ["Gestion Maintenances → TPE à réparer, Livraisons TPE réparés",
                          "Gestion des décomm → Livraisons TPE param, Tableau de bord"],
                "actions": ["TPE réparés : <b>Confirmer Réception</b>, <b>Retourner demande</b>, puis "
                            "<b>Cloturer la demande</b>.",
                            "TPE à paramétrer : <b>Confirmer réception</b> puis <b>Clôturer la livraison</b> "
                            "(les TPE reçus repassent au statut « paramétrage »)."],
                "attente": ["Livraisons en cours (à réceptionner) et livrées (à clôturer)."],
                "voir": ["10", "8"],
            },
            {
                "ids": [37], "nom": "supervision_reparation", "libelle": "Valideur des réparations",
                "but": "Contrôler les lots de réparation et suivre la livraison des TPE réparés.",
                "menus": ["Gestion Maintenances → TPE à réparer, Lots de réparation, Livraisons TPE réparés"],
                "actions": ["<b>Valider la réparation</b> d'un lot : TPE acceptés (réparés) ou refusés "
                            "(à réparer de nouveau)."],
                "attente": ["Lots en réparation à valider."],
                "voir": ["10"],
            },
        ],
    },
    {
        "id": "parc",
        "titre": "Parc TPE",
        "chapitre": "11",
        "flux": [],
        "intro": "Le parc est le registre central des TPE et de leur statut ; chaque changement est "
                 "historisé.",
        "roles": [
            {
                "ids": [27], "nom": "gestion_tpe", "libelle": "Gestionnaire du parc",
                "but": "Consulter tout le parc et modifier le statut des TPE.",
                "menus": ["Gestion Parc TPE → Voir Parc, Manipulation TPE"],
                "actions": ["Rechercher un TPE et consulter son historique.",
                            "<b>Manipulation TPE</b> : changer le statut d'un ou plusieurs TPE."],
                "attente": ["Rien à traiter."],
                "voir": ["11"],
            },
            {
                "ids": [28], "nom": "supervision_tpe", "libelle": "Lecteur du parc",
                "but": "Consulter tout le parc et l'historique des TPE.",
                "menus": ["Gestion Parc TPE → Voir Parc"],
                "actions": ["Consultation, filtres et export."],
                "attente": ["Rien à traiter."],
                "voir": ["11"],
            },
        ],
    },
    {
        "id": "admin",
        "titre": "Administration",
        "chapitre": "13",
        "flux": [],
        "intro": "Ces rôles gèrent les comptes et corrigent les données ; ils ne reçoivent pas de "
                 "notifications par défaut.",
        "roles": [
            {
                "ids": [5], "nom": "gestion_comptes", "libelle": "Gestionnaire des comptes",
                "but": "Créer, consulter et modifier les comptes utilisateurs et leurs rôles.",
                "menus": ["Gestion des Profils → Ajouter utilisateur, Tous les utilisateurs"],
                "actions": ["Créer un compte (identité, service, rôles).",
                            "Modifier un profil, ses rôles ; désactiver un compte."],
                "attente": ["Rien à traiter."],
                "voir": ["13", "3"],
            },
            {
                "ids": [6], "nom": "modification", "libelle": "Modificateur (administration)",
                "but": "Corriger tout formulaire de livraison, de remplacement ou de demande, même déjà validé.",
                "menus": ["Gestion Maintenances → Liaison pièces TPE"],
                "actions": ["<b>Modification Admin</b> sur une fiche de demande, de livraison ou de remplacement.",
                            "<b>Liaison pièces TPE</b> : corriger les pièces défectueuses et fonctionnelles d'un TPE "
                            "quand elles n'ont pas été bien saisies lors de la vérification du décom."],
                "attente": ["Rien à traiter."],
                "voir": ["13"],
                "note": "le rôle 6 n'est pas dans les rôles du menu Gestion Maintenances : un utilisateur qui "
                        "n'a que ce rôle ne voit pas Liaison pièces TPE. L'ajouter au menu ? Le menu « Admin » (vide) "
                        "n'est pas décrit dans le guide.",
            },
            {
                "ids": [39], "nom": "super_admin", "libelle": "Super administrateur",
                "but": "Intervenir là où le propriétaire d'un stock ou le gestionnaire de stock est exigé. Pour "
                       "l'instant, ses droits portent sur les stocks et le catalogue des éléments.",
                "menus": ["Aucun menu propre."],
                "actions": ["<b>Modifier stock</b>, <b>Associer stocks</b>, <b>Supprimer stock</b> sur "
                            "n'importe quel stock.",
                            "Ajouter ou modifier les pièces du catalogue.",
                            "Modifier n'importe quelle demande de stock."],
                "attente": ["Pas de notification par défaut."],
                "voir": ["6", "13"],

            },
        ],
    },
]

# Plan général du guide (chapitre -> sections prévues)
PLAN = [
    ("1", "Présentation de SYSLIS", ["À quoi sert l'application", "Le cycle de vie d'un TPE",
                                     "Les modules en un coup d'œil"]),
    ("2", "Prise en main", ["Se connecter et gérer son mot de passe", "L'écran principal",
                            "Notifications : bulles et cloche", "Les listes",
                            "Les fiches", "Mon profil"]),
    ("3", "Rôles et droits", ["Comment fonctionnent les rôles", "Tableau des rôles", "Fiches par rôle"]),
    ("4", "Tableaux de bord", ["Semaine en cours", "Livraison TPE, Remplacement TPE, Sorties Chargeurs",
                               "QR codes", "Mouvement Stock", "Statistiques Parc TPE", "Tableau de bord décom"]),
    ("5", "Livraisons et remplacements de TPE", ["Créer une livraison", "Suivre, réceptionner ou retourner",
                                                  "Remplacements", "Statuts et mails"]),
    ("6", "Stocks et demandes de stock", ["Catalogue des éléments", "Créer et gérer un stock",
                                         "Demande, validation, livraison, réception", "Entrées et sorties",
                                         "Statuts, mails et PDF"]),
    ("7", "QR codes", ["Demande et import des marchands", "Génération, impression, livraison, réception",
                       "Suspension et annulation", "Marchands QR", "Statuts et mails"]),
    ("8", "Décommissionnement", ["Créer un décom (modèle Excel)", "Réception, validation, transmission",
                                 "Vérification technique et diagnostic", "Clôture et suite des TPE",
                                 "Livraisons de TPE à paramétrer", "Statuts"]),
    ("9", "Maintenance : mise au rebut", ["Demande, validation et clôture", "TPE au rebut et pièces",
                                          "Récupérer les pièces fonctionnelles", "Créer un stock depuis le rebut",
                                          "Liaison pièces TPE"]),
    ("10", "Maintenance : réparation des TPE", ["Mise en réparation et lots", "Validation",
                                                "Livraison et réception", "Statuts"]),
    ("11", "Parc TPE", ["Consulter le parc", "Historique d'un TPE", "Manipulation TPE", "Statuts du parc"]),
    ("12", "Régularisations", ["Principe", "Les formulaires REG"]),
    ("13", "Administration", ["Comptes et rôles", "Types de livraison", "Modifications admin"]),
    ("A", "Annexes", ["Tableaux des statuts", "Glossaire", "Questions fréquentes et messages d'erreur",
                      "Correspondance écrans ↔ sections (bouton « ? »)"]),
]
