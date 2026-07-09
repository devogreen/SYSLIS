import { useEffect, useState, useMemo } from "react"

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

export default function AllPiecesRebutsList() {

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

    const [selectedModels, setSelectedModels] = useState([]);

    const [modelOptions, setModelOptions] = useState([])
    const [models, setModels] = useState([])

    const [pieces, setPieces] = useState([])
    const [pieceOptions, setPieceOptions] = useState([])
    const [selectedPieces, setSelectedPieces] = useState([])

    const [piecesRebut, setPiecesRebut] = useState([])

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
            selectedPieces,
        });
    }, [globalFilter, datesUpdatePiece, selectedModels, selectedPieces]);

    useEffect(() => {
        const fetchData = async () => {
            const piecesRebutData = await rebutData.getAllPiecesRebut()
            setPiecesRebut(piecesRebutData)

            console.log(piecesRebutData)

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
        sessionStorage.setItem("paginationStateRebut", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setDateUpdatePiece(null);
        setSelectedModels([]);
        setSelectedPieces([])
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    // const handleSelectModels = (e) => {
    //     const value = e.value
    //     setSelectedModels(value)

    //     const filteredPieces = piecesRebut.filter((item) => {
    //         return item.parc_tpe.model_id == value
    //     })

    //     setPiecesRebut(filteredPieces)
    // }

    const nomPieceTemplate = (piece) => {
        return (
            <>
                <div>
                    <span className="text-sm font-medium">{piece.nom_piece}</span>
                </div>
            </>
        )
    }

    const piecesFoncTemplate = (piece) => {
        const total = pieceTotals[`${piece.id_piece}_fonctionnel`] || 0
        return (
            <>
                <div>
                    <span className="text-xl font-medium">{total}</span>
                </div>
            </>
        )
    }

    const piecesDefTemplate = (piece) => {
        const listePieces = piecesRebut.filter((item) => {
            return item.piece_id == piece.id_piece && item.etat == 'defectueux'
        })

        const total = listePieces.length > 0 ? listePieces.length : 0
        return (
            <>
                <div>
                    <span className="text-sm font-medium text-red-700">{total}</span>
                </div>
            </>
        )
    }

    const piecesRecupTemplate = (piece) => {
        const listePieces = piecesRebut.filter((item) => {
            return item.piece_id == piece.id_piece && item.etat == 'utilise'
        })

        const total = listePieces.length > 0 ? listePieces.length : 0
        return (
            <>
                <div>
                    <span className="text-sm font-medium text-sky-700">{total}</span>
                </div>
            </>
        )
    }

    const pieceTotals = useMemo(() => {
        const totals = {}

        piecesRebut.forEach((item) => {
            // console.log(item)
            const modelId = item.parc_tpe?.model_id
            // console.log(typeof modelId, modelId)
            // console.log(typeof selectedModels, selectedModels)
            const matchesModel =
                selectedModels.length === 0 ||
                selectedModels.includes(modelId)

            if (!matchesModel) return

            const key = `${item.piece_id}_${item.etat}`

            totals[key] = (totals[key] || 0) + 1
        })

        // console.log(
        //     piecesRebut.map(item => ({
        //         piece: item.piece_id,
        //         model: item.parc_tpe?.model_id,
        //         etat: item.etat
        //     }))
        // )

        return totals
    }, [piecesRebut, selectedModels])

    const filteredPieces = pieces.filter((item) => {
        const rebuts = piecesRebut.filter((p) => {
            return p.piece_id == item.id_piece
        })


        const matchesPiece = selectedPieces.length > 0 ? selectedPieces.includes(item.id_piece) : true
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(rebuts).toLowerCase().includes(globalFilter.toLowerCase())
            : true;

        return matchesPiece && matchesGlobalFilter
    });

    const totalPieces = filteredPieces.length;

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
                                placeholder="Rechercher parmis les pièces au rebut..."
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
                        {/* <MultiSelect
                            value={selectedModels}
                            onChange={(e) => setSelectedModels(e.value)}
                            options={modelOptions}
                            display="chip"
                            optionLabel="label"
                            optionValue="value"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par modèle"
                            className=""
                        /> */}
                        <MultiSelect
                            value={selectedPieces}
                            onChange={(e) => setSelectedPieces(e.value)}
                            options={pieceOptions}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par pièces"
                            className=""
                        />
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-between">
                    <div className="flex space-x-3 items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {totalPieces.length} lignes
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredPieces}
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

                        <Column field="id_piece" header="ID" sortable></Column>
                        <Column field="nom_piece" header="Nom" body={nomPieceTemplate} sortable></Column>
                        <Column header="Total fonctionnels" body={piecesFoncTemplate}></Column>
                        <Column header="Total défectueux" body={piecesDefTemplate}></Column>
                        <Column header="Total utilisé" body={piecesRecupTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}