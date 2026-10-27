import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import * as XLSX from "xlsx";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";
import { Calendar } from "primereact/calendar";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Statistiques } from "../../../backend/statistiques/Statistiques";
import {
  CARTE, LABEL, SOUS_TITRE, TITRE,
  couleurStatut, fmtDateHeure, fmtDuree, libelle, nf, toISO,
} from "./parcTpeUtils";

const statistiques = new Statistiques();
const MAX_ETAPES = 10;

const MODES = [
  { label: "Strict", value: "strict" },
  { label: "Souple", value: "souple" },
];

const REGLES = [
  { label: "Dernier statut atteint dans la période", value: "fin" },
  { label: "Premier statut atteint dans la période", value: "debut" },
  { label: "Tout le parcours dans la période", value: "tout" },
  { label: "Sans contrainte de date", value: "aucune" },
];

const AIDE_MODE = {
  strict: "Les statuts se suivent directement, sans autre statut entre eux.",
  souple: "Les statuts sont dans cet ordre, mais d'autres statuts peuvent s'intercaler.",
};

// Recherche des TPE passés par une suite ordonnée de statuts
export default function ParcoursSection({ statuts, periode, modelId, couleurs, theme, onVoirTimeline }) {
  const [chemin, setChemin] = useState([]);
  const [mode, setMode] = useState("souple");
  const [regle, setRegle] = useState("fin");
  const [dates, setDates] = useState(periode);
  const [resultat, setResultat] = useState(null);
  const [cleResultat, setCleResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recherche, setRecherche] = useState("");

  // La période suit le filtre global tant que l'utilisateur ne la change pas ici
  useEffect(() => { setDates(periode); }, [periode]);

  const nomStatut = useMemo(() => new Map(statuts.map((s) => [s.id, s.statut])), [statuts]);
  const [from, to] = dates || [];

  const criteres = useMemo(() => ({
    statuts: chemin.join(","),
    mode,
    regle,
    from: regle === "aucune" ? undefined : toISO(from),
    to: regle === "aucune" ? undefined : toISO(to),
    modelId: modelId || undefined,
  }), [chemin, mode, regle, from, to, modelId]);
  const cle = JSON.stringify(criteres);
  const perime = resultat && cleResultat !== cle;

  // ---- Construction du parcours ----
  const dernier = chemin[chemin.length - 1];
  const optionsAjout = useMemo(
    () => statuts.filter((s) => s.id !== dernier).map((s) => ({ value: s.id, label: libelle(s.statut) })),
    [statuts, dernier]
  );
  const ajouter = (id) => { if (id && chemin.length < MAX_ETAPES) setChemin((c) => [...c, id]); };
  const retirer = (i) => setChemin((c) => c.filter((_, j) => j !== i));
  const deplacer = (i, d) => setChemin((c) => {
    const n = [...c];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    return n;
  });
  // Deux étapes consécutives identiques (possible après un retrait / déplacement)
  const doublonConsecutif = chemin.some((id, i) => i > 0 && id === chemin[i - 1]);

  const rechercher = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await statistiques.getParcoursTpe(criteres);
      setResultat(data);
      setCleResultat(cle);
    } catch (e) {
      setResultat(null);
      setError(e?.message || "Impossible de rechercher ce parcours.");
    } finally {
      setLoading(false);
    }
  };

  const tpes = resultat?.tpes || [];
  const etapesRes = resultat?.chemin || [];

  const exporter = () => {
    const lignes = tpes.map((t) => {
      const ligne = {
        "Numéro de série": t.serial_number,
        "Modèle": t.modele || "",
        "Statut actuel": libelle(t.statut_actuel),
      };
      t.etapes.forEach((e, i) => {
        ligne[`${i + 1}. ${libelle(etapesRes[i]?.statut)} - entrée`] = fmtDateHeure(e.date_entree);
        ligne[`${i + 1}. ${libelle(etapesRes[i]?.statut)} - durée (h)`] = e.duree_heures ?? "";
      });
      ligne["Durée du parcours (h)"] = t.duree_parcours_heures ?? "";
      ligne["Occurrences"] = t.nb_occurrences;
      return ligne;
    });
    const ws = XLSX.utils.json_to_sheet(lignes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parcours");
    const nom = etapesRes.map((s) => s.statut).join("-");
    XLSX.writeFile(wb, `parcours_${nom}_${mode}_${toISO(new Date())}.xlsx`);
  };

  const pastille = (id) => (
    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: couleurStatut(couleurs, id, theme) }} />
  );

  const etapeBody = (i) => (t) => {
    const e = t.etapes[i];
    return (
      <div className="whitespace-nowrap">
        <div>{fmtDateHeure(e.date_entree)}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {e.date_sortie ? `resté ${fmtDuree(e.duree_heures)}` : `en cours (${fmtDuree(e.duree_heures)})`}
        </div>
      </div>
    );
  };

  return (
    <section id="parcours-tpe" className={CARTE}>
      <div className="mb-4">
        <h2 className={TITRE}>Parcours de statuts</h2>
        <p className={SOUS_TITRE}>
          Choisissez des statuts dans l'ordre pour retrouver les TPE qui sont passés par ce parcours.
        </p>
      </div>

      {/* Constructeur du parcours */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
        {chemin.length === 0 && <span className="px-1 text-sm text-gray-500">Aucun statut choisi.</span>}
        {chemin.map((id, i) => (
          <span key={`${id}-${i}`} className="flex items-center gap-2">
            {i > 0 && <i className={`pi ${mode === "strict" ? "pi-arrow-right" : "pi-ellipsis-h"} text-xs text-gray-400`}
              title={mode === "strict" ? "suivi directement de" : "suivi (pas forcément directement) de"} />}
            <span className={`flex items-center gap-1.5 rounded-full border bg-white py-1 pl-2.5 pr-1 text-sm dark:bg-gray-900 ${
              i > 0 && id === chemin[i - 1] ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}>
              <span className="text-xs font-semibold text-gray-400">{i + 1}</span>
              {pastille(id)}
              <span className="text-gray-700 dark:text-gray-200">{libelle(nomStatut.get(id))}</span>
              <button type="button" className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/[0.06]"
                disabled={i === 0} onClick={() => deplacer(i, -1)} title="Déplacer avant" aria-label="Déplacer avant">
                <i className="pi pi-angle-left text-xs" />
              </button>
              <button type="button" className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/[0.06]"
                disabled={i === chemin.length - 1} onClick={() => deplacer(i, 1)} title="Déplacer après" aria-label="Déplacer après">
                <i className="pi pi-angle-right text-xs" />
              </button>
              <button type="button" className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                onClick={() => retirer(i)} title="Retirer" aria-label="Retirer">
                <i className="pi pi-times text-xs" />
              </button>
            </span>
          </span>
        ))}
        {chemin.length < MAX_ETAPES && (
          <Dropdown value={null} options={optionsAjout} onChange={(e) => ajouter(e.value)} filter
            placeholder={chemin.length ? "+ Statut suivant" : "+ Premier statut"} className="p-inputtext-sm" style={{ minWidth: 190 }}
            itemTemplate={(o) => <span className="flex items-center gap-2">{pastille(o.value)}{o.label}</span>} />
        )}
        {chemin.length > 0 && (
          <Button label="Vider" text size="small" severity="secondary" className="ml-auto" onClick={() => setChemin([])} />
        )}
      </div>

      {/* Options */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className={LABEL}>
          Enchaînement
          <SelectButton value={mode} options={MODES} onChange={(e) => e.value && setMode(e.value)} />
        </label>
        <label className={LABEL}>
          Règle de date
          <Dropdown value={regle} options={REGLES} onChange={(e) => setRegle(e.value)} style={{ minWidth: 280 }} />
        </label>
        {regle !== "aucune" && (
          <label className={LABEL}>
            Période
            <Calendar value={dates} onChange={(e) => setDates(e.value)} selectionMode="range" readOnlyInput
              dateFormat="dd/mm/yy" placeholder="Toutes les dates" showButtonBar maxDate={new Date()} />
          </label>
        )}
        <Button label="Rechercher" icon="pi pi-search" loading={loading} onClick={rechercher}
          disabled={chemin.length < 2 || doublonConsecutif || (from && !to)} />
      </div>
      <p className="-mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">{AIDE_MODE[mode]}</p>

      {doublonConsecutif && (
        <Message className="mb-3 w-full justify-start" severity="warn" text="Deux étapes qui se suivent ne peuvent pas avoir le même statut." />
      )}
      {error && <Message className="mb-3 w-full justify-start" severity="error" text={error} />}

      {resultat && (
        <>
          {perime && (
            <Message className="mb-3 w-full justify-start" severity="info"
              text="Les critères ont changé : relancez la recherche pour mettre à jour les résultats." />
          )}

          {/* Résumé */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">TPE trouvés</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-gray-800 dark:text-white/90">{nf.format(resultat.resume.nb_tpe)}</div>
              {resultat.resume.nb_occurrences > resultat.resume.nb_tpe && (
                <div className="text-xs text-gray-500">{nf.format(resultat.resume.nb_occurrences)} parcours au total</div>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Durée médiane du parcours</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-gray-800 dark:text-white/90">{fmtDuree(resultat.resume.duree_mediane_h)}</div>
              <div className="text-xs text-gray-500">moyenne : {fmtDuree(resultat.resume.duree_moyenne_h)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Délai médian entre étapes</div>
              <ul className="space-y-0.5 text-sm">
                {resultat.resume.transitions.map((tr, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate text-gray-600 dark:text-gray-300">{libelle(tr.de)} → {libelle(tr.vers)}</span>
                    <span className="whitespace-nowrap font-semibold tabular-nums text-gray-800 dark:text-white/90">{fmtDuree(tr.duree_mediane_h)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Si un TPE a fait le parcours plusieurs fois, la ligne montre le plus récent.
            </span>
            <span className="relative sm:ml-auto">
              <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <InputText value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (S/N, modèle…)" style={{ paddingLeft: "2.25rem" }} />
            </span>
            <Button label="Exporter Excel" icon="pi pi-file-excel" severity="success" outlined size="small"
              disabled={!tpes.length} onClick={exporter} />
          </div>

          <div className="overflow-x-auto">
            <DataTable value={tpes} paginator rows={10} rowsPerPageOptions={[10, 25, 50, 100]} size="small" stripedRows removableSort
              globalFilter={recherche} globalFilterFields={["serial_number", "modele", "statut_actuel"]}
              emptyMessage="Aucun TPE n'a suivi ce parcours avec ces critères.">
              <Column header="N° de série" sortable sortField="serial_number"
                body={(t) => <Link to={`/historique-tpe/${t.id_tpe}`} className="font-medium text-brand-500 hover:underline">{t.serial_number}</Link>} />
              <Column field="modele" header="Modèle" sortable body={(t) => t.modele || "—"} />
              {etapesRes.map((s, i) => (
                <Column key={`${s.id}-${i}`} body={etapeBody(i)}
                  header={<span className="flex items-center gap-1.5 whitespace-nowrap">{pastille(s.id)}{i + 1}. {libelle(s.statut)}</span>} />
              ))}
              <Column field="duree_parcours_heures" header="Durée parcours" sortable body={(t) => fmtDuree(t.duree_parcours_heures)} />
              <Column header="Statut actuel" sortable sortField="statut_actuel" body={(t) => libelle(t.statut_actuel)} />
              <Column field="nb_occurrences" header="Fois" sortable style={{ width: 70 }} />
              <Column header="" style={{ width: 48 }}
                body={(t) => <Button icon="pi pi-history" text rounded size="small" tooltip="Chronologie" tooltipOptions={{ position: "left" }}
                  onClick={() => onVoirTimeline(t.serial_number)} />} />
            </DataTable>
          </div>
        </>
      )}
    </section>
  );
}
