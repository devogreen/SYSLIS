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
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";
import { Statistiques } from "../../../backend/statistiques/Statistiques";
import {
  CARTE, LABEL, MODES_LISTE, SOUS_TITRE, TITRE,
  couleurStatut, fmtDateHeure, fmtDuree, libelle, nf, toISO,
} from "./parcTpeUtils";

const statistiques = new Statistiques();

const descriptionMode = (mode) => ({
  actuel: "TPE actuellement dans ce statut, avec la date d'entrée dans le statut.",
  entree: "Chaque passage dans ce statut dont l'entrée a eu lieu sur la période (un TPE peut apparaître plusieurs fois).",
  presence: "Passages dans ce statut qui recouvrent au moins en partie la période.",
  date: "TPE qui étaient dans ce statut à la date choisie.",
}[mode]);

// Liste des TPE par statut / période, avec export Excel
export default function ListeTpeSection({ statuts, selection, setSelection, modelId, couleurs, theme, onVoirTimeline }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recherche, setRecherche] = useState("");

  const { statutId, mode, from, to, date } = selection;
  const pret = statutId && (mode !== "date" || date);

  useEffect(() => {
    if (!pret) { setRows([]); return; }
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { statutId, mode, modelId: modelId || undefined };
        if (mode === "entree" || mode === "presence") {
          params.from = toISO(from);
          params.to = toISO(to);
        }
        if (mode === "date") params.date = toISO(date);
        const data = await statistiques.getTpesParStatut(params);
        if (!ignore) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) { setRows([]); setError(e?.message || "Impossible de charger la liste des TPE."); }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [pret, statutId, mode, from, to, date, modelId]);

  const nbTpe = useMemo(() => new Set(rows.map((r) => r.id_tpe)).size, [rows]);
  const nomStatut = statuts.find((s) => s.id === statutId)?.statut;

  const exporter = () => {
    const lignes = rows.map((r) => ({
      "Numéro de série": r.serial_number,
      "Modèle": r.modele || "",
      "Statut précédent": libelle(r.statut_precedent),
      "Entrée dans le statut": r.date_entree ? fmtDateHeure(r.date_entree) : "",
      "Sortie du statut": r.date_sortie ? fmtDateHeure(r.date_sortie) : "",
      "En cours": r.en_cours ? "Oui" : "Non",
      "Durée (heures)": r.duree_heures ?? "",
      "Statut actuel": libelle(r.statut_actuel),
      "Opération": libelle(r.form_type),
      "Formulaire": r.form_id || "",
      "Par": r.utilisateur || "",
    }));
    const ws = XLSX.utils.json_to_sheet(lignes);
    ws["!cols"] = [18, 14, 18, 18, 18, 9, 14, 18, 22, 11, 20].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TPE");
    const suffixe = mode === "date" ? toISO(date) : mode === "actuel" ? toISO(new Date()) : `${toISO(from) || "debut"}_${toISO(to) || "fin"}`;
    XLSX.writeFile(wb, `tpe_${nomStatut || statutId}_${mode}_${suffixe}.xlsx`);
  };

  const options = useMemo(() => statuts.map((s) => ({ value: s.id, label: libelle(s.statut) })), [statuts]);

  const statutOption = (o) => (
    <span className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: couleurStatut(couleurs, o?.value, theme) }} />
      {o?.label}
    </span>
  );

  return (
    <section id="liste-tpe" className={CARTE}>
      <div className="mb-4">
        <h2 className={TITRE}>Liste des TPE par statut</h2>
        <p className={SOUS_TITRE}>{descriptionMode(mode)}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className={LABEL}>
          Statut
          <Dropdown value={statutId} options={options} onChange={(e) => setSelection((s) => ({ ...s, statutId: e.value }))}
            placeholder="Choisir un statut" filter itemTemplate={statutOption}
            valueTemplate={(o, p) => (o ? statutOption(o) : <span>{p.placeholder}</span>)} style={{ minWidth: 220 }} />
        </label>
        <label className={LABEL}>
          Critère
          <SelectButton className="flex flex-wrap" value={mode} options={MODES_LISTE} onChange={(e) => e.value && setSelection((s) => ({ ...s, mode: e.value }))} />
        </label>
        {(mode === "entree" || mode === "presence") && (
          <label className={LABEL}>
            Période
            <Calendar value={from || to ? [from || null, to || null] : null} selectionMode="range" readOnlyInput dateFormat="dd/mm/yy" showButtonBar
              placeholder="Toutes les dates"
              onChange={(e) => {
                const [a, b] = e.value || [];
                setSelection((s) => ({ ...s, from: a || null, to: b || null }));
              }} />
          </label>
        )}
        {mode === "date" && (
          <label className={LABEL}>
            Date
            <Calendar value={date} onChange={(e) => setSelection((s) => ({ ...s, date: e.value }))} dateFormat="dd/mm/yy"
              maxDate={new Date()} readOnlyInput showIcon />
          </label>
        )}
      </div>

      {error && <Message className="mb-3 w-full justify-start" severity="error" text={error} />}

      {!statutId ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          Choisissez un statut, ou cliquez sur une tuile ou une barre des graphiques ci-dessus.
        </div>
      ) : mode === "date" && !date ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          Choisissez une date.
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold tabular-nums text-gray-800 dark:text-white/90">{nf.format(nbTpe)}</span> TPE
              {rows.length !== nbTpe && <> · <span className="tabular-nums">{nf.format(rows.length)}</span> passages</>}
            </span>
            <span className="relative sm:ml-auto">
              <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <InputText value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (S/N, modèle…)" style={{ paddingLeft: "2.25rem" }} />
            </span>
            <Button label="Exporter Excel" icon="pi pi-file-excel" severity="success" outlined size="small"
              disabled={!rows.length} onClick={exporter} />
          </div>

          <div className="overflow-x-auto">
          <DataTable value={rows} loading={loading} paginator rows={10} rowsPerPageOptions={[10, 25, 50, 100]}
            globalFilter={recherche} globalFilterFields={["serial_number", "modele", "statut_precedent", "statut_actuel", "form_type", "utilisateur"]}
            emptyMessage="Aucun TPE pour ce critère." size="small" stripedRows removableSort sortField="date_entree" sortOrder={-1}>
            <Column header="N° de série" sortable sortField="serial_number"
              body={(r) => <Link to={`/historique-tpe/${r.id_tpe}`} className="font-medium text-brand-500 hover:underline">{r.serial_number}</Link>} />
            <Column field="modele" header="Modèle" sortable body={(r) => r.modele || "—"} />
            <Column header="Statut précédent" sortable sortField="statut_precedent" body={(r) => libelle(r.statut_precedent)} />
            <Column header="Entrée" sortable sortField="date_entree" body={(r) => fmtDateHeure(r.date_entree)} />
            <Column header="Sortie" sortable sortField="date_sortie"
              body={(r) => (r.en_cours ? <Tag value="En cours" severity="info" /> : fmtDateHeure(r.date_sortie))} />
            <Column header="Durée" sortable sortField="duree_heures" body={(r) => fmtDuree(r.duree_heures)} />
            {mode !== "actuel" && <Column header="Statut actuel" sortable sortField="statut_actuel" body={(r) => libelle(r.statut_actuel)} />}
            <Column header="Opération" sortable sortField="form_type" body={(r) => libelle(r.form_type)} />
            <Column field="utilisateur" header="Par" sortable body={(r) => r.utilisateur || "—"} />
            <Column header="" style={{ width: 48 }}
              body={(r) => <Button icon="pi pi-history" text rounded size="small" tooltip="Chronologie" tooltipOptions={{ position: "left" }}
                onClick={() => onVoirTimeline(r.serial_number)} />} />
          </DataTable>
          </div>
        </>
      )}
    </section>
  );
}
