import { useEffect, useState } from "react"
import { Stock } from "../../backend/stock/Stock"
import { Users } from "../../backend/users/Users";

import { Link } from "react-router"

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';


import Input from "../form/input/InputField";

import { MultiSelect } from "primereact/multiselect";

export default function AllStocksList() {

    const stockData = new Stock()
    const userData = new Users()

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateStock"));
    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allStocksFilters";
    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };
    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();
    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");
    const [optionsItems, setOptionsItems] = useState([])
    const [selectedPieces, setSelectedPieces] = useState(savedFilters?.selectedPieces || []);
    const [optionsModels, setOptionsModels] = useState([]);
    const [selectedModels, setSelectedModels] = useState(savedFilters?.selectedModels || []);
    const [optionsServices, setOptionsServices] = useState([])
    const [selectedServices, setSelectedServices] = useState(savedFilters?.selectedServices || []);

    const [loading, setLoading] = useState(false)
    const [stocks, setStocks] = useState([])
    const [items, setItems] = useState([])
    const [models, setModels] = useState([])
    const [services, setServices] = useState([])
    const [users, setUsers] = useState([])

    const [optionUsers, setOptionUsers] = useState([])
    const [selectedUsers, setSelectedUsers] = useState(savedFilters?.selectedUsers || [])
    
    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedPieces,
            selectedModels,
            selectedServices,
            selectedUsers,
        });
    }, [globalFilter, selectedPieces, selectedModels, selectedServices, selectedUsers]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const stocks_data_all = await stockData.getAllStocks()
                const stocks_data = stocks_data_all.filter((item) => {
                    return item.is_deleted == false
                })
                setStocks(stocks_data)

                const piece_data_all = await stockData.getAllItems()
                const piece_data = piece_data_all.filter((item) => {
                    return item.is_deleted == false
                })
                setItems(piece_data)
                const options_pieces = piece_data.map((item) => ({
                    value: item.id_piece,
                    label: item.nom_piece,
                }))
                setOptionsItems(options_pieces)

                const models_data = await stockData.getAllModels()
                setModels(models_data)
                const options_models = models_data.map((item) => ({
                    value: item.id_model,
                    label: item.nom_model,
                }))
                setOptionsModels(options_models)

                const services_data = await userData.getAllServices()
                setServices(services_data)
                const options_services = services_data.map((item) => ({
                    value: item.id,
                    label: item.nom_service,
                }))
                setOptionsServices(options_services)

                const users_data_all = await userData.getAllUsers()
                const users_data = users_data_all.filter((item) => {
                    return item.is_deleted == false
                })
                setUsers(users_data)
                const options_users = users_data.map((item) => ({
                    value: item.id_user,
                    label: item.fullname,
                }))
                setOptionUsers(options_users)
                

            } catch (error) {
                console.log('Error fetching the data ', error)
            } finally {
                setLoading(false)
            }
        };
        fetchData()
    }, [])

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
        sessionStorage.setItem("paginationStateStock", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedPieces([])
        setSelectedModels([])
        setSelectedServices([])
        setSelectedUsers([])
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const idTemplate = (stock) => {
        return (
            <>
                <span className="text-theme-xs font-medium">{stock.id}</span>
            </>
        )
    }
    const codeTemplate = (stock) => {
        const linkSee = `/details-stock/${stock.id}`
        return (
            <>
                <span className="text-theme-xs font-bold">
                    <Link to={linkSee}>{stock.code_stock}</Link>
                </span>
            </>
        )
    }
    const pieceTemplate = (stock) => {
        const piece = items.find((item) => {
            return stock.piece_id == item.id_piece
        })
        const nomPiece = stock.items.nom_piece

        const model = models.find((item) => {
            return stock.model_id == item.id_model
        })
        const nomModel = stock.model_piece.nom_model

        const service = services.find((item) => {
            return stock.service_id == item.id
        })
        const nomService = stock.services.nom_service

        return (
            <>
                <div className="flex flex-col">
                    <span className="text-gray-600 font-medium text-sm">{nomPiece}</span>
                    <span className="text-cyan-900 text-xs" style={{ fontSize: '10px' }}>
                        <span className="font-bold">{nomModel} </span>|
                        <span className="font-medium"> {nomService}</span>
                    </span>
                </div>
            </>
        )
    }
    const quantitePieceTemplate = (stock) => {
        return (
            <>
                <span className="text-sm font-semibold">{stock.quantite_piece}</span>
            </>
        )
    }
    const quantiteCartonTemplate = (stock) => {
        return (
            <>
                <span className="text-sm font-semibold">{stock.quantite_carton}</span>
            </>
        )
    }
    const quantiteLotTemplate = (stock) => {
        return (
            <>
                <span className="text-sm font-semibold">{stock.quantite_lot}</span>
            </>
        )
    }
    const dateTemplate = (stock) => {
        return (
            <>
                <span className="text-gray-700 ">{formatDate(stock.last_update)}</span>
            </>
        )
    }
    const userTemplate = (stock) => {
        const user = users.find((item) => {
            return item.id_user == stock.updated_by
        })

        const nomUser = stock.stockOwner.fullname

        return (
            <>
                <span className="font-semibold">{nomUser}</span>
            </>
        )
    }
    const actionsTemplate = (stock) => {
        const linkSee = `/details-stock/${stock.id}`
        return (
            <>
                <div className="flex items-center justify-between">
                    <Link to={linkSee}>
                        <button>
                            <i className="pi pi-eye"></i>
                        </button>
                    </Link>
                    {/* <Link to={`/modifier-stock/${stock.id}`}>
                        <button>
                            <i className="pi pi-pencil"></i>
                        </button>
                    </Link> */}
                </div>
            </>
        )
    }

    const filteredStocks = stocks.filter((item) => {
        const matchesOwners = selectedUsers.length > 0 ? selectedUsers.includes(item.owner) : true
        const matchesPieces = selectedPieces.length > 0 ? selectedPieces.includes(item.piece_id) : true;
        const matchesModels = selectedModels.length > 0 ? selectedModels.includes(item.model_id) : true;
        const matchesServices = selectedServices.length > 0 ? selectedServices.includes(item.service_id) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;

        return matchesOwners && matchesPieces && matchesModels && matchesServices && matchesGlobalFilter
    })
    return (
        <>
            <div className="border rounded-2xl bg-white p-2">
                <div className="space-y-5">
                    <div>
                        <div className="px-6 pt-6 flex items-center">
                            <div className="relative w-full">
                                <Input
                                    className="pl-10"
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    placeholder="Rechercher un stock..."
                                />
                                <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                            </div>
                            <span className="pl-4">
                                <button onClick={handleClearFilters}>
                                    <i className="pi pi-refresh"></i>
                                </button>
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 p-6 pb-0">
                            <MultiSelect
                                value={selectedPieces}
                                options={optionsItems}
                                display="chip"
                                optionLabel="label"
                                maxSelectedLabels={2}
                                onChange={(e) => setSelectedPieces(e.value)}
                                placeholder="Filtrer par pièce"
                                className=""
                            />
                            <MultiSelect
                                value={selectedModels}
                                options={optionsModels}
                                display="chip"
                                optionLabel="label"
                                maxSelectedLabels={2}
                                onChange={(e) => setSelectedModels(e.value)}
                                placeholder="Filtrer par modèles"
                                className=""
                            />
                            <MultiSelect
                                value={selectedServices}
                                options={optionsServices}
                                display="chip"
                                optionLabel="label"
                                maxSelectedLabels={2}
                                onChange={(e) => setSelectedServices(e.value)}
                                placeholder="Filtrer par services"
                                className=""
                            />
                            <MultiSelect
                                value={selectedUsers}
                                options={optionUsers}
                                display="chip"
                                optionLabel="label"
                                maxSelectedLabels={2}
                                onChange={(e) => setSelectedUsers(e.value)}
                                placeholder="Filtrer par propriétaires"
                                className=""
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between p-2 items-center">
                            <div className="flex space-x-3 items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {filteredStocks.length} stock(s) trouvé(s)
                                </span>
                            </div>
                        </div>
                        <div className="card rounded-2xl">
                            <DataTable
                                value={filteredStocks}
                                loading={loading}
                                removableSort
                                paginator
                                rows={rows}
                                first={first}
                                onPage={handlePageChange}
                                rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                                tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                                emptyMessage="Aucun stock trouvé"
                                className="p-datatable-sm">

                                <Column field="id" header="ID" body={idTemplate} sortable></Column>
                                <Column field="code_stock" body={codeTemplate} header="Code Stock"></Column>
                                <Column field="piece_id" header="Pièce" body={pieceTemplate}></Column>
                                <Column field="quantite_piece" header="Qte Pièce" body={quantitePieceTemplate} sortable></Column>
                                <Column field="quantite_carton" header="Qte Carton" body={quantiteCartonTemplate} sortable></Column>
                                <Column field="quantite_lot" header="Qte Lot" body={quantiteLotTemplate} sortable></Column>
                                <Column field="last_update" header="Dernière Modification" body={dateTemplate} sortable></Column>
                                <Column field="updated_by" header="Propriétaire" body={userTemplate}></Column>
                                <Column header="Actions" body={actionsTemplate}></Column>

                            </DataTable>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}