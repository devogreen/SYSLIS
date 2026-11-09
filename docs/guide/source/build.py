# -*- coding: utf-8 -*-
"""Génère le PDF du guide utilisateur SYSLIS (HTML -> Chromium).

Deux passes : la première rend le PDF pour repérer la page de chaque titre,
la seconde injecte les numéros de page dans le sommaire.
"""
import base64, html, json, re, sys
from pathlib import Path
import pdfplumber
from playwright.sync_api import sync_playwright
from roles_data import FAMILLES, PLAN, MENUS_COMMUNS
import subprocess
import chapitres
import chapitres2
import shutil
from aide_ecrans import ECRANS

ROOT = Path(__file__).parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
VERSION_APP = "v1.45.0"
DATE_DOC = "09/11/2026"
BROUILLON = False  # affiche les notes de relecture

logo_b64 = base64.b64encode((ROOT / "assets/logo_GP.png").read_bytes()).decode()

TITRES_CHAP = {num: titre for num, titre, _ in PLAN}
REDIGES = {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "A"}  # chapitres rédigés dans cette version


def esc(s):
    return html.escape(s, quote=False).replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")


def note(txt):
    return f'<div class="note">{esc(txt)}</div>' if BROUILLON else ""


def ref_chap(num):
    return f"ch. {num} — {TITRES_CHAP[num]}"


# ---------------------------------------------------------------- styles
CSS = """
@page { size: A4; margin: 22mm 18mm 20mm 18mm; }
@page :first { margin: 0; }
:root { --vert:#2e8b3a; --vert-clair:#e9f5ea; --nuit:#141b4d; --gris:#5b6475; --trait:#d9dee7;
        --fond:#f5f7fa; --note:#fff6d6; --note-bord:#e0b100; }
* { box-sizing: border-box; }
html { font-family: 'Inter', sans-serif; font-feature-settings: 'calt' 0, 'case' 0, 'liga' 0; font-size: 9.6pt; color: #1d2433; line-height: 1.5; }
body { margin: 0; }
h1, h2, h3, h4 { color: var(--nuit); line-height: 1.25; break-after: avoid; }
h1 { font-size: 22pt; font-weight: 700; margin: 0 0 6mm; }
h2 { font-size: 13.5pt; font-weight: 650; margin: 8mm 0 3mm; padding-bottom: 1.5mm;
     border-bottom: 1.5px solid var(--vert); }
h3 { font-size: 11pt; font-weight: 650; margin: 5mm 0 2mm; }
p { margin: 0 0 2.5mm; }
b { font-weight: 650; }
.chapitre { break-before: page; }
.num-chap { display:block; font-size: 10pt; font-weight:600; color: var(--vert); letter-spacing: .08em;
            text-transform: uppercase; margin-bottom: 2mm; }

/* couverture */
.couverture { height: 297mm; width: 210mm; position: relative; background: var(--nuit); color: #fff;
              padding: 34mm 22mm; overflow: hidden; }
.couverture .bande { position:absolute; right:-40mm; top:-30mm; width:150mm; height:150mm; border-radius:50%;
              background: radial-gradient(circle at 35% 35%, #3fae4b 0%, #2e8b3a 45%, rgba(46,139,58,0) 70%);
              opacity:.35; }
.couverture img { width: 26mm; height: 26mm; background:#fff; border-radius: 50%; padding: 2mm; }
.couverture .marque { font-size: 10pt; letter-spacing: .25em; text-transform: uppercase; color:#b9c3e6;
              margin-top: 8mm; }
.couverture h1 { color:#fff; font-size: 34pt; margin: 3mm 0 2mm; }
.couverture .sous-titre { font-size: 15pt; color: #d7dcf2; font-weight: 400; }
.couverture .etat { display:inline-block; margin-top: 12mm; padding: 1.5mm 4mm; border-radius: 10mm;
              background: #e0b100; color: #1d2433; font-weight: 650; font-size: 9pt; }
.couverture table { position:absolute; left:22mm; right:22mm; bottom: 28mm; border-collapse: collapse;
              color:#d7dcf2; font-size: 9pt; }
.couverture td { padding: 1.6mm 0; border-top: 1px solid rgba(255,255,255,.18); vertical-align: top; }
.couverture td:first-child { width: 48mm; color:#8f9bc9; }

/* encadrés */
.encadre { background: var(--fond); border-left: 3px solid var(--vert); padding: 3mm 4mm; margin: 3mm 0 4mm;
           break-inside: avoid; }
.note { background: var(--note); border-left: 3px solid var(--note-bord); padding: 2mm 3.5mm; margin: 2mm 0;
        font-size: 8.6pt; break-inside: avoid; }
.note::before { content: "Note de relecture — "; font-weight: 650; }

/* sommaire */
.toc { width:100%; border-collapse: collapse; }
.toc td { padding: 1.1mm 0; vertical-align: baseline; }
.toc .n { width: 9mm; font-weight: 650; color: var(--vert); }
.toc .t { font-weight: 600; }
.toc .s td { font-size: 8.6pt; color: var(--gris); padding: .3mm 0; }
.toc .s .t { font-weight: 400; padding-left: 0; }
.toc .p { text-align: right; width: 14mm; font-variant-numeric: tabular-nums; }
.toc tr.chap td { border-top: 1px solid var(--trait); padding-top: 2mm; }
.statut { font-size: 7.5pt; font-weight: 600; padding: .3mm 2mm; border-radius: 3mm; margin-left: 2mm; }
.statut.ok { background: var(--vert-clair); color: var(--vert); }
.statut.todo { background: #eef0f5; color: var(--gris); }

/* tableaux */
table.grille { width:100%; border-collapse: collapse; font-size: 8.4pt; margin: 2mm 0 4mm; }
table.grille th { text-align:left; background: var(--nuit); color:#fff; font-weight: 600; padding: 1.6mm 2mm; }
table.grille td { padding: 1.4mm 2mm; border-bottom: 1px solid var(--trait); vertical-align: top; }
table.grille tr { break-inside: avoid; }
table.grille tbody { break-inside: avoid; }
table.grille td.id { font-weight: 650; color: var(--vert); width: 9mm; }
table.grille code, .carte code { font-family: 'DejaVu Sans Mono', monospace; font-size: 7.8pt; color: var(--gris); }
table.grille tr.famille td { background: var(--vert-clair); font-weight: 650; color: var(--nuit); }

/* flux */
.flux { display:flex; flex-wrap: wrap; gap: 1.5mm; align-items: center; margin: 2mm 0 4mm; }
.flux span.etape { background: #fff; border: 1px solid var(--trait); border-radius: 2mm; padding: 1.2mm 2.5mm;
                   font-size: 8.4pt; }
.flux span.fleche { color: var(--vert); font-weight: 700; }

/* cartes rôle */
.carte { border: 1px solid var(--trait); border-radius: 2.5mm; margin: 0 0 4mm; break-inside: avoid; overflow:hidden; }
.carte .entete { display:flex; align-items: baseline; gap: 3mm; background: var(--fond); padding: 2.2mm 4mm;
                 border-bottom: 1px solid var(--trait); }
.carte .ids { font-weight: 700; color: #fff; background: var(--vert); border-radius: 1.5mm; padding: .4mm 2mm;
              font-size: 9pt; white-space: nowrap; }
.carte .libelle { font-weight: 650; font-size: 10.5pt; color: var(--nuit); }
.carte .code { margin-left:auto; }
.carte .corps { padding: 2.5mm 4mm 3mm; }
.carte dl { margin: 0; display: grid; grid-template-columns: 34mm 1fr; column-gap: 3mm; row-gap: 1.6mm; }
.carte dt { font-size: 8pt; font-weight: 650; color: var(--gris); text-transform: uppercase; letter-spacing: .03em;
            padding-top: .4mm; }
.carte dd { margin: 0; }
.carte ul { margin: 0; padding-left: 4mm; }
.carte li { margin: 0 0 .6mm; }

/* figures et listes */
figure { margin: 3mm auto 4mm; break-inside: avoid; }
figure img { width: 100%; display: block; border: 1px solid var(--trait); border-radius: 1.5mm; }
figcaption { font-size: 8pt; color: var(--gris); margin-top: 1.2mm; text-align: center; }
ol, ul { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: .8mm; }
.a-preciser { color: #a07800; font-style: italic; }
.duo { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; align-items: start; margin: 2mm 0 3mm; }
.duo figure { margin: 0; }
.faq { break-inside: avoid; margin: 0 0 3mm; }
.faq .q { font-weight: 650; color: var(--nuit); margin-bottom: 1mm; }
.faq .q::before { content: "Q. "; color: var(--vert); }
"""


# ---------------------------------------------------------------- sections
def couverture():
    return f"""
<section class="couverture">
  <div class="bande"></div>
  <img src="data:image/png;base64,{logo_b64}" alt="">
  <div class="marque">Green Pay · Direction Technique</div>
  <h1>SYSLIS</h1>
  <div class="sous-titre">Guide utilisateur</div>
  <div class="etat">Brouillon 3 — tous les chapitres rédigés</div>
  <table>
    <tr><td>Version de l'application</td><td>SYSLIS {VERSION_APP}</td></tr>
    <tr><td>Date</td><td>{DATE_DOC}</td></tr>
    <tr><td>Référence</td><td>GP-DT-GU-2026-[ à attribuer ]</td></tr>
    <tr><td>Rédaction</td><td>Christian COMBEY</td></tr>
    <tr><td>Vérification / validation</td><td>à définir</td></tr>
    <tr><td>Diffusion</td><td>Document interne</td></tr>
  </table>
</section>"""


def lecture():
    return """
<section class="chapitre" id="lecture">
  <h1>Comment utiliser ce guide</h1>
  <p>Ce guide explique SYSLIS à un nouvel utilisateur : ce que fait l'application, ce que chaque rôle permet,
  et comment se déroule chaque processus, de la première saisie jusqu'au résultat (statuts, mouvements de stock,
  mails, PDF, exports).</p>
  <div class="encadre"><b>Par où commencer ?</b><br>
  1. Lisez le chapitre 2 « Prise en main » pour l'écran principal et les notifications.<br>
  2. Au chapitre 3, repérez les fiches de <b>vos</b> rôles (votre profil les affiche) : chaque fiche liste vos
  menus, vos actions et renvoie aux chapitres qui vous concernent.<br>
  3. Gardez le guide sous la main : le bouton « ? » de chaque écran ouvre la section correspondante.</div>
  <h2>Conventions</h2>
  <p><b>Texte en gras</b> : libellé exact d'un bouton ou d'un menu de l'application.<br>
  « Menu → Sous-menu » : chemin dans la barre latérale.<br>
  Les numéros de rôle (par exemple <b>25</b>) sont ceux de la table des rôles ; le code technique
  (<code>verification_decom</code>) est rappelé sur chaque fiche.</p>
  <div class="note">dans ce brouillon, les encadrés jaunes signalent un point à confirmer ou une anomalie
  relevée dans l'application pendant la rédaction. Ils seront retirés de la version publiée.</div>
</section>"""


def sommaire(pages):
    rows = []
    for num, titre, sections in PLAN:
        st = '<span class="statut ok">rédigé</span>' if num in REDIGES else '<span class="statut todo">à rédiger</span>'
        p = pages.get(f"chap-{num}", "")
        lab = "Annexes" if num == "A" else titre
        rows.append(f'<tr class="chap"><td class="n">{"" if num == "A" else num}</td>'
                    f'<td class="t">{esc(lab)}{st}</td><td class="p">{p}</td></tr>')
        for i, s in enumerate(sections, 1):
            sid = f"sec-{num}-{i}"
            sn = f"{num}.{i}" if num != "A" else chr(64 + i)
            rows.append(f'<tr class="s"><td class="n"></td><td class="t">{sn} {esc(s)}</td>'
                        f'<td class="p">{pages.get(sid, "")}</td></tr>')
    return f"""
<section class="chapitre" id="sommaire">
  <h1>Sommaire</h1>
  <table class="toc">{''.join(rows)}</table>
</section>"""


def tableau_roles():
    rows = []
    for fam in FAMILLES:
        if rows:
            rows.append('</tbody><tbody>')
        rows.append(f'<tr class="famille"><td colspan="4">{esc(fam["titre"])}</td></tr>')
        for r in fam["roles"]:
            if not r["ids"]:
                continue
            ids = ", ".join(map(str, r["ids"]))
            codes = r["nom"].replace(" · ", "<br>")
            rows.append(f'<tr><td class="id">{ids}</td><td>{esc(r["libelle"])}</td>'
                        f'<td><code>{codes}</code></td><td>{esc(r["but"])}</td></tr>')
    return ('<table class="grille"><thead><tr><th>Rôle</th><th>Libellé</th><th>Code</th>'
            '<th>En une phrase</th></tr></thead><tbody>' + "".join(rows) + "</tbody></table>")


def liste(items):
    return "<ul>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"


def carte(r):
    ids = " · ".join(map(str, r["ids"])) if r["ids"] else "—"
    voir = ", ".join(ref_chap(c) for c in r["voir"])
    note = f'<div class="note">{esc(r["note"])}</div>' if (BROUILLON and r.get("note")) else ""
    rid = "role-" + ("-".join(map(str, r["ids"])) if r["ids"] else "responsable-stock")
    return f"""
<div class="carte" id="{rid}">
  <div class="entete"><span class="ids">{ids}</span><span class="libelle">{esc(r["libelle"])}</span>
    <code class="code">{r["nom"]}</code></div>
  <div class="corps"><dl>
    <dt>À quoi il sert</dt><dd>{esc(r["but"])}</dd>
    <dt>Menus</dt><dd>{liste(r["menus"])}</dd>
    <dt>Ce que vous faites</dt><dd>{liste(r["actions"])}</dd>
    <dt>Quand agir</dt><dd>{liste(r["attente"])}</dd>
    <dt>Voir aussi</dt><dd>{esc(voir)}</dd>
  </dl>{note}</div>
</div>"""


def chapitre_roles():
    familles = []
    for i, fam in enumerate(FAMILLES, 1):
        flux = ""
        if fam["flux"]:
            parts = []
            for j, e in enumerate(fam["flux"]):
                if j:
                    parts.append('<span class="fleche">→</span>')
                parts.append(f'<span class="etape">{esc(e)}</span>')
            flux = f'<div class="flux">{"".join(parts)}</div>'
        cartes = "".join(carte(r) for r in fam["roles"])
        familles.append(f"""
  <h3 id="fam-{fam['id']}">3.3.{i} {esc(fam['titre'])}</h3>
  <p>{esc(fam['intro'])} Processus détaillé : {esc(ref_chap(fam['chapitre']))}.</p>
  {flux}
  {cartes}""")
    communs = "".join(f"<li>{esc(m)}</li>" for m in MENUS_COMMUNS)
    return f"""
<section class="chapitre" id="chap-3">
  <span class="num-chap">Chapitre 3</span>
  <h1>Rôles et droits</h1>

  <h2 id="sec-3-1">3.1 Comment fonctionnent les rôles</h2>
  <p>Chaque compte reçoit un ou plusieurs rôles, attribués par le gestionnaire des comptes (rôle 5).
  Vos rôles sont affichés sur votre profil. Ils décident de trois choses :</p>
  <ul>
    <li><b>Les menus visibles</b> dans la barre latérale. Un menu sans rôle requis est visible par tous.</li>
    <li><b>Les boutons d'action</b> sur une fiche (demande, livraison, décom…). Un bouton n'apparaît que si
    vous avez le rôle de l'étape <b>et</b> que la fiche est au statut où cette étape est possible.</li>
    <li><b>Les notifications</b> : les bulles rouges et la cloche comptent les éléments qui attendent
    une action de votre part.</li>
  </ul>
  <h3>Menus ouverts à tous</h3>
  <ul>{communs}</ul>
  <h3>Rôle et responsabilité</h3>
  <p>Certaines actions dépendent aussi de <b>qui vous êtes sur la fiche</b>, pas seulement de votre rôle :
  le propriétaire ou un sous-propriétaire d'un stock livre les demandes de ce stock ; seul le créateur, le
  demandeur ou un membre du service demandeur modifie une demande ; le réceptionnaire d'une demande de stock doit
  appartenir au service demandeur.</p>
  <h3>Un menu qui apparaît tout seul</h3>
  <p>Quand un élément vous attend à un endroit dont le menu ne vous est pas attribué, ce menu s'affiche
  avec sa bulle tant que l'action n'est pas faite. C'est le cas, par exemple, du valideur de décom (38) ou du
  propriétaire d'un stock qui doit livrer une demande. La cloche de l'en-tête liste aussi ces actions et
  ouvre directement la bonne fiche.</p>
  <h3>Rôles d'information</h3>
  <p>Les rôles de supervision (13, 22, 26, 28, 33, 37) donnent une vue d'ensemble et, selon le module,
  reçoivent les mails de suivi. Le rôle 37 valide en plus les lots de réparation.</p>

  <h2 id="sec-3-2">3.2 Tableau des rôles</h2>
  {tableau_roles()}

  <h2 id="sec-3-3">3.3 Fiches par rôle</h2>
  <p>Les fiches sont regroupées par processus. Pour chaque rôle : à quoi il sert, les menus qu'il affiche, les
  actions qu'il permet, quand une action vous attend, et où trouver le processus détaillé.</p>
  {''.join(familles)}
</section>"""


def chapitre_vide(num, titre, sections):
    lis = "".join(f'<li id="sec-{num}-{i}">{esc(s)}</li>' for i, s in enumerate(sections, 1))
    lab = "Annexes" if num == "A" else f"Chapitre {num}"
    return f"""
<section class="chapitre" id="chap-{num}">
  <span class="num-chap">{lab}</span><h1>{esc(titre)}</h1>
  <div class="encadre">Chapitre à rédiger. Contenu prévu :<ul>{lis}</ul></div>
</section>"""


def document(pages):
    chapitres.reset_figures()
    corps = [couverture(), lecture(), sommaire(pages)]
    rediges = {"1": lambda: chapitres.chapitre_1(esc, note), "2": lambda: chapitres.chapitre_2(esc, note),
               "3": chapitre_roles, "A": lambda: chapitres2.annexes(esc, note, pages)}
    for n in range(4, 14):
        rediges[str(n)] = (lambda n=n: getattr(chapitres2, f"chapitre_{n}")(esc, note))
    for num, titre, sections in PLAN:
        corps.append(rediges[num]() if num in rediges else chapitre_vide(num, titre, sections))
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>SYSLIS — Guide utilisateur</title><style>{CSS}</style></head><body>{''.join(corps)}</body></html>"""


# ---------------------------------------------------------------- rendu
FOOTER = f"""<div style="font-family:Inter,sans-serif;font-size:7.5pt;color:#8a93a6;width:100%;
padding:0 18mm;display:flex;justify-content:space-between;">
<span>SYSLIS — Guide utilisateur · {VERSION_APP} · Brouillon</span>
<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>"""


def rendre(html_txt, pdf_path):
    (OUT / "guide.html").write_text(html_txt, encoding="utf-8")
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.set_content(html_txt, wait_until="networkidle")
        pg.pdf(path=str(pdf_path), format="A4", print_background=True, prefer_css_page_size=True,
               display_header_footer=True, header_template="<span></span>", footer_template=FOOTER,
               outline=True, tagged=True)
        # couverture sans pied de page : rendue à part puis substituée à la page 1
        pg.set_content(f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head>"
                       f"<body>{couverture()}</body></html>", wait_until="networkidle")
        pg.pdf(path=str(OUT / "_couverture.pdf"), format="A4", print_background=True, prefer_css_page_size=True)
        b.close()
    tmp = OUT / "_corps.pdf"
    Path(pdf_path).replace(tmp)
    subprocess.run(["qpdf", str(tmp), "--pages", str(OUT / "_couverture.pdf"), "1", str(tmp), "2-z", "--",
                    str(pdf_path)], check=True)
    tmp.unlink(); (OUT / "_couverture.pdf").unlink()


def reperer_pages(html_txt):
    """Rend une version où chaque ancre porte un marqueur, puis lit la page de chaque marqueur."""
    ids = re.findall(r'id="((?:chap|sec)-[^"]+|sommaire)"', html_txt)
    marque = html_txt
    for i in ids:
        marque = marque.replace(f'id="{i}">', f'id="{i}"><span style="font-size:1pt;color:#fff">QQMK{i.replace('-', 'x')}KMQQ</span>', 1)
    tmp = OUT / "_reperage.pdf"
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.set_content(marque, wait_until="networkidle")
        pg.pdf(path=str(tmp), format="A4", print_background=True, prefer_css_page_size=True,
               display_header_footer=True, header_template="<span></span>", footer_template=FOOTER)
        b.close()
    pages = {}
    with pdfplumber.open(tmp) as pdf:
        for n, page in enumerate(pdf.pages, 1):
            txt = (page.extract_text() or "").replace("\n", "")
            for m in [x.replace('x', '-') for x in re.findall(r"QQMK([a-zA-Z0-9]+?)KMQQ", txt)]:
                pages.setdefault(m, n)
    tmp.unlink()
    return pages


def ecrire_fichiers_app(pdf, pages):
    """Fichiers livrés dans frontend/public/guide/ : le PDF et la table écran -> page des boutons « ? »."""
    app = OUT / "app"
    app.mkdir(exist_ok=True)
    shutil.copyfile(pdf, app / "guide-utilisateur-syslis.pdf")
    manquants = sorted({s for _, s in ECRANS if s not in pages})
    if manquants:
        raise SystemExit(f"Sections inconnues dans aide_ecrans.py : {manquants}")
    aide = {
        "version": VERSION_APP,
        "brouillon": BROUILLON,
        "pdf": "/guide/guide-utilisateur-syslis.pdf",
        "sommaire": pages.get("sommaire", 1),
        "ecrans": [{"route": r, "section": s, "page": pages[s]} for r, s in ECRANS],
    }
    (app / "guide-aide.json").write_text(json.dumps(aide, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    pages = reperer_pages(document({}))
    html_final = document(pages)
    pages2 = reperer_pages(html_final)  # le sommaire rempli peut décaler les pages
    if pages2 != pages:
        html_final = document(pages2)
        pages = pages2
    nom = f"Guide_Utilisateur_SYSLIS_{VERSION_APP}_brouillon3.pdf"
    rendre(html_final, OUT / nom)
    (OUT / "pages.json").write_text(json.dumps(pages, indent=1), encoding="utf-8")
    ecrire_fichiers_app(OUT / nom, pages)
    print(nom, len(pages), "ancres")
