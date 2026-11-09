import { useState, useEffect } from "react"
import { useParams, Link } from "react-router"
import { Stock } from "../../backend/stock/Stock"
import { Users } from "../../backend/users/Users";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { MultipleCogs } from "../../icons";
import { all } from "axios";
import AideGuideButton from "../../components/guide/AideGuideButton";

export default function ItemDetails() {

    const { id } = useParams()
    const stockData = new Stock()
    const UserData = new Users()

    const [loading, setLoading] = useState(false)
    const [nomPiece, setNomPiece] = useState('')
    const [creationDate, setCreationDate] = useState('')
    const [stocks, setStocks] = useState([])
    // const [modelStocks, setModelStocks] = useState([])
    const [models, setModels] = useState([])
    const [classModels, setClassModels] = useState('')
    const [selectedModel, setSelectedModel] = useState(null)
    const [hasManyModels, setHasManyModel] = useState(false)
    const [quantites, setQuantites] = useState([])
    // const [modelServices, setModelServices] = useState([])
    const [services, setServices] = useState([])
    const [allModels, setAllModels] = useState([])

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const piece_data = await stockData.getPiece(id)
                setNomPiece(piece_data.nom_piece)

                const date = piece_data.created_at ? piece_data.created_at : 'inconnu'
                setCreationDate(date)

                const stocks_data = await stockData.getStockParPiece(id)
                setStocks(stocks_data)

                const models_data = await stockData.getItemModels(id)
                setModels(models_data.model_piece)
                const classModelText = `grid grid-cols-${models_data.model_piece.length}`
                // console.log(classModelText)
                setClassModels(classModelText)

                if (models_data.model_piece.length > 1) {
                    setHasManyModel(true)
                } else {
                    const modelId = models_data.model_piece[0].id_model
                    setSelectedModel(modelId)
                }

                // Quantités par service : l'ancienne table stock_piece n'est plus alimentée (affichage retiré) ;
                // les quantités viennent des stocks ci-dessus.

                const services_data = await UserData.getAllServices()
                setServices(services_data)

                const allModels_data = await stockData.getAllModels()
                setAllModels(allModels_data)

            } catch (error) {
                console.log("Error fetching data : ", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleSelectModel = (id) => {
        setSelectedModel(id)
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

    const serviceTemplate = (stock) => {
        const service = services.find((item) => {
            return item.id == stock.service_id
        })
        const nomService = service ? service.nom_service : 'N/A'
        return (
            <>
                <span className="font-medium">{nomService}</span>
            </>
        )
    }

    const modelTemplate = (stock) => {
        const model = allModels.find((item) => {
            return item.id_model == selectedModel
        })
        const nomModel = model ? model.nom_model : 'N/A'
        return (
            <>
                <span className="font-medium">{nomModel}</span>
            </>
        )
    }

    const modelServices = quantites.filter((item) => {
        return item.model_id == selectedModel
    })

    const modelStocks = stocks.filter((item) => {
        return item.model_id == selectedModel
    })
    return (
        <>
            <div>
                <div className="flex justify-end mb-2">
                    <AideGuideButton />
                </div>
                <div className="border rounded-2xl bg-white">
                    <div>
                        <div className="p-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div>
                                        <span className="text-sm text-gray-700 font-medium">Informations pièce</span>
                                    </div>
                                    <div>
                                        <span className="text-sm rounded-2xl bg-green-200 px-1.5">{nomPiece}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs">Créé le <span className="font-semibold">{creationDate}</span> </span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-blue-light-700" style={{ fontSize: "70px" }}>
                                        <MultipleCogs />
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div>
                                    <span className="text-sm text-gray-700 font-medium">Informations stock</span>
                                </div>
                                {hasManyModels ? (
                                    <div>
                                        <div className="text-center">
                                            <span className="text-xs rounded-sm bg-blue-300 px-1.5 font-semibold">Modèles</span>
                                        </div>
                                        <div>
                                            <div className={classModels}>
                                                {models.map((item) => {
                                                    const nom = item.nom_model

                                                    return (
                                                        <>
                                                            <button key={item.id_model} className="text-center border-white rounded-xs font-medium text-xs border px-1 py-1.5 bg-gray-100 hover:bg-gray-200"
                                                                onClick={() => handleSelectModel(item.id_model)}
                                                            >
                                                                <span>{nom}</span>
                                                            </button>
                                                        </>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <></>
                                )}
                                <div>
                                    <div>
                                        {selectedModel ? (
                                            <>
                                                <div>
                                                    {/* <div>
                                                        <span className="text-xs bg-blue-200 px-1.5 font-semibold">Stocks par service</span>
                                                        <div className="grid grid-cols-6">
                                                            {modelServices.map((item) => {
                                                                const service = services.find((s) => {
                                                                    return s.id == item.service_id
                                                                })
                                                                const nomService = service ? service.nom_service : '???'

                                                                const model = allModels.find((item) => {
                                                                    return item.id_model == selectedModel
                                                                })
                                                                const nomModel = model ? model.nom_model : 'N/A'



                                                                return (
                                                                    <>
                                                                        <div className="rounded-md flex flex-col text-center h-20 justify-center bg-red-200">
                                                                            <span className="text-xs text-red-800">{nomService}</span>
                                                                            <span className="text-5xl text-red-900 font-semibold">{item.quantite}</span>
                                                                            <span className="text-xs font-semibold">{nomModel}</span>
                                                                        </div>
                                                                    </>
                                                                )
                                                            })}
                                                        </div>
                                                    </div> */}
                                                    <div>
                                                        <span className="text-xs bg-blue-200 px-1.5 font-semibold">Stocks par code</span>
                                                        <DataTable
                                                            value={modelStocks}
                                                            removableSort
                                                            paginator
                                                            rows={4}
                                                            rowsPerPageOptions={[1, 2, 3, 4, 5, 10]}
                                                            tableStyle={{ fontSize: '11px' }}
                                                            emptyMessage="Aucun stock trouvé"
                                                            className="p-datatable-sm">

                                                            <Column field="id" header="ID"></Column>
                                                            <Column field="code_stock" header="Code" body={codeTemplate}></Column>
                                                            <Column field="service_id" header="Service" body={serviceTemplate}></Column>
                                                            <Column field="model_id" header="Modèle" body={modelTemplate}></Column>
                                                            <Column field="quantite_piece" header="Quantité"></Column>
                                                            <Column field="created_at" header="Date creation"></Column>

                                                        </DataTable>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}