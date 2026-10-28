// Utilitaires partagés du dashboard "Statistiques Parc TPE"

// ---------------------------------------------------------------------
//  Couleurs
//  7 couleurs catégorielles (ordre validé daltonisme) + gris "Autres".
//  Une couleur est attribuée à un STATUT (jamais à un rang) : la
//  correspondance est calculée une seule fois au chargement, à partir de la
//  répartition actuelle du parc, puis reste fixe pour toute la page.
// ---------------------------------------------------------------------
export const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"];
export const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"];
export const AUTRES_LIGHT = "#9ca3af";
export const AUTRES_DARK = "#6b7280";
export const AUTRES_ID = "autres";
export const MAX_COULEURS = SERIES_LIGHT.length;

export const chartTheme = (dark) => ({
  series: dark ? SERIES_DARK : SERIES_LIGHT,
  autres: dark ? AUTRES_DARK : AUTRES_LIGHT,
  text: dark ? "#c3c2b7" : "#52514e",
  grid: dark ? "rgba(255,255,255,0.08)" : "#edf1ed",
  surface: dark ? "#1a2231" : "#ffffff",
});

// statuts: [{ id, total }] -> Map(statutId -> index de couleur) pour les 7 plus gros
export const construireCouleurs = (statuts) => {
  const tries = [...(statuts || [])].filter((s) => s.total > 0).sort((a, b) => b.total - a.total || a.id - b.id);
  const map = new Map();
  tries.slice(0, MAX_COULEURS).forEach((s, i) => map.set(s.id, i));
  return map;
};

export const couleurStatut = (couleurs, statutId, theme) => {
  const i = couleurs.get(statutId);
  return i === undefined ? theme.autres : theme.series[i];
};

// ---------------------------------------------------------------------
//  Libellés
// ---------------------------------------------------------------------
const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const libelle = (v) => (v ? capitalise(String(v).replace(/_/g, " ")) : "—");

export const nf = new Intl.NumberFormat("fr-FR");
export const pct = (v, total) => (total ? Math.round((v / total) * 1000) / 10 : 0);

export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—");
export const fmtDateHeure = (v) =>
  v
    ? new Date(v).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

// heures -> "3 j 4 h", "5 h", "< 1 h"
export const fmtDuree = (h) => {
  if (h === null || h === undefined) return "—";
  if (h < 1) return "< 1 h";
  const j = Math.floor(h / 24);
  const r = Math.round(h - j * 24);
  if (!j) return `${r} h`;
  return r ? `${j} j ${r} h` : `${j} j`;
};

// ---------------------------------------------------------------------
//  Dates & périodes
// ---------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : undefined);

export const GRANULARITES = [
  { label: "Jour", value: "day" },
  { label: "Semaine", value: "week" },
  { label: "Mois", value: "month" },
];

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const periodLabel = (key, g) => {
  if (!key) return "";
  if (g === "day") {
    const [, m, day] = key.split("-");
    return `${day}/${m}`;
  }
  if (g === "week") return key.split("-")[1];
  const [y, m] = key.split("-");
  return `${MOIS[Number(m) - 1]} ${y.slice(2)}`;
};

// Clé de période renvoyée par le backend -> [début, fin] (objets Date locaux)
export const periodeVersDates = (key, g) => {
  if (g === "day") {
    const [y, m, d] = key.split("-").map(Number);
    const jour = new Date(y, m - 1, d);
    return [jour, jour];
  }
  if (g === "week") {
    const [y, w] = key.split("-W").map(Number);
    // Lundi de la semaine ISO 1 = lundi de la semaine contenant le 4 janvier
    const jan4 = new Date(y, 0, 4);
    const lundi1 = new Date(y, 0, 4 - ((jan4.getDay() + 6) % 7));
    const debut = new Date(lundi1.getFullYear(), lundi1.getMonth(), lundi1.getDate() + (w - 1) * 7);
    const fin = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + 6);
    return [debut, fin];
  }
  const [y, m] = key.split("-").map(Number);
  return [new Date(y, m - 1, 1), new Date(y, m, 0)];
};

// Intersection d'une période [a, b] avec la période filtrée [from, to]
export const borner = ([a, b], [from, to] = []) => [from && from > a ? from : a, to && to < b ? to : b];

// Période par défaut : les 6 derniers mois (mois en cours inclus)
export const periodeParDefaut = () => {
  const now = new Date();
  return [new Date(now.getFullYear(), now.getMonth() - 5, 1), new Date(now.getFullYear(), now.getMonth(), now.getDate())];
};

// ---------------------------------------------------------------------
//  Modes de la liste de TPE
// ---------------------------------------------------------------------
export const MODES_LISTE = [
  { label: "Actuellement", value: "actuel" },
  { label: "Entrés sur la période", value: "entree" },
  { label: "Présents sur la période", value: "presence" },
  { label: "À une date", value: "date" },
];

// Styles de carte communs (TailAdmin)
export const CARTE = "min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";
export const TITRE = "text-base font-semibold text-gray-800 dark:text-white/90";
export const SOUS_TITRE = "text-sm text-gray-500 dark:text-gray-400";
export const LABEL = "flex flex-col gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400";
