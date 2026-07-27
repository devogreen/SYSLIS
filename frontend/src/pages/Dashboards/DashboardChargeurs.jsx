import { useState, useEffect, useMemo, useCallback } from "react";
import { Chart } from "primereact/chart";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";
import { Statistiques } from "../../backend/statistiques/Statistiques";

// Instance du service d'API
const statistiques = new Statistiques();

// =====================================================================
//  Constantes
// =====================================================================
const COLORS = {
  sell: "#0F9D63",   // Livraison chargeur (standard)
  decom: "#158B87",  // Livraison chargeur (décom)
  stock: "#E0A82E",  // Mouvement de stock
  ink: "#14251E",
  muted: "#6B7B72",
  border: "#E3E8E4",
  grid: "#EDF1ED",
};

const CHANNELS = [
  { key: "livraison_chargeur", label: "Livraison chargeur", short: "Livraison", color: COLORS.sell },
  { key: "livraison_decom", label: "Livraison chargeur (décom)", short: "Décom", color: COLORS.decom },
  { key: "stock", label: "Mouvement de stock", short: "Stock", color: COLORS.stock },
];

const nf = new Intl.NumberFormat("fr-FR");
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : undefined);
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—");

const periodLabel = (key, g) => {
  if (!key) return "";
  if (g === "day") { const [, m, day] = key.split("-"); return `${day}/${m}`; }
  if (g === "week") return key.split("-")[1];
  const [y, m] = key.split("-"); return `${MOIS[Number(m) - 1]} ${y.slice(2)}`;
};

const GRANULARITES = [
  { label: "Jour", value: "day" },
  { label: "Semaine", value: "week" },
  { label: "Mois", value: "month" },
];
const SOURCES = [
  { label: "Livraisons", value: "livraison" },
  { label: "Mouvements de stock", value: "stock" },
];

// =====================================================================
//  Dashboard
// =====================================================================
export default function ChargerWithdrawalsDashboard() {
  const [granularity, setGranularity] = useState("month");
  const [dates, setDates] = useState(null); // [from, to] (Calendar range)
  const [origine, setOrigine] = useState(null);
  const [destination, setDestination] = useState(null);

  const [serviceOptions, setServiceOptions] = useState({ origines: [], destinations: [] });
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [drillSource, setDrillSource] = useState("livraison");
  const [drillRows, setDrillRows] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // Construit l'objet de query params (axios ignore les undefined)
  const buildParams = useCallback((extra = {}) => {
    const [start, end] = dates || [];
    const p = { ...extra };
    if (start) p.from = toISO(start);
    if (end) p.to = toISO(end);
    Object.keys(p).forEach((k) => (p[k] == null || p[k] === "") && delete p[k]);
    return p;
  }, [dates]);

  // Options de services (une fois)
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      try {
        const data = await statistiques.getChargerMovementServiceOptions();
        if (!ignore) setServiceOptions(data || { origines: [], destinations: [] });
      } catch (e) {
        // options non bloquantes
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, []);

  // Série temporelle
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = buildParams({ granularity, serviceOrigine: origine, serviceDestination: destination });
        const data = await statistiques.getChargerWithdrawalsTimeSeries(params);
        if (!ignore) setSeries(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setError("Impossible de charger les sorties de chargeurs.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [granularity, dates, origine, destination, buildParams]);

  // Drill-down (liste selon la source)
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setDrillLoading(true);
      try {
        const data = drillSource === "livraison"
          ? await statistiques.getChargerLivraisonWithdrawals(buildParams())
          : await statistiques.getChargerStockWithdrawals(buildParams({ serviceOrigine: origine, serviceDestination: destination }));
        if (!ignore) setDrillRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setDrillRows([]);
      } finally {
        if (!ignore) setDrillLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [drillSource, dates, origine, destination, buildParams]);

  // Totaux
  const totals = useMemo(
    () => series.reduce((a, s) => ({
      livraison_chargeur: a.livraison_chargeur + (s.livraison_chargeur || 0),
      livraison_decom: a.livraison_decom + (s.livraison_decom || 0),
      stock: a.stock + (s.stock || 0),
      total: a.total + (s.total || 0),
    }), { livraison_chargeur: 0, livraison_decom: 0, stock: 0, total: 0 }),
    [series]
  );
  const pct = (v) => (totals.total ? (v / totals.total) * 100 : 0);

  // Chart.js
  const chartData = useMemo(() => ({
    labels: series.map((s) => periodLabel(s.period, granularity)),
    datasets: CHANNELS.map((c) => ({
      label: c.label,
      backgroundColor: c.color,
      data: series.map((s) => s[c.key] || 0),
      stack: "sorties",
      borderRadius: c.key === "stock" ? 4 : 0,
      maxBarThickness: 46,
    })),
  }), [series, granularity]);

  const chartOptions = useMemo(() => ({
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, color: COLORS.muted } },
      tooltip: {
        callbacks: {
          label: (i) => `${i.dataset.label} : ${nf.format(i.parsed.y)}`,
          footer: (items) => `Total : ${nf.format(items.reduce((a, i) => a + i.parsed.y, 0))}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: COLORS.muted } },
      y: { stacked: true, beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.muted, precision: 0 } },
    },
  }), []);

  const resetFilters = () => { setDates(null); setOrigine(null); setDestination(null); };
  const serviceActive = origine || destination;

  const origineOptions = serviceOptions.origines || [];
  const destinationOptions = serviceOptions.destinations || [];

  // Templates DataTable
  const typeTag = (row) => {
    const nom = row.type_livraison_commerciale?.nom_type_livraison || "—";
    const decom = nom.toUpperCase().includes("DECOM");
    return <Tag value={nom} style={{ background: decom ? COLORS.decom : COLORS.sell, color: "#fff" }} />;
  };
  const statutTag = (row) => <Tag value={row.statut_livraison} severity={row.statut_livraison === "livre" ? "success" : "warning"} />;

  return (
    <div style={{ padding: 24, color: COLORS.ink }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Sorties de chargeurs</h1>
            <p style={{ margin: "6px 0 0", color: COLORS.muted, fontSize: 14 }}>
              Chargeurs sortis par canal — livraison (standard / décom) et mouvement de stock.
            </p>
          </div>
          <SelectButton value={granularity} onChange={(e) => e.value && setGranularity(e.value)} options={GRANULARITES} />
        </div>

        {/* Filtres */}
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: COLORS.muted }}>
            Période
            <Calendar value={dates} onChange={(e) => setDates(e.value)} selectionMode="range" readOnlyInput
              dateFormat="dd/mm/yy" placeholder="Toutes les dates" showButtonBar />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: COLORS.muted }}>
            Service origine
            <Dropdown value={origine} onChange={(e) => setOrigine(e.value)} options={origineOptions}
              optionLabel="nom" optionValue="id" placeholder="Tous" showClear style={{ minWidth: 180 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: COLORS.muted }}>
            Service destination
            <Dropdown value={destination} onChange={(e) => setDestination(e.value)} options={destinationOptions}
              optionLabel="nom" optionValue="id" placeholder="Tous" showClear style={{ minWidth: 180 }} />
          </label>
          <Button label="Réinitialiser" text onClick={resetFilters} style={{ marginLeft: "auto" }} />
          {serviceActive ? (
            <div style={{ flexBasis: "100%" }}>
              <Message severity="warn" text="Les filtres de service s'appliquent uniquement au mouvement de stock." />
            </div>
          ) : null}
        </div>

        {error ? <Message severity="error" text={error} /> : null}

        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
          {[
            { label: "Total sorties", value: totals.total, dot: null },
            { label: "Livraison chargeur", value: totals.livraison_chargeur, dot: COLORS.sell },
            { label: "Livr. chargeur (décom)", value: totals.livraison_decom, dot: COLORS.decom },
            { label: "Mouvement de stock", value: totals.stock, dot: COLORS.stock },
          ].map((k) => (
            <div key={k.label} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.muted, fontSize: 13 }}>
                {k.dot && <span style={{ width: 9, height: 9, borderRadius: 3, background: k.dot }} />}
                {k.label}
              </div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                {nf.format(k.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Barre de composition */}
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 10, fontSize: 13 }}>
            {CHANNELS.map((c) => (
              <span key={c.key} style={{ color: c.color, fontWeight: 600 }}>{c.short} {Math.round(pct(totals[c.key]))}%</span>
            ))}
          </div>
          <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: COLORS.grid }}>
            {CHANNELS.map((c) => <div key={c.key} style={{ width: `${pct(totals[c.key])}%`, background: c.color }} />)}
          </div>
        </div>

        {/* Graphique */}
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 18 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Quantité de chargeurs sortis</h2>
          {loading ? (
            <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>Chargement…</div>
          ) : series.length === 0 ? (
            <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>Aucune sortie sur la période sélectionnée.</div>
          ) : (
            <Chart type="bar" data={chartData} options={chartOptions} style={{ height: "360px" }} />
          )}
        </div>

        {/* Drill-down */}
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Détail des sorties</h2>
            <SelectButton value={drillSource} onChange={(e) => e.value && setDrillSource(e.value)} options={SOURCES} style={{ marginLeft: "auto" }} />
          </div>

          {drillSource === "livraison" ? (
            <DataTable value={drillRows} loading={drillLoading} paginator rows={10} rowsPerPageOptions={[10, 25, 50]}
              emptyMessage="Aucune livraison de chargeur." size="small" stripedRows>
              <Column field="id_livraison" header="N°" style={{ width: 80 }} sortable />
              <Column header="Date" body={(r) => fmtDate(r.date_livraison)} sortable sortField="date_livraison" />
              <Column header="Type" body={typeTag} />
              <Column field="qte_totale_livraison" header="Quantité" sortable />
              <Column header="Statut" body={statutTag} />
              <Column header="Service" body={(r) => r.services?.nom_service || "—"} />
            </DataTable>
          ) : (
            <DataTable value={drillRows} loading={drillLoading} paginator rows={10} rowsPerPageOptions={[10, 25, 50]}
              emptyMessage="Aucun mouvement de stock de chargeur." size="small" stripedRows>
              <Column field="id" header="N°" style={{ width: 80 }} sortable />
              <Column header="Date" body={(r) => fmtDate(r.created_at)} sortable sortField="created_at" />
              <Column field="quantite" header="Quantité" sortable />
              <Column header="Origine" body={(r) => r.services_mouvement_stock_service_origineToservices?.nom_service || r.origine || "—"} />
              <Column header="Destination" body={(r) => r.services_mouvement_stock_service_destinationToservices?.nom_service || r.destination || "—"} />
              <Column field="motif" header="Motif" />
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
}