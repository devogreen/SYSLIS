import { useEffect, useState } from "react"

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Link } from "react-router";

import Input from "../form/input/InputField";
import Label from "../form/Label";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";
import { MultiSelect } from "primereact/multiselect";
import Checkbox from "../form/input/Checkbox";
import { Decom } from "../../backend/decom/Decom";

addLocale('fr', {
    firstDayOfWeek: 1,
    showMonthAfterYear: false,
    dayNames: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    dayNamesShort: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
    dayNamesMin: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
    monthNames: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    monthNamesShort: ['janv', 'févr', 'mars', 'avril', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
    today: 'Aujourd\'hui',
    clear: 'Effacer'
});

const STATUTS = {
    en_reparation: { label: 'en réparation', className: 'bg-warning-100 text-warning-300' },
    valide: { label: 'validé', className: 'bg-green-100 text-green-500' },
    livre: { label: 'livré', className: 'bg-blue-100 text-blue-300' },
    annule: { label: 'annulé', className: 'bg-black text-white' },
}

const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR')

const derniereValidation = (lot) => lot.validation_reparation_tpe.at(-1)

export default function AllReparationTpeList() {
    const decomData = new Decom()

    const PAGINATION_KEY = "paginationStateReparationTpe"
    const FILTERS_KEY = "allReparationTpeFilters"

    const lireSession = (cle) => {
        try {
            const valeur = sessionStorage.getItem(cle)
            return valeur ? JSON.parse(valeur) : null
        } catch (e) {
            return null
        }
    }
    const savedPagination = lireSession(PAGINATION_KEY)
    const savedFilters = lireSession(FILTERS_KEY)

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 10);

    const [livraisonList, setLivraisonList] = useState([])
    const [loading, setLoading] = useState(false);
    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");
    const [selectedStatus, setSelectedStatus] = useState(savedFilters?.selectedStatus || []);
    const [isDepuisDecom, setIsDepuisDecom] = useState(savedFilters?.isDepuisDecom || false)
    const [datesLivraison, setDatesLivraison] = useState(
        savedFilters?.datesLivraison ? savedFilters.datesLivraison.map((d) => new Date(d)) : null
    );

    const statusOptions = Object.entries(STATUTS).map(([value, s]) => ({ label: s.label, value }))

    useEffect(() => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
            globalFilter,
            selectedStatus,
            isDepuisDecom,
            datesLivraison: datesLivraison?.map(d => d?.toISOString()),
        }));
    }, [globalFilter, selectedStatus, isDepuisDecom, datesLivraison]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const lots = await decomData.getAllReparationTpe()
                setLivraisonList(lots.filter((item) => item.forms.is_deleted == false))
            } catch (error) {
                console.log('Erreur de chargement des lots de réparation : ', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem(PAGINATION_KEY, JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedStatus([]);
        setIsDepuisDecom(false);
        setDatesLivraison(null);
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const statutTemplate = (livraison) => {
        const statut = STATUTS[livraison.statut] || { label: livraison.statut, className: '' }
        return (
            <Link to={`/reparation-tpe-details/${livraison.id}`}>
                <span className={`grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 ${statut.className}`}>{statut.label}</span>
            </Link>
        )
    }
    const decomTemplate = (livraison) => livraison.decom_id ? (
        <Link to={`/decom-details/${livraison.decom_id}`} className="text-blue-500 underline">#{livraison.decom_id}</Link>
    ) : (
        <span>-</span>
    )
    const quantiteValideTemplate = (lot) => {
        const validation = derniereValidation(lot)
        return <span>{validation ? validation.quantite : 'N/A'}</span>
    }
    const dateLivraisonTemplate = (livraison) => (
        <span className="font-medium">{formatDate(livraison.forms.created_at)}</span>
    )
    const dateValidationTemplate = (lot) => {
        const validation = derniereValidation(lot)
        return <span className="font-medium">{validation ? formatDate(validation.forms.last_modified_at) : 'N/A'}</span>
    }
    const livraisonTemplate = (lot) => lot.livraison ? (
        <Link to={`/livraison-reparation-details/${lot.livraison.id}`} className="text-blue-500 underline">#{lot.livraison.id}</Link>
    ) : (
        <span>-</span>
    )
    const actionTemplate = (livraison) => (
        <Link to={`/reparation-tpe-details/${livraison.id}`}>
            <button className="mx-1">
                <i className="pi pi-eye" style={{ fontSize: '13px' }}></i>
            </button>
        </Link>
    )

    const filteredLivraisons = livraisonList.filter((item) => {
        const dateLivraison = new Date(item.forms.created_at);
        const finPeriode = datesLivraison?.[1] ? new Date(datesLivraison[1]) : null;
        finPeriode?.setDate(finPeriode.getDate() + 1);

        const matchesStatus = selectedStatus.length > 0 ? selectedStatus.includes(item.statut) : true;
        const matchesDecom = isDepuisDecom ? Boolean(item.decom_id) : true;
        const matchesDates = datesLivraison?.[0] && finPeriode ? (datesLivraison[0] <= dateLivraison && finPeriode >= dateLivraison) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesStatus && matchesDecom && matchesDates && matchesGlobalFilter;
    });

    const totalTPE = filteredLivraisons.reduce((sum, item) => sum + Number(item.quantite || 0), 0);

    return (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="p-6 space-y-7">
                <div className="flex items-center">
                    <div className="relative w-full">
                        <Input
                            className="pl-10"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder="Rechercher parmi les lots (S/N, marchand...)"
                        />
                        <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                    </div>
                    <span className="pl-4">
                        <button onClick={handleClearFilters}>
                            <i className="pi pi-refresh"></i>
                        </button>
                    </span>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                    <MultiSelect
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.value)}
                        options={statusOptions}
                        display="chip"
                        optionLabel="label"
                        maxSelectedLabels={2}
                        placeholder="Filtrer par statut"
                    />
                    <div>
                        <Label>Dates de mise en réparation</Label>
                        <Calendar
                            value={datesLivraison}
                            onChange={(e) => setDatesLivraison(e.value)}
                            selectionMode="range"
                            readOnlyInput
                            hideOnRangeSelection
                            locale="fr"
                            dateFormat="dd/mm/yy"
                            placeholder="jj/mm/aaaa - jj/mm/aaaa"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Checkbox
                        checked={isDepuisDecom}
                        onChange={() => setIsDepuisDecom(!isDepuisDecom)}
                        label="Lots issus d'un décom" />
                </div>
            </div>
            <div className="p-6 pt-0 flex space-x-3 items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                    {filteredLivraisons.length} lot(s) trouvé(s)
                </span>
                <span className="text-xs text-gray-700 font-semibold dark:text-gray-300">
                    {totalTPE} TPE(s)
                </span>
            </div>
            <div className="card">
                <DataTable
                    value={filteredLivraisons}
                    loading={loading}
                    removableSort
                    paginator
                    rows={rows}
                    first={first}
                    onPage={handlePageChange}
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                    emptyMessage="Aucun lot de réparation trouvé"
                    className="p-datatable-sm">
                    <Column field="id" header="ID" sortable></Column>
                    <Column field="statut" header="Statut" body={statutTemplate} sortable></Column>
                    <Column header="Décom" body={decomTemplate}></Column>
                    <Column field="quantite" header="Quantité" sortable></Column>
                    <Column header="Validé(s)" body={quantiteValideTemplate}></Column>
                    <Column field="forms.created_at" header="Date Réparation" body={dateLivraisonTemplate} sortable></Column>
                    <Column header="Date Validation" body={dateValidationTemplate}></Column>
                    <Column header="Livraison" body={livraisonTemplate}></Column>
                    <Column header="Actions" body={actionTemplate}></Column>
                </DataTable>
            </div>
        </div>
    )
}
