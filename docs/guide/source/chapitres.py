# -*- coding: utf-8 -*-
"""Chapitres 1 (Présentation) et 2 (Prise en main) du guide utilisateur SYSLIS."""
import base64
from pathlib import Path

CAPTURES = Path(__file__).parent / "captures"
_num_fig = {"n": 0}


def capture(fichier, legende, largeur="100%", recadrage=None):
    """Insère une capture d'écran (embarquée en base64) avec sa légende numérotée.
    recadrage = (x0, y0, x1, y1) en pixels de la capture d'origine."""
    p = CAPTURES / fichier
    mime = "image/png" if p.suffix == ".png" else "image/jpeg"
    if recadrage:
        import io
        from PIL import Image
        im = Image.open(p).convert("RGB").crop(recadrage)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=90)
        data = base64.b64encode(buf.getvalue()).decode()
        mime = "image/jpeg"
    else:
        data = base64.b64encode(p.read_bytes()).decode()
    _num_fig["n"] += 1
    return (f'<figure style="width:{largeur}"><img src="data:{mime};base64,{data}" alt="">'
            f'<figcaption>Figure {_num_fig["n"]} — {legende}</figcaption></figure>')


def reset_figures():
    _num_fig["n"] = 0


STATUTS_PARC = [
    # (id, code, libellé, famille, sens)
    (1, "stock", "En stock", "Préparation", "TPE rangé dans un stock (lot, carton ou pièce)."),
    (4, "parametrage", "Paramétrage", "Préparation",
     "TPE sorti du stock par une demande de stock, à paramétrer puis à livrer."),
    (13, "param_maintenance", "Paramétrage (maintenance)", "Préparation",
     "TPE diagnostiqué « paramétrage » à la clôture d'un décom, en attente de livraison par la maintenance."),
    (2, "back_office", "Back office", "Préparation",
     "Étape prévue entre le paramétrage et la livraison ; utilisée dans une prochaine version."),
    (6, "back_office_livre", "Livré", "Chez le marchand", "TPE livré à un marchand."),
    (7, "back_office_remplace", "Livré en remplacement", "Chez le marchand",
     "TPE livré pour remplacer un autre TPE."),
    (3, "decom", "Décom (ancien)", "Anciens statuts",
     "Ancien statut, remplacé par « attente décom »."),
    (8, "attente_decom", "Attente décom", "Retour (décommissionnement)",
     "TPE d'un décom validé, en attente d'arrivée à la maintenance."),
    (16, "decom_remplacement", "Décom remplacement", "Retour (décommissionnement)",
     "Comme « attente décom », pour un décom lié à un remplacement."),
    (9, "diagnostic", "Diagnostic (ancien)", "Anciens statuts",
     "Ancien statut des TPE d'un décom en vérification technique."),
    (12, "annulation_decom", "Annulation décom", "Anciens statuts",
     "Prévu pour les TPE sortis d'un décom ; non utilisé."),
    (11, "a_reparer", "À réparer", "Maintenance", "TPE diagnostiqué « à réparer », pas encore dans un lot."),
    (14, "decom_en_reparation", "En réparation", "Maintenance", "TPE dans un lot de réparation en cours."),
    (10, "repare", "Réparé", "Maintenance", "Réparation validée ; le TPE attend sa livraison."),
    (15, "decom_repare", "Décom réparé", "Anciens statuts", "Statut de test, plus utilisé."),
    (5, "rebut", "Rebut", "Fin de vie", "TPE mis au rebut ; ses pièces fonctionnelles peuvent être récupérées."),
]

_ORDRE = ["Préparation", "Chez le marchand", "Retour (décommissionnement)", "Maintenance", "Fin de vie", "Anciens statuts"]
STATUTS_PARC.sort(key=lambda t: _ORDRE.index(t[3]))

MODULES = [
    ("Tableaux de bord", "Chiffres de la semaine, des livraisons, des QR codes, des stocks, du parc et des décoms.", "4"),
    ("Livraisons", "Livraisons de TPE et de chargeurs aux marchands, remplacements de TPE.", "5"),
    ("Stocks", "Catalogue des éléments, stocks, demandes de stock, livraisons et réceptions, entrées et sorties.", "6"),
    ("QR codes", "Demandes de QR codes pour les marchands, de la génération à la réception.", "7"),
    ("Décommissionnement", "Retour de TPE depuis les marchands, diagnostic à la maintenance, clôture.", "8"),
    ("Maintenance", "Mise au rebut et récupération des pièces ; réparation des TPE par lots.", "9, 10"),
    ("Parc TPE", "Registre de tous les TPE, de leur statut et de leur historique.", "11"),
    ("Régularisations", "Saisie après coup d'opérations faites hors de l'application.", "12"),
    ("Administration", "Comptes, rôles, types de livraison, corrections.", "13"),
]


def chapitre_1(esc, note):
    lignes = []
    famille = None
    for i, code, lib, fam, sens in STATUTS_PARC:
        if fam != famille:
            lignes.append(f'<tr class="famille"><td colspan="4">{esc(fam)}</td></tr>')
            famille = fam
        txt = esc(sens) if sens else '<span class="a-preciser">à préciser</span>'
        lignes.append(f'<tr><td class="id">{i}</td><td>{esc(lib)}</td><td><code>{code}</code></td><td>{txt}</td></tr>')
    modules = "".join(f"<tr><td><b>{esc(m)}</b></td><td>{esc(d)}</td><td>ch. {c}</td></tr>" for m, d, c in MODULES)
    return f"""
<section class="chapitre" id="chap-1">
  <span class="num-chap">Chapitre 1</span>
  <h1>Présentation de SYSLIS</h1>

  <h2 id="sec-1-1">1.1 À quoi sert l'application</h2>
  <p>SYSLIS est l'application interne de la Direction Technique de Green Pay pour suivre les terminaux de
  paiement (TPE) et tout ce qui les accompagne : stocks de pièces, de chargeurs et de TPE, livraisons aux
  marchands, QR codes, retours en décommissionnement, réparation et mise au rebut.</p>
  <p>Chaque opération est un <b>formulaire qui passe par des étapes</b> : une personne le crée, d'autres le
  valident, le livrent, le réceptionnent ou le clôturent. À chaque étape, SYSLIS enregistre qui a agi, quand,
  et avec quel commentaire. Selon le module, l'étape envoie aussi des mails et produit un formulaire PDF.</p>
  <div class="encadre"><b>Trois idées à retenir</b><br>
  1. Ce que vous voyez et pouvez faire dépend de vos <b>rôles</b> (chapitre 3).<br>
  2. Un formulaire avance par <b>statuts</b> ; un bouton d'action n'apparaît qu'au bon statut, pour le bon rôle.<br>
  3. Les <b>bulles rouges</b> et la <b>cloche</b> vous indiquent ce qui attend une action de votre part.</div>

  <h2 id="sec-1-2">1.2 Le cycle de vie d'un TPE</h2>
  <p>Le <b>parc TPE</b> est le registre central : chaque TPE y figure avec son numéro de série, son modèle et
  son statut, et chaque changement de statut est historisé. Les modules font avancer ce statut :</p>
  <div class="flux">
    <span class="etape">Stock</span><span class="fleche">→</span>
    <span class="etape">Paramétrage (demande de stock)</span><span class="fleche">→</span>
    <span class="etape">Livraison ou remplacement</span><span class="fleche">→</span>
    <span class="etape">Décommissionnement</span><span class="fleche">→</span>
    <span class="etape">Diagnostic à la maintenance</span><span class="fleche">→</span>
    <span class="etape">Paramétrage, réparation ou rebut</span>
  </div>
  <p>Après le diagnostic, un TPE en bon état repart au paramétrage pour être livré de nouveau ; un TPE à
  réparer passe par un lot de réparation avant de revenir au paramétrage ; un TPE hors d'usage est mis au
  rebut et ses pièces fonctionnelles peuvent être remises en stock.</p>
  <table class="grille"><thead><tr><th>N°</th><th>Statut</th><th>Code</th><th>Signification</th></tr></thead>
  <tbody>{''.join(lignes)}</tbody></table>


  <h2 id="sec-1-3">1.3 Les modules en un coup d'œil</h2>
  <table class="grille"><thead><tr><th>Module</th><th>Ce qu'on y fait</th><th>Voir</th></tr></thead>
  <tbody>{modules}</tbody></table>
</section>"""


def chapitre_2(esc, note):
    return f"""
<section class="chapitre" id="chap-2">
  <span class="num-chap">Chapitre 2</span>
  <h1>Prise en main</h1>

  <h2 id="sec-2-1">2.1 Se connecter et gérer son mot de passe</h2>
  <h3>Se connecter</h3>
  <ol>
    <li>Ouvrez SYSLIS dans votre navigateur, à l'adresse communiquée par la Direction Technique.</li>
    <li>Saisissez votre <b>Email</b> et votre mot de passe (<b>Password</b>). L'icône en forme d'œil affiche
    le mot de passe en clair.</li>
    <li>Cliquez sur <b>Connexion</b>. Vous arrivez sur le tableau de bord de la semaine en cours.</li>
  </ol>
  {capture("02-01_connexion.jpg", "Page de connexion")}
  <p>Le message « Utilisateur ou mot de passe incorrects » s'affiche quand la connexion échoue.</p>
  {note("ce message s'affiche aussi quand le serveur ne répond pas. À corriger dans l'application "
        "(« Serveur injoignable »), sinon un utilisateur croira à une erreur de mot de passe.")}
  <h3>Mot de passe oublié</h3>
  <p>La page de connexion ne propose pas de lien « mot de passe oublié ». Adressez-vous au gestionnaire des
  comptes (rôle 5) : il peut définir un nouveau mot de passe depuis votre fiche utilisateur. Changez-le ensuite
  vous-même.</p>
  <h3>Changer son mot de passe</h3>
  <ol>
    <li>Cliquez sur votre nom en haut à droite, puis sur <b>Reset Password</b>.</li>
    <li>Saisissez l'<b>Ancien mot de passe</b>, le <b>Nouveau mot de passe</b>, puis <b>Confirmer mot de passe</b>.</li>
    <li>Cliquez sur <b>Modifier</b>.</li>
  </ol>
  {capture("02-01b_mot-de-passe.jpg", "Modifier mot de passe")}
  <h3>Se déconnecter</h3>
  <p>Cliquez sur votre nom en haut à droite, puis sur <b>Sign out</b>. Pensez à vous déconnecter sur un poste
  partagé.</p>

  <h2 id="sec-2-2">2.2 L'écran principal</h2>
  {capture("02-02_ecran-principal.jpg", "Écran principal : barre latérale, en-tête et tableau de bord de la semaine")}
  <p><b>La barre latérale</b> (à gauche) regroupe les menus : Dashboard, Gestion des Livraisons, Gestion des
  QRcodes, Gestion des Stocks, etc. Cliquez sur un menu pour afficher ses sous-menus. Vous ne voyez que les menus
  de vos rôles (chapitre 3). Le numéro de version de SYSLIS est affiché en bas de la barre.</p>
  <p><b>Le bouton ☰</b> (en haut à gauche) replie la barre pour ne garder que les icônes et laisser plus de
  place à la page.</p>
  <p><b>L'en-tête</b> (en haut à droite) contient quatre boutons :</p>
  <ul>
    <li>le <b>livre</b> : télécharge ce guide au format PDF ;</li>
    <li>la <b>lune</b> : passe l'affichage en mode sombre, ou revient au mode clair ;</li>
    <li>la <b>cloche</b> : les actions qui vous attendent (section 2.3) ;</li>
    <li><b>votre nom</b> : ouvre le menu utilisateur avec <b>Profil Utilisateur</b>, <b>Reset Password</b> et
    <b>Sign out</b>.</li>
  </ul>
  {capture("02-02b_menu-utilisateur.png", "Menu utilisateur", "62%")}
  <p>Sous l'en-tête, chaque page affiche son titre et un fil d'Ariane (<b>Home › nom de la page</b>) ;
  cliquez sur <b>Home</b> pour revenir au tableau de bord. Le bouton <b>?</b> à côté du titre ouvre ce guide à la
  section qui décrit l'écran affiché.</p>


  <h2 id="sec-2-3">2.3 Notifications : bulles et cloche</h2>
  <p>SYSLIS ne vous envoie pas chercher le travail : il le compte pour vous.</p>
  <h3>Les bulles rouges</h3>
  <ul>
    <li>Une bulle sur un <b>sous-menu</b> indique le nombre d'éléments qui attendent <b>votre</b> action à cet
    endroit (une demande à valider, une livraison à réceptionner…). Le menu parent affiche le total.</li>
    <li>Barre repliée : un point rouge signale le menu concerné.</li>
    <li>En survolant une bulle, vous voyez le détail par étape.</li>
    <li>Il n'y a pas d'état « lu » : la bulle diminue quand l'action est faite.</li>
    <li>Les compteurs se mettent à jour quand vous changez de page, quand vous revenez sur l'onglet, et
    toutes les 60 secondes.</li>
  </ul>
  <h3>La cloche</h3>
  <p>Le badge de la cloche affiche le même total que les bulles (« 99+ » au-delà de 99). Cliquez dessus pour
  ouvrir le panneau <b>Actions en attente</b> :</p>
  <ul>
    <li>les actions sont groupées par étape (par exemple « Demandes de stock à valider », « Demandes de stock
    à livrer »), avec leur nombre ;</li>
    <li>chaque groupe montre les 10 plus récentes ; <b>Voir la liste complète →</b> ouvre la liste entière ;</li>
    <li>cliquez sur une ligne pour aller directement sur la page où l'action se fait ;</li>
    <li>le bouton ⟳ actualise le panneau, la croix le ferme.</li>
  </ul>
  {capture("02-03_cloche.jpg", "Le panneau Actions en attente ouvert depuis la cloche")}
  <div class="encadre">Un menu qui ne fait pas partie de vos rôles peut apparaître avec une bulle : c'est qu'un
  élément vous attend à cet endroit (par exemple, une demande à livrer depuis un stock dont vous êtes
  responsable). Il disparaît quand l'action est faite.</div>

  <h2 id="sec-2-4">2.4 Les listes</h2>
  <p>Chaque module a une ou plusieurs listes (Toutes les demandes Stock, Tous les décomm…). Elles
  fonctionnent de la même façon :</p>
  <ul>
    <li><b>Recherche</b> : la barre du haut filtre sur le texte saisi ; l'icône ⟳ recharge la liste.</li>
    <li><b>Filtres</b> : listes déroulantes (statut, pièce, modèle, service…) et période (<b>Date de début</b>,
    <b>Date de fin</b>). La case <b>Régularisations</b> n'affiche que les formulaires saisis en régularisation.</li>
    <li>Le nombre de résultats est indiqué au-dessus du tableau (« 50 demande(s) trouvée(s) »).</li>
    <li><b>Tri</b> : cliquez sur un titre de colonne marqué ↑↓.</li>
    <li><b>Pagination</b> en bas du tableau, avec le nombre de lignes par page.</li>
    <li><b>Actions</b> : l'œil ouvre la fiche ; l'imprimante ouvre le formulaire PDF.</li>
  </ul>
  {capture("02-04_liste.jpg", "Liste des demandes de stock : filtres, statuts et actions")}
  <p>Les statuts sont des pastilles de couleur : orange pour « en cours », vert pour une étape franchie
  (validée, livrée, réceptionnée), rouge pour un retour ou un refus, gris pour un formulaire clos ou annulé.
  Certaines listes (parc, décoms, QR codes) proposent aussi un export Excel.</p>

  <h2 id="sec-2-5">2.5 Les fiches</h2>
  <p>Ouvrir un élément d'une liste affiche sa fiche :</p>
  <ul>
    <li>en haut à gauche, la date du formulaire et son <b>statut</b> ;</li>
    <li>en haut à droite, les <b>boutons d'action</b> : <b>Voir formulaire PDF</b>, puis les actions possibles
    pour vous à ce statut (valider, livrer, réceptionner, modifier…). Si un bouton attendu n'apparaît pas,
    vérifiez le statut de la fiche et vos rôles ;</li>
    <li>au centre, le contenu du formulaire ; plus bas, le suivi de chaque étape franchie : qui, quand,
    commentaire, quantités.</li>
  </ul>
  {capture("02-05_fiche.jpg", "Fiche d'une demande de stock validée")}
  <p>Les actions importantes ouvrent une fenêtre de confirmation où vous pouvez ajouter un commentaire ; certaines
  étapes demandent aussi une signature à l'écran, tracée à la souris ou au doigt (livraisons, réceptions, demandes
  de stock et de QR codes). Le formulaire PDF reprend le contenu et les étapes de la fiche :
  c'est la pièce à imprimer ou à transmettre.</p>


  <h2 id="sec-2-6">2.6 Mon profil</h2>
  <p>Menu utilisateur → <b>Profil Utilisateur</b> : votre nom, vos services, votre email et la liste de vos
  <b>rôles</b>. C'est le point de départ pour lire le chapitre 3 : repérez vos rôles, puis leurs fiches.</p>
  {capture("02-06_profil.jpg", "Profil utilisateur avec ses services et ses rôles")}
  <p>Pour changer de service ou de rôle, adressez-vous au gestionnaire des comptes (rôle 5).</p>
</section>"""
