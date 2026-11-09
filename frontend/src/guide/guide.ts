// Guide utilisateur SYSLIS : accès au PDF et correspondance écran -> page pour les boutons « ? ».
// Les deux fichiers sont générés avec le guide (docs/guide/source/build.py) et servis depuis public/guide/.
import { matchPath } from "react-router";

export const GUIDE_PDF = "/guide/guide-utilisateur-syslis.pdf";
const GUIDE_AIDE = "/guide/guide-aide.json";
export const GUIDE_NOM_FICHIER = "Guide_Utilisateur_SYSLIS.pdf";

export interface EcranGuide {
  route: string;
  section: string;
  page: number;
}

export interface AideGuide {
  version: string;
  pdf: string;
  sommaire: number;
  ecrans: EcranGuide[];
}

let chargement: Promise<AideGuide | null> | null = null;

// Chargée une seule fois par session ; un échec n'est pas mémorisé (nouvel essai au prochain appel).
export function chargerAideGuide(): Promise<AideGuide | null> {
  if (!chargement) {
    chargement = fetch(GUIDE_AIDE, { cache: "no-cache" })
      .then((r) => (r.ok ? (r.json() as Promise<AideGuide>) : null))
      .catch(() => null)
      .then((aide) => {
        if (!aide) chargement = null;
        return aide;
      });
  }
  return chargement;
}

// Page du guide pour l'écran affiché (null si l'écran n'est pas référencé).
export function pagePourChemin(aide: AideGuide | null, chemin: string): number | null {
  if (!aide) return null;
  let decode = chemin;
  try {
    decode = decodeURIComponent(chemin); // ex. /cr%C3%A9er-utilisateur
  } catch {
    // chemin mal encodé : on garde la valeur brute
  }
  const ecran = aide.ecrans.find((e) => matchPath({ path: e.route, end: true }, decode));
  return ecran ? ecran.page : null;
}

// Lien vers le PDF ; ?v= évite qu'un navigateur garde l'ancienne version après une mise à jour.
export function lienGuide(aide: AideGuide | null, page?: number | null): string {
  const base = aide ? `${GUIDE_PDF}?v=${encodeURIComponent(aide.version)}` : GUIDE_PDF;
  return page ? `${base}#page=${page}` : base;
}
