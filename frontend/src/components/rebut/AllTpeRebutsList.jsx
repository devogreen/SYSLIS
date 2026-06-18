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
import { Stock } from "../../backend/stock/Stock";

import Swal from "sweetalert2";

export default function AllTpeRebutsList() {

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
    const stockData = new Stock()

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateRebut"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allRebutFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();


    const [tpeRebutList, setTpeRebutList] = useState([])
    const [loading, setLoading] = useState(false);
    const [printingId, setPrintingId] = useState(null);
    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");

    const [selectedModels, setSelectedModels] = useState(savedFilters?.selectedModels || []);

    const [models, setModels] = useState([])

    const [datesUpdatePiece, setDateUpdatePiece] = useState(
        savedFilters?.datesUpdatePiece
            ? savedFilters.datesUpdatePiece.map((d) => new Date(d))
            : null
    );

    useEffect(() => {
        saveFilters({
            globalFilter,
            datesUpdatePiece: datesUpdatePiece?.map(d => d?.toISOString()),
            selectedModels,
        });
    }, [globalFilter, datesUpdatePiece, selectedModels]);

    useEffect(() => {
        const fetchData = async () => {
            const allTpeRebuts = await rebutData.getAllTpeRebuts()
            setTpeRebutList(allTpeRebuts)

            const modelsData = await stockData.getAllModels()
            const modelsOptions = modelsData.map((item) => ({
                value: item.id_model,
                label: item.nom_model,
            }))
            setModels(modelsOptions)
        }
        fetchData()
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationStateRebut", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setDateUpdatePiece(null);
        setSelectedModels([]);
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    const serialNumberTemplate = (tpe) => {
        const linkSee = `/tpe-rebut-details/${tpe.id}`
        return (
            <>
                <Link to={linkSee}>
                    <span className="font-medium text-red-700">
                        {tpe.serial_number}
                    </span>
                </Link>
            </>
        )
    }

    const modelTemplate = (tpe) => {
        return (
            <>
                <div>
                    <span className="font-medium">
                        {tpe.model_piece?.nom_model}
                    </span>
                </div>
            </>
        )
    }

    const piecesFoncTemplate = (tpe) => {
        const piecesFonc = tpe.pieces_rebut.filter((item) => {
            return item.etat == 'fonctionnel'
        })
        const quantite = piecesFonc?.length ? piecesFonc?.length : 0
        return (
            <>
                <div>
                    <span className="font-bold text-sm">
                        {quantite}
                    </span>
                </div>
            </>
        )
    }

    const piecesDefTemplate = (tpe) => {
        const piecesDef = tpe.pieces_rebut.filter((item) => {
            return item.etat == 'defectueux'
        })
        const quantite = piecesDef?.length ? piecesDef?.length : 0
        return (
            <>
                <div>
                    <span className="font-bold text-sm">
                        {quantite}
                    </span>
                </div>
            </>
        )
    }

    const actionTemplate = (tpe) => {
        const linkSee = `/tpe-rebut-details/${tpe.id}`

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

    const filteredTpeRebutList = tpeRebutList.filter((item) => {

        // const matchesDatesUpdatesPiece = datesUpdatePiece ? (datesUpdatePiece[0] <= dateDemandeRebut && nextDayDemandeRebut >= dateDemandeRebut) : true;
        const matchesModel = selectedModels.length > 0 ? selectedModels.includes(item.model_id) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesModel, matchesGlobalFilter;
    });

    const totalTPE = filteredTpeRebutList.length;

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
                                placeholder="Rechercher parmis les TPE au rebut..."
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
                            value={selectedModels}
                            onChange={(e) => setSelectedModels(e.value)}
                            options={models}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par modèle"
                            className=""
                        />
                    </div>
                    {/* <div className="flex justify-normal flex-wrap gap-3">
                        <div>
                            <Label>Dates Updates</Label>
                            <Calendar
                                value={datesUpdatePiece}
                                onChange={(e) => {
                                    setDateUpdatePiece(e.value)
                                }}
                                selectionMode="range"
                                readOnlyInput
                                hideOnRangeSelection
                                locale="fr"
                                dateFormat="dd/mm/yy"
                                placeholder="jj/mm/aaaa - jj/mm/aaaa"
                            />
                        </div>
                    </div> */}
                </div>
                <div className="p-6 pt-0 flex justify-between">
                    <div className="flex space-x-3 items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {filteredTpeRebutList.length} TPE(s) au rebut trouvée(s)
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredTpeRebutList}
                        loading={loading}
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
                        <Column field="serial_number" header="S/N" body={serialNumberTemplate} sortable></Column>
                        <Column field="model_id" header="Modèle" body={modelTemplate} sortable></Column>
                        <Column header="Total pièces fonctionnelles" body={piecesFoncTemplate} sortable></Column>
                        <Column header="Total pièces défectueuses" body={piecesDefTemplate} sortable></Column>
                        {/* <Column header="Dernière modification" body={dateUpdateTemplate} sortable></Column> */}
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}