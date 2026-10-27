import { useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { CARTE, SOUS_TITRE, TITRE, couleurStatut, fmtDuree, libelle, nf } from "./parcTpeUtils";

// Temps passé dans chaque statut (passages commencés sur la période)
export default function DureesSection({ durees, loading, couleurs, theme, onSelectStatut }) {
  const maxMediane = useMemo(() => Math.max(0, ...(durees || []).map((d) => d.duree_mediane_h || 0)), [durees]);

  const statutBody = (d) => (
    <button type="button" onClick={() => onSelectStatut(d.id)} className="flex items-center gap-2 text-left hover:underline">
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: couleurStatut(couleurs, d.id, theme) }} />
      {libelle(d.statut)}
    </button>
  );

  // Médiane + petite barre proportionnelle (comparaison rapide entre statuts)
  const medianeBody = (d) => (
    <div className="flex items-center gap-2">
      <span className="w-20 whitespace-nowrap tabular-nums">{fmtDuree(d.duree_mediane_h)}</span>
      {d.duree_mediane_h !== null && maxMediane > 0 && (
        <span className="hidden h-2 w-24 overflow-hidden rounded bg-gray-100 sm:inline-block dark:bg-white/[0.06]">
          <span className="block h-full rounded" style={{ width: `${(d.duree_mediane_h / maxMediane) * 100}%`, background: couleurStatut(couleurs, d.id, theme) }} />
        </span>
      )}
    </div>
  );

  return (
    <section className={CARTE}>
      <div className="mb-4">
        <h2 className={TITRE}>Temps passé par statut</h2>
        <p className={SOUS_TITRE}>
          Passages dont l'entrée a eu lieu sur la période. Les durées (médiane, moyenne, max) portent sur les passages terminés ;
          l'ancienneté moyenne porte sur les TPE encore dans le statut.
        </p>
      </div>
      <div className="overflow-x-auto">
      <DataTable value={durees || []} loading={loading} size="small" stripedRows removableSort sortField="nb_passages" sortOrder={-1}
        emptyMessage="Aucun passage de statut sur la période." scrollable>
        <Column header="Statut" body={statutBody} sortable sortField="statut" />
        <Column field="nb_passages" header="Passages" sortable body={(d) => nf.format(d.nb_passages)} />
        <Column field="nb_termines" header="Terminés" sortable body={(d) => nf.format(d.nb_termines)} />
        <Column field="nb_en_cours" header="En cours" sortable body={(d) => nf.format(d.nb_en_cours)} />
        <Column field="duree_mediane_h" header="Durée médiane" sortable body={medianeBody} />
        <Column field="duree_moyenne_h" header="Durée moyenne" sortable body={(d) => fmtDuree(d.duree_moyenne_h)} />
        <Column field="duree_max_h" header="Durée max" sortable body={(d) => fmtDuree(d.duree_max_h)} />
        <Column field="anciennete_moyenne_en_cours_h" header="Ancienneté moy. (en cours)" sortable body={(d) => fmtDuree(d.anciennete_moyenne_en_cours_h)} />
      </DataTable>
      </div>
    </section>
  );
}
