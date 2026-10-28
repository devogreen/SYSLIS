import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Timeline } from "primereact/timeline";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Statistiques } from "../../../backend/statistiques/Statistiques";
import { CARTE, SOUS_TITRE, TITRE, couleurStatut, fmtDateHeure, fmtDuree, libelle } from "./parcTpeUtils";

const statistiques = new Statistiques();

// Chronologie complète d'un TPE (recherche par numéro de série)
export default function TimelineTpeSection({ sn, setSn, couleurs, theme }) {
  const [saisie, setSaisie] = useState(sn || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toutAfficher, setToutAfficher] = useState(false);

  // Synchronise le champ quand le S/N est choisi depuis la liste
  useEffect(() => { setSaisie(sn || ""); }, [sn]);

  useEffect(() => {
    if (!sn) { setData(null); return; }
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await statistiques.getTimelineTpe(sn);
        if (!ignore) setData(res);
      } catch (e) {
        if (!ignore) { setData(null); setError(e?.message || "Impossible de charger la chronologie."); }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [sn]);

  const rechercher = (e) => {
    e.preventDefault();
    const v = saisie.trim();
    if (v) setSn(v);
  };

  // Les lignes qui répètent le statut précédent sont masquées par défaut
  const evenements = (data?.evenements || []).filter((ev) => toutAfficher || ev.est_changement);
  const nbMasques = (data?.evenements || []).length - (data?.evenements || []).filter((ev) => ev.est_changement).length;

  const marqueur = (ev) => (
    <span className="flex h-4 w-4 items-center justify-center rounded-full border-2"
      style={{ borderColor: theme.surface, background: ev.est_changement ? couleurStatut(couleurs, ev.statut_id, theme) : theme.autres, boxShadow: `0 0 0 1px ${theme.grid}` }} />
  );

  const contenu = (ev) => (
    <div className={`mb-4 ${ev.est_changement ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-800 dark:text-white/90">{libelle(ev.statut)}</span>
        {ev.en_cours && <Tag value="Statut actuel" severity="info" />}
        {!ev.est_changement && <span className="text-xs text-gray-500">(même statut)</span>}
      </div>
      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {ev.est_changement && <>Durée : <span className="tabular-nums">{fmtDuree(ev.duree_heures)}</span>{ev.en_cours ? " (en cours)" : ""} · </>}
        {libelle(ev.form_type)}{ev.form_id ? ` n° ${ev.form_id}` : ""} · {ev.utilisateur || "—"}
      </div>
    </div>
  );

  return (
    <section id="chronologie-tpe" className={CARTE}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={TITRE}>Chronologie d'un TPE</h2>
          <p className={SOUS_TITRE}>Tous les statuts par lesquels un TPE est passé, avec le temps passé dans chacun.</p>
        </div>
        <form onSubmit={rechercher} className="flex flex-wrap gap-2">
          <InputText value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Numéro de série" />
          <Button type="submit" icon="pi pi-search" label="Rechercher" size="small" disabled={!saisie.trim()} loading={loading} />
        </form>
      </div>

      {error && <Message className="w-full justify-start" severity="warn" text={error} />}

      {data && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-white/[0.02]">
            <span><span className="text-gray-500">S/N :</span> <span className="font-semibold text-gray-800 dark:text-white/90">{data.tpe.serial_number}</span></span>
            <span><span className="text-gray-500">Modèle :</span> {data.tpe.modele || "—"}</span>
            <span><span className="text-gray-500">Statut actuel :</span> {libelle(data.tpe.statut_actuel)}</span>
            <Link to={`/historique-tpe/${data.tpe.id}`} className="ml-auto text-brand-500 hover:underline">Historique détaillé</Link>
          </div>
          {nbMasques > 0 && (
            <button type="button" className="mb-3 text-xs text-gray-500 underline" onClick={() => setToutAfficher((v) => !v)}>
              {toutAfficher ? "Masquer" : "Afficher"} les {nbMasques} ligne(s) répétant le même statut
            </button>
          )}
          {evenements.length ? (
            <Timeline value={evenements} marker={marqueur} content={contenu}
              pt={{ opposite: { style: { flex: "0 0 auto", minWidth: 140 } } }}
              opposite={(ev) => <span className="whitespace-nowrap text-sm tabular-nums text-gray-500">{fmtDateHeure(ev.date)}</span>} />
          ) : (
            <div className="text-sm text-gray-500">Aucun historique pour ce TPE.</div>
          )}
        </>
      )}
    </section>
  );
}
