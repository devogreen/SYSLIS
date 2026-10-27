import { useMemo } from "react";
import { Chart } from "primereact/chart";
import { Calendar } from "primereact/calendar";
import { SelectButton } from "primereact/selectbutton";
import { Message } from "primereact/message";
import {
  AUTRES_ID, CARTE, LABEL, SOUS_TITRE, TITRE,
  couleurStatut, libelle, nf, pct,
} from "./parcTpeUtils";

const VUES = [
  { label: "Aujourd'hui", value: "actuel" },
  { label: "À une date", value: "date" },
];

// État du parc : tuiles par statut + camembert (actuel ou photo à une date)
export default function EtatParcSection({
  repartition, loading, couleurs, theme,
  vue, setVue, dateEtat, setDateEtat, onSelectStatut,
}) {
  const statuts = useMemo(
    () => (repartition?.statuts || []).filter((s) => s.total > 0).sort((a, b) => b.total - a.total),
    [repartition]
  );
  const total = repartition?.total || 0;

  // Parts du camembert : statuts colorés + "Autres" regroupé
  const parts = useMemo(() => {
    const colores = statuts.filter((s) => couleurs.has(s.id));
    const autres = statuts.filter((s) => !couleurs.has(s.id));
    const res = colores.map((s) => ({ id: s.id, label: libelle(s.statut), total: s.total, color: couleurStatut(couleurs, s.id, theme) }));
    if (autres.length) {
      res.push({
        id: AUTRES_ID,
        label: `Autres (${autres.length} statuts)`,
        total: autres.reduce((a, s) => a + s.total, 0),
        color: theme.autres,
        detail: autres,
      });
    }
    return res;
  }, [statuts, couleurs, theme]);

  const chartData = useMemo(() => ({
    labels: parts.map((p) => p.label),
    datasets: [{
      data: parts.map((p) => p.total),
      backgroundColor: parts.map((p) => p.color),
      borderColor: theme.surface,
      borderWidth: 2,
      hoverOffset: 6,
    }],
  }), [parts, theme]);

  const chartOptions = useMemo(() => ({
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (i) => ` ${nf.format(i.parsed)} TPE (${pct(i.parsed, total)} %)`,
          afterBody: (items) => {
            const p = parts[items[0]?.dataIndex];
            return p?.detail ? p.detail.map((s) => `${libelle(s.statut)} : ${nf.format(s.total)}`) : [];
          },
        },
      },
    },
    onClick: (_evt, elements) => {
      const p = parts[elements?.[0]?.index];
      if (p && p.id !== AUTRES_ID) onSelectStatut(p.id);
    },
    onHover: (evt, elements) => {
      const p = parts[elements?.[0]?.index];
      if (evt?.native?.target) evt.native.target.style.cursor = p && p.id !== AUTRES_ID ? "pointer" : "default";
    },
  }), [parts, total, onSelectStatut]);

  return (
    <section className={CARTE}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={TITRE}>État du parc</h2>
          <p className={SOUS_TITRE}>
            {vue === "actuel" ? "Répartition actuelle des TPE par statut." : "Répartition des TPE par statut à la date choisie (reconstituée depuis l'historique)."}
            {" "}Cliquez sur un statut pour voir la liste des TPE.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectButton value={vue} onChange={(e) => e.value && setVue(e.value)} options={VUES} />
          {vue === "date" && (
            <label className={LABEL}>
              Date
              <Calendar value={dateEtat} onChange={(e) => setDateEtat(e.value)} dateFormat="dd/mm/yy"
                maxDate={new Date()} readOnlyInput showIcon />
            </label>
          )}
        </div>
      </div>

      {vue === "actuel" && repartition?.incoherences > 0 && (
        <Message className="mb-4 w-full justify-start" severity="warn"
          text={`${nf.format(repartition.incoherences)} TPE ont un statut actuel qui ne correspond pas à leur dernière ligne d'historique (ou n'ont pas d'historique). Ils sont comptés ici mais absents des statistiques sur période.`} />
      )}

      {/* Tuiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Total parc</div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-gray-800 dark:text-white/90">{loading ? "…" : nf.format(total)}</div>
        </div>
        {statuts.map((s) => (
          <button key={s.id} type="button" onClick={() => onSelectStatut(s.id)}
            className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:hover:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: couleurStatut(couleurs, s.id, theme) }} />
              <span className="truncate" title={libelle(s.statut)}>{libelle(s.statut)}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-gray-800 dark:text-white/90">{nf.format(s.total)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{pct(s.total, total)} %</span>
            </div>
          </button>
        ))}
      </div>

      {/* Camembert + légende chiffrée */}
      <div className="mt-6 grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative h-[280px]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Chargement…</div>
          ) : total === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Aucun TPE.</div>
          ) : (
            <Chart type="pie" data={chartData} options={chartOptions} style={{ height: "280px" }} />
          )}
        </div>
        <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
          {parts.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={p.id === AUTRES_ID} onClick={() => onSelectStatut(p.id)}
                className="flex w-full items-center gap-3 py-2 text-left enabled:hover:bg-gray-50 disabled:cursor-default dark:enabled:hover:bg-white/[0.03]"
                title={p.detail ? p.detail.map((s) => `${libelle(s.statut)} : ${s.total}`).join("\n") : undefined}>
                <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: p.color }} />
                <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{p.label}</span>
                <span className="tabular-nums font-semibold text-gray-800 dark:text-white/90">{nf.format(p.total)}</span>
                <span className="w-14 text-right tabular-nums text-gray-500 dark:text-gray-400">{pct(p.total, total)} %</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
