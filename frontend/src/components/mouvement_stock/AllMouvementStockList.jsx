import { useEffect, useState, useSyncExternalStore } from "react"
import { Stock } from "../../backend/stock/Stock"
import { Users } from "../../backend/users/Users";

import { Link } from "react-router"

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";
import { MultiSelect } from "primereact/multiselect";
import Label from "../form/Label";

export default function AllMouvementStockList() {

    const stockData = new Stock()
    const userData = new Users()

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

    const [loading, setLoading] = useState(false)
    const [allMouvement, setAllMouvement] = useState([])
    const savedPagination = JSON.parse(sessionStorage.getItem("paginationState"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 10);

    const FILTERS_KEY = "allMouvementStockFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();

    const [items, setItems] = useState([])

    const [models, setModels] = useState([])

    const [typesMouvement, setTypesMouvement] = useState([])

    const [services, setServices] = useState([])

    const [stocks, setStocks] = useState([])

    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");

    const optionsTypes = [
        { label: 'entree', value: 'entree'},
        { label: 'sortie', value: 'sortie'},
    ]

    const [selectedTypes, setSelectedTypes] = useState(savedFilters?.selectedTypes || [])

    const [optionsPieces, setOptionsPieces] = useState([])
    const [selectedItems, setSelectedItems] = useState(savedFilters?.selectedItems || []);

    const [optionsModels, setOptionsModels] = useState([])
    const [selectedModels, setSelectedModels] = useState(savedFilters?.selectedModels || []);

    const [optionsServiceOrigines, setOptionsServiceOrigines] = useState([])
    const [selectedServiceOrigines, setSelectedServiceOrigines] = useState(savedFilters?.selectedServiceOrigines || [])

    const [optionsServiceReceptions, setOptionsServiceReceptions] = useState([])
    const [selectedServiceReceptions, setSelectedServiceReceptions] = useState(savedFilters?.selectedServiceReceptions || [])

    const [optionsStocks, setOptionsStocks] = useState([])
    const [selectedStocks, setSelectedStocks] = useState(savedFilters?.selectedStocks || [])

    const [optionsMouvements, setOptionsMouvements] = useState([])
    const [selectedMouvements, setSelectedMouvements] = useState(savedFilters?.selectedMouvements || [])

    const [periode, setPeriode] = useState(
        savedFilters?.periode
            ? savedFilters.periode.map((d) => new Date(d))
            : null
    );

    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedItems,
            selectedModels,
            selectedServiceOrigines,
            selectedServiceReceptions,
            selectedStocks,
            selectedMouvements,
            periode: periode?.map(d => d?.toISOString()),
            selectedTypes,
        });
    }, [globalFilter, selectedItems, selectedModels, selectedServiceOrigines, selectedServiceReceptions, selectedStocks, selectedMouvements, periode, selectedTypes]); 

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const mouvement_data = await stockData.getAllMouvementStock()
                setAllMouvement(mouvement_data)

                const piece_data = await stockData.getAllItems()
                const items_data = piece_data.filter((item) => {
                    return item.is_deleted == false
                })
                setItems(items_data)
                const options_pieces = items_data.map((item) => ({
                    value: item.id_piece,
                    label: item.nom_piece,
                }))
                setOptionsPieces(options_pieces)

                const models_data = await stockData.getAllModels()
                setModels(models_data)
                const options_model = models_data.map((item) => ({
                    value: item.id_model,
                    label: item.nom_model.toUpperCase(),
                }))
                setOptionsModels(options_model)

                const typesMouvement_data = await stockData.getAllTypeMouvementStock()
                setTypesMouvement(typesMouvement_data)
                const options_typesMouvement = typesMouvement_data.map((item) => ({
                    value: item.id,
                    label: item.titre,
                }))
                setOptionsMouvements(options_typesMouvement)

                const services_data = await userData.getAllServices()
                setServices(services_data)
                const options_services = services_data.map((item) => ({
                    value: item.id,
                    label: item.nom_service.toUpperCase(),
                }))
                setOptionsServiceOrigines(options_services)
                setOptionsServiceReceptions(options_services)

                const stocks_data_all = await stockData.getAllStocks()
                const stocks_data = stocks_data_all.filter((item) => {
                    return item.is_deleted == false
                })
                setStocks(stocks_data)
                const options_stocks = stocks_data.map((item) => ({
                    value: item.id,
                    label: item.code_stock + ' - ' + item.stockOwner?.fullname,
                }))
                setOptionsStocks(options_stocks)

            } catch (error) {
                console.log('Error fetching data ', error)
            } finally {
                setLoading(false)
            }
        };
        fetchData()
    }, [])

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedStocks([]);
        setSelectedItems([]);
        setSelectedModels([]);
        setSelectedServiceOrigines([]);
        setSelectedServiceReceptions([]);
        setSelectedMouvements([]);
        setPeriode(null);
        setFirst(0);
        setRows(10);
        setSelectedTypes([]);
        sessionStorage.removeItem("paginationState");
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

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationState", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const idTemplate = (mouvement) => {
        return (
            <>
                <span className="text-theme-xs font-medium">{mouvement.id}</span>
            </>
        )
    }
    const typeTemplate = (mouvement) => {
        const type = mouvement.type
        const textClass = type == 'entree' ? 'text-theme-xs text-green-600 font-bold' : 'text-theme-xs text-red-600 font-bold'

        return (
            <>
                <span className={textClass}>{type}</span>
            </>
        )
    }
    const codeStockTemplate = (mouvement) => {
        const stock = stocks.find((item) => {
            return item.id == mouvement.stock_id
        })
        const codeStock = mouvement.stocks?.code_stock
        const idStock = mouvement.stock_id
        const linkSee = `/details-stock/${idStock}`
        const owner = mouvement.stocks?.stockOwner?.fullname

        return (
            <>
                <span className="font-bold text-gray-700">
                    <Link to={linkSee} className="flex flex-col">
                        <span>{codeStock}</span>
                        {owner && <span className="font-medium text-gray-500">{owner}</span>}
                    </Link>
                </span>
            </>
        )
    }
    const pieceTemplate = (mouvement) => {
        const piece = items.find((item) => {
            return mouvement.piece_id == item.id_piece
        })
        const nomPiece = mouvement.items.nom_piece

        const model = models.find((item) => {
            return mouvement.model_id == item.id_model
        })
        const nomModel = mouvement.model_piece.nom_model

        return (
            <>
                <div className="flex flex-col">
                    <span className="text-theme-xs font-medium text-gray-700">{nomPiece}</span>
                    <span className="text-cyan-700 font-bold">{nomModel}</span>
                </div>
            </>
        )
    }
    const modelTemplate = (mouvement) => {
        const model = models.find((item) => {
            return mouvement.model_id == item.id_model
        })

        const nomModel = model ? model.nom_model : 'N/A'

        return (
            <>
                <span className="p-1 rounded-2xl text-white bg-gray-dark text-xs font-bold">{nomModel}</span>
            </>
        )
    }
    const mouvementTemplate = (mouvement) => {
        const type = typesMouvement.find((item) => {
            return mouvement.mouvement == item.id
        })

        const nomType = mouvement.type_mouvement_stock.titre

        return (
            <>
                <span className="font-medium text-gray-800">{nomType}</span>
            </>
        )
    }
    const initialTemplate = (mouvement) => {
        return (
            <>
                <span className="text-sm font-bold">{mouvement.stock_initial}</span>
            </>
        )
    }
    const quantiteTemplate = (mouvement) => {
        const isEntree = mouvement.type == 'entree' ? true : false
        const textClass = isEntree ? 'text-sm font-bold text-green-700' : 'text-sm font-bold text-red-700'
        const quantite = isEntree ? `+${mouvement.quantite}` : `-${mouvement.quantite}`

        return (
            <>
                <span className={textClass}>{quantite}</span>
            </>
        )
    }
    const finalTemplate = (mouvement) => {
        return (
            <>
                <span className="text-sm font-bold">{mouvement.stock_final}</span>
            </>
        )
    }
    const totalTemplate = (mouvement) => {
        return (
            <>
                <span className="text-sm font-bold">{mouvement.quantite_totale_piece}</span>
            </>
        )
    }
    const origineTemplate = (mouvement) => {
        const service = services.find((item) => {
            return mouvement.service_origine == item.id
        })

        // const nomService = service ? service.nom_service : origine ? origine : 'N/A'
        const origine = mouvement.services_mouvement_stock_service_origineToservices ? mouvement.services_mouvement_stock_service_origineToservices.nom_service : mouvement.origine ? mouvement.origine : 'N/A'

        return (
            <>
                <span className="font-bold">{origine}</span>
            </>
        )
    }
    const destinationTemplate = (mouvement) => {
        const service = services.find((item) => {
            return mouvement.service_destination == item.id
        })

        // const nomService = service ? service.nom_service : destination ? destination : 'N/A'
        const destination = mouvement.services_mouvement_stock_service_destinationToservices ? mouvement.services_mouvement_stock_service_destinationToservices.nom_service : mouvement.destination ? mouvement.destination : 'N/A'

        return (
            <>
                <span className="font-bold">{destination}</span>
            </>
        )
    }
    const dateTemplate = (mouvement) => {
        return (
            <>
                <span className="text-theme-xs text-gray-700 font-medium">{formatDate(mouvement.created_at)}</span>
            </>
        )
    }
    const livraisonTemplate = (mouvement) => {
        const idLivraison = mouvement.formulaire_id ? `#${mouvement.formulaire_id}` : 'N/A'
        const textClass = mouvement.formulaire_id ? 'text-xs font-bold italic' : 'text-xs font-bold'
        return (
            <>
                <span className={textClass}>{idLivraison}</span>
            </>
        )
    }
    const demandeTemplate = (mouvement) => {
        const idDemande = mouvement.demande_id ? `#${mouvement.demande_id}` : 'N/A'
        const textClass = mouvement.demande_id ? 'text-xs font-bold italic' : 'text-xs font-bold'
        return (
            <>
                <span className={textClass}>{idDemande}</span>
            </>
        )
    }
    const actionsTemplate = (mouvement) => {
        const linkSee = `/details-mouvement/${mouvement.id}`
        return (
            <>
                <span className="flex items-center justify-center">
                    <Link to={linkSee}>
                        <button>
                            <i className="pi pi-eye"></i>
                        </button>
                    </Link>
                </span>
            </>
        )
    }

    const filteredMouvementStock = allMouvement.filter((item) => {

        const dateMouvement = new Date(item.created_at);
        const dateMouvementPlus = periode ? new Date(periode[1]) : null;
        dateMouvementPlus?.setDate(dateMouvementPlus.getDate() + 1);
        const nextDay = dateMouvementPlus ? new Date(dateMouvementPlus) : null;

        const matchesPeriode = periode ? (periode[0] <= dateMouvement && nextDay >= dateMouvement) : true;
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);
        const matchesItem = selectedItems.length === 0 || selectedItems.includes(item.piece_id);
        const matchesModel = selectedModels.length === 0 || selectedModels.includes(item.model_id);
        const matchesServiceOrigine = selectedServiceOrigines.length === 0 || selectedServiceOrigines.includes(item.service_origine);
        const matchesServiceReception = selectedServiceReceptions.length === 0 || selectedServiceReceptions.includes(item.service_destination);
        const matchesStock = selectedStocks.length === 0 || selectedStocks.includes(item.stock_id);
        const matchesMouvement = selectedMouvements.length === 0 || selectedMouvements.includes(item.mouvement);
         const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;

        return matchesPeriode && matchesType && matchesItem && matchesModel && matchesServiceOrigine && matchesServiceReception && matchesStock && matchesMouvement && matchesGlobalFilter;
    });

    return (
        <>
            <div className="border rounded-2xl bg-white p-2">
                <div className="p-6 space-y-7">
                    <div className="flex items-center">
                        <div className="relative w-full">
                            <Input
                                className="pl-10"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                placeholder="Rechercher..."
                            />
                            <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                        </div>
                        <span className="pl-4">
                            <button onClick={handleClearFilters}>
                                <i className="pi pi-refresh"></i>
                            </button>
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <MultiSelect
                            value={selectedTypes}
                            onChange={(e) => setSelectedTypes(e.value)}
                            options={optionsTypes}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par type de mouvement"
                            className=""
                        />
                        <MultiSelect
                            label="Filtrer par pièces"
                            options={optionsPieces}
                            display="chip"
                            value={selectedItems}
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par pièce"
                            className=""
                            onChange={(e) => setSelectedItems(e.value)}
                        />
                        <MultiSelect
                            label="Model"
                            options={optionsModels}
                            display="chip"
                            value={selectedModels}
                            optionLabel="label"
                            maxSelectedLabels={2}
                            placeholder="Filtrer par modèle"
                            className=""
                            onChange={(e) => setSelectedModels(e.value)}
                        />
                        <MultiSelect
                            value={selectedStocks}
                            options={optionsStocks}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedStocks(e.value)}
                            placeholder="Filtrer par stock"
                            className=""
                        />
                        <MultiSelect
                            value={selectedServiceOrigines}
                            options={optionsServiceOrigines}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedServiceOrigines(e.value)}
                            placeholder="Filtrer par service d'origine"
                            className=""
                        />
                        <MultiSelect
                            value={selectedServiceReceptions}
                            options={optionsServiceReceptions}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedServiceReceptions(e.value)}
                            placeholder="Filtrer par service recepteur"
                            className=""
                        />
                        <MultiSelect
                            value={selectedMouvements}
                            options={optionsMouvements}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedMouvements(e.value)}
                            placeholder="Filtrer par mouvement"
                            className=""
                        />
                    </div>
                    <div className="flex justify-normal flex-wrap gap-3">
                        <div>
                            <Label>Période</Label>
                            <Calendar
                                value={periode}
                                onChange={(e) => {
                                    setPeriode(e.value)
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
                <div className="">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        {filteredMouvementStock.length} mouvement(s) trouvé(s)
                    </span>
                </div>,
                <div className="card">
                    <DataTable
                        value={filteredMouvementStock}
                        loading={loading}
                        removableSort
                        paginator
                        rows={rows}
                        first={first}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                        tableStyle={{ minWidth: '50rem', fontSize: '10px' }}
                        emptyMessage="Aucun mouvement trouvé"
                        className="p-datatable-sm flex-wrap">

                        <Column field="id" header="ID" body={idTemplate} sortable></Column>
                        <Column field="type" header="Type" body={typeTemplate}></Column>
                        <Column field="stock_id" header="Code Stock" body={codeStockTemplate}></Column>
                        <Column field="piece_id" header="Pièce" body={pieceTemplate}></Column>
                        {/* <Column field="model_id" header="Modèle" body={modelTemplate}></Column> */}
                        <Column field="mouvement" header="Mouvement" body={mouvementTemplate}></Column>
                        <Column field="stock_initial" header="Stock Initial" body={initialTemplate} sortable></Column>
                        <Column field="quantite" header="Quantité" body={quantiteTemplate} sortable></Column>
                        <Column field="stock_final" header="Stock Final" body={finalTemplate} sortable></Column>
                        <Column field="quantite_totale_piece" header="Qte Totale" body={totalTemplate} sortable></Column>
                        <Column field="service_origine" header="Origine" body={origineTemplate}></Column>
                        <Column field="service_destination" header="Destination" body={destinationTemplate}></Column>
                        <Column field="created_at" header="Date" body={dateTemplate} sortable></Column>
                        {/* <Column header="Actions" body={actionsTemplate}></Column> */}
                        {/* <Column field="formulaire_id" header="ID Livraison" body={livraisonTemplate} sortable></Column> */}
                        {/* <Column field="demande_id" header="ID Demande" body={demandeTemplate} sortable></Column> */}

                    </DataTable>
                </div>
            </div>
        </>
    )
}