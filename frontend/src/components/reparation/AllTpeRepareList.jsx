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
import { Decom } from "../../backend/decom/decom";

import Swal from "sweetalert2";

export default function AllTpeRepareList() {

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
    const decomData = new Decom()

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateTpeRepare"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allTpeRepareFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();

    const [tpeRebutList, setTpeMaintenanceList] = useState([])
    const [loading, setLoading] = useState(false);
    const [printingId, setPrintingId] = useState(null);
    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");

    const [selectedModels, setSelectedModels] = useState(savedFilters?.selectedModels || []);

    const [modelOptions, setModelOptions] = useState([])
    const [models, setModels] = useState([])

    const [pieces, setPieces] = useState([])
    const [pieceOptions, setPieceOptions] = useState([])
    const [selectedPieces, setSelectedPieces] = useState([])

    const [datesUpdate, setDatesUpdate] = useState(
        savedFilters?.datesUpdate
            ? savedFilters.datesUpdate.map((d) => new Date(d))
            : null
    );
    const optionsEtat = [
        { label: 'Réparé', value: 'repare' },
        { label: 'A Réparer', value: 'defectueux' },
    ];
    const [selectedEtats, setSelectedEtats] = useState(savedFilters?.selectedEtats || []);


    useEffect(() => {
        saveFilters({
            globalFilter,
            datesUpdate: datesUpdate?.map(d => d?.toISOString()),
            selectedModels,
            selectedPieces,
            selectedEtats,
        });
    }, [globalFilter, datesUpdate, selectedModels, selectedPieces, selectedEtats]);

    useEffect(() => {
        const fetchData = async () => {
            const allTpeMaintenance = await decomData.getAllTpeRepare()
            setTpeMaintenanceList(allTpeMaintenance)

            console.log(allTpeMaintenance)

            const modelsData = await stockData.getAllModels()
            const modelsOptions = modelsData.map((item) => ({
                value: item.id_model,
                label: item.nom_model,
            }))
            setModelOptions(modelsOptions)
            setModels(modelsData)

            const allItems = await stockData.getAllItems()
            const items = allItems.filter((item) => {
                return item.is_deleted == false && item.type != 'TERMINAL'
            })
            const pieceOptions = items.map((p) => ({
                value: p.id_piece,
                label: p.nom_piece,
            }))
            setPieces(items)
            setPieceOptions(pieceOptions)
        }
        fetchData()
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationStateTpeRepare", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setDatesUpdate(null);
        setSelectedModels([]);
        setSelectedPieces([])
        setSelectedEtats([])
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    const serialNumberTemplate = (tpe) => {
        return (
            <>
                <span className="font-medium">
                    {tpe.parc_tpe?.serial_number}
                </span>
            </>
        )
    }

    const etatTemplate = (tpe) => {
        let etatClass = ''
        let etat = ''

        if (tpe.etat == 'defectueux') {
            etat = 'à réparer'
            etatClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 text-red-700'
        } else if (tpe.etat == 'repare') {
            etat = 'réparé'
            etatClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 text-blue-700'
        }
        return (
            <div>
                <span className={etatClass}>{etat}</span>
            </div>
        )
    }

    const piecesFoncTemplate = (tpe) => {
        // const piecesFonc = tpe.pieces_rebut.filter((item) => {
        //     return item.etat == 'fonctionnel'
        // })
        // const quantite = piecesFonc?.length ? piecesFonc?.length : 0
        // return (
        //     <>
        //         <div className="grid grid-cols-2 text-xs">
        //             {piecesFonc?.map((item) => {
        //                 return (
        //                     <>
        //                         <div>
        //                             <span className="font-medium text-blue-600">{item.items.nom_piece} ,</span>
        //                         </div>
        //                     </>
        //                 )
        //             })}
        //         </div>
        //     </>
        // )
    }

    const piecesDefTemplate = (tpe) => {
        const piecesDef = tpe.pieces_a_reparer.filter((item) => {
            return item.etat == 'defectueux'
        })
        const quantite = piecesDef?.length ? piecesDef?.length : 0
        return (
            <>
                <div className="grid grid-cols-2 text-xs">
                    {piecesDef?.map((item) => {
                        return (
                            <>
                                <div>
                                    <span className="font-medium opacity-55">{item.items.nom_piece} ,</span>
                                </div>
                            </>
                        )
                    })}
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

    const dateCreationTemplate = (tpe) => {
        // const indexSession = tpe.sn_rebut.length - 1
        // const session = tpe.sn_rebut[indexSession]
        // const date = session ? formatDate(session?.last_modified_at) : 'N/A'
        // return (
        //     <>
        //         <div>
        //             <span>{date}</span>
        //         </div>
        //     </>
        // )
    }

    const filteredTpeMaintenance = tpeRebutList.filter((item) => {

        // const piecesRebuts = item.pieces_rebut.filter((p) => {
        //     return p.etat == 'fonctionnel'
        // })
        // const piecesId = piecesRebuts.map((p) => {
        //     return p.piece_id
        // })

        // const indexSession = item.sn_rebut.length - 1
        // const session = item.sn_rebut[indexSession]
        const dateUpdate = new Date(item.last_modified_at);
        const dayUpdatesPlus = datesUpdate ? new Date(datesUpdate[1]) : null;
        dayUpdatesPlus?.setDate(dayUpdatesPlus.getDate() + 1);
        const nextDayUpdate = dayUpdatesPlus ? new Date(dayUpdatesPlus) : null;

        const matchesDatesUpdates = datesUpdate ? (datesUpdate[0] <= dateUpdate && nextDayUpdate >= dateUpdate) : true;
        // const matchesPiecesFonc = selectedPieces.length > 0 ? selectedPieces.some(p => piecesId.includes(p)) : true;
        const matchesEtat = selectedEtats.length > 0 ? selectedEtats.includes(item.etat) : true;
        const matchesModel = selectedModels.length > 0 ? selectedModels.includes(item.model_id) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesDatesUpdates && matchesEtat && matchesModel && matchesGlobalFilter
    });

    const totalTPE = filteredTpeMaintenance.length;

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
                            value={selectedEtats}
                            onChange={(e) => setSelectedEtats(e.value)}
                            options={optionsEtat}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par état"
                            className=""
                        />
                    </div>
                    <div className="flex justify-normal flex-wrap gap-3">
                        <div>
                            <Label>Dates Updates</Label>
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
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {filteredTpeMaintenance.length} TPE(s) trouvé(s)
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredTpeMaintenance}
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
                        <Column field="tpe_id" header="S/N" body={serialNumberTemplate} sortable></Column>
                        <Column field="nom_marchand" header="Point Marchand" sortable></Column>
                        <Column field="etat" header="Etat" body={etatTemplate} sortable></Column>
                        <Column header="Pièces défectueuses" body={piecesDefTemplate}></Column>
                        <Column field="last_modified_at" header="Dernière modification" sortable></Column>
                        <Column field="created_at" header="Date de création" sortable></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}