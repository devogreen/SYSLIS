import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Statistiques } from "../../../backend/statistiques/Statistiques";
import { useTheme } from "../../../context/ThemeContext";
import EtatParcSection from "./EtatParcSection";
import FluxSection from "./FluxSection";
import ListeTpeSection from "./ListeTpeSection";
import ParcoursSection from "./ParcoursSection";
import DureesSection from "./DureesSection";
import TimelineTpeSection from "./TimelineTpeSection";
import {
  CARTE, GRANULARITES, LABEL,
  borner, chartTheme, construireCouleurs, periodeParDefaut, periodeVersDates, toISO,
} from "./parcTpeUtils";

// Instance du service d'API
const statistiques = new Statistiques();

const defiler = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

// =====================================================================
//  Dashboard Statistiques Parc TPE
// =====================================================================
export default function StatsParcTpe() {
  const { theme: modeTheme } = useTheme();
  const theme = useMemo(() => chartTheme(modeTheme === "dark"), [modeTheme]);

  // ---- Filtres globaux ----
  const [modeles, setModeles] = useState([]);
  const [modelId, setModelId] = useState(null);
  const [periode, setPeriode] = useState(periodeParDefaut);     // [from, to] appliquée
  const [saisiePeriode, setSaisiePeriode] = useState(periode);  // valeur du Calendar (peut être incomplète)
  const [granularity, setGranularity] = useState("month");

  // ---- État du parc ----
  const [vueEtat, setVueEtat] = useState("actuel");
  const [dateEtat, setDateEtat] = useState(() => new Date());
  const [repartition, setRepartition] = useState(null);
  const [loadingRep, setLoadingRep] = useState(false);
  const [couleurs, setCouleurs] = useState(() => new Map());

  // ---- Flux / durées ----
  const [flux, setFlux] = useState(null);
  const [loadingFlux, setLoadingFlux] = useState(false);
  const [durees, setDurees] = useState([]);
  const [loadingDurees, setLoadingDurees] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const setErreur = useCallback((cle, msg) => setErreurs((e) => ({ ...e, [cle]: msg })), []);

  // ---- Liste & chronologie ----
  const [selection, setSelection] = useState({ statutId: null, mode: "actuel", from: null, to: null, date: null });
  const [timelineSn, setTimelineSn] = useState(null);

  const [from, to] = periode || [];
  const periodeParams = useCallback(
    () => ({ from: toISO(from), to: toISO(to), modelId: modelId || undefined }),
    [from, to, modelId]
  );

  // Modèles + correspondance couleur <-> statut (une seule fois, parc complet)
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      try {
        const [mods, rep] = await Promise.all([
          statistiques.getModelesParcTpe(),
          statistiques.getRepartitionParcTpe({}),
        ]);
        if (ignore) return;
        setModeles(Array.isArray(mods) ? mods : []);
        setCouleurs(construireCouleurs(rep?.statuts));
      } catch {
        // non bloquant : les graphiques passent en gris "Autres"
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, []);

  // Répartition (actuelle ou à une date)
  useEffect(() => {
    if (vueEtat === "date" && !dateEtat) return;
    let ignore = false;
    const fetchData = async () => {
      setLoadingRep(true);
      setErreur("rep", null);
      try {
        const params = { modelId: modelId || undefined };
        if (vueEtat === "date") params.date = toISO(dateEtat);
        const data = await statistiques.getRepartitionParcTpe(params);
        if (!ignore) setRepartition(data);
      } catch {
        if (!ignore) { setRepartition(null); setErreur("rep", "Impossible de charger la répartition du parc."); }
      } finally {
        if (!ignore) setLoadingRep(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [vueEtat, dateEtat, modelId, setErreur]);

  // Flux par période
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoadingFlux(true);
      setErreur("flux", null);
      try {
        const data = await statistiques.getFluxParcTpe({ ...periodeParams(), granularity });
        if (!ignore) setFlux(data);
      } catch {
        if (!ignore) { setFlux(null); setErreur("flux", "Impossible de charger les flux de statuts."); }
      } finally {
        if (!ignore) setLoadingFlux(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [periodeParams, granularity, setErreur]);

  // Durées par statut
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoadingDurees(true);
      setErreur("durees", null);
      try {
        const data = await statistiques.getDureesParcTpe(periodeParams());
        if (!ignore) setDurees(Array.isArray(data) ? data : []);
      } catch {
        if (!ignore) { setDurees([]); setErreur("durees", "Impossible de charger les durées par statut."); }
      } finally {
        if (!ignore) setLoadingDurees(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [periodeParams, setErreur]);

  // ---- Interactions entre sections ----
  const ouvrirListe = useCallback((sel) => {
    setSelection(sel);
    defiler("liste-tpe");
  }, []);

  const selectStatutEtat = useCallback((statutId) => {
    ouvrirListe(vueEtat === "actuel"
      ? { statutId, mode: "actuel", from, to, date: null }
      : { statutId, mode: "date", from, to, date: dateEtat });
  }, [ouvrirListe, vueEtat, from, to, dateEtat]);

  const selectStatutPeriode = useCallback((statutId) => {
    ouvrirListe({ statutId, mode: "entree", from, to, date: null });
  }, [ouvrirListe, from, to]);

  const selectBucket = useCallback((statutId, periodKey) => {
    const [a, b] = borner(periodeVersDates(periodKey, granularity), [from, to]);
    ouvrirListe({ statutId, mode: "entree", from: a, to: b, date: null });
  }, [ouvrirListe, granularity, from, to]);

  const voirTimeline = useCallback((sn) => {
    setTimelineSn(sn);
    defiler("chronologie-tpe");
  }, []);

  const changerPeriode = (value) => {
    setSaisiePeriode(value);
    const [a, b] = value || [];
    if (!value || (a && b)) setPeriode(value ? [a, b] : null); // n'applique qu'une plage complète ou effacée
  };

  const reinitialiser = () => {
    const p = periodeParDefaut();
    setModelId(null);
    setPeriode(p);
    setSaisiePeriode(p);
    setGranularity("month");
    setErreurs({});
  };

  const statuts = flux?.statuts || [];

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Statistiques du parc TPE</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          État actuel du parc, passages par les statuts sur une période, parcours de statuts, temps passé dans chaque statut et chronologie d'un TPE.
        </p>
      </div>

      {/* Filtres */}
      <div className={`${CARTE} flex flex-wrap items-end gap-4`}>
        <label className={LABEL}>
          Modèle
          <Dropdown value={modelId} onChange={(e) => setModelId(e.value)} options={modeles} optionLabel="nom" optionValue="id"
            placeholder="Tous les modèles" showClear style={{ minWidth: 200 }} />
        </label>
        <label className={LABEL}>
          Période (flux, durées)
          <Calendar value={saisiePeriode} onChange={(e) => changerPeriode(e.value)} selectionMode="range" readOnlyInput
            dateFormat="dd/mm/yy" placeholder="Toutes les dates" showButtonBar maxDate={new Date()} />
        </label>
        <label className={LABEL}>
          Regroupement
          <SelectButton value={granularity} onChange={(e) => e.value && setGranularity(e.value)} options={GRANULARITES} />
        </label>
        <Button label="Réinitialiser" text onClick={reinitialiser} className="ml-auto" />
      </div>

      {Object.values(erreurs).filter(Boolean).map((msg) => (
        <Message key={msg} severity="error" text={msg} className="w-full justify-start" />
      ))}

      <EtatParcSection repartition={repartition} loading={loadingRep} couleurs={couleurs} theme={theme}
        vue={vueEtat} setVue={setVueEtat} dateEtat={dateEtat} setDateEtat={setDateEtat}
        onSelectStatut={selectStatutEtat} />

      <FluxSection flux={flux} loading={loadingFlux} granularity={granularity} couleurs={couleurs} theme={theme}
        onSelectBucket={selectBucket} onSelectStatut={selectStatutPeriode} />

      <ListeTpeSection statuts={statuts} selection={selection} setSelection={setSelection} modelId={modelId}
        couleurs={couleurs} theme={theme} onVoirTimeline={voirTimeline} />

      <ParcoursSection statuts={statuts} periode={periode} modelId={modelId}
        couleurs={couleurs} theme={theme} onVoirTimeline={voirTimeline} />

      <DureesSection durees={durees} loading={loadingDurees} couleurs={couleurs} theme={theme}
        onSelectStatut={selectStatutPeriode} />

      <TimelineTpeSection sn={timelineSn} setSn={setTimelineSn} couleurs={couleurs} theme={theme} />
    </div>
  );
}
