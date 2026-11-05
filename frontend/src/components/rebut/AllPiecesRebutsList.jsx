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
import TextArea from "../form/input/TextArea";
import { Rebut } from "../../backend/rebut/Rebut";
import { Stock } from "../../backend/stock/Stock";

import Swal from "sweetalert2";

import { Modal } from "../ui/modal/index";

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

    const [selectedModels, setSelectedModels] = useState(savedFilters?.selectedModels || []);

    const [modelOptions, setModelOptions] = useState([])
    const [models, setModels] = useState([])

    const [pieces, setPieces] = useState([])
    const [pieceOptions, setPieceOptions] = useState([])
    const [selectedPieces, setSelectedPieces] = useState(
        // anciens filtres sauvegardés : objets {value, label} -> on garde seulement l'id
        (savedFilters?.selectedPieces || []).map((p) => (p && typeof p === 'object' ? p.value : p))
    )

    const [piecesRebut, setPiecesRebut] = useState([])

    const [datesUpdatePiece, setDateUpdatePiece] = useState(
        savedFilters?.datesUpdatePiece
            ? savedFilters.datesUpdatePiece.map((d) => new Date(d))
            : null
    );

    const userId = localStorage.getItem('id')

    const selectClasses = "h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"

    // --- Création / alimentation d'un stock à partir des pièces fonctionnelles au rebut
    const [isModalStockOpen, setIsModalStockOpen] = useState(false)
    const [pieceForStock, setPieceForStock] = useState(null)
    const [stockModel, setStockModel] = useState('')
    const [stockQuantite, setStockQuantite] = useState('')
    const [stockMode, setStockMode] = useState('nouveau') // 'nouveau' | 'existant'
    const [stocksExistants, setStocksExistants] = useState([])
    const [selectedStockId, setSelectedStockId] = useState('')
    const [servicesOptions, setServicesOptions] = useState([])
    const [stockService, setStockService] = useState('')
    const [codeStock, setCodeStock] = useState('')
    const [motifStock, setMotifStock] = useState('')
    const [commentaireStock, setCommentaireStock] = useState('')
    const [errorStock, setErrorStock] = useState('')
    const [loadingStocksExistants, setLoadingStocksExistants] = useState(false)
    const [loadingCreationStock, setLoadingCreationStock] = useState(false)

    const refreshPiecesRebut = async () => {
        const piecesRebutData = await rebutData.getAllPiecesRebut()
        setPiecesRebut(piecesRebutData)
    }

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
            setLoading(true)
            try {
                await refreshPiecesRebut()

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
            } catch (error) {
                console.error(error)
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur',
                    text: error?.message || "Erreur lors du chargement des pièces au rebut",
                })
            } finally {
                setLoading(false)
            }
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

    // On ne modifie plus piecesRebut ici : le filtrage par modèle est dérivé
    // (voir filteredPiecesRebut), ce qui permet de désélectionner / changer de modèle
    // sans perdre les données chargées.
    const handleSelectModels = (e) => {
        setSelectedModels(e.value || [])
        setFirst(0)
    }

    // Pièces au rebut restreintes aux modèles sélectionnés
    // (comparaison en String pour éviter les soucis number / string)
    const filteredPiecesRebut = useMemo(() => {
        if (!selectedModels || selectedModels.length === 0) return piecesRebut
        const selected = selectedModels.map(String)
        return piecesRebut.filter((item) => {
            const modelId = item.parc_tpe?.model_id
            return modelId != null && selected.includes(String(modelId))
        })
    }, [piecesRebut, selectedModels])

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
        const total = pieceTotals[`${piece.id_piece}_defectueux`] || 0
        return (
            <>
                <div>
                    <span className="text-sm font-medium text-red-700">{total}</span>
                </div>
            </>
        )
    }

    const piecesRecupTemplate = (piece) => {
        const total = pieceTotals[`${piece.id_piece}_utilise`] || 0
        return (
            <>
                <div>
                    <span className="text-sm font-medium text-sky-700">{total}</span>
                </div>
            </>
        )
    }

    const piecesEnStockTemplate = (piece) => {
        const total = pieceTotals[`${piece.id_piece}_en_stock`] || 0
        return (
            <>
                <div>
                    <span className="text-sm font-medium text-emerald-700">{total}</span>
                </div>
            </>
        )
    }

    // Pièces fonctionnelles disponibles par pièce et par modèle de terminal (indépendamment des filtres du tableau)
    // { [pieceId]: { [modelId]: nombre } }
    const disponiblesParPieceModel = useMemo(() => {
        const result = {}
        piecesRebut.forEach((item) => {
            const modelId = item.parc_tpe?.model_id
            if (item.etat !== 'fonctionnel' || modelId == null || item.parc_tpe?.is_deleted) return
            result[item.piece_id] = result[item.piece_id] || {}
            result[item.piece_id][modelId] = (result[item.piece_id][modelId] || 0) + 1
        })
        return result
    }, [piecesRebut])

    const totalDisponible = (pieceId) => {
        const parModel = disponiblesParPieceModel[pieceId] || {}
        return Object.values(parModel).reduce((acc, n) => acc + n, 0)
    }

    const modelOptionsStock = useMemo(() => {
        if (!pieceForStock) return []
        const parModel = disponiblesParPieceModel[pieceForStock.id_piece] || {}
        return Object.entries(parModel)
            .filter(([, nombre]) => nombre > 0)
            .map(([modelId, nombre]) => {
                const model = models.find((m) => String(m.id_model) === String(modelId))
                return {
                    value: String(modelId),
                    label: `${model?.nom_model || `Modèle ${modelId}`} (${nombre} disponible${nombre > 1 ? 's' : ''})`,
                    max: nombre,
                }
            })
    }, [pieceForStock, disponiblesParPieceModel, models])

    const maxQuantiteStock = modelOptionsStock.find((m) => m.value === String(stockModel))?.max || 0
    const stockChoisi = stocksExistants.find((s) => String(s.id) === String(selectedStockId))

    const resetStockForm = () => {
        setStockModel('')
        setStockQuantite('')
        setStockMode('nouveau')
        setStocksExistants([])
        setSelectedStockId('')
        setStockService('')
        setCodeStock('')
        setMotifStock('')
        setCommentaireStock('')
        setErrorStock('')
    }

    // `piece` est passé explicitement à l'ouverture de la modale (le state pieceForStock n'est pas encore à jour)
    const handleSelectStockModel = async (modelId, piece = pieceForStock) => {
        setStockModel(modelId)
        setStockQuantite('')
        setSelectedStockId('')
        setStocksExistants([])
        setErrorStock('')
        if (!modelId || !piece) return

        setLoadingStocksExistants(true)
        try {
            const stocks = await rebutData.getStocksPourRebut(piece.id_piece, modelId, userId)
            setStocksExistants(stocks)
            // Si un stock correspondant existe, on propose de l'alimenter par défaut (évite les doublons)
            if (stocks.length > 0) {
                setStockMode('existant')
                if (stocks.length === 1) setSelectedStockId(String(stocks[0].id))
            } else {
                setStockMode('nouveau')
            }
        } catch (error) {
            console.error(error)
            setStockMode('nouveau')
        } finally {
            setLoadingStocksExistants(false)
        }
    }

    const openStockModal = async (piece) => {
        resetStockForm()
        setPieceForStock(piece)
        setIsModalStockOpen(true)

        // Services autorisés pour cette pièce (comme dans la création de stock classique)
        try {
            const itemServices = await stockData.getItemServices(piece.id_piece)
            const options = (itemServices?.services || []).map((s) => ({
                value: String(s.id),
                label: s.nom_service?.toUpperCase(),
            }))
            setServicesOptions(options)
            if (options.length === 1) setStockService(options[0].value)
        } catch (error) {
            console.error(error)
            setServicesOptions([])
        }

        // Pré-sélection du modèle : un seul disponible, ou un seul modèle filtré dans le tableau
        const parModel = disponiblesParPieceModel[piece.id_piece] || {}
        const modelsDispo = Object.keys(parModel)
        const modelFiltre = selectedModels.length === 1 ? String(selectedModels[0]) : null
        if (modelsDispo.length === 1) {
            handleSelectStockModel(modelsDispo[0], piece)
        } else if (modelFiltre && modelsDispo.includes(modelFiltre)) {
            handleSelectStockModel(modelFiltre, piece)
        }
    }

    const closeStockModal = () => {
        setIsModalStockOpen(false)
    }

    const validateStockForm = () => {
        const nombre = Number(stockQuantite)
        if (!stockModel) return "Vous devez choisir le modèle !"
        if (!Number.isInteger(nombre) || nombre < 1) return "Quantité invalide !"
        if (nombre > maxQuantiteStock) return `Quantité maximale : ${maxQuantiteStock}`
        if (stockMode === 'existant') {
            if (!selectedStockId) return "Vous devez choisir le stock à alimenter !"
        } else {
            if (!stockService) return "Vous devez choisir le service !"
            if (!codeStock.trim()) return "Vous devez déterminer un code au stock !"
        }
        if (!motifStock.trim()) return "Vous devez préciser le motif !"
        return ''
    }

    const handleSubmitStock = async () => {
        const erreur = validateStockForm()
        if (erreur) {
            setErrorStock(erreur)
            return
        }
        setErrorStock('')

        const nombre = Number(stockQuantite)
        const modelLabel = models.find((m) => String(m.id_model) === String(stockModel))?.nom_model || ''
        const recap = stockMode === 'existant'
            ? `${nombre} ${pieceForStock.nom_piece} (${modelLabel}) seront retirées du rebut et ajoutées au stock ${stockChoisi?.code_stock} (${stockChoisi?.quantite_piece ?? 0} → ${(stockChoisi?.quantite_piece ?? 0) + nombre}).`
            : `${nombre} ${pieceForStock.nom_piece} (${modelLabel}) seront retirées du rebut pour créer le stock ${codeStock.trim()}.`

        // On ferme la modale pendant la confirmation (la popup Swal passerait sinon derrière)
        setIsModalStockOpen(false)
        const confirmation = await Swal.fire({
            title: "Confirmer",
            text: recap,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Valider",
            cancelButtonText: "Annuler",
        })
        if (!confirmation.isConfirmed) {
            setIsModalStockOpen(true)
            return
        }

        const payload = {
            pieceId: pieceForStock.id_piece,
            modelId: stockModel,
            quantite: nombre,
            mode: stockMode,
            stockId: stockMode === 'existant' ? selectedStockId : null,
            serviceId: stockMode === 'nouveau' ? stockService : null,
            codeStock: stockMode === 'nouveau' ? codeStock.trim() : null,
            motif: motifStock.trim(),
            commentaire: commentaireStock,
            userId,
        }

        try {
            setLoadingCreationStock(true)
            const response = await rebutData.createStockFromRebut(payload)
            Swal.fire({
                title: "Succès",
                text: response?.message || "Opération effectuée avec succès !",
                icon: "success",
            })
            setPieceForStock(null)
            resetStockForm()
            await refreshPiecesRebut()
        } catch (error) {
            console.error(error)
            await Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la création du stock !",
                icon: "warning",
            })
            // On rouvre la modale avec les données saisies pour permettre de corriger
            setIsModalStockOpen(true)
            await refreshPiecesRebut()
        } finally {
            setLoadingCreationStock(false)
        }
    }

    const createStockTemplate = (piece) => {
        const disponible = totalDisponible(piece.id_piece)
        return (
            <>
                <div>
                    <span>
                        <button
                            className="bg-cyan-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                            onClick={() => openStockModal(piece)}
                            disabled={disponible === 0 || loadingCreationStock}
                            title={disponible === 0 ? "Aucune pièce fonctionnelle disponible" : ""}
                        >
                            Créer Stock
                        </button>
                    </span>
                </div>
            </>
        )
    }

    const pieceTotals = useMemo(() => {
        const totals = {}

        filteredPiecesRebut.forEach((item) => {
            const key = `${item.piece_id}_${item.etat}`
            totals[key] = (totals[key] || 0) + 1
        })

        return totals
    }, [filteredPiecesRebut])

    const filteredPieces = pieces.filter((item) => {
        const rebuts = filteredPiecesRebut.filter((p) => {
            return p.piece_id == item.id_piece
        })

        // Quand des modèles sont sélectionnés, on n'affiche que les pièces
        // ayant au moins un rebut pour ces modèles
        const matchesModel = selectedModels.length > 0 ? rebuts.length > 0 : true
        const matchesPiece = selectedPieces.length > 0 ? selectedPieces.includes(item.id_piece) : true
        const matchesGlobalFilter = globalFilter
            ? (
                JSON.stringify(rebuts).toLowerCase().includes(globalFilter.toLowerCase()) ||
                (item.nom_piece || '').toLowerCase().includes(globalFilter.toLowerCase())
            )
            : true;

        return matchesModel && matchesPiece && matchesGlobalFilter
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
                        <MultiSelect
                            value={selectedModels}
                            onChange={(e) => handleSelectModels(e)}
                            options={modelOptions}
                            display="chip"
                            optionLabel="label"
                            optionValue="value"
                            filter
                            maxSelectedLabels={2}
                            placeholder="Filtrer par modèle"
                            className=""
                        />
                        <MultiSelect
                            value={selectedPieces}
                            onChange={(e) => { setSelectedPieces(e.value || []); setFirst(0) }}
                            options={pieceOptions}
                            display="chip"
                            optionLabel="label"
                            optionValue="value"
                            filter
                            maxSelectedLabels={2}
                            placeholder="Filtrer par pièces"
                            className=""
                        />
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-between">
                    <div className="flex space-x-3 items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {totalPieces} lignes
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
                        <Column header="Total en stock" body={piecesEnStockTemplate}></Column>
                        <Column header="Créer Stock" body={createStockTemplate}></Column>
                    </DataTable>
                </div>
            </div>
            <Modal isOpen={isModalStockOpen} onClose={closeStockModal} className="p-4 max-w-md">
                <div className="space-y-6">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-black text-white font-medium">Stock depuis le rebut</span>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto space-y-5 px-1">
                        <div>
                            <Label>Pièce</Label>
                            <Input type="text" value={pieceForStock?.nom_piece || ''} disabled />
                        </div>

                        <div>
                            <Label>Modèle <span className="text-red-700">*</span></Label>
                            <select
                                className={selectClasses}
                                value={stockModel}
                                onChange={(e) => handleSelectStockModel(e.target.value)}
                            >
                                <option value="">Choisir un modèle</option>
                                {modelOptionsStock.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {stockModel && (
                            <>
                                <div>
                                    <Label>Destination <span className="text-red-700">*</span></Label>
                                    {loadingStocksExistants ? (
                                        <span className="text-sm text-gray-500">Recherche des stocks existants...</span>
                                    ) : (
                                        <div className="flex gap-6 text-sm">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="stockMode"
                                                    value="nouveau"
                                                    checked={stockMode === 'nouveau'}
                                                    onChange={() => { setStockMode('nouveau'); setErrorStock('') }}
                                                />
                                                Nouveau stock
                                            </label>
                                            <label className={`flex items-center gap-2 ${stocksExistants.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input
                                                    type="radio"
                                                    name="stockMode"
                                                    value="existant"
                                                    checked={stockMode === 'existant'}
                                                    disabled={stocksExistants.length === 0}
                                                    onChange={() => { setStockMode('existant'); setErrorStock('') }}
                                                />
                                                Stock existant ({stocksExistants.length})
                                            </label>
                                        </div>
                                    )}
                                    {!loadingStocksExistants && stocksExistants.length === 0 && (
                                        <span className="text-xs text-gray-500">Aucun stock de cette pièce / ce modèle dont vous êtes propriétaire ou co-propriétaire.</span>
                                    )}
                                </div>

                                {stockMode === 'existant' ? (
                                    <div>
                                        <Label>Stock à alimenter <span className="text-red-700">*</span></Label>
                                        <select
                                            className={selectClasses}
                                            value={selectedStockId}
                                            onChange={(e) => setSelectedStockId(e.target.value)}
                                        >
                                            <option value="">Choisir un stock</option>
                                            {stocksExistants.map((s) => (
                                                <option key={s.id} value={String(s.id)}>
                                                    {s.code_stock} · {s.services?.nom_service || 'N/A'} · {s.quantite_piece ?? 0} pcs
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <Label>Service <span className="text-red-700">*</span></Label>
                                            <select
                                                className={selectClasses}
                                                value={stockService}
                                                onChange={(e) => setStockService(e.target.value)}
                                            >
                                                <option value="">Choisir un service</option>
                                                {servicesOptions.map((s) => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Code Stock <span className="text-red-700">*</span></Label>
                                            <Input
                                                type="text"
                                                value={codeStock}
                                                onChange={(e) => setCodeStock(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <Label>Type d'entrée</Label>
                                    <Input type="text" value="Par pièce" disabled />
                                </div>

                                <div>
                                    <Label>Quantité <span className="text-red-700">*</span> <span className="text-xs text-gray-500">(max {maxQuantiteStock})</span></Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max={String(maxQuantiteStock)}
                                        step={1}
                                        value={stockQuantite}
                                        onChange={(e) => setStockQuantite(e.target.value)}
                                    />
                                    {Number(stockQuantite) > 0 && (
                                        <span className="text-xs text-gray-600">
                                            {stockMode === 'existant' && stockChoisi
                                                ? `Stock : ${stockChoisi.quantite_piece ?? 0} → ${(stockChoisi.quantite_piece ?? 0) + Number(stockQuantite)}`
                                                : `Stock : 0 → ${Number(stockQuantite)}`}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <Label>Origine</Label>
                                    <Input type="text" value="Rebut" disabled />
                                </div>

                                <div>
                                    <Label>Motif <span className="text-red-700">*</span></Label>
                                    <Input
                                        type="text"
                                        value={motifStock}
                                        onChange={(e) => setMotifStock(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label>Commentaire</Label>
                                    <TextArea
                                        rows={3}
                                        placeholder="Commentaire (facultatif)"
                                        value={commentaireStock}
                                        onChange={(value) => setCommentaireStock(value)}
                                    />
                                </div>
                            </>
                        )}

                        {errorStock && (
                            <div className="text-sm text-red-600 font-medium">{errorStock}</div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            className="py-2 px-4 rounded border border-gray-300 text-sm"
                            onClick={closeStockModal}
                        >
                            Annuler
                        </button>
                        <button
                            className="py-2 px-4 rounded bg-black text-white text-sm disabled:bg-gray-400"
                            onClick={handleSubmitStock}
                            disabled={!stockModel || loadingStocksExistants || loadingCreationStock}
                        >
                            {loadingCreationStock ? 'En cours...' : (stockMode === 'existant' ? 'Ajouter au stock' : 'Créer le stock')}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}