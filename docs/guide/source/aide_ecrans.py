# -*- coding: utf-8 -*-
"""Correspondance écrans de SYSLIS -> section du guide (boutons « ? »).

Chaque route (syntaxe react-router, comme dans App.tsx) pointe vers l'ancre d'une section du guide.
build.py en déduit la page du PDF et écrit guide-aide.json, lu par l'application.
Ajouter un écran = ajouter une ligne ici, puis régénérer le guide.
"""

ECRANS = [
    # 2 — Prise en main
    ("/modifier-mot-de-passe", "sec-2-1"),
    ("/user-profil", "sec-2-6"),
    ("/profile", "sec-2-6"),
    # 4 — Tableaux de bord
    ("/", "sec-4-1"),
    ("/sous-dashboard-livraison", "sec-4-2"),
    ("/sous-dashboard-remplacement", "sec-4-2"),
    ("/sous-dashboard-chargeurs", "sec-4-2"),
    ("/sous-dashboard-qrcode", "sec-4-3"),
    ("/sous-dashboard-mvt-stock", "sec-4-4"),
    ("/dashboard-parc-tpe", "sec-4-5"),
    ("/decom-dashboard", "sec-4-6"),
    # 5 — Livraisons et remplacements
    ("/form-livraison", "sec-5-1"),
    ("/modifier-livraison/:id", "sec-5-1"),
    ("/toutes-les-livraisons", "sec-5-2"),
    ("/formulaire/:id", "sec-5-2"),
    ("/nouveau-remplacement", "sec-5-3"),
    ("/tous-les-remplacements", "sec-5-3"),
    ("/remplacement-details/:id", "sec-5-3"),
    ("/modifier-remplacement/:id", "sec-5-3"),
    # 6 — Stocks
    ("/voir-items", "sec-6-1"),
    ("/voir-piece/:id", "sec-6-1"),
    ("/ajouter-piece", "sec-6-1"),
    ("/ajouter-terminal", "sec-6-1"),
    ("/modifier-piece/:id", "sec-6-1"),
    ("/ajouter-stock", "sec-6-2"),
    ("/creer-stock", "sec-6-2"),
    ("/voir-stocks", "sec-6-2"),
    ("/details-stock/:id", "sec-6-2"),
    ("/nouvelle-demande", "sec-6-3"),
    ("/nouvelle-demande-terminal", "sec-6-3"),
    ("/toutes-les-demandes", "sec-6-3"),
    ("/demande-details/:id", "sec-6-3"),
    ("/modifier-demande/:id", "sec-6-3"),
    ("/valider-demande/:id", "sec-6-3"),
    ("/livraison-demande/:id", "sec-6-3"),
    ("/entree-sortie-stock", "sec-6-4"),
    ("/details-mouvement/:id", "sec-6-4"),
    # 7 — QR codes
    ("/demande-qr", "sec-7-1"),
    ("/modifier-demande-qr/:id", "sec-7-1"),
    ("/toutes-les-demandes-qr", "sec-7-2"),
    ("/demande-qr-details/:id", "sec-7-2"),
    ("/tous-les-marchands-qr", "sec-7-4"),
    # 8 — Décommissionnement
    ("/nouveau-decommissionnement", "sec-8-1"),
    ("/modifier-decom/:id", "sec-8-1"),
    ("/tous-les-decommissionnements", "sec-8-2"),
    ("/decom-details/:id", "sec-8-2"),
    ("/validation-decom/:id", "sec-8-2"),
    ("/validation-transmission-decom/:id", "sec-8-2"),
    ("/verification-decom/:id", "sec-8-3"),
    ("/reg-verification-decom/:id", "sec-8-3"),
    ("/livraison-param-decom", "sec-8-5"),
    ("/livraisons-param-decom", "sec-8-5"),
    ("/livraison-param-decom-details/:id", "sec-8-5"),
    ("/reception-livraison-param-decom/:id", "sec-8-5"),
    # 9 — Mise au rebut
    ("/nouveau-rebut", "sec-9-1"),
    ("/toutes-les-demandes-rebut", "sec-9-1"),
    ("/demande-rebut-details/:id", "sec-9-1"),
    ("/modifier-rebut/:id", "sec-9-1"),
    ("/valider-rebut/:id", "sec-9-1"),
    ("/tpe-rebuts", "sec-9-2"),
    ("/tpe-rebut-details/:id", "sec-9-2"),
    ("/pieces-rebuts", "sec-9-4"),
    # 10 — Réparation
    ("/mise-en-reparation", "sec-10-1"),
    ("/tpe-a-reparer", "sec-10-1"),
    ("/reparation-tpe", "sec-10-1"),
    ("/reparations-tpe", "sec-10-2"),
    ("/reparation-tpe-details/:id", "sec-10-2"),
    ("/validation-reparation-tpe/:id", "sec-10-2"),
    ("/update-reparation-tpe/:id", "sec-10-2"),
    ("/toutes-livraisons-reparation", "sec-10-3"),
    ("/livraison-reparation-details/:id", "sec-10-3"),
    ("/reception-livraison-reparation/:id", "sec-10-3"),
    # 11 — Parc TPE
    ("/parc-tpe", "sec-11-1"),
    ("/historique-tpe/:id", "sec-11-2"),
    ("/manipulation-tpe", "sec-11-3"),
    # 12 — Régularisations
    ("/regularisation-livraison", "sec-12-2"),
    ("/regularisation-demande", "sec-12-2"),
    ("/regularisation-demande-qr", "sec-12-2"),
    ("/regularisation-remplacement", "sec-12-2"),
    ("/regularisation-decom", "sec-12-2"),
    # 13 — Administration
    ("/créer-utilisateur", "sec-13-1"),
    ("/tous-les-utilisateurs", "sec-13-1"),
    ("/modifier-profil/:id", "sec-13-1"),
    ("/types-livraison", "sec-13-2"),
    ("/ajouter-type-livraison", "sec-13-2"),
    ("/modifier-type-livraison/:id", "sec-13-2"),
    ("/modification-admin-demande/:id", "sec-13-3"),
    ("/liaison-tpe-pieces", "sec-9-5"),
]
