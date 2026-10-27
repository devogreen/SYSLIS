import { useMemo } from "react";
import { Chart } from "primereact/chart";
import {
  AUTRES_ID, CARTE, SOUS_TITRE, TITRE,
  couleurStatut, libelle, nf, periodLabel,
} from "./parcTpeUtils";

// Flux : nombre de TPE entrés dans chaque statut, par période (barres empilées)
export default function FluxSection({ flux, loading, granularity, couleurs, theme, onSelectBucket, onSelectStatut }) {
  const series = useMemo(() => flux?.series || [], [flux]);
  const nomStatut = useMemo(() => new Map((flux?.statuts || []).map((s) => [s.id, s.statut])), [flux]);

  // Tous les statuts ayant au moins une entrée sur la période
  const totaux = useMemo(
    () => Object.entries(flux?.totaux || {})
      .map(([id, n]) => ({ id: Number(id), statut: nomStatut.get(Number(id)), total: n }))
      .sort((a, b) => b.total - a.total),
    [flux, nomStatut]
  );

  const datasets = useMemo(() => {
    const colores = totaux.filter((s) => couleurs.has(s.id)).sort((a, b) => couleurs.get(a.id) - couleurs.get(b.id));
    const autres = new Set(totaux.filter((s) => !couleurs.has(s.id)).map((s) => s.id));
    const ds = colores.map((s) => ({
      statutId: s.id,
      label: libelle(s.statut),
      backgroundColor: couleurStatut(couleurs, s.id, theme),
      data: series.map((p) => p.counts[s.id] || 0),
    }));
    if (autres.size) {
      ds.push({
        statutId: AUTRES_ID,
        label: "Autres",
        backgroundColor: theme.autres,
        data: series.map((p) => [...autres].reduce((a, id) => a + (p.counts[id] || 0), 0)),
      });
    }
    return ds.map((d) => ({ ...d, stack: "flux", borderColor: theme.surface, borderWidth: 1, maxBarThickness: 46 }));
  }, [totaux, couleurs, theme, series]);

  const chartData = useMemo(() => ({
    labels: series.map((s) => periodLabel(s.period, granularity)),
    datasets,
  }), [series, granularity, datasets]);

  const chartOptions = useMemo(() => ({
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: true },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, color: theme.text } },
      tooltip: {
        callbacks: {
          label: (i) => `${i.dataset.label} : ${nf.format(i.parsed.y)} TPE`,
          footer: () => "Cliquez pour voir la liste",
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: theme.text } },
      y: { stacked: true, beginAtZero: true, grid: { color: theme.grid }, ticks: { color: theme.text, precision: 0 } },
    },
    onClick: (_evt, elements) => {
      const el = elements?.[0];
      if (!el) return;
      const ds = datasets[el.datasetIndex];
      const periode = series[el.index]?.period;
      if (ds && ds.statutId !== AUTRES_ID && periode) onSelectBucket(ds.statutId, periode);
    },
    onHover: (evt, elements) => {
      const ds = datasets[elements?.[0]?.datasetIndex];
      if (evt?.native?.target) evt.native.target.style.cursor = ds && ds.statutId !== AUTRES_ID ? "pointer" : "default";
    },
  }), [theme, datasets, series, onSelectBucket]);

  return (
    <section className={CARTE}>
      <div className="mb-4">
        <h2 className={TITRE}>Entrées dans les statuts sur la période</h2>
        <p className={SOUS_TITRE}>
          Nombre de TPE distincts entrés dans chaque statut, par période. Cliquez sur une barre pour lister les TPE concernés.
        </p>
      </div>

      <div className="h-[360px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Chargement…</div>
        ) : series.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Aucun changement de statut sur la période sélectionnée.</div>
        ) : (
          <Chart type="bar" data={chartData} options={chartOptions} style={{ height: "360px" }} />
        )}
      </div>

      {totaux.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Total sur la période (TPE distincts)</div>
          <div className="flex flex-wrap gap-2">
            {totaux.map((s) => (
              <button key={s.id} type="button" onClick={() => onSelectStatut(s.id)}
                className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: couleurStatut(couleurs, s.id, theme) }} />
                {libelle(s.statut)}
                <span className="font-semibold tabular-nums text-gray-800 dark:text-white/90">{nf.format(s.total)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
