# -*- coding: utf-8 -*-
"""Chapitres 4 à 13 et annexes du guide utilisateur SYSLIS."""
from chapitres import capture
from aide_ecrans import ECRANS

# Recadrages usuels (captures 1568 px de large)
PAGE = (238, 62, 1568, 675)      # sans la barre latérale ni l'en-tête
FORM = (575, 62, 1215, 675)      # formulaire centré


def H(esc, num, i, titre):
    return f'<h2 id="sec-{num}-{i}">{num}.{i} {esc(titre)}</h2>'


def P(t):
    return f"<p>{t}</p>"


def UL(items):
    return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def OL(items):
    return "<ol>" + "".join(f"<li>{i}</li>" for i in items) + "</ol>"


def TAB(entetes, lignes):
    th = "".join(f"<th>{h}</th>" for h in entetes)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in l) + "</tr>" for l in lignes)
    return f'<table class="grille"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


def BOX(t):
    return f'<div class="encadre">{t}</div>'


def FLUX(etapes):
    parts = []
    for j, e in enumerate(etapes):
        if j:
            parts.append('<span class="fleche">→</span>')
        parts.append(f'<span class="etape">{e}</span>')
    return f'<div class="flux">{"".join(parts)}</div>'


def chapitre(num, titre, corps):
    return f"""
<section class="chapitre" id="chap-{num}">
  <span class="num-chap">Chapitre {num}</span>
  <h1>{titre}</h1>
  {corps}
</section>"""


# ---------------------------------------------------------------- 4
def chapitre_4(esc, note):
    c = [
        P("Les tableaux de bord sont dans le menu <b>Dashboard</b>. Ils sont en lecture seule : ils comptent et "
          "résument, les actions se font dans les modules. Livraison TPE, Remplacement TPE et Sorties Chargeurs "
          "sont réservés au rôle 1 ; les autres sont ouverts à tous."),
        H(esc, 4, 1, "Semaine en cours"),
        P("C'est la page d'accueil (<b>Dashboard → Semaine en cours</b>, titre « DASHBOARD GÉNÉRAL »). Elle affiche "
          "le numéro de la semaine et ses dates, puis les chiffres clés de la période : livraisons, demandes de "
          "stock, stock de terminaux. Changez la <b>Date début</b> et la <b>Date fin</b> puis cliquez sur "
          "<b>Actualiser</b> pour une autre période."),
        H(esc, 4, 2, "Livraison TPE, Remplacement TPE et Sorties Chargeurs"),
        capture("04-02_dashboard-livraison.jpg", "Dashboard Livraisons TPE", recadrage=PAGE),
        UL(["<b>Livraison TPE</b> : livraisons <b>En attente</b> de réception, <b>TPE livrés</b> et <b>Retours</b> sur la "
            "période, puis la <b>Hiérarchie Livraisons</b> : cliquez sur une année pour la détailler par mois, "
            "semaine et jour.",
            "<b>Remplacement TPE</b> : la même présentation pour les remplacements.",
            "<b>Sorties Chargeurs</b> : chargeurs sortis par canal (livraison chargeur, livraison chargeur issue d'un "
            "décom, mouvement de stock), par jour, semaine ou mois, avec filtres par service d'origine et de "
            "destination, un graphique et le détail des sorties."]),
        H(esc, 4, 3, "QR codes"),
        capture("04-03_dashboard-qr.jpg", "Dashboard QR Codes", recadrage=PAGE),
        UL(["<b>Total des demandes</b> et <b>Quantité de QR Codes</b> à chaque étape : soumis, générés, imprimés, "
            "livrés, reçus.",
            "Tableaux hebdomadaires des demandes et des impressions, bilan d'impression par opérateur et par format, "
            "avec <b>Télécharger Excel</b>.",
            "Les 10 dernières demandes."]),
        H(esc, 4, 4, "Mouvement Stock"),
        capture("04-04_dashboard-stocks.jpg", "Dashboard Stocks", recadrage=PAGE),
        P("Le nombre de demandes de stock (total, validées, en cours, refusées), puis le <b>Détail Stocks par "
          "Pièce</b> : pour chaque élément, le nombre de stocks et les quantités en lots, cartons et pièces. Le filtre "
          "de période porte sur la date de création des stocks."),
        H(esc, 4, 5, "Statistiques Parc TPE"),
        capture("04-05_stats-parc.jpg", "Statistiques du parc TPE", recadrage=PAGE),
        P("Ce tableau de bord lit l'historique des statuts du parc (chapitre 11). Choisissez un <b>Modèle</b>, une "
          "<b>Période</b> et un <b>Regroupement</b> (jour, semaine, mois), puis parcourez les sections :"),
        UL(["<b>État du parc</b> : nombre de TPE par statut, aujourd'hui ou <b>À une date</b>. Cliquez sur un statut "
            "pour afficher la liste des TPE (export Excel possible). Un bandeau jaune signale les TPE dont le statut "
            "ne correspond pas à leur historique.",
            "<b>Flux</b> : nombre de TPE entrés dans chaque statut sur la période.",
            "<b>Parcours</b> : TPE passés par une suite de statuts que vous choisissez (par exemple attente décom → "
            "à réparer → réparé), à la suite (strict) ou avec d'autres statuts entre deux (souple).",
            "<b>Durées</b> : temps passé dans chaque statut (médiane, moyenne, maximum).",
            "<b>Chronologie d'un TPE</b> : tous les statuts d'un numéro de série, avec leur durée."]),
        H(esc, 4, 6, "Tableau de bord décom"),
        capture("04-06_dashboard-decom.jpg", "Tableau de bord des décommissionnements", recadrage=PAGE),
        P("Menu <b>Gestion des décomm → Tableau de bord</b> (rôles 23 à 26 et 36). Il suit les TPE entrés en décom "
          "jusqu'à leur issue :"),
        UL(["filtres : période, <b>Date de référence</b> (création ou clôture du décom), <b>Type de décom</b> (tous, "
            "standard, remplacement), modèle ;",
            "<b>Résumé</b> : TPE entrés en décom, livrés, mis au rebut, encore en cours, et délai médian entre création "
            "et clôture ;",
            "<b>Devenir des TPE après diagnostic</b> : paramétrage direct, à réparer, rebut, avec les étapes suivantes "
            "(réparés, revenus en paramétrage, livrés) et les délais médians. Cliquez sur un chiffre pour la liste ;",
            "la liste complète des TPE, exportable (<b>Exporter tout</b>, <b>Exporter cette liste</b>). Les TPE au "
            "parcours inhabituel sont signalés et classés selon leur statut final."]),
    ]
    return chapitre("4", "Tableaux de bord", "".join(c))


# ---------------------------------------------------------------- 5
def chapitre_5(esc, note):
    c = [
        P("Ce module enregistre la remise de TPE paramétrés et de chargeurs aux services internes (le plus souvent "
          "le service commercial), et le remplacement d'un TPE par un autre. Les types « bancaire » ou « mobile » "
          "correspondent au paramétrage du TPE ; « chargeur » est la livraison du câble de charge."),
        FLUX(["Livreur (rôle 1) : livraison", "Réceptionnaire : réception ou retour",
              "Si retour : correction puis renvoi"]),
        H(esc, 5, 1, "Créer une livraison"),
        P("Menu <b>Gestion des Livraisons → Nouvelle Livraison</b> (rôle 1)."),
        OL(["<b>Informations générales</b> : <b>Type de Livraison</b> (LIVRAISON TPE GIM, LIVRAISON TPE MOBILE, "
            "LIVRAISON CHARGEUR…), <b>Model TPE</b>, <b>Service recepteur</b>, et si besoin <b>Associer un rôle</b> : "
            "le rôle qui pourra réceptionner (par exemple « reception commerciale »). Ajoutez un commentaire et des "
            "fichiers si nécessaire.",
            "<b>Informations sur produits</b>, pour chaque TPE : <b>Numéro de série</b> (obligatoire), commentaire, "
            "<b>Point Marchand</b>, <b>Banque</b>, <b>Caisse</b>, et les services activés (Orange Money, MTN Money, "
            "MOOV Money, RNE). Cliquez sur <b>Ajouter</b> : le TPE rejoint le tableau en bas de page.",
            "Contrôlez le tableau (<b>Supprimer</b> retire une ligne), puis cliquez sur <b>Valider formulaire</b>, "
            "relisez le récapitulatif et signez pour valider la livraison."]),
        '<div class="duo">' + capture("05-01a_form-livraison.jpg", "Nouvelle livraison : informations générales",
                                      recadrage=FORM)
        + capture("05-01b_form-livraison.jpg", "Nouvelle livraison : informations sur un TPE", recadrage=FORM)
        + "</div>",
        BOX("<b>Un seul modèle par livraison.</b> Tous les TPE d'une livraison doivent être du modèle choisi en haut "
            "du formulaire. Si un numéro de série est déjà au parc avec un autre modèle, SYSLIS refuse de l'ajouter : "
            "faites une livraison séparée pour chaque modèle."),
        P("<b>Résultat</b> : la livraison est enregistrée « en cours » ; les TPE passent au statut <b>back office "
          "livré</b> au parc ; un mail « SYSLIS - NOUVELLE LIVRAISON » part vers les membres du service récepteur et "
          "le rôle 13, avec le lien vers la fiche."),
        H(esc, 5, 2, "Suivre, réceptionner ou retourner"),
        capture("05-02_liste-livraisons.jpg", "Liste des livraisons", recadrage=PAGE),
        P("<b>Toutes les livraisons</b> se filtrent par statut, type, service, modèle, dates de livraison et de "
          "réception, et régularisations. Au-dessus du tableau, l'icône dossier télécharge les PDF des livraisons "
          "affichées (fichier ZIP) et l'icône de téléchargement les exporte dans Excel."),
        capture("05-02b_fiche-livraison.jpg", "Fiche d'une livraison en attente de réception", recadrage=PAGE),
        P("Sur la fiche d'une livraison en attente :"),
        UL(["<b>Réceptionner Livraison</b> (rôle 2, ou le rôle associé à la livraison : 8, 9, 10…) : commentaire et "
            "signature. La livraison passe à « livré » et le livreur est prévenu par mail.",
            "<b>Retourner Livraison</b> : avec un commentaire qui explique le problème. La livraison passe à "
            "« retourné » ; le livreur la corrige avec <b>Modifier Livraison</b> et la renvoie.",
            "<b>Modification Admin</b> (rôle 6) : corriger une livraison, même réceptionnée."]),
        H(esc, 5, 3, "Remplacements"),
        P("Un remplacement enregistre l'échange d'un TPE chez un marchand. Menu <b>Gestion des Livraisons → Nouveau "
          "Remplacement</b> (rôle 1) : service récepteur et rôle, puis pour chaque échange l'<b>Ancien Model TPE</b> "
          "et l'<b>Ancien S/N</b>, le <b>Nouveau Model TPE</b> et le <b>Nouvel S/N</b>, le point marchand, la banque, "
          "la caisse, le paramétrage et les services. Validez et signez."),
        P("Le TPE remplaçant passe au statut <b>back office remplacé</b> ; le TPE remplacé reviendra par un "
          "décommissionnement de type « Remplacement » (chapitre 8). La réception, le retour et la modification "
          "se font comme pour une livraison, depuis <b>Tous les remplacements</b>."),
        H(esc, 5, 4, "Statuts et mails"),
        TAB(["Statut", "Signification", "Action suivante"],
            [["en cours / en attente", "Livraison enregistrée, pas encore réceptionnée", "Réceptionner ou retourner"],
             ["livré", "Réception confirmée et signée", "—"],
             ["retourné", "Renvoyée au livreur avec un commentaire", "Modifier puis renvoyer"]]),
        TAB(["Événement", "Mail", "Destinataires"],
            [["Création", "NOUVELLE LIVRAISON (type)", "Service récepteur, rôle 13"],
             ["Modification", "MODIFICATION LIVRAISON", "Service récepteur, rôle 13"],
             ["Réception", "RECEPTION LIVRAISON", "Livreurs (rôle 1), rôle 13"],
             ["Retour", "RETOUR DE LIVRAISON", "Livreurs (rôle 1), rôle 13"],
             ["Remplacement", "NOUVEAU / VALIDATION / RETOUR / MODIFICATION REMPLACEMENT", "Mêmes règles"]]),
    ]
    return chapitre("5", "Livraisons et remplacements de TPE", "".join(c))


# ---------------------------------------------------------------- 6
def chapitre_6(esc, note):
    c = [
        H(esc, 6, 1, "Catalogue des éléments"),
        P("Un <b>élément</b> (pièce, chargeur, terminal…) est défini une fois dans le catalogue : <b>Gestion des "
          "Stocks → Voir Elements Stock</b> (rôle 7). Chaque élément a un nom unique, un type (<b>TERMINAL</b> ou "
          "<b>PIECE</b>), les modèles de TPE et les services qui le gèrent. <b>Ajouter pièce</b> crée un élément ; "
          "l'icône de modification le corrige."),
        BOX("<b>Lots, cartons, pièces.</b> Un stock peut être organisé en lots, qui contiennent des cartons, qui "
            "contiennent des pièces. C'est surtout utile pour les terminaux, livrés en lots de cartons. La plupart des "
            "stocks n'utilisent que les pièces (une simple quantité). Pour les terminaux, chaque pièce est un "
            "numéro de série."),
        P("On ne peut pas changer le type d'un élément qui a des stocks actifs, ni lui retirer un modèle ou un "
          "service utilisé par un stock actif."),
        H(esc, 6, 2, "Créer et gérer un stock"),
        P("<b>Créer Nouveau Stock</b> (rôle 7) : élément, modèle, service, <b>Code Stock</b> (unique), propriétaire et "
          "sous-propriétaires, motif, origine et commentaire, puis la quantité initiale selon le mode choisi (par "
          "lot, carton, pièce, ou par S/N pour des terminaux). Les terminaux insérés par S/N entrent au parc avec le "
          "statut <b>stock</b>."),
        capture("06-02a_liste-stocks.jpg", "Tous les stocks", recadrage=PAGE),
        capture("06-02b_fiche-stock.jpg", "Fiche d'un stock et ses actions", recadrage=PAGE),
        P("La fiche d'un stock montre son initialisation, son état actuel et tous ses mouvements. Ses boutons "
          "dépendent de votre place sur le stock :"),
        TAB(["Bouton", "Qui", "Effet"],
            [["<b>Modifier stock</b>", "Propriétaire, super admin (39)", "Code, propriétaire, sous-propriétaires"],
             ["<b>Associer stocks</b>", "Propriétaire, super admin",
              "Verse d'autres stocks (même élément, modèle et service) dans celui-ci ; les stocks versés sont fermés"],
             ["<b>Supprimer stock</b>", "Propriétaire, super admin",
              "Ferme le stock avec un motif ; un stock de terminaux non vide ne peut pas être supprimé"],
             ["<b>Faire une entrée/sortie</b>", "Propriétaire, sous-propriétaires", "Mouvement manuel (section 6.4)"]]),
        P("Après un changement de propriétaire, l'ancien propriétaire perd ses droits, sauf s'il est repris comme "
          "sous-propriétaire."),
        H(esc, 6, 3, "Demande, validation, livraison, réception"),
        FLUX(["Demandeur (3)", "Validateur (4)", "Responsable du stock : livraison", "Réceptionnaire (12)"]),
        P("<b>1. Demander</b> — <b>Nouvelle Demande Stock</b> (rôle 3) : élément, service demandeur, motif, "
          "commentaire et fichiers ; puis modèle, service de l'élément, mode (par lot, carton ou pièce) et quantité. "
          "<b>Ajouter un champ</b> permet de préciser une information libre. Signez pour valider la demande. "
          "<b>Nouvelle demande terminal</b> fonctionne de la même façon pour des terminaux, suivis par numéro de "
          "série."),
        capture("06-03a_form-demande.jpg", "Nouvelle demande de stock", largeur="62%", recadrage=FORM),
        P("<b>2. Valider</b> — le validateur (rôle 4) ouvre la demande et clique sur <b>Valider demande</b> : date, "
          "quantité validée, commentaire et signature. Il peut aussi la retourner au demandeur (qui la corrige avec "
          "<b>Modifier demande</b>) ou la refuser. À la validation, les propriétaires et sous-propriétaires des stocks "
          "concernés sont prévenus par mail."),
        P("<b>3. Livrer</b> — un propriétaire ou sous-propriétaire d'un stock contenant l'élément voit "
          "<b>Livraison Stock</b> sur la demande. Il choisit le stock, le mode de sortie et les lots, cartons ou la "
          "quantité, puis signe. La livraison peut se faire en plusieurs fois : la demande est alors "
          "« Partiellement livrée » jusqu'à atteindre la quantité validée, ou jusqu'à ce que la case <b>Clôturer la "
          "demande avec cette livraison</b> soit cochée. Une livraison ne peut pas dépasser le reste à livrer. "
          "Seul le stock d'origine est débité ; des terminaux livrés passent au statut <b>paramétrage</b>."),
        capture("06-03c_livraison-stock.jpg", "Livraison d'une demande depuis un stock", largeur="62%", recadrage=FORM),
        P("Si aucun stock ne contient l'élément, le gestionnaire de stock (rôle 7) voit <b>Créer nouveau stock</b> "
          "sur la demande."),
        P("<b>4. Réceptionner</b> — un membre du service demandeur ayant le rôle 12 clique sur <b>Réceptionner "
          "Pièces</b>, signe, indique la date et choisit la <b>Mise en stock</b> :"),
        '<div class="duo">' + capture("06-03d_reception.jpg", "Réception et mise en stock",
                                      recadrage=(600, 60, 968, 616))
        + "<div>" + UL(["<b>Créer un nouveau stock</b> : donnez un code ; vous en devenez propriétaire ;",
                        "<b>Ajouter à un de mes stocks</b> : un stock dont vous êtes responsable, même élément, modèle "
                        "et service ;",
                        "<b>Ne pas mettre en stock</b> : la réception est enregistrée sans mouvement de stock."])
        + P("Chaque livraison se réceptionne séparément. Les livraisons faites avant la mise en stock à la "
            "réception ne proposent que « Ne pas mettre en stock ».") + "</div></div>",
        H(esc, 6, 4, "Entrées et sorties"),
        P("<b>Faire une entrée/sortie</b>, sur la fiche du stock, enregistre un mouvement manuel : entrée ou sortie, "
          "mode (lot, carton, pièce, S/N), quantités, motif et origine. Le menu <b>Entrées Sorties</b> (rôle 7) "
          "liste tous les mouvements de tous les stocks, avec la quantité avant et après chaque mouvement."),
        H(esc, 6, 5, "Statuts, mails et PDF"),
        TAB(["Statut de la demande", "Signification"],
            [["en cours", "En attente de validation"], ["validée", "Validée, à livrer ou livrée"],
             ["partiellement livrée", "Une partie de la quantité validée a été livrée"],
             ["retournée", "Renvoyée au demandeur pour correction"], ["refusée", "Refusée par le validateur"]]),
        P("Le statut de réception est suivi à part : en attente, partiellement reçue, reçue. Mails envoyés : "
          "« MOUVEMENT DE STOCK » à la création (validateurs), « VALIDATION DEMANDE », « DEMANDE RETOURNÉE », "
          "« DEMANDE REFUSÉE », « RECEPTION DE STOCK ». <b>Voir formulaire PDF</b> produit le formulaire de la demande "
          "avec toutes ses livraisons et réceptions."),
    ]
    return chapitre("6", "Stocks et demandes de stock", "".join(c))


# ---------------------------------------------------------------- 7
def chapitre_7(esc, note):
    c = [
        P("Les QR codes de paiement (Orange Money, MTN, MOOV) sont demandés pour des marchands, générés avec un outil "
          "externe, imprimés puis livrés."),
        FLUX(["Demande (15)", "Génération (16)", "Impression (17)", "Livraison (18)", "Réception (19)"]),
        H(esc, 7, 1, "Demande et import des marchands"),
        P("Menu <b>Gestion des QRcodes → Nouvelle Demande QRC</b> (rôle 15). Ajoutez les lignes de la demande "
          "<b>Manuellement</b> ou par <b>Import Excel</b> (<b>Télécharger template</b> donne le modèle de fichier). "
          "Chaque ligne indique le <b>Type QR Code</b> (opérateur), le <b>Format</b> d'impression, le marchand (par "
          "chaîne ou par point marchand), le nombre de TPE et le nombre de copies : SYSLIS calcule le total de QR "
          "codes. Ajoutez un commentaire ou des fichiers, puis signez la demande."),
        H(esc, 7, 2, "Génération, impression, livraison, réception"),
        capture("07-02_fiche-qr.jpg", "Fiche d'une demande générée", recadrage=PAGE),
        TAB(["Étape", "Rôle", "Bouton", "Statut obtenu"],
            [["Génération", "16", "<b>Upload QR Codes</b> (dépôt des fichiers)", "générée"],
             ["Impression", "17", "<b>Confirmer Impression</b> (ou <b>Retourner QR Codes</b> au générateur)",
              "imprimée"],
             ["Livraison", "18", "<b>Livraison QR Codes</b>", "livrée"],
             ["Réception", "19", "<b>Réception QR Codes</b>", "reçue : la demande est close"]]),
        P("Dès la génération, le rôle 20 peut <b>Télécharger QR Codes</b>. Chaque étape prévient par mail l'étape "
          "suivante et le rôle 22."),
        H(esc, 7, 3, "Suspension et annulation"),
        UL(["<b>Suspendre Demande</b> (rôle 16) : quand un problème externe bloque la génération ; le motif est "
            "obligatoire et le demandeur est prévenu. Celui qui a suspendu peut <b>Annuler Suspension</b> ; le "
            "demandeur peut modifier sa demande pour la débloquer.",
            "<b>Annuler la demande</b> (rôle 15) : tant qu'elle est soumise. Elle passe à « annulée »."]),
        H(esc, 7, 4, "Marchands QR"),
        P("<b>Tous les Marchands QRC</b> liste chaque marchand servi : nombre de TPE et de QR codes, type, format, "
          "dates de livraison et de réception, avec des filtres par type, format, demande et dates."),
        H(esc, 7, 5, "Statuts et mails"),
        TAB(["Statut", "Signification"],
            [["soumise", "Demande créée, à générer"], ["générée", "QR codes déposés, à imprimer"],
             ["imprimée", "Impression confirmée, à livrer"], ["livrée", "Livrée, à réceptionner"],
             ["reçue", "Réception confirmée : demande close"], ["suspendue", "Génération bloquée"],
             ["annulée", "Annulée par le demandeur"]]),
    ]
    return chapitre("7", "QR codes", "".join(c))


# ---------------------------------------------------------------- 8
def chapitre_8(esc, note):
    c = [
        P("Un décommissionnement (décom) ramène des TPE de chez les marchands à la maintenance. Chaque TPE y est "
          "diagnostiqué puis part au paramétrage, en réparation ou au rebut."),
        FLUX(["Création (23)", "Réception (24)", "Validation + transmission (38)", "Réception maintenance (25)",
              "Vérification technique (25)", "Clôture (29)"]),
        H(esc, 8, 1, "Créer un décom"),
        P("Menu <b>Gestion des décomm → Nouveau décomm</b> (rôle 23). Choisissez <b>Décommissionnement</b> ou "
          "<b>Remplacement</b> (TPE remplacés, chapitre 5), un commentaire général et des fichiers, puis ajoutez les "
          "TPE par <b>Upload Excel</b> (<b>Télécharger template</b>) ou <b>Par S/N</b> :"),
        '<div class="duo">' + capture("08-01_form-decom.jpg", "Informations d'un TPE à décommissionner",
                                      recadrage=FORM)
        + "<div>" + UL(["<b>Numéro de série</b> et <b>Modèle</b> (obligatoire ; si le TPE est déjà au parc, son "
                        "modèle s'affiche et fait foi) ;",
                        "<b>Point Marchand</b>, <b>Caisse</b>, <b>Banque</b>, <b>TID GIM</b>, <b>TID ECOBANK</b> ;",
                        "<b>État du terminal</b> : R.A.S ou problème signalé (avec le rapport d'incident) ;",
                        "<b>Récupéré avec</b> : carton, chargeur, carte SIM ;",
                        "<b>Commercial</b> et commentaire."])
        + P("Validez : les rôles 24 et 26 sont prévenus. Tant que le décom n'est pas reçu (ou après un retour), "
            "l'initiateur peut <b>Modifier la liste</b> ou annuler le décom.") + "</div></div>",
        H(esc, 8, 2, "Réception, validation, transmission"),
        OL(["<b>Confirmer réception</b> (rôle 24) : les TPE ont été récupérés. Le décom peut aussi être retourné à "
            "l'initiateur.",
            "<b>Valider liste</b> (rôle 38) : cochez les TPE retenus, date et commentaire. Les TPE validés sont "
            "enregistrés au parc au statut <b>attente décom</b> (ou <b>décom remplacement</b>).",
            "<b>Transmettre à la maintenance</b> (rôle 38).",
            "<b>Valider réception maintenance</b> (rôle 25) : la maintenance confirme les TPE réellement reçus ; ceux "
            "qui manquent apparaissent grisés."]),
        H(esc, 8, 3, "Vérification technique et diagnostic"),
        '<div class="duo">' + capture("08-03a_fiche-decom.jpg", "Décom en vérification", recadrage=(238, 62, 1568, 420))
        + capture("08-03b_verification.jpg", "Vérification d'un TPE", recadrage=FORM) + "</div>",
        P("Sur un décom en vérification, <b>Vérification technique</b> (rôle 25) ouvre la liste des TPE. Pour chacun : "
          "<b>Sélectionner</b>, choisir le <b>Statut</b> (paramétrage, à réparer, rebut), cocher les pièces "
          "défectueuses ou absentes et les pièces fonctionnelles, ajouter un détail, puis <b>Confirmer</b>. "
          "<b>Valider</b> enregistre la vérification ; un mail de rapport peut être envoyé."),
        P("Quand plus aucun TPE n'est « checking », le rôle 25 confirme le diagnostic : le décom passe à "
          "<b>complet</b> et le rôle 29 est prévenu. <b>Annuler diagnostic</b> (motif obligatoire) le remet en "
          "vérification."),
        H(esc, 8, 4, "Clôture et suite des TPE"),
        P("<b>Cloturer décomm</b> (rôle 29) valide les diagnostics. Au parc, chaque TPE prend le statut de son "
          "diagnostic :"),
        TAB(["Diagnostic", "Statut au parc", "Suite"],
            [["Paramétrage", "paramétrage (maintenance)", "Livraison TPE param (section 8.5)"],
             ["À réparer", "à réparer", "Lot de réparation (chapitre 10)"],
             ["Rebut", "rebut", "Pièces récupérables (chapitre 9)"]]),
        H(esc, 8, 5, "Livraisons de TPE à paramétrer"),
        capture("08-05_livraison-param.jpg", "Livraison des TPE à paramétrer", recadrage=PAGE),
        UL(["<b>Livraison TPE param</b> (rôle 25) : cochez les TPE (ou <b>Importer Excel (S/N)</b> ; les S/N en "
            "anomalie sont signalés et exportables), commentaire, <b>Livrer</b>.",
            "<b>Livraisons TPE param</b> (rôle 36) : <b>Confirmer réception</b> des TPE reçus, puis <b>Clôturer la "
            "livraison</b> : les TPE repassent au statut <b>paramétrage</b>."]),
        P("Le décom suit automatiquement : « transmis param » quand tous ses TPE à paramétrer sont livrés, "
          "« réception param » quand ils sont tous reçus."),
        H(esc, 8, 6, "Statuts"),
        TAB(["Statut", "Signification"],
            [["soumis", "Créé, en attente de réception"], ["récupéré", "Réception confirmée, à valider"],
             ["retourné", "Renvoyé à l'initiateur"], ["validé", "Liste validée, à transmettre"],
             ["transmis à la maintenance", "À réceptionner par la maintenance"],
             ["vérification", "Vérification technique en cours"], ["complet", "Diagnostic confirmé, à clôturer"],
             ["clos", "Clôturé ; suite selon les diagnostics"],
             ["transmis / réception param", "TPE à paramétrer livrés / reçus"],
             ["en réparation / réparé / transmis réparé / réceptionné réparé", "Suivi des TPE à réparer"]]),
    ]
    return chapitre("8", "Décommissionnement", "".join(c))


# ---------------------------------------------------------------- 9
def chapitre_9(esc, note):
    c = [
        FLUX(["Demande (30 ou 32)", "Validation (31)", "Clôture (30)", "Récupération des pièces (32)",
              "Mise en stock"]),
        H(esc, 9, 1, "Demande, validation et clôture"),
        P("<b>Gestion Maintenances → Mise au rebut</b> (rôles 30 et 32). Ajoutez les TPE par <b>Import Excel</b> ou "
          "<b>Par S/N</b> : numéro de série, modèle, point marchand, puis les <b>pièces défectueuses ou absentes</b> "
          "et les <b>pièces fonctionnelles</b> (bouton TOUT pour tout cocher). Ajoutez date, commentaire et fichiers, "
          "puis confirmez. Les rôles 31 et 33 sont prévenus."),
        UL(["<b>Valider demande</b> (rôle 31) : retenez tout ou partie des TPE. Les TPE retenus passent au statut "
            "<b>rebut</b> au parc ; le demandeur est prévenu.",
            "<b>Retourner demande</b> (rôle 31) : avec un commentaire.",
            "<b>Modifier la liste</b> (rôle 32) ou <b>Annuler la demande</b> (rôle 30) tant qu'elle est en cours.",
            "<b>Cloturer la demande</b> (rôle 30) une fois validée."]),
        capture("09-01_fiche-rebut.jpg", "Fiche d'une mise au rebut validée", recadrage=PAGE),
        note("vous indiquez qu'une demande peut être refusée : la fiche n'a pas de bouton « Refuser ». Est-ce une "
             "validation sans aucun TPE retenu ?"),
        H(esc, 9, 2, "TPE au rebut et pièces"),
        P("<b>Tous les TPE au rebut</b> liste les TPE au statut rebut. Leur fiche montre l'état de chaque pièce "
          "(fonctionnelle, défectueuse, utilisée, en stock) et l'historique des mouvements de pièces. Le rôle 34 peut "
          "y corriger la liste avec <b>Modifier lots de pièces</b>."),
        H(esc, 9, 3, "Récupérer les pièces fonctionnelles"),
        P("<b>Récupérer pièces fonctionnelles</b> (rôles 32 et 34), sur la fiche d'un TPE au rebut, enregistre les "
          "pièces prélevées : elles passent à « utilisé ». Les pièces utilisées ou mises en stock ne peuvent plus "
          "être modifiées."),
        H(esc, 9, 4, "Créer un stock depuis le rebut"),
        capture("09-04_pieces-rebut.jpg", "Pièces au rebut", recadrage=PAGE),
        P("<b>Toutes les pièces au rebut</b> totalise, par pièce, les quantités fonctionnelles, défectueuses, "
          "utilisées et en stock. <b>Créer Stock</b> remet des pièces fonctionnelles en stock : choisissez le modèle "
          "(le nombre disponible s'affiche), la quantité, puis un nouveau stock (service et code) ou un stock existant "
          "dont vous êtes responsable, et un motif. Les pièces les plus anciennes sont prises en premier ; elles "
          "passent à « en stock » et une entrée d'origine « Rebut » est enregistrée sur le stock."),
        H(esc, 9, 5, "Liaison pièces TPE"),
        P("<b>Liaison pièces TPE</b> (rôle 6) corrige les pièces défectueuses et fonctionnelles d'un TPE quand elles "
          "n'ont pas été bien sélectionnées lors de la vérification du décom. Elle sert à ajuster les pièces d'un "
          "terminal d'une session de mise au rebut. Ajoutez les TPE par S/N ou par Excel, cochez les pièces, puis "
          "confirmez la liaison."),
    ]
    return chapitre("9", "Maintenance : mise au rebut", "".join(c))


# ---------------------------------------------------------------- 10
def chapitre_10(esc, note):
    c = [
        FLUX(["À réparer", "Lot en réparation (25 ou 35)", "Validation (37)", "Livraison (25 ou 35)",
              "Réception et clôture (36)"]),
        H(esc, 10, 1, "Mise en réparation et lots"),
        UL(["<b>Mise en réparation</b> (rôle 35) : déclarer des TPE à réparer en dehors d'un décom (S/N ou Excel, "
            "pièces défectueuses). Ils passent au statut <b>à réparer</b>.",
            "<b>TPE à réparer</b> (rôles 35, 36, 37) : la liste des TPE à réparer et réparés, avec leurs pièces "
            "défectueuses.",
            "<b>Réparation TPE</b> (rôles 25 et 35) : crée un <b>lot de réparation</b>. Depuis un décom clos, le bouton "
            "de la fiche du décom ouvre le formulaire avec ses TPE à réparer. Indiquez les pièces à réparer et "
            "confirmez : les TPE passent à <b>en réparation</b>."]),
        capture("10-01_tpe-a-reparer.jpg", "TPE réparés et à réparer", recadrage=PAGE),
        P("Pour un décom qui a aussi des TPE à paramétrer, la réparation n'est possible qu'une fois ceux-ci livrés."),
        H(esc, 10, 2, "Validation"),
        P("<b>Lots de réparation</b> liste les lots. Sur un lot en réparation, <b>Valider la réparation</b> (rôle 37) : "
          "pour chaque TPE, acceptez (statut <b>réparé</b>) ou refusez (retour à <b>à réparer</b>, il pourra entrer "
          "dans un nouveau lot)."),
        H(esc, 10, 3, "Livraison et réception"),
        UL(["<b>Livrer les TPE réparés</b> (rôles 25 et 35), sur un lot validé : crée une livraison de TPE réparés.",
            "<b>Livraisons TPE réparés</b> (rôle 36) : <b>Confirmer Réception</b> des TPE reçus ou <b>Retourner "
            "demande</b>, puis <b>Cloturer la demande</b> : les TPE repassent au statut <b>paramétrage</b>."]),
        BOX("Livrez la liste complète en une fois : une livraison par TPE oblige à réceptionner et clôturer autant de "
            "livraisons."),
        H(esc, 10, 4, "Statuts"),
        TAB(["Objet", "Statuts"],
            [["Lot de réparation", "en réparation → validé → livré (ou annulé)"],
             ["Livraison de TPE réparés", "en cours → livré → clos (ou retourné, annulé)"],
             ["TPE au parc", "à réparer → en réparation → réparé → paramétrage"]]),
    ]
    return chapitre("10", "Maintenance : réparation des TPE", "".join(c))


# ---------------------------------------------------------------- 11
def chapitre_11(esc, note):
    c = [
        H(esc, 11, 1, "Consulter le parc"),
        capture("11-01_parc.jpg", "Parc TPE", recadrage=PAGE),
        P("<b>Gestion Parc TPE → Voir Parc</b> (rôles 27 et 28) : tous les TPE avec leur S/N, modèle, statut, date de "
          "dernière modification et de création. Recherche, filtres par statut, modèle et dates ; l'icône de "
          "téléchargement exporte la liste dans Excel ; l'œil ouvre l'historique."),
        H(esc, 11, 2, "Historique d'un TPE"),
        capture("11-02_historique.jpg", "Historique d'un TPE", recadrage=PAGE),
        P("Chaque changement de statut, avec sa date, le formulaire qui l'a provoqué (décom, livraison…) et "
          "l'utilisateur. Pour la durée passée dans chaque statut, voir la chronologie des Statistiques Parc TPE "
          "(section 4.5)."),
        H(esc, 11, 3, "Manipulation TPE"),
        '<div class="duo">' + capture("11-03_manipulation.jpg", "Manipuler TPE", recadrage=(590, 115, 1215, 440))
        + "<div>" + P("<b>Manipulation TPE</b> (rôle 27) change directement le statut d'un ou plusieurs TPE, "
                      "<b>Par S/N</b> ou <b>Par fichier</b>, avec le <b>Nouveau Statut</b>. Pour un TPE inconnu du parc, "
                      "le modèle est demandé.")
        + P("Le rôle 27 peut aussi <b>Corriger le modèle</b> d'un TPE enregistré avec un mauvais modèle ; le statut "
            "devient alors facultatif.") + "</div></div>",
        BOX("La manipulation contourne les processus : réservez-la aux corrections. Un TPE doit normalement changer "
            "de statut par le formulaire du module concerné."),
        H(esc, 11, 4, "Statuts du parc"),
        P("La liste des statuts et leur sens est au chapitre 1 (section 1.2) et en annexe A."),
    ]
    return chapitre("11", "Parc TPE", "".join(c))


# ---------------------------------------------------------------- 12
def chapitre_12(esc, note):
    c = [
        H(esc, 12, 1, "Principe"),
        P("Une <b>régularisation</b> (REG) enregistre après coup une opération déjà faite hors de SYSLIS. Elle porte "
          "une date passée (jamais future) et reste marquée « Régularisation » : la case du même nom, dans les listes, "
          "permet de les isoler. Les étapes suivantes se confirment avec les boutons <b>Reg …</b> (Reg Livraison, Reg "
          "Réception, REG validation)."),
        H(esc, 12, 2, "Les formulaires REG"),
        TAB(["Menu Gestion Régularisation", "Rôle", "Suite"],
            [["REG Livraison", "1", "Reg Réception par le réceptionnaire"],
             ["REG Demande Stock", "3", "REG validation (4), Reg Livraison, Reg Réception (12)"],
             ["REG Demande QRC", "21", "Reg Livraison (18), Reg Réception (19)"],
             ["REG Remplacement", "1", "Reg Réception par le réceptionnaire"],
             ["REG Décommissionnement", "23", "Mêmes étapes que le décom, dont une vérification REG"]]),
        P("La mise au rebut et la mise en réparation ont aussi une option « Régularisation » dans leur formulaire."),
    ]
    return chapitre("12", "Régularisations", "".join(c))


# ---------------------------------------------------------------- 13
def chapitre_13(esc, note):
    c = [
        H(esc, 13, 1, "Comptes et rôles"),
        P("<b>Gestion des Profils</b> (rôle 5). <b>Ajouter utilisateur</b> : nom, prénoms, email, mot de passe, "
          "services et rôles (cases à cocher). <b>Tous les utilisateurs</b> : la liste ; la fiche d'un utilisateur "
          "permet de modifier ses informations, ses services, ses rôles et de lui donner un nouveau mot de passe. Un "
          "compte supprimé est désactivé, pas effacé."),
        note("le champ Mot de passe du formulaire de création est prérempli avec un mot de passe par défaut, visible "
             "en clair. À changer : un champ vide, ou un mot de passe à modifier à la première connexion."),
        P("Le chapitre 3 décrit chaque rôle ; attribuez à chaque personne les rôles des étapes où elle intervient."),
        H(esc, 13, 2, "Types de livraison"),
        P("<b>Parametrage Livraison</b> (rôle 14) : <b>Ajouter type livraison</b> (nom) et <b>Voir types "
          "livraison</b> pour les modifier. Ces types alimentent la liste « Type de Livraison » du formulaire de "
          "livraison."),
        H(esc, 13, 3, "Modifications admin"),
        P("<b>Modification Admin</b> (rôle 6) apparaît sur les fiches de demande de stock, de livraison et de "
          "remplacement. Elle corrige un formulaire même déjà validé ou réceptionné. À réserver aux corrections."),
    ]
    return chapitre("13", "Administration", "".join(c))


# ---------------------------------------------------------------- annexes
def annexes(esc, note, pages):
    from chapitres import STATUTS_PARC
    parc = "".join(f"<tr><td class='id'>{i}</td><td>{esc(l)}</td><td><code>{c}</code></td><td>{esc(s)}</td></tr>"
                   for i, c, l, f, s in STATUTS_PARC)
    glossaire = [
        ("TPE", "Terminal de paiement électronique."), ("S/N", "Numéro de série d'un TPE."),
        ("Parc", "Registre de tous les TPE, avec leur statut et leur historique."),
        ("Décom", "Décommissionnement : retour de TPE de chez les marchands vers la maintenance."),
        ("Paramétrage", "Configuration d'un TPE (bancaire ou mobile) avant livraison."),
        ("Rebut", "TPE hors d'usage ; ses pièces fonctionnelles peuvent être récupérées."),
        ("Lot / carton / pièce", "Niveaux de rangement d'un stock : un lot contient des cartons, un carton des "
                                 "pièces."),
        ("Propriétaire / sous-propriétaire", "Personnes responsables d'un stock."),
        ("Point marchand, caisse", "Lieu et poste d'encaissement où le TPE est installé."),
        ("TID", "Identifiant du terminal chez la banque (GIM, ECOBANK)."),
        ("OM, MTN, MOOV", "Opérateurs de mobile money (Orange Money, MTN Money, MOOV Money)."),
        ("RNE", "Service activé sur le TPE (case RNE des livraisons)."),
        ("RI", "Rapport d'incident joint à un TPE décommissionné."),
        ("REG", "Régularisation : saisie après coup d'une opération faite hors application."),
        ("Back office", "Équipe qui livre les TPE paramétrés ; « back office livré » = TPE livré."),
    ]
    glo = "".join(f"<tr><td><b>{esc(m)}</b></td><td>{esc(d)}</td></tr>" for m, d in glossaire)
    faq = [
        ("Je ne trouve pas un module ou un formulaire.",
         "Les menus dépendent de vos rôles : repérez vos rôles sur votre profil, puis leurs fiches au chapitre 3. Si "
         "une action vous attend, la cloche y mène directement. Si un menu manque alors que vous en avez besoin, "
         "demandez le rôle au gestionnaire des comptes."),
        ("Un bouton d'action n'apparaît pas sur une fiche.",
         "Le bouton n'existe qu'au bon statut et pour le bon rôle (ou le bon responsable). Vérifiez le statut de la "
         "fiche et la fiche de votre rôle au chapitre 3."),
        ("SYSLIS refuse un TPE dans ma livraison : modèle incorrect.",
         "Une livraison ne contient qu'un modèle. Le TPE est enregistré au parc avec un autre modèle : retirez-le et "
         "faites une livraison séparée pour ce modèle. Si le modèle du parc est faux, demandez une correction au rôle "
         "27 (Manipulation TPE)."),
        ("J'ai livré les TPE réparés un par un.",
         "Chaque livraison doit être réceptionnée puis clôturée. Sélectionnez tous les TPE d'un lot dans une seule "
         "livraison."),
        ("Un formulaire est resté bloqué à une étape.",
         "Une validation ou une réception a été oubliée. La bulle de la personne concernée reste affichée tant que "
         "l'action n'est pas faite : signalez-lui, ou ouvrez la fiche pour voir l'étape attendue."),
        ("J'ai oublié mon mot de passe.",
         "Demandez au gestionnaire des comptes (rôle 5) de vous en donner un nouveau, puis changez-le avec Reset "
         "Password."),
        ("« Utilisateur ou mot de passe incorrects » alors que je suis sûr de mon mot de passe.",
         "Le message s'affiche aussi quand le serveur ne répond pas. Réessayez plus tard ou prévenez la Direction "
         "Technique."),
    ]
    faq_html = "".join(f'<div class="faq"><p class="q">{esc(q)}</p><p>{esc(r)}</p></div>' for q, r in faq)
    par_section = {}
    for r, s in ECRANS:
        par_section.setdefault(s, []).append(r)
    ecrans = "".join(f"<tr><td>{s.replace('sec-', '').replace('-', '.')}</td><td>{pages.get(s, '')}</td>"
                     f"<td><code>{'</code>, <code>'.join(esc(r) for r in routes)}</code></td></tr>"
                     for s, routes in par_section.items())
    return f"""
<section class="chapitre" id="chap-A">
  <span class="num-chap">Annexes</span>
  <h1>Annexes</h1>
  <h2 id="sec-A-1">A. Tableaux des statuts</h2>
  <h3>Statuts du parc TPE</h3>
  <table class="grille"><thead><tr><th>N°</th><th>Statut</th><th>Code</th><th>Signification</th></tr></thead>
  <tbody>{parc}</tbody></table>
  <p>Les statuts des formulaires de chaque module sont rappelés à la fin de leur chapitre : livraisons (5.4), demandes
  de stock (6.5), QR codes (7.5), décommissionnements (8.6), réparation (10.4).</p>
  <h2 id="sec-A-2">B. Glossaire</h2>
  <table class="grille"><tbody>{glo}</tbody></table>
  <h2 id="sec-A-3">C. Questions fréquentes et messages d'erreur</h2>
  {faq_html}
  <h2 id="sec-A-4">D. Correspondance écrans ↔ sections (bouton « ? »)</h2>
  <p>Le bouton « ? » de chaque écran ouvre la section indiquée. Un écran absent de cette liste ouvre le sommaire.</p>
  <table class="grille"><thead><tr><th>Section</th><th>Page</th><th>Adresses des écrans</th></tr></thead>
  <tbody>{ecrans}</tbody></table>
</section>"""
