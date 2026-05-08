import { useEffect, useState } from "react"
import { Decom } from "../../backend/decom/decom"

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

export default function AllDecomList() {

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

    const decomData = new Decom()

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateDecom"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allDecomsFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();


    const [decomList, setDecomList] = useState([])
    const [loading, setLoading] = useState(false);
    const [printingId, setPrintingId] = useState(null);
    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");
    const [selectedStatus, setSelectedStatus] = useState(savedFilters?.selectedStatus || []);
    const statusOptions = [
        { label: 'En cours', value: 'en_cours' },
        { label: 'Retourné', value: 'retourne' },
        { label: 'En vérification', value: 'recu' },
        { label: 'Clos', value: 'clos' },
    ];
    const [isReg, setIsReg] = useState(savedFilters?.isReg || false)
    const [datesDecom, setDatesDecom] = useState(
        savedFilters?.datesDecom
            ? savedFilters.datesDecom.map((d) => new Date(d))
            : null
    );
    const [datesReception, setDatesReception] = useState(
        savedFilters?.datesReception
            ? savedFilters.datesReception.map((d) => new Date(d))
            : null
    );

    const [isNotReg, setIsNotReg] = useState(savedFilters?.isNotReg || false)

    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedStatus,
            isReg,
            isNotReg,
            datesDecom: datesDecom?.map(d => d?.toISOString()),
            datesReception: datesReception?.map(d => d?.toISOString()),
        });
    }, [globalFilter, selectedStatus, isReg, isNotReg, datesDecom, datesReception]);

    useEffect(() => {
        const fetchData = async () => {
            const AllDecoms = await decomData.getAllDecoms()
            const decoms = AllDecoms.filter((item) => {
                return item.forms.is_deleted == false
            })
            setDecomList(decoms)
        }
        fetchData()
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationStateDecom", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedStatus([]);
        setIsReg(false);
        setIsNotReg(false);
        setDatesDecom(null);
        setDatesReception(null);
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    const statutTemplate = (decom) => {
        let statutClass = ''
        let statut = ''
        if (decom.statut == 'en_cours') {
            statut = 'en cours'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-warning-100 text-warning-300'
        } else if (decom.statut == 'recu') {
            statut = 'en vérification'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-blue-100 text-blue-300'
        } else if (decom.statut == 'retourne') {
            statut = 'retourné'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-red-100 text-red-300'
        } else if (decom.statut == 'clos') {
            statut = 'clos'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-gray-100 text-gray-400'
        }
        return (
            <div>
                <span className={statutClass}>{statut}</span>
            </div>
        )
    }
    const dateDecomTemplate = (decom) => {
        return (
            <div className="">
                <span className="font-medium">{formatDate(decom.forms.last_modified_at)}</span>
            </div>
        )
    }
    const dateReceptionTemplate = (decom) => {
        const index = decom.reception_decom.length - 1
        const reception = decom.reception_decom[index]
        const dateValue = reception && decom.statut != 'en_cours' ? formatDate(reception.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const dateVerificationTemplate = (decom) => {
        const index = decom.retour_decom.length - 1
        const retour = decom.retour_decom[index]
        const dateValue = retour && decom.statut != 'en_cours' ? formatDate(retour.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const dateClotureTemplate = (decom) => {
        const index = decom.retour_decom.length - 1
        const retour = decom.retour_decom[index]
        const dateValue = retour && decom.statut == 'clos' ? formatDate(retour.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const actionTemplate = (decom) => {
        const linkSee = `/decom-details/${decom.id}`

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
                    {/* {decom.statut == 'recue' ? (
                        <>
                            <span>
                                {printingId === decom.id ? (
                                    <span className='mx-1'>
                                        <ProgressSpinner style={{ width: '15px', height: '15px' }} strokeWidth="8" animationDuration=".5s" />
                                    </span>
                                ) : (
                                    <button onClick={() => handleGeneratePdf(decom.id)}><span className="mx-1 text-gray-500 text-theme-sm dark:text-gray-400"><i className="pi pi-print"></i></span></button>
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

    const filteredDecom = decomList.filter((item) => {
        const form = item.forms
        const dateDecom = new Date(form.last_modified_at);
        const dayDecomPlus = datesDecom ? new Date(datesDecom[1]) : null;
        dayDecomPlus?.setDate(dayDecomPlus.getDate() + 1);
        const nextDayDecom = dayDecomPlus ? new Date(dayDecomPlus) : null;

        const indexReception = item.reception_decom.length - 1
        const reception = item.reception_decom[indexReception]
        const receptionForm = reception?.forms
        const dateReception = new Date(receptionForm?.last_modified_at);
        const dayReceptionPlus = datesReception ? new Date(datesReception[1]) : null;
        dayReceptionPlus?.setDate(dayReceptionPlus.getDate() + 1);
        const nextDayReception = dayReceptionPlus ? new Date(dayReceptionPlus) : null;


        const matchesStatus = selectedStatus.length > 0 ? selectedStatus.includes(item.statut) : true;
        const matchesReg = isReg ? form.is_reg : true;
        const matchesNotReg = isNotReg ? !form?.is_reg && !item.is_reg : true;
        const matchesDatesDecom = datesDecom ? (datesDecom[0] <= dateDecom && nextDayDecom >= dateDecom) : true;
        const matchesDatesReception = datesReception ? (datesReception[0] <= dateReception && nextDayReception >= dateReception) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesStatus && matchesReg && matchesNotReg && matchesDatesDecom && matchesDatesReception && matchesGlobalFilter;
    });

    const totalTPE = filteredDecom.reduce((sum, item) => sum + Number(item.quantite || 0), 0);

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
                                placeholder="Rechercher parmis les décoms..."
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
                            options={statusOptions}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par statut décom"
                            className=""
                        />
                    </div>
                    <div className="flex justify-normal flex-wrap gap-3">
                        <div>
                            <Label>Dates demande de décom</Label>
                            <Calendar
                                value={datesDecom}
                                onChange={(e) => {
                                    setDatesDecom(e.value)
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
                            <Label>Dates Réception</Label>
                            <Calendar
                                value={datesReception}
                                onChange={(e) => {
                                    setDatesReception(e.value)
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
                    <div>
                        <div className="flex items-center gap-3 my-2">
                            <Checkbox
                                checked={isReg}
                                onChange={(e) => {
                                    if (isReg) {
                                        setIsReg(false)
                                    } else {
                                        setIsReg(true)
                                    }
                                }}
                                label="Régularisations" />
                        </div>
                        <div className="flex items-center gap-3 my-2">
                            <Checkbox
                                checked={isNotReg}
                                onChange={(e) => {
                                    if (isNotReg) {
                                        setIsNotReg(false)
                                    } else {
                                        setIsNotReg(true)
                                    }
                                }}
                                label="Sans Régularisations" />
                        </div>
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-between">
                    <div className="flex space-x-3 items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {filteredDecom.length} décommissionnement(s) trouvé(s)
                        </span>
                        <span className="text-xs text-gray-700 font-semibold dark:text-gray-300">
                            {totalTPE} TPE(s)
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredDecom}
                        loading={loading}
                        removableSort
                        paginator
                        rows={rows}
                        first={first}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                        tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                        emptyMessage="Aucun decommissionnement trouvé"
                        className="p-datatable-sm">

                        <Column field="id" header="ID" sortable></Column>
                        <Column field="statut" header="Statut" body={statutTemplate} sortable></Column>
                        <Column field="quantite" header="Quantité" sortable></Column>
                        <Column field="forms.last_modified_at" header="Date Demande" body={dateDecomTemplate} sortable></Column>
                        <Column header="Date Réception" body={dateReceptionTemplate} sortable></Column>
                        <Column header="Dernière Vérification" body={dateVerificationTemplate} sortable></Column>
                        <Column header="Date Cloture" body={dateClotureTemplate} sortable></Column>
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}