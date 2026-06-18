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
import { Rebut } from "../../backend/rebut/Rebut";

import Swal from "sweetalert2";

export default function AllDemandeRebutsList() {

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

    const rebutData = new Rebut()

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateDemandeRebut"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allDemandeRebutFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();


    const [rebutList, setRebutList] = useState([])
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
    const [datesDemandeRebut, setDatesDemandeRebut] = useState(
        savedFilters?.datesDemandeRebut
            ? savedFilters.datesDemandeRebut.map((d) => new Date(d))
            : null
    );
    const [datesValidation, setDatesValidation] = useState(
        savedFilters?.datesValidation
            ? savedFilters.datesValidation.map((d) => new Date(d))
            : null
    );

    const [isNotReg, setIsNotReg] = useState(savedFilters?.isNotReg || false)

    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedStatus,
            isReg,
            isNotReg,
            datesDemandeRebut: datesDemandeRebut?.map(d => d?.toISOString()),
            datesValidation: datesValidation?.map(d => d?.toISOString()),
        });
    }, [globalFilter, selectedStatus, isReg, isNotReg, datesDemandeRebut, datesValidation]);

    useEffect(() => {
        const fetchData = async () => {
            const allDemandeRebut = await rebutData.getAllDemandesRebut()
            const demandeRebuts = allDemandeRebut.filter((item) => {
                return item.forms.is_deleted == false
            })
            setRebutList(demandeRebuts)
        }
        fetchData()
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationStateDemandeRebut", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedStatus([]);
        setIsReg(false);
        setIsNotReg(false);
        setDatesDemandeRebut(null);
        setDatesValidation(null);
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    const statutTemplate = (rebut) => {
        let statutClass = ''
        let statut = ''
        const linkSee = `/demande-rebut-details/${rebut.id}`

        if (rebut.statut == 'en_cours') {
            statut = 'en cours'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-warning-100 text-warning-300'
        } else if (rebut.statut == 'valide') {
            statut = 'validée'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-blue-100 text-blue-300'
        } else if (rebut.statut == 'retourne') {
            statut = 'retournée'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-red-100 text-red-300'
        } else if (rebut.statut == 'clos') {
            statut = 'clos'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-gray-100 text-gray-400'
        } else if (rebut.statut == 'refuse') {
            statut = 'refusée'
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-black text-white'
        }
        return (
            <Link to={linkSee}>
                <span className={statutClass}>{statut}</span>
            </Link>
        )
    }
    const dateDemandeTemplate = (rebut) => {
        return (
            <div className="">
                <span className="font-medium">{formatDate(rebut.forms.created_at)}</span>
            </div>
        )
    }
    const dateUpdateTemplate = (rebut) => {
        return (
            <div className="">
                <span className="font-medium">{formatDate(rebut.forms.last_modified_at)}</span>
            </div>
        )
    }
    const dateValidationTemplate = (rebut) => {
        const index = rebut.validation_rebut.length - 1
        const validation = rebut.validation_rebut[index]
        const dateValue = validation ? formatDate(validation.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const dateClotureTemplate = (rebut) => {
        const index = rebut.retour_rebut.length - 1
        const retour = rebut.retour_rebut[index]
        const dateValue = retour && rebut.statut == 'clos' ? formatDate(retour.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const actionTemplate = (rebut) => {
        const linkSee = `/demande-rebut-details/${rebut.id}`

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
                    {/* {rebut.statut == 'recue' ? (
                        <>
                            <span>
                                {printingId === rebut.id ? (
                                    <span className='mx-1'>
                                        <ProgressSpinner style={{ width: '15px', height: '15px' }} strokeWidth="8" animationDuration=".5s" />
                                    </span>
                                ) : (
                                    <button onClick={() => handleGeneratePdf(rebut.id)}><span className="mx-1 text-gray-500 text-theme-sm dark:text-gray-400"><i className="pi pi-print"></i></span></button>
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

    const filteredDemandeRebut = rebutList.filter((item) => {
        const form = item.forms
        const dateDemandeRebut = new Date(form.created_at);
        const dayDemandeRebutPlus = datesDemandeRebut ? new Date(datesDemandeRebut[1]) : null;
        dayDemandeRebutPlus?.setDate(dayDemandeRebutPlus.getDate() + 1);
        const nextDayDemandeRebut = dayDemandeRebutPlus ? new Date(dayDemandeRebutPlus) : null;

        const indexValidation = item.validation_rebut.length - 1
        const validation = item.validation_rebut[indexValidation]
        const validationForm = validation?.forms
        const dateValidation = new Date(validationForm?.last_modified_at);
        const dayValidationPlus = datesValidation ? new Date(datesValidation[1]) : null;
        dayValidationPlus?.setDate(dayValidationPlus.getDate() + 1);
        const nextDayValidation = dayValidationPlus ? new Date(dayValidationPlus) : null;


        const matchesStatus = selectedStatus.length > 0 ? selectedStatus.includes(item.statut) : true;
        const matchesReg = isReg ? form.is_reg : true;
        const matchesNotReg = isNotReg ? !form?.is_reg && !item.is_reg : true;
        const matchesDatesDemandeRebut = datesDemandeRebut ? (datesDemandeRebut[0] <= dateDemandeRebut && nextDayDemandeRebut >= dateDemandeRebut) : true;
        const matchesDatesValidation = datesValidation ? (datesValidation[0] <= dateValidation && nextDayValidation >= dateValidation) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesStatus && matchesReg && matchesNotReg && matchesDatesDemandeRebut && matchesDatesValidation && matchesGlobalFilter;
    });

    const totalTPE = filteredDemandeRebut.reduce((sum, item) => sum + Number(item.quantite || 0), 0);

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
                                placeholder="Rechercher parmis les mises au rebut..."
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
                            placeholder="Filtrer par statut de la demande"
                            className=""
                        />
                    </div>
                    <div className="flex justify-normal flex-wrap gap-3">
                        <div>
                            <Label>Dates demande</Label>
                            <Calendar
                                value={datesDemandeRebut}
                                onChange={(e) => {
                                    setDatesDemandeRebut(e.value)
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
                            <Label>Dates Validation</Label>
                            <Calendar
                                value={datesValidation}
                                onChange={(e) => {
                                    setDatesValidation(e.value)
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
                            {filteredDemandeRebut.length} mise(s) au rebut trouvée(s)
                        </span>
                        <span className="text-xs text-gray-700 font-semibold dark:text-gray-300">
                            {totalTPE} TPE(s)
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredDemandeRebut}
                        loading={loading}
                        removableSort
                        paginator
                        rows={rows}
                        first={first}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                        tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                        emptyMessage="Aucune demande trouvée"
                        className="p-datatable-sm">

                        <Column field="id" header="ID" sortable></Column>
                        <Column field="statut" header="Statut" body={statutTemplate} sortable></Column>
                        <Column field="quantite" header="Quantité" sortable></Column>
                        <Column field="forms.created_at" header="Date Demande" body={dateDemandeTemplate} sortable></Column>
                        <Column field="forms.last_modified_at" header="Date update" body={dateUpdateTemplate} sortable></Column>
                        <Column header="Date Validation" body={dateValidationTemplate}></Column>
                        {/* <Column header="Date Cloture" body={dateClotureTemplate}></Column> */}
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}