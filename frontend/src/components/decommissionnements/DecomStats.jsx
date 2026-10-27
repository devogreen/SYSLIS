import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import * as XLSX from "xlsx";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Statistiques } from "../../backend/statistiques/Statistiques";
import { useTheme } from "../../context/ThemeContext";
import { CARTE, LABEL, SOUS_TITRE, TITRE, fmtDate, fmtDuree, libelle, nf, pct, toISO } from "../dashboards/parc_tpe/parcTpeUtils";

const statistiques = new Statistiques();

// ---------------------------------------------------------------------
//  Constantes
// ---------------------------------------------------------------------
const COULEURS = {
  light: { parametrage: "#2a78d6", reparation: "#eb6834", rebut: "#e34948", en_cours: "#9ca3af", sans_diagnostic: "#d1d5db" },
  dark: { parametrage: "#3987e5", reparation: "#d95926", rebut: "#e66767", en_cours: "#6b7280", sans_diagnostic: "#4b5563" },
};

const BASES = [
  { label: "Création du décom", value: "creation" },
  { label: "Clôture du décom", value: "cloture" },
];
const TYPES = [
  { label: "Tous", value: "tous" },
  { label: "Standard", value: "standard" },
  { label: "Remplacement", value: "remplacement" },
];

const DIAGNOSTICS = { parametrage: "Paramétrage", a_reparer: "À réparer", rebus: "Rebut", checking: "En vérification" };

// Groupes de TPE affichables / exportables (filtres sur les lignes renvoyées)
const NOEUDS = {
  tous: { label: "Tous les TPE entrés en décom", filtre: () => true },
  parametrage: { label: "Paramétrage direct", filtre: (l) => l.branche === "parametrage" },
  param_livres: { label: "Paramétrage direct — livrés", filtre: (l) => l.branche === "parametrage" && l.date_livraison },
  param_attente: { label: "Paramétrage direct — en attente de livraison", filtre: (l) => l.branche === "parametrage" && !l.date_livraison },
  reparation: { label: "À réparer", filtre: (l) => l.branche === "reparation" },
  rep_attente_rep: { label: "À réparer — pas encore réparés", filtre: (l) => l.branche === "reparation" && !l.date_repare },
  rep_repares: { label: "À réparer — réparés", filtre: (l) => l.branche === "reparation" && l.date_repare },
  rep_attente_param: { label: "Réparés — pas encore revenus en paramétrage", filtre: (l) => l.branche === "reparation" && l.date_repare && !l.date_retour_param },
  rep_param: { label: "Réparés — revenus en paramétrage", filtre: (l) => l.branche === "reparation" && l.date_retour_param },
  rep_attente_livr: { label: "Réparés et paramétrés — en attente de livraison", filtre: (l) => l.branche === "reparation" && l.date_retour_param && !l.date_livraison },
  rep_livres: { label: "Réparés — livrés", filtre: (l) => l.branche === "reparation" && l.date_livraison },
  rebut: { label: "Rebut", filtre: (l) => l.branche === "rebut" },
  rebut_direct: { label: "Rebut direct", filtre: (l) => l.branche === "rebut" && !l.rebut_apres_reparation },
  rebut_apres_rep: { label: "Rebut après tentative de réparation", filtre: (l) => l.branche === "rebut" && l.rebut_apres_reparation },
  en_cours: { label: "Décom en cours (diagnostic non décidé)", filtre: (l) => l.branche === "en_cours" },
  sans_diagnostic: { label: "Décom clôturé sans diagnostic (TPE non reçu)", filtre: (l) => l.branche === "sans_diagnostic" },
  livres: { label: "Tous les TPE livrés", filtre: (l) => !!l.date_livraison },
};

// Feuilles de l'export complet
const FEUILLES = [
  ["Tous", "tous"], ["Param. direct", "parametrage"], ["Param. livrés", "param_livres"],
  ["À réparer", "reparation"], ["Réparés", "rep_repares"], ["Réparés retour param", "rep_param"], ["Réparés livrés", "rep_livres"],
  ["Rebut", "rebut"], ["En cours", "en_cours"], ["Sans diagnostic", "sans_diagnostic"],
];

const BRANCHES = {
  parametrage: "Paramétrage direct", reparation: "À réparer", rebut: "Rebut", en_cours: "En cours", sans_diagnostic: "Sans diagnostic",
};

const periodeParDefaut = () => {
  const now = new Date();
  return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), now.getMonth(), now.getDate())];
};

const ligneExcel = (l) => ({
  "Numéro de série": l.serial_number,
  "Modèle": l.modele || "",
  "Décom n°": l.decom_id,
  "Type de décom": l.decom_remplacement ? "Remplacement" : "Standard",
  "Créé le": fmtDate(l.date_creation),
  "Clôturé le": l.date_cloture ? fmtDate(l.date_cloture) : "",
  "Banque": l.banque || "",
  "Point marchand": l.point_marchand || "",
  "Diagnostic": DIAGNOSTICS[l.diagnostic] || "",
  "Résultat": BRANCHES[l.branche] + (l.rebut_apres_reparation ? " (après réparation)" : ""),
  "Réparé le": l.date_repare ? fmtDate(l.date_repare) : "",
  "Retour paramétrage le": l.date_retour_param ? fmtDate(l.date_retour_param) : "",
  "Livré le": l.date_livraison ? fmtDate(l.date_livraison) : "",
  "Type de livraison": l.type_livraison === "remplacement" ? "Remplacement" : l.type_livraison === "back_office" ? "Back office" : "",
  "Rebut le": l.date_rebut ? fmtDate(l.date_rebut) : "",
  "Statut actuel": libelle(l.statut_actuel),
  "Reparti dans un autre décom": l.suivi_interrompu ? "Oui" : "",
});

// =====================================================================
//  Composants d'affichage
// =====================================================================
function Compteur({ label, valeur, base, couleur, actif, onClick, petit, aide }) {
  return (
    <button type="button" onClick={onClick} title={aide}
      className={`w-full rounded-xl border p-3 text-left transition hover:shadow-sm ${actif
        ? "border-brand-500 ring-1 ring-brand-500"
        : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {couleur && <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: couleur }} />}
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`${petit ? "text-lg" : "text-2xl"} font-bold tabular-nums text-gray-800 dark:text-white/90`}>{nf.format(valeur)}</span>
        {base !== undefined && <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{pct(valeur, base)} %</span>}
      </div>
    </button>
  );
}

function Attente({ valeur, label, onClick }) {
  if (!valeur) return null;
  return (
    <button type="button" onClick={onClick}
      className="ml-4 flex items-center gap-1.5 text-xs text-amber-700 hover:underline dark:text-amber-400">
      <i className="pi pi-clock text-[10px]" /> {nf.format(valeur)} {label}
    </button>
  );
}

function Fleche({ delai }) {
  return (
    <div className="ml-4 flex items-center gap-2 py-1 text-xs text-gray-400">
      <i className="pi pi-arrow-down text-[10px]" />
      {delai !== null && delai !== undefined && <span>délai médian {fmtDuree(delai)}</span>}
    </div>
  );
}

// =====================================================================
//  Tableau de bord
// =====================================================================
export default function DecomStats() {
  const { theme } = useTheme();
  const couleurs = COULEURS[theme === "dark" ? "dark" : "light"];

  const [periode, setPeriode] = useState(null);
  const [saisiePeriode, setSaisiePeriode] = useState(periode);
  const [base, setBase] = useState("creation");
  const [type, setType] = useState("tous");
  const [modeles, setModeles] = useState([]);
  const [modelId, setModelId] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [noeud, setNoeud] = useState("tous");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      try {
        const mods = await statistiques.getModelesParcTpe();
        if (!ignore) setModeles(Array.isArray(mods) ? mods : []);
      } catch {
        // filtre non bloquant
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, []);

  const [from, to] = periode || [];
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await statistiques.getEntonnoirDecom({
          from: toISO(from), to: toISO(to), base, type, modelId: modelId || undefined,
        });
        if (!ignore) setData(res);
      } catch (e) {
        if (!ignore) { setData(null); setError(e?.message || "Impossible de charger le tableau de bord décom."); }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [from, to, base, type, modelId]);

  const changerPeriode = (value) => {
    setSaisiePeriode(value);
    const [a, b] = value || [];
    if (!value || (a && b)) setPeriode(value ? [a, b] : null);
  };
  const reinitialiser = () => {
    const p = periodeParDefaut();
    setBase("creation"); setType("tous"); setModelId(null); setNoeud("tous");
  };

  const lignes = useMemo(() => data?.lignes || [], [data]);
  const r = data?.resume;
  const d = data?.delais || {};
  const N = r?.total || 0;
  const livres = r ? r.parametrage.livres + r.reparation.livres : 0;

  const choisir = (n) => {
    setNoeud(n);
    setTimeout(() => document.getElementById("liste-decom")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const lignesNoeud = useMemo(() => lignes.filter(NOEUDS[noeud].filtre), [lignes, noeud]);

  // ---- Exports ----
  const suffixe = () => `${base}_${type}_${toISO(from) || "debut"}_${toISO(to) || "fin"}`;
  const exporterNoeud = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignesNoeud.map(ligneExcel)), "TPE");
    XLSX.writeFile(wb, `decom_${noeud}_${suffixe()}.xlsx`);
  };
  const exporterTout = () => {
    const wb = XLSX.utils.book_new();
    const resume = [
      ["Tableau de bord décom", ""],
      ["Période", `${fmtDate(from)} - ${fmtDate(to)}`],
      ["Date de référence", base === "cloture" ? "Clôture du décom" : "Création du décom"],
      ["Type de décom", TYPES.find((t) => t.value === type)?.label],
      ["Modèle", modeles.find((m) => m.id === modelId)?.nom || "Tous"],
      [],
      ["Indicateur", "Nombre"],
      ["TPE entrés en décom", N],
      ["Paramétrage direct", r.parametrage.total],
      ["  dont livrés", r.parametrage.livres],
      ["À réparer", r.reparation.total],
      ["  dont réparés", r.reparation.repares],
      ["  dont revenus en paramétrage", r.reparation.retour_param],
      ["  dont livrés", r.reparation.livres],
      ["Rebut", r.rebut.total],
      ["  dont direct", r.rebut.direct],
      ["  dont après réparation", r.rebut.apres_reparation],
      ["Décom en cours", r.en_cours],
      ["Clôturé sans diagnostic", r.sans_diagnostic],
      ["Livrés back office", r.livres.back_office],
      ["Livrés en remplacement", r.livres.remplacement],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resume), "Résumé");
    for (const [nom, cle] of FEUILLES) {
      const rows = lignes.filter(NOEUDS[cle].filtre).map(ligneExcel);
      if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), nom);
    }
    XLSX.writeFile(wb, `decom_tableau_de_bord_${suffixe()}.xlsx`);
  };

  // ---- Barre de répartition ----
  const repartition = r ? [
    { cle: "parametrage", label: "Paramétrage direct", n: r.parametrage.total },
    { cle: "reparation", label: "À réparer", n: r.reparation.total },
    { cle: "rebut", label: "Rebut", n: r.rebut.total },
    { cle: "en_cours", label: "En cours", n: r.en_cours },
    { cle: "sans_diagnostic", label: "Sans diagnostic", n: r.sans_diagnostic },
  ].filter((x) => x.n > 0) : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Filtres */}
      <div className={`${CARTE} flex flex-wrap items-end gap-4`}>
        <label className={LABEL}>
          Période
          <Calendar value={saisiePeriode} onChange={(e) => changerPeriode(e.value)} selectionMode="range" readOnlyInput
            dateFormat="dd/mm/yy" placeholder="Toutes les dates" showButtonBar maxDate={new Date()} />
        </label>
        <label className={LABEL}>
          Date de référence
          <SelectButton value={base} options={BASES} onChange={(e) => e.value && setBase(e.value)} />
        </label>
        <label className={LABEL}>
          Type de décom
          <SelectButton value={type} options={TYPES} onChange={(e) => e.value && setType(e.value)} />
        </label>
        <label className={LABEL}>
          Modèle
          <Dropdown value={modelId} onChange={(e) => setModelId(e.value)} options={modeles} optionLabel="nom" optionValue="id"
            placeholder="Tous les modèles" showClear style={{ minWidth: 180 }} />
        </label>
        <Button label="Réinitialiser" text onClick={reinitialiser} className="ml-auto" />
        <p className="basis-full text-xs text-gray-500 dark:text-gray-400">
          {base === "creation"
            ? "TPE des décoms créés sur la période. Les décoms pas encore clôturés apparaissent « en cours »."
            : "TPE des décoms clôturés sur la période (date à laquelle les diagnostics sont décidés)."}
          {" "}Les étapes suivantes (réparation, paramétrage, livraison, rebut) sont suivies jusqu'à aujourd'hui.
        </p>
      </div>

      {error && <Message severity="error" text={error} className="w-full justify-start" />}

      {/* Résumé */}
      <section className={CARTE}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={TITRE}>Résumé</h2>
            <p className={SOUS_TITRE}>
              {loading ? "Chargement…" : r ? `${nf.format(N)} passages en décom (${nf.format(r.nb_tpe)} TPE, ${nf.format(r.nb_decoms)} décoms).` : ""}
              {d.creation_cloture != null && ` Délai médian création → clôture : ${fmtDuree(d.creation_cloture)}.`}
            </p>
          </div>
          <Button label="Exporter tout" icon="pi pi-file-excel" severity="success" size="small" disabled={!N} onClick={exporterTout} />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Compteur label="Entrés en décom" valeur={N} actif={noeud === "tous"} onClick={() => choisir("tous")} />
          <Compteur label="Livrés" valeur={livres} base={N} actif={noeud === "livres"} onClick={() => choisir("livres")}
            aide={r ? `Back office : ${r.livres.back_office} · Remplacement : ${r.livres.remplacement}` : undefined} />
          <Compteur label="Rebut" valeur={r?.rebut.total || 0} base={N} couleur={couleurs.rebut} actif={noeud === "rebut"} onClick={() => choisir("rebut")} />
          <Compteur label="Décom en cours" valeur={r?.en_cours || 0} base={N} couleur={couleurs.en_cours} actif={noeud === "en_cours"} onClick={() => choisir("en_cours")} />
        </div>

        {N > 0 && (
          <div className="mt-5">
            <div className="flex h-3 overflow-hidden rounded-md bg-gray-100 dark:bg-white/[0.06]">
              {repartition.map((x, i) => (
                <div key={x.cle} title={`${x.label} : ${x.n}`}
                  className={i ? "border-l-2 border-white dark:border-gray-900" : ""}
                  style={{ width: `${(x.n / N) * 100}%`, background: couleurs[x.cle] }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {repartition.map((x) => (
                <button key={x.cle} type="button" onClick={() => choisir(x.cle)} className="flex items-center gap-1.5 text-gray-600 hover:underline dark:text-gray-300">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: couleurs[x.cle] }} />
                  {x.label} <span className="font-semibold tabular-nums text-gray-800 dark:text-white/90">{nf.format(x.n)}</span>
                  <span className="tabular-nums text-gray-500">({pct(x.n, N)} %)</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Parcours par résultat de diagnostic */}
      {r && N > 0 && (
        <section className={CARTE}>
          <div className="mb-4">
            <h2 className={TITRE}>Devenir des TPE après diagnostic</h2>
            <p className={SOUS_TITRE}>Cliquez sur un chiffre pour afficher la liste des TPE correspondants. Les pourcentages sont calculés sur l'étape précédente.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Paramétrage direct */}
            <div className="rounded-xl border-t-4 bg-gray-50/60 p-3 dark:bg-white/[0.02]" style={{ borderTopColor: couleurs.parametrage }}>
              <Compteur label="Paramétrage direct" valeur={r.parametrage.total} base={N} couleur={couleurs.parametrage}
                actif={noeud === "parametrage"} onClick={() => choisir("parametrage")} />
              <Fleche delai={d.param_cloture_livraison} />
              <Compteur petit label="Livrés (back office / remplacement)" valeur={r.parametrage.livres} base={r.parametrage.total}
                actif={noeud === "param_livres"} onClick={() => choisir("param_livres")} />
              <Attente valeur={r.parametrage.total - r.parametrage.livres} label="en attente de livraison" onClick={() => choisir("param_attente")} />
            </div>

            {/* À réparer */}
            <div className="rounded-xl border-t-4 bg-gray-50/60 p-3 dark:bg-white/[0.02]" style={{ borderTopColor: couleurs.reparation }}>
              <Compteur label="À réparer" valeur={r.reparation.total} base={N} couleur={couleurs.reparation}
                actif={noeud === "reparation"} onClick={() => choisir("reparation")} />
              <Fleche delai={d.rep_cloture_repare} />
              <Compteur petit label="Réparés" valeur={r.reparation.repares} base={r.reparation.total}
                actif={noeud === "rep_repares"} onClick={() => choisir("rep_repares")} />
              <Attente valeur={r.reparation.total - r.reparation.repares} label="pas encore réparés" onClick={() => choisir("rep_attente_rep")} />
              <Fleche delai={d.rep_repare_param} />
              <Compteur petit label="Revenus en paramétrage" valeur={r.reparation.retour_param} base={r.reparation.repares}
                actif={noeud === "rep_param"} onClick={() => choisir("rep_param")} />
              <Attente valeur={r.reparation.repares - r.reparation.retour_param} label="pas encore en paramétrage" onClick={() => choisir("rep_attente_param")} />
              <Fleche delai={d.rep_param_livraison} />
              <Compteur petit label="Livrés (back office / remplacement)" valeur={r.reparation.livres} base={r.reparation.retour_param}
                actif={noeud === "rep_livres"} onClick={() => choisir("rep_livres")} />
              <Attente valeur={r.reparation.retour_param - r.reparation.livres} label="en attente de livraison" onClick={() => choisir("rep_attente_livr")} />
            </div>

            {/* Rebut */}
            <div className="rounded-xl border-t-4 bg-gray-50/60 p-3 dark:bg-white/[0.02]" style={{ borderTopColor: couleurs.rebut }}>
              <Compteur label="Rebut" valeur={r.rebut.total} base={N} couleur={couleurs.rebut}
                actif={noeud === "rebut"} onClick={() => choisir("rebut")} />
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Compteur petit label="Direct (décidé au diagnostic)" valeur={r.rebut.direct} base={r.rebut.total}
                  actif={noeud === "rebut_direct"} onClick={() => choisir("rebut_direct")} />
                <Compteur petit label="Après tentative de réparation" valeur={r.rebut.apres_reparation} base={r.rebut.total}
                  actif={noeud === "rebut_apres_rep"} onClick={() => choisir("rebut_apres_rep")} />
              </div>
              {d.rebut_cloture_rebut != null && (
                <p className="mt-2 text-xs text-gray-500">Après réparation : délai médian clôture → rebut {fmtDuree(d.rebut_cloture_rebut)}</p>
              )}
              {r.sans_diagnostic > 0 && (
                <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
                  <Compteur petit label="Clôturés sans diagnostic (TPE non reçus)" valeur={r.sans_diagnostic} base={N} couleur={couleurs.sans_diagnostic}
                    actif={noeud === "sans_diagnostic"} onClick={() => choisir("sans_diagnostic")} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Liste */}
      <section id="liste-decom" className={CARTE}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div>
            <h2 className={TITRE}>{NOEUDS[noeud].label}</h2>
            <p className={SOUS_TITRE}>{nf.format(lignesNoeud.length)} TPE</p>
          </div>
          <span className="relative sm:ml-auto">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <InputText value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (S/N, banque…)" style={{ paddingLeft: "2.25rem" }} />
          </span>
          <Button label="Exporter cette liste" icon="pi pi-file-excel" severity="success" outlined size="small"
            disabled={!lignesNoeud.length} onClick={exporterNoeud} />
        </div>
        <div className="overflow-x-auto [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <DataTable value={lignesNoeud} loading={loading} paginator rows={10} rowsPerPageOptions={[10, 25, 50, 100]}
            size="small" stripedRows removableSort emptyMessage="Aucun TPE."
            globalFilter={recherche} globalFilterFields={["serial_number", "modele", "banque", "point_marchand", "statut_actuel"]}>
            <Column header="N° de série" sortable sortField="serial_number" body={(l) => (l.id_tpe
              ? <Link to={`/historique-tpe/${l.id_tpe}`} className="font-medium text-brand-500 hover:underline">{l.serial_number}</Link>
              : l.serial_number)} />
            <Column field="modele" header="Modèle" sortable body={(l) => l.modele || "—"} />
            <Column header="Décom" sortable sortField="decom_id" body={(l) => (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Link to={`/decom-details/${l.decom_id}`} className="text-brand-500 hover:underline">n° {l.decom_id}</Link>
                {l.decom_remplacement && <Tag value="Rempl." severity="warning" />}
              </span>
            )} />
            <Column header="Créé le" sortable sortField="date_creation" body={(l) => fmtDate(l.date_creation)} />
            <Column header="Clôturé le" sortable sortField="date_cloture" body={(l) => fmtDate(l.date_cloture)} />
            <Column field="banque" header="Banque" sortable body={(l) => l.banque || "—"} />
            <Column field="point_marchand" header="Point marchand" sortable body={(l) => l.point_marchand || "—"} />
            <Column header="Résultat" sortable sortField="branche" body={(l) => (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: couleurs[l.branche] }} />
                {BRANCHES[l.branche]}{l.rebut_apres_reparation ? " (après rép.)" : ""}
              </span>
            )} />
            <Column header="Réparé le" sortable sortField="date_repare" body={(l) => fmtDate(l.date_repare)} />
            <Column header="Paramétré le" sortable sortField="date_retour_param" body={(l) => fmtDate(l.date_retour_param)} />
            <Column header="Livré le" sortable sortField="date_livraison" body={(l) => (l.date_livraison ? (
              <span className="whitespace-nowrap">{fmtDate(l.date_livraison)} <span className="text-xs text-gray-500">({l.type_livraison === "remplacement" ? "rempl." : "BO"})</span></span>
            ) : "—")} />
            <Column header="Rebut le" sortable sortField="date_rebut" body={(l) => fmtDate(l.date_rebut)} />
            <Column header="Statut actuel" sortable sortField="statut_actuel" body={(l) => (
              <span className="whitespace-nowrap">
                {libelle(l.statut_actuel)}
                {l.suivi_interrompu && <i className="pi pi-replay ml-1.5 text-xs text-gray-400" title="Reparti dans un autre décom : suivi arrêté à ce moment-là" />}
              </span>
            )} />
            <Column header="Depuis dernière étape" sortable sortField="heures_depuis_derniere_etape" body={(l) => fmtDuree(l.heures_depuis_derniere_etape)} />
          </DataTable>
        </div>
      </section>
    </div>
  );
}
