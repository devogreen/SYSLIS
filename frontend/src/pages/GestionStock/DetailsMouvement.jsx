import { use, useEffect, useState } from "react"
import { useParams, Link, useNavigate, useAsyncError } from "react-router"
import PageBreadcrumb from "../../components/common/PageBreadCrumb"
import { Stock } from "../../backend/stock/Stock"
import { Users } from "../../backend/users/Users"

export default function DetailsMouvement() {

    const stockData = new Stock()
    const userData = new Users()
    const { id } = useParams()
    const user_id = localStorage.getItem('id')

    const [mouvementDetails, setMouvementDetails] = useState([])
    const [nomPiece, setNomPiece] = useState('')
    const [nomModel, setNomModel] = useState()
    const [nomService, setNomService] = useState('')

    const [typeMouvement, setTypeMouvement] = useState('')
    const [isEntree, setIsEntree] = useState(true)

    const [origine, setOrigine] = useState('')
    const [destination, setDestination] = useState('')

    const [date, setDate] = useState('')

    const [parLot, setParLot] = useState(false)
    const [parCartonLot, setParCartonLot] = useState(false)
    const [parPieceCarton, setParPieceCarton] = useState(false)
    const [parCarton, setParCarton] = useState(false)
    const [parPiece, setParPiece] = useState(false)

    const [stockInitial, setStockInitial] = useState(0)
    const [stockFinal, setStockFinal] = useState(0)
    const [mouvementStock, setMouvementStock] = useState(0)

    const [stockInitialPiece, setStockInitialPiece] = useState(0)
    const [stockFinalPiece, setStockFinalPiece] = useState(0)
    const [mouvementStockPiece, setMouvementStockPiece] = useState(0)

    const [loading, setLoading] = useState(false)

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    useEffect(() => {
        const fecthData = async () => {
            try {
                setLoading(true)

                const mouvement_data = await stockData.getOneMouvement(id)
                setMouvementDetails(mouvement_data)
                const type = mouvement_data.type
                const typeCheck = type == 'entree' ? true : false
                setIsEntree(typeCheck)
                const date_mouvement = mouvement_data.created_at
                setDate(formatDate(date_mouvement))
                const service_origine_id = mouvement_data.service_origine
                const service_destination_id = mouvement_data.service_destination
                setStockInitial(mouvement_data.stock_initial)
                setMouvementStock(mouvement_data.quantite)
                setStockFinal(mouvement_data.stock_final)
                const model_id = mouvement_data.model_id

                const type_mouvement_id = mouvement_data.mouvement
                const piece_id = mouvement_data.piece_id

                const details = JSON.parse(mouvement_data.details_mouvement)

                const typeMouvement_data = await stockData.getAllTypeMouvementStock()
                const typeMouvement = typeMouvement_data.find((item) => {
                    return item.id == type_mouvement_id
                })
                switch (type_mouvement_id) {
                    case 1:
                        setParLot(true);
                        break;
                    case 2:
                        setParCartonLot(true);
                        break;
                    case 3:
                        setParPieceCarton(true);
                        break;
                    case 4:
                        setParCarton(true);
                        setStockInitialPiece(details.stockInitialPiece)
                        setStockFinalPiece(details.stockFinalPiece)
                        setMouvementStockPiece(details.quantiteMouvementPiece)
                        break;
                    case 5:
                        setParPiece(true);
                        break;
                    default:
                        break
                }
                const nom_type = typeMouvement ? typeMouvement.titre : ''
                setTypeMouvement(nom_type)

                const piece_data = await stockData.getPiece(piece_id)
                setNomPiece(piece_data.nom_piece)

                const services_data = await userData.getAllServices()
                const service_origine = services_data.find((item) => {
                    return item.id == service_origine_id
                })
                const nom_origine = service_origine ? service_origine.nom_service : ''
                setOrigine(nom_origine)

                const service_destination = services_data.find((item) => {
                    return item.id == service_destination_id
                })
                const nom_destination = service_destination ? service_destination.nom_service : ''
                setDestination(nom_destination)

                const models_data = await stockData.getAllModels()
                const model = models_data.find((item) => {
                    return item.id_model == model_id
                })
                const nom_model = model ? model.nom_model : ''
                setNomModel(nom_model)

            } catch (error) {
                console.log("Error fetchind data ", error)
            } finally {
                setLoading(false)
            }
        }
        fecthData()
    }, [id])
    return (
        <>
            <div className="flex justify-center items-center">
                {loading ? (
                    <>
                        <span className="">Loading...</span>
                    </>
                ) : (
                    <>
                        <div className="border bg-white rounded-2xl w-11/12 p-4">
                            <div className="space-y-6">
                                <div className="pb-6 border-b">
                                    <div>
                                        <span>
                                            {isEntree ? (
                                                <>
                                                    <span className="text-green-600 font-bold text-2xl">Entree </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-red-600 font-bold text-2xl">Sortie </span>
                                                </>
                                            )}
                                        </span>
                                        <span>de stock <span className="font-medium">{nomPiece} | <span className="text-red-800">{nomModel}</span></span></span>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium">{typeMouvement}</span>
                                    </div>
                                </div>
                                <div className="pb-6 border-b">
                                    <div>
                                        <span className="text-sm font-normal">Le {date}</span>
                                    </div>
                                    <div>
                                        <div>
                                            {origine ? (
                                                <>
                                                    <span>
                                                        <span className="text-sm text-gray-700">provenance : </span>{origine}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            {destination ? (
                                                <>
                                                    <span>
                                                        <span className="text-sm text-gray-700">arrivé : </span>{destination}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="space-y-5">
                                        <div>
                                            {parLot ? (
                                                <>
                                                </>
                                            ) : (
                                                <>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            {parCarton ? (
                                                <>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <span className="text-sm">Stock Initial Carton : <span className="text-xl font-bold text-cyan-900">{stockInitial}</span></span>
                                                        </div>
                                                        <div>
                                                            {isEntree ? (
                                                                <>
                                                                    <span className="text-sm">Mouvement : <span className="text-xl font-medium text-green-700"> +{mouvementStock}</span></span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="text-sm">Mouvement : <span className="text-xl font-medium text-red-700"> -{mouvementStock}</span></span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="text-sm">Stock final Carton : <span className="text-xl font-medium text-cyan-900">{stockFinal}</span></span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>

                                                </>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-sm">Stock Initial Pièce : <span className="text-xl font-bold text-cyan-900">{stockInitialPiece}</span></span>
                                            </div>
                                            <div>
                                                {isEntree ? (
                                                    <>
                                                        <span className="text-sm">Mouvement : <span className="text-xl font-medium text-green-700"> +{mouvementStockPiece}</span></span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-sm">Mouvement : <span className="text-xl font-medium text-red-700"> -{mouvementStockPiece}</span></span>
                                                    </>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-sm">Stock final pièce : <span className="text-xl font-medium text-cyan-900">{stockFinalPiece}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}