import { useEffect, useState } from "react"
import { GestionTpe } from "../../backend/gestionTpe/GestionTpe"

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

import { Link } from "react-router";

import Input from "../form/input/InputField";
import Label from "../form/Label";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";
import { MultiSelect } from "primereact/multiselect";
import Checkbox from "../form/input/Checkbox";

import Swal from "sweetalert2";

export default function AllParcTpeList() {
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

    const parcData = new GestionTpe()

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateListeParc"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allParcFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();

    const [parcListe, setParcListe] = useState([])
    const [loadingData, setLoadingData] = useState(false)

    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");
    const [selectedStatus, setSelectedStatus] = useState(savedFilters?.selectedStatus || []);

    const [statuts, setStatuts] = useState([])

    const [datesCreation, setDatesCreation] = useState(
        savedFilters?.datesCreation
            ? savedFilters.datesCreation.map((d) => new Date(d))
            : null
    );
    const [datesUpdate, setDatesUpdate] = useState(
        savedFilters?.datesUpdate
            ? savedFilters.datesUpdate.map((d) => new Date(d))
            : null
    );

    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedStatus,
            datesCreation: datesCreation?.map(d => d?.toISOString()),
            datesUpdate: datesUpdate?.map(d => d?.toISOString()),
        });
    }, [globalFilter, selectedStatus, datesCreation, datesUpdate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const allTpe = await parcData.getParcTpe()
                setParcListe(allTpe)

                const statuts = await parcData.getAllStatut()
                const statutsOptions = statuts.map((item) => ({
                    value: item.id,
                    label: item.statut,
                }))
                setStatuts(statutsOptions)

            } catch (error) {
                console.log('Error fetching data ', error)
            } finally {
                setLoadingData(false);
            }
        }
        fetchData()
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationStateListeParc", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedStatus([]);
        setDatesCreation(null);
        setDatesUpdate(null);
        sessionStorage.removeItem(FILTERS_KEY);
    }

    // const formatDate = (date) => {
    //     const d = new Date(date);
    //     return d.toLocaleDateString('fr-FR'); // or use any locale you want
    // };

    const formatDate = (isoDate) => {
        const date = new Date(isoDate);
        return date.toLocaleString("fr-FR", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const snTemplate = (tpe) => {
        return (
            <div>
                <span className=''>{tpe.serial_number}</span>
            </div>
        )
    }

    const statutTemplate = (tpe) => {
        let statutClass = ''
        let statut = ''
        const statutTpe = tpe.statut_tpe.statut
        if (statutTpe == 'stock') {
            statut = 'stock';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-cyan-400'
        } else if (statutTpe == 'back_office') {
            statut = 'back office';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-blue-500'
        } else if (statutTpe == 'decom') {
            statut = 'décom';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-gray-500'
        } else if (statutTpe == 'parametrage') {
            statut = 'parametrage';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-green-500'
        } else if (statutTpe == 'rebut') {
            statut = 'rebut';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-red-500'
        } else if (statutTpe == 'back_office_livre') {
            statut = 'back office livré';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-blue-700'
        } else if (statutTpe == 'back_office_remplace') {
            statut = 'back office remplacé';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-blue-400'
        } else if (statutTpe == 'attente_decom') {
            statut = 'attente decom';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-gray-300'
        } else if (statutTpe == 'diagnostic') {
            statut = 'diagnostic';
            statutClass = 'text-center text-xs font-semibold rounded-xl text-orange-400'
        } else {
            statut = { statutTpe }
            statutClass = 'text-center text-xs font-semibol'
        }
        return (
            <div>
                <span className={statutClass}>{statut}</span>
            </div>
        )
    }

    const dateModificationTemplate = (tpe) => {
        return (
            <div className="">
                <span className="font-medium">{formatDate(tpe.last_modified_at)}</span>
            </div>
        )
    }

    const dateCreationTemplate = (tpe) => {
        return (
            <div className="">
                <span className="font-medium">{formatDate(tpe.created_at)}</span>
            </div>
        )
    }

    const actionTemplate = (tpe) => {
        const linkSee = `/historique-tpe/${tpe.id}`

        return (
            <>
                <div>
                    <span>
                        <Link to={linkSee}>
                            <button className="mx-1">
                                <i className="pi pi-eye" style={{ fontSize: '13px' }}></i>
                            </button>
                        </Link>
                    </span>
                    {/* {demande.statut == 'recue' ? (
                            <>
                                <span>
                                    {printingId === demande.id ? (
                                        <span className='mx-1'>
                                            <ProgressSpinner style={{ width: '15px', height: '15px' }} strokeWidth="8" animationDuration=".5s" />
                                        </span>
                                    ) : (
                                        <button onClick={() => handleGeneratePdf(demande.id)}><span className="mx-1 text-gray-500 text-theme-sm dark:text-gray-400"><i className="pi pi-print"></i></span></button>
                                    )}
                                </span>
                            </>
                        ) : (
                            <></>
                        )} */}
                </div>
            </>
        )
    }

    const filteredTpe = parcListe.filter((item) => {
        const matchesStatus = selectedStatus.length > 0 ? selectedStatus.includes(item.statut_id) : true;
        // const matchesDatesDecom = datesDecom ? (datesDecom[0] <= dateDecom && nextDayDecom >= dateDecom) : true;
        // const matchesDatesReception = datesReception ? (datesReception[0] <= dateReception && nextDayReception >= dateReception) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesStatus && matchesGlobalFilter;
    })

    const total = filteredTpe.length

    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="p-6 space-y-7">
                    <div className="flex items-center">
                        <div className="relative w-full">
                            <Input
                                className="pl-10"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                placeholder="Rechercher parmis les TPE..."
                            />
                            <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                        </div>
                        <span className="pl-4">
                            <button onClick={handleClearFilters}>
                                <i className="pi pi-refresh"></i>
                            </button>
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pb-0">
                        <MultiSelect
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.value)}
                            options={statuts}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par statut"
                            className=""
                        />
                    </div>
                    <div className="flex justify-normal flex-wrap gap-3">
                        <div>
                            <Label>Dates Création</Label>
                            <Calendar
                                value={datesCreation}
                                onChange={(e) => {
                                    setDatesCreation(e.value)
                                }}
                                selectionMode="range"
                                readOnlyInput
                                hideOnRangeSelection
                                locale="fr"
                                dateFormat="dd/mm/yy"
                                placeholder="jj/mm/aaaa - jj/mm/aaaa"
                            />
                        </div>
                        <div>
                            <Label>Dates Update</Label>
                            <Calendar
                                value={datesUpdate}
                                onChange={(e) => {
                                    setDatesUpdate(e.value)
                                }}
                                selectionMode="range"
                                readOnlyInput
                                hideOnRangeSelection
                                locale="fr"
                                dateFormat="dd/mm/yy"
                                placeholder="jj/mm/aaaa - jj/mm/aaaa"
                            />
                        </div>
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-between">
                    <div className="flex space-x-3 items-center">
                        <span className="text-xs text-gray-700 font-semibold dark:text-gray-300">
                            {total} TPE(s)
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredTpe}
                        loading={loadingData}
                        removableSort
                        paginator
                        rows={rows}
                        first={first}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                        tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                        emptyMessage="Aucun TPE trouvé"
                        className="p-datatable-sm">

                        <Column field="id" header="ID" sortable></Column>
                        <Column field="serial_number" header="S/N" body={snTemplate} sortable></Column>
                        <Column field="statut_id" header="Statut" body={statutTemplate} sortable></Column>
                        <Column field="last_modified_at" header="Dernière Modification" body={dateModificationTemplate} sortable></Column>
                        <Column field="created_at" header="Date Création" body={dateCreationTemplate} sortable></Column>
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}