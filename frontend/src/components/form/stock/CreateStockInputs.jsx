import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate, useLocation } from "react-router"
import ComponentCard from "../../common/ComponentCard"
import { Stock } from "../../../backend/stock/Stock"
import { Users } from "../../../backend/users/Users"
import { Modal } from "../../ui/modal"
import Swal from 'sweetalert2'
import { ProgressSpinner } from 'primereact/progressspinner';
import Input from "../input/InputField"
import Label from "../Label"
import TextArea from "../input/TextArea"
import Select from "../Select"
import Checkbox from "../input/Checkbox"
import { MultiSelect } from "primereact/multiselect"
// import FileInput from "../input/FileInput"
import { FileUpload } from "primereact/fileupload"
import ExcelJS from "exceljs"
import { Demandes } from "../../../backend/demandes/Demandes"

export default function CreateStockInputs() {

    const stockData = new Stock()
    const userData = new Users()
    const demandeData = new Demandes()

    const navigate = useNavigate();
    const userId = localStorage.getItem('id');

    // const idDemande = sessionStorage.getItem('id_demande')
    const location = useLocation();
    const { from, idDemande } = location.state || {};
    const [fromSuccess, setFromSuccess] = useState('/voir-stocks')
    const [fromFail, setFromFail] = useState('/voir-stocks')

    const [loading, setLoading] = useState(false)

    const [quantitePiece, setQuantitePiece] = useState(null)
    const [newStockPiece, setNewStockPiece] = useState(0)
    const [finalStockPiece, setFinaleStockPiece] = useState(0)
    const [entreeParPieceModalOpen, setEntreeParPieceModalOpen] = useState(false)

    const [quantiteCarton, setQuantiteCarton] = useState(null)
    const [newStockCarton, setNewStockCarton] = useState(0)
    const [finalStockCarton, setFinalStockCarton] = useState(0)
    const [quantitePieceCarton, setQuantitePieceCarton] = useState(0)
    const [entreeParCartonModalOpen, setEntreeParCartonModalOpen] = useState(false)
    const [selectedCartons, setSelectedCartons] = useState([])
    const [listeCartons, setListeCartons] = useState([])

    const [stockPieceCarton, setStockPieceCarton] = useState(0)
    const [finalStockPieceCarton, setFinalStockPieceCarton] = useState(0)
    const [selectedCarton, setSelectedCarton] = useState(null)
    const [nomCarton, setNomCarton] = useState('')

    const [stockCartonLot, setStockCartonLot] = useState(0)
    const [finalStockCartonLot, setFinalStockCartonLot] = useState(0)
    const [selectedLot, setSelectedLot] = useState(null)
    const [nomLot, setNomLot] = useState('')
    const [stockPieceLot, setStockPieceLot] = useState(0)
    const [finalStockPieceLot, setFinalStockPieceLot] = useState(0)

    const [quantiteLot, setQuantiteLot] = useState(null)
    const [newStockLot, setNewStockLot] = useState(0)
    const [finalStockLot, setFinalStockLot] = useState(0)
    const [quantiteCartonLot, setQuantiteCartonLot] = useState(0)
    const [selectedLots, setSelectedLots] = useState([])
    const [listeLots, setListeLots] = useState([])
    const [entreeParLotModalOpen, setEntreeParLotModalOpen] = useState(false)

    const [nomPiece, setNomPiece] = useState('')

    const [motif, setMotif] = useState('INITIALISATION DE STOCK')
    const [commentaire, setCommentaire] = useState('')

    const [error, setError] = useState('')
    const [loadingValidation, setLoadingValidation] = useState(false)

    const [isEntree, setIsEntree] = useState(true)

    const [optionsLot, setOptionsLot] = useState([])
    const [optionsCartons, setOptionsCartons] = useState([])

    const [models, setModels] = useState([])
    const [optionsModels, setOptionsModels] = useState([])
    const [selectedModel, setSelectedModel] = useState()
    const [nomModel, setNomModel] = useState('')

    const [services, setServices] = useState([])
    const [optionsServices, setOptionsServices] = useState([])
    const [selectedService, setSelectedService] = useState()
    const [nomService, setNomService] = useState('')

    const [parLot, setParLot] = useState(false)
    const [parCartonLot, setParCartonLot] = useState(false)
    const [parPieceCarton, setParPieceCarton] = useState(false)
    const [parCarton, setParCarton] = useState(false)
    const [parPiece, setParPiece] = useState(false)
    const [parSn, setParSn] = useState(false)

    const [selectedEntree, setSelectedEntree] = useState(true)

    const [codeStock, setCodeStock] = useState('')

    const [itemsList, setItemsList] = useState([])
    const [optionsPieces, setOptionsPieces] = useState([])
    const [selectedPiece, setSelectedPiece] = useState(null)

    const [pieceLoading, setPieceLoading] = useState(false)

    const [detailsMouvement, setDetailsMouvement] = useState([])

    const [origine, setOrigine] = useState('')
    const [destination, setDestination] = useState('')

    const [stocks, setStocks] = useState([])

    const [avecLot, setAvecLot] = useState(false)
    const [avecCarton, setAvecCarton] = useState(false)

    const [excelFile, setExcelFile] = useState(null)
    const [analysis, setAnalysis] = useState(null);
    const [entreeParSnModalOpen, setEntreeParSnModalOpen] = useState(false)

    const [isDemande, setIsDemande] = useState(false)

    const isOnlyDigits = (str) => /^\d+$/.test(str);

    useEffect(() => {
        const fetchPieces = async () => {
            setLoading(true)
            try {
                const pieces_data_all = await stockData.getAllItems()
                const pieces_data = pieces_data_all.filter((item) => {
                    return item.is_deleted == false
                })
                setItemsList(pieces_data)
                const options_pieces = pieces_data.map((item) => ({
                    value: item.id_piece,
                    label: item.nom_piece
                }))
                setOptionsPieces(options_pieces)

                const stocks_data_all = await stockData.getAllStocks()
                const stocks_data = stocks_data_all.filter((item) => {
                    return item.is_deleted == false
                })
                setStocks(stocks_data)

                let userRoles_data = await userData.getUserRoles(parseInt(userId))
                const roles_id = userRoles_data.roles.map((role) => {
                    return role.id_role
                })
                if (idDemande) {
                    const demande_data = await demandeData.getOneDemande(idDemande)
                    const details = JSON.parse(demande_data.details_demande)

                    setSelectedPiece(demande_data.item_id)
                    setIsDemande(true)
                    const piece = pieces_data.find((item) => {
                        return item.id_piece == demande_data.item_id
                    })
                    const nom = piece ? piece.nom_piece : ''
                    setNomPiece(nom)
                    setSelectedModel(details.selectedModel)
                    setSelectedService(details.selectedServicePiece)

                    const models_data = await stockData.getAllModels()
                    const model = models_data.find((item) => {
                        return item.id_model == details.selectedModel
                    })
                    if (model) {
                        setNomModel(model.nom_model)
                    }

                    const services_data = await userData.getAllServices()
                    const service = services_data.find((item) => {
                        return item.id == details.selectedServicePiece
                    })
                    const nomService = service ? service.nom_service : ''
                    setNomService(nomService)
                    if (!['valide', 'partiel'].includes(demande_data.statut_demande) && roles_id.includes(4)) {
                        const successPath = from === "demande-details"
                            ? `/valider-demande/${idDemande}`
                            : "/voir-stocks";
                        setFromSuccess(successPath)

                        const failPath = from === "demande-details"
                            ? `/demande-details/${idDemande}`
                            : "/voir-stocks";
                        setFromFail(failPath)
                    } else if (['valide', 'partiel'].includes(demande_data.statut_demande)) {
                        const successPath = `/livraison-demande/${idDemande}`
                        setFromSuccess(successPath)
                    }
                }

            } catch (error) {
                console.log('Error fetching the data ', error)
            } finally {
                setLoading(false)
            }
        };
        fetchPieces()
    }, [])

    const handleSelectPiece = async (value) => {
        setPieceLoading(true)
        setSelectedModel(null)
        setSelectedService(null)
        setSelectedPiece(value)
        const piece = itemsList.find((item) => {
            return item.id_piece == value
        })
        const nom = piece ? piece.nom_piece : ''
        setNomPiece(nom)
        try {
            const itemModels_data = await stockData.getItemModels(value)
            const options_models = itemModels_data.model_piece.map((item) => ({
                value: item.id_model,
                label: item.nom_model.toUpperCase()
            }))
            setOptionsModels(options_models)
            setModels(itemModels_data.model_piece)
            const listModels = itemModels_data.model_piece.map((item) => {
                return item.id_model
            })
            if (listModels.length == 1) {
                setSelectedModel(listModels[0])
                const model = itemModels_data.model_piece.find((item) => {
                    return item.id_model == listModels[0]
                })
                const nomModel = model ? model.nom_model : ''
                setNomModel(nomModel)
            }

            const itemService_data = await stockData.getItemServices(value)
            const options_services = itemService_data.services.map((item) => ({
                value: item.id,
                label: item.nom_service.toUpperCase()
            }))
            setOptionsServices(options_services)
            setServices(itemService_data.services)
            const listServices = itemService_data.services.map((item) => {
                return item.id
            })
            if (listServices.length == 1) {
                setSelectedService(listServices[0])
                const service = itemService_data.services.find((item) => {
                    return item.id == listServices[0]
                })
                const nomService = service ? service.nom_service : ''
                setNomService(nomService)
            }
        } catch (error) {
            console.log('Erreur avec la pièce : ', error)
        } finally {
            setPieceLoading(false)
        }
    }

    const handleSelectModel = (value) => {
        console.log('Selected model value: ', value)
        const model = models.find((item) => {
            return item.id_model == value
        })
        const nomModel = model ? model.nom_model : ''
        setNomModel(nomModel)
        setSelectedModel(value)
    }

    const handleSelectService = (value) => {
        console.log('Selected service value: ', value)
        const service = services.find((item) => {
            return item.id == value
        })
        const nomService = service ? service.nom_service : ''
        setNomService(nomService)
        setSelectedService(value)
    }

    // Création de stock : uniquement des entrées (les sorties se font par une demande ou depuis la page du stock)
    const optionsTypes = [
        { value: "ENTREE", label: "ENTREE" },
    ]

    const handleSelectType = (value) => {
        if (value == "ENTREE") {
            setSelectedEntree(true)
        } else {
            setSelectedEntree(false)
        }
    }

    const normalize = (value) => {
        if (value === null || value === undefined) return null;
        return String(value).trim(); // handles numbers + strings
    };

    const analyzeExcel = async (file) => {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];

        // Read headers dynamically
        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[String(cell.value).trim().toUpperCase()] = colNumber;
        });

        // Required column
        if (!headers["SERIAL NUMBER"]) {
            throw new Error("Missing required column: SERIAL NUMBER");
        }

        const serialNumbers = new Set();
        const cartons = new Set();
        const lots = new Set();

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const sn = normalize(row.getCell(headers["SERIAL NUMBER"]).value);
            if (sn) serialNumbers.add(sn);

            if (headers["CARTON"]) {
                const carton = normalize(row.getCell(headers["CARTON"]).value);
                if (carton) cartons.add(carton);
            }

            if (headers["LOT"]) {
                const lot = normalize(row.getCell(headers["LOT"]).value);
                if (lot) lots.add(lot);
            }
        });

        return {
            serialNumberCount: serialNumbers.size,
            cartonCount: headers["CARTON"] ? cartons.size : null,
            lotCount: headers["LOT"] ? lots.size : null,
        };
    };

    const onUpload = async ({ files }) => {
        if (!files?.length) {
            console.log('No file')
            return
        };
        setAnalysis(null);
        setLoadingValidation(true);
        setExcelFile(files[0])

        try {
            const result = await analyzeExcel(files[0]);
            setAnalysis(result);
        } catch (err) {
            console.log("Error analyse: ", err)
            Swal.fire({
                title: "Error",
                text: `Erreur dans l'upload : ${err.message}`,
                icon: "error"
            })
            setAnalysis(null);
        } finally {
            setLoadingValidation(false);
        }
    };

    const handleSelectLotCarton = async (id) => {
        setSelectedLot(id)
        const cartons_data_all = await stockData.getCartonLot(id)
        const cartons_data = cartons_data_all.filter((item) => {
            return item.is_deleted == false
        })
        const options_cartons = cartons_data.map((item) => ({
            value: item.id,
            label: `Carton ${item.numero_carton} - ${item.quantite_totale_piece} pièces`
        }))
        setOptionsCartons(options_cartons)

        const lot = listeLots.find((item) => {
            return item.id == id
        })
        const nom = lot ? `Lot ${lot.numero_lot}` : ''
        setNomLot(nom)
        const totalCarton = lot ? lot.quantite_carton_lot : 0
        setQuantiteCartonLot(totalCarton)
        const stockCarton = lot ? lot.quantite_carton : 0
        setStockCartonLot(stockCarton)
        const stockPiece = lot ? lot.quantite_piece : 0
        setStockPieceLot(stockPiece)
    }

    const handleSelectCarton = (value) => {
        setSelectedCarton(value)
        const carton = listeCartons.find((item) => {
            return item.id == value
        })
        const nom = carton ? (carton.lot_id ? `Lot ${carton.numero_lot} - Carton ${carton.numero_carton}` : `Carton ${carton.numero_carton}`) : ('')
        setNomCarton(nom)
        const totalPiece = carton ? carton.quantite_piece_carton : 0
        setQuantitePieceCarton(totalPiece)
        const stock = carton ? carton.quantite_totale_piece : 0
        setStockPieceCarton(stock)
    }

    const checkValidate = () => {
        if (!selectedPiece) {
            setError("Vous devez choisir la pièce !")
            return false
        }
        if (!selectedModel) {
            setError("Vous devez choisir le modèle !")
            return false
        }
        if (!selectedService) {
            setError("Vous devez choisir le service !")
            return false
        }
        if (!codeStock) {
            setError("Vous devez déterminer un code au stock !")
            return false
        }
        const existingStock = stocks.find((item) => {
            const sameCode = item.code_stock.toLowerCase().trim() == codeStock.toLowerCase().trim()
            return sameCode
        })

        if (existingStock) {
            setError("Un Stock du même code existe déjà !")
            return
        }
        if (!motif) {
            setError("Vous devez précisier le motif !")
            return false
        }
        setError('')
        return true
    }

    // FONCTIONS POUR MOUVEMENT PAR LOT
    const handleEntreeParLot = () => {
        const newStockLotInt = parseInt(newStockLot)
        if (!checkValidate()) {
            return
        }
        if (newStockLotInt == 0 || isNaN(newStockLotInt) || newStockLotInt == "") {
            setError("Quantité lot invalide !")
            return
        }
        if (quantiteCartonLot == 0 || isNaN(quantiteCartonLot) || quantiteCartonLot == "") {
            setError("Quantite carton invalide !")
            return
        }
        if (quantitePieceCarton == 0 || isNaN(quantitePieceCarton) || quantitePieceCarton == "") {
            setError("Quantite pièce invalide !")
            return
        }
        const details = {
            typeMouvement: 1,
            stockInitialLot: 0,
            quantiteMouvementLot: newStockLotInt,
            stockFinalLot: newStockLotInt,
            stockInitialPiece: 0,
            quantiteMouvementPiece: Number(newStockLotInt * quantiteCartonLot * quantitePieceCarton),
            stockFinalPiece: Number(newStockLotInt * quantiteCartonLot * quantitePieceCarton),
            quantitePieceCarton: Number(quantitePieceCarton),
            stockInitialCarton: 0,
            quantiteMouvementCarton: Number(newStockLotInt * quantiteCartonLot),
            stockFinalCarton: Number(newStockLotInt * quantiteCartonLot),
            quantiteCartonLot: Number(quantiteCartonLot),
            quantitePieceLot: Number(quantitePieceCarton * quantiteCartonLot),
        }
        setDetailsMouvement(details)
        setFinalStockLot(quantiteLot + newStockLotInt)
        setFinalStockCarton(quantiteCarton + (newStockLotInt * quantiteCartonLot))
        setFinaleStockPiece(quantitePiece + (newStockLotInt * quantiteCartonLot * quantitePieceCarton))
        setEntreeParLotModalOpen(true)
        setError('')
        setIsEntree(true)
    }
    // FONCTIONS POUR MOUVEMENT PAR CARTONS LOT
    // FONCTIONS POUR MOUVEMENT PAR PIECES CARTON
    // FONCTIONS POUR MOUVEMENT PAR CARTON
    const handleEntreeParCarton = () => {
        const newStockCartonInt = parseInt(newStockCarton)
        const quantitePieceCartonInt = parseInt(quantitePieceCarton)
        if (!checkValidate()) {
            return
        }
        if (newStockCartonInt == 0 || isNaN(newStockCartonInt) || newStockCartonInt == "") {
            setError("Quantité carton invalide !")
            return
        }
        if (quantitePieceCartonInt == 0 || isNaN(quantitePieceCartonInt) || quantitePieceCartonInt == "") {
            setError("Quantite pièce invalide !")
            return
        }
        const details = {
            typeMouvement: 4,
            stockInitialCarton: 0,
            quantiteMouvementCarton: newStockCartonInt,
            stockFinalCarton: newStockCartonInt,
            stockInitialPiece: 0,
            quantiteMouvementPiece: Number(quantitePieceCartonInt * newStockCartonInt),
            stockFinalPiece: Number(quantitePieceCartonInt * newStockCartonInt),
            quantitePieceCarton: Number(quantitePieceCartonInt),
        }
        setDetailsMouvement(details)
        setFinalStockCarton(quantiteCarton + newStockCartonInt)
        setFinaleStockPiece(quantitePiece + (newStockCartonInt * quantitePieceCartonInt))
        setEntreeParCartonModalOpen(true)
        setError('')
        setIsEntree(true)
    }

    // FONCTIONS POUR MOUVEMENT STOCK PAR PIECE
    const handleEntreeParPiece = () => {
        const stockPiece = parseInt(newStockPiece)
        if (!checkValidate()) {
            return
        }
        if (stockPiece == 0 || isNaN(stockPiece) || stockPiece == "") {
            setError("Quantité invalide !")
            return
        }
        const details = {
            typeMouvement: 5,
            stockInitialPiece: 0,
            quantiteMouvement: stockPiece,
            stockFinalPiece: stockPiece,
        }
        setDetailsMouvement(details)
        setFinaleStockPiece(quantitePiece + stockPiece)
        setEntreeParPieceModalOpen(true)
        setError('')
        setIsEntree(true)
    }
    // FONCTIONS POUR MOUVEMENT STOCK PAR SN
    const handleEntreeParSn = () => {
        if (!checkValidate()) {
            return
        }
        if (!excelFile) {
            setError('Vous devez choisir un fichier !')
            return
        }
        setEntreeParSnModalOpen(true)
    }

    const handleValidate = async () => {
        setEntreeParPieceModalOpen(false)
        setEntreeParCartonModalOpen(false)
        setEntreeParLotModalOpen(false)

        const payload = {
            selectedPiece,
            selectedModel,
            selectedService,
            origine,
            codeStock,
            motif,
            detailsMouvement,
            userId,
            commentaire
        }

        try {
            setLoadingValidation(true)
            console.log('Sending payload...')

            const response = await stockData.createStock(payload)
            console.log(response)

            Swal.fire({
                title: "Succès",
                text: "Stock créé avec succès !",
                icon: "success"
            })
            // navigate('/voir-stocks')
            navigate(fromSuccess, { replace: true });
        } catch (error) {
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la création !",
                icon: "warning"
            })
            // navigate('/voir-stocks')
            navigate(fromFail, { replace: true });
        } finally {
            setLoadingValidation(false)
        }
    }

    const handleValidateParSn = async () => {
        setEntreeParSnModalOpen(false)
        const fromData = new FormData()
        fromData.append("item_id", selectedPiece)
        fromData.append("model_id", selectedModel)
        fromData.append("service_id", selectedService)
        fromData.append("userId", userId)
        fromData.append("origine", origine)
        fromData.append("codeStock", codeStock)
        fromData.append("motif", motif)
        fromData.append("commentaire", commentaire)
        fromData.append("file", excelFile)

        try {
            setLoadingValidation(true)
            console.log('Sending file...')

            const response = await stockData.setStockSn(fromData)
            console.log(response)
            Swal.fire({
                title: "Succès",
                text: "Stock créé avec succès !",
                icon: "success"
            })
            navigate('/voir-stocks')
        } catch (error) {
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la création !",
                icon: "warning"
            })
            navigate('/voir-stocks')
        } finally {
            setLoadingValidation(false)
        }
    }

    return (
        <>
            <div className="flex justify-center">
                {loading ? (
                    <>
                        <span className="text-sm">Loading...</span>
                    </>
                ) : (
                    <ComponentCard className="md:w-1/2 w-full" title="Nouveau Stock">
                        <div className="space-y-5">
                            {isDemande ? (
                                <>
                                    <div>
                                        <Label className="text-gray-400">Choisir la pièce <span className="text-gray-700">*</span></Label>
                                        <Input
                                            type="text"
                                            value={nomPiece}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-gray-400">Choisir le modèle <span className="text-gray-700">*</span></Label>
                                        <Input
                                            type="text"
                                            value={nomModel}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-gray-400">Choisir le service <span className="text-gray-700">*</span></Label>
                                        <Input
                                            type="text"
                                            value={nomService}
                                            disabled
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <Label>Choisir la pièce <span className="text-red-700">*</span></Label>
                                        <Select
                                            options={optionsPieces}
                                            placeholder="Choisir une option"
                                            onChange={handleSelectPiece}
                                            className="dark:bg-dark-900"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                {pieceLoading ? (
                                    <>
                                        <div>
                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-5">
                                            <div>
                                                {models.length > 1 ? (
                                                    <>
                                                        <div>
                                                            <Label>Choisir le model <span className="text-red-700">*</span></Label>
                                                            <Select
                                                                options={optionsModels}
                                                                onChange={handleSelectModel}
                                                                className="dark:bg-dark-900"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                            <div>
                                                {services.length > 1 ? (
                                                    <>
                                                        <div>
                                                            <Label>Choisir le service <span className="text-red-700">*</span></Label>
                                                            <Select
                                                                options={optionsServices}
                                                                placeholder="Choisir une option"
                                                                onChange={handleSelectService}
                                                                className="dark:bg-dark-900"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div>
                                <Label>Code Stock <span className="text-red-700">*</span></Label>
                                <Input
                                    type="text"
                                    value={codeStock}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setCodeStock(value)
                                    }}
                                    className="dark:bg-dark-900"
                                />
                            </div>
                            {/* <div className="flex justify-between items-center">
                                <div className="flex flex-col  border-b pb-2 border-black">
                                    <span className="text-xs text-gray-700 font-normal">{nomPiece} {nomModel} - {nomService}</span>
                                    <span className="font-medium">QUANTITE ACTUELLE</span>
                                    <span className="text-title-md font-bold">{quantitePiece ? quantitePiece : '0'}</span>
                                    <span className="text-sm">Stock carton - {quantiteCarton ? quantiteCarton : 'N/A'}</span>
                                    <span className="text-sm">Stock lot - {quantiteLot ? quantiteLot : 'N/A'}</span>
                                </div>
                                <div>
                                    <span><i className="pi pi-box" style={{ fontSize: '3rem' }}></i></span>
                                </div>
                            </div> */}
                            <div className="text-center">
                                <span className="text-sm font-semibold">Initialisation de Stock</span>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <Label>Motif <span className="text-red-700">*</span></Label>
                                    <Input
                                        type="text"
                                        value={motif}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setMotif(value)
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label>Commentaire</Label>
                                    <TextArea
                                        type="text"
                                        placeholder="Ajoutez un commentaire"
                                        value={commentaire}
                                        onChange={(value) => setCommentaire(value)}
                                    />
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <span>Faire une entrée : </span>
                                        <div>
                                            <div>
                                                <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={parLot}
                                                        onChange={() => {
                                                            if (parLot) {
                                                                setParLot(false)
                                                            } else {
                                                                setParLot(true)
                                                                setParCarton(false)
                                                                setParCartonLot(false)
                                                                setParPiece(false)
                                                                setParPieceCarton(false)
                                                                setParSn(false)
                                                            }
                                                        }}
                                                        readOnly
                                                        label="Par Lot"
                                                    />
                                                </div>
                                                {/* <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={parCartonLot}
                                                        onChange={() => {
                                                            if (parCartonLot) {
                                                                setParCartonLot(false)
                                                            } else {
                                                                setParLot(false)
                                                                setParCarton(false)
                                                                setParCartonLot(true)
                                                                setParPiece(false)
                                                                setParPieceCarton(false)
                                                            }
                                                        }}
                                                        readOnly
                                                        label="Par Carton-Lot"
                                                    />
                                                </div> */}
                                                {/* <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={parPieceCarton}
                                                        onChange={() => {
                                                            if (parPieceCarton) {
                                                                setParCartonLot(false)
                                                            } else {
                                                                setParLot(false)
                                                                setParCarton(false)
                                                                setParCartonLot(false)
                                                                setParPiece(false)
                                                                setParPieceCarton(true)
                                                            }
                                                        }}
                                                        readOnly
                                                        label="Par Pièce-Carton"
                                                    />
                                                </div> */}
                                                <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={parCarton}
                                                        onChange={() => {
                                                            if (parCarton) {
                                                                setParCarton(false)
                                                            } else {
                                                                setParLot(false)
                                                                setParCarton(true)
                                                                setParCartonLot(false)
                                                                setParPiece(false)
                                                                setParPieceCarton(false)
                                                                setParSn(false)
                                                            }
                                                        }}
                                                        readOnly
                                                        label="Par Carton"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={parPiece}
                                                        onChange={() => {
                                                            if (parPiece) {
                                                                setParPiece(false)
                                                            } else {
                                                                setParLot(false)
                                                                setParCarton(false)
                                                                setParCartonLot(false)
                                                                setParPiece(true)
                                                                setParPieceCarton(false)
                                                                setParSn(false)
                                                            }
                                                        }}
                                                        readOnly
                                                        label="Par Pièce"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={parSn}
                                                        onChange={() => {
                                                            if (parSn) {
                                                                setParSn(false)
                                                            } else {
                                                                setParLot(false)
                                                                setParCarton(false)
                                                                setParCartonLot(false)
                                                                setParPiece(false)
                                                                setParPieceCarton(false)
                                                                setParSn(true)
                                                            }
                                                        }}
                                                        readOnly
                                                        label="Par S/N"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div>
                                            <Label>Origine</Label>
                                            <Input
                                                type="text"
                                                value={origine}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    setOrigine(value)
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        {parLot ? (
                                            <>
                                                <div className="">
                                                    <div className="space-y-5">
                                                        <div className="text-center">
                                                            <span className="text-sm font-semibold">Mouvement par lots</span>
                                                        </div>
                                                        {/* <div>
                                                            <Label>Choisir le type</Label>
                                                            <Select
                                                                options={optionsTypes}
                                                                placeholder="Choisir une option"
                                                                onChange={handleSelectType}
                                                                className="dark:bg-dark-900"
                                                            />
                                                        </div> */}
                                                                                                                    <>
                                                                <div className="space-y-5">
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <Label>Quantité Lot</Label>
                                                                            <Input
                                                                                type="text"
                                                                                id="input"
                                                                                value={newStockLot}
                                                                                onChange={(e) => {
                                                                                    if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                                                        const value = e.target.value
                                                                                        setNewStockLot(value)
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label>Quantité Carton/Lot</Label>
                                                                            <Input
                                                                                type="text"
                                                                                id="input"
                                                                                value={quantiteCartonLot}
                                                                                onChange={(e) => {
                                                                                    if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                                                        const value = e.target.value
                                                                                        setQuantiteCartonLot(value)
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <Label>Quantité Pièce/Carton</Label>
                                                                        <Input
                                                                            type="text"
                                                                            id="input"
                                                                            value={quantitePieceCarton}
                                                                            onChange={(e) => {
                                                                                if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                                                    const value = e.target.value
                                                                                    setQuantitePieceCarton(value)
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        {loadingValidation ? (
                                                                            <>
                                                                                <div>
                                                                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className="w-full flex justify-center items-center">
                                                                                    <button className="w-1/2 flex items-center justify-between bg-green-400 p-2 rounded-2xl"
                                                                                        onClick={handleEntreeParLot}
                                                                                    >
                                                                                        <span>Entrée</span>
                                                                                        <i className="pi pi-arrow-circle-down"></i>
                                                                                    </button>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {parCarton ? (
                                            <>
                                                <div className="">
                                                    <div className="space-y-5">
                                                        <div className="text-center">
                                                            <span className="text-sm font-semibold">Mouvement par cartons</span>
                                                        </div>
                                                        {/* <div>
                                                            <Label>Choisir le type</Label>
                                                            <Select
                                                                options={optionsTypes}
                                                                placeholder="Choisir une option"
                                                                onChange={handleSelectType}
                                                                className="dark:bg-dark-900"
                                                            />
                                                        </div> */}
                                                                                                                    <>
                                                                <div className="space-y-5">
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <Label>Stock Carton</Label>
                                                                            <Input
                                                                                type="text"
                                                                                id="input"
                                                                                value={newStockCarton}
                                                                                onChange={(e) => {
                                                                                    if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                                                        const value = e.target.value
                                                                                        setNewStockCarton(value)
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label>Quantité Pièce/Carton</Label>
                                                                            <Input
                                                                                type="text"
                                                                                id="input"
                                                                                value={quantitePieceCarton}
                                                                                onChange={(e) => {
                                                                                    if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                                                        const value = e.target.value
                                                                                        setQuantitePieceCarton(value)
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        {loadingValidation ? (
                                                                            <>
                                                                                <div>
                                                                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className="w-full flex justify-center items-center">
                                                                                    <button className="w-1/2 flex items-center justify-between bg-green-400 p-2 rounded-2xl"
                                                                                        onClick={handleEntreeParCarton}
                                                                                    >
                                                                                        <span>Entrée</span>
                                                                                        <i className="pi pi-arrow-circle-down"></i>
                                                                                    </button>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {parPiece ? (
                                            <>
                                                <div className="space-y-5">
                                                    <div>
                                                        <div className="py-3 text-center">
                                                            <span className="text-sm font-semibold">Mouvement par pièce</span>
                                                        </div>
                                                        <div>
                                                            <Label>Quantité</Label>
                                                            <Input
                                                                type="text"
                                                                id="input"
                                                                value={newStockPiece}
                                                                onChange={(e) => {
                                                                    if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                                        const value = e.target.value
                                                                        setNewStockPiece(value)
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        {loadingValidation ? (
                                                            <>
                                                                <div>
                                                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-full flex justify-center items-center">
                                                                    <button className="w-1/2 flex items-center justify-between bg-green-400 p-2 rounded-2xl"
                                                                        onClick={handleEntreeParPiece}
                                                                    >
                                                                        <span>Entrée</span>
                                                                        <i className="pi pi-arrow-circle-down"></i>
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {parSn ? (
                                            <>
                                                <div className="space-y-5">
                                                    <div className="space-y-2.5">
                                                        <div className="py-3 text-center">
                                                            <span className="text-sm font-semibold">Insertion S/N</span>
                                                        </div>
                                                        <div>
                                                            <FileUpload
                                                                mode="basic"
                                                                name="file"
                                                                accept=".xlsx,.xls"
                                                                maxFileSize={5_000_000}
                                                                customUpload
                                                                uploadHandler={onUpload}
                                                                chooseLabel="Upload Excel"
                                                                auto
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        {loadingValidation ? (
                                                            <>
                                                                <div>
                                                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-full flex justify-center items-center">
                                                                    <button className="w-1/2 flex items-center justify-between bg-green-400 p-2 rounded-2xl"
                                                                        onClick={handleEntreeParSn}
                                                                    >
                                                                        <span>Entrée</span>
                                                                        <i className="pi pi-arrow-circle-down"></i>
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">
                                        {error}
                                    </span>
                                </div>
                                <div className="text-right text-gray-500">
                                    <span className="text-xs font-medium">
                                        Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                    </span>
                                </div>
                            </div>
                        </div>
                    </ComponentCard>
                )}
            </div>
            <Modal isOpen={entreeParLotModalOpen} onClose={() => setEntreeParLotModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Nouveau Stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {codeStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomService}</span>
                        </span>
                    </div>
                    <div className="ms-5 text-center">
                        <span className="text-sm text-gray-800 underline">Motif: {motif}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                            <div>
                                <span>Quantité lot initiale : {quantiteLot ? quantiteLot : '0'}</span>
                            </div>
                            <div>
                                <span>Mouvement : <span className="text-green-600 font-bold">+{newStockLot}</span></span>
                            </div>
                            <div>
                                <span>Stock final lot : {finalStockLot}</span>
                            </div>
                        </div>
                        <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                            <div>
                                <span>Quantité carton initiale : {quantiteCarton ? quantiteCarton : '0'}</span>
                            </div>
                            <div>
                                <span>Carton/Lot : {quantiteCartonLot}</span>
                            </div>
                            <div>
                                <span>Mouvement : <span className="text-green-600 font-bold">+{quantiteCartonLot * newStockLot}</span></span>
                            </div>
                            <div>
                                <span>Stock final carton : {finalStockCarton}</span>
                            </div>
                        </div>
                        <div className="space-y-1 ms-5 text-sm">
                            <div>
                                <span>Quantité pièce initiale : {quantitePiece ? quantitePiece : '0'}</span>
                            </div>
                            <div>
                                <span>Pièce/Carton : {quantitePieceCarton}</span>
                            </div>
                            <div>
                                <span>Mouvement : <span className="text-green-600 font-bold">+{quantitePieceCarton * quantiteCartonLot * newStockLot}</span></span>
                            </div>
                            <div>
                                <span>Stock final pièce : {finalStockPiece}</span>
                            </div>
                        </div>
                    </div>
                    <div className='w-full mt-6 flex justify-center items-center'>
                        <button
                            onClick={handleValidate}
                            className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                            Valider
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={entreeParCartonModalOpen} onClose={() => setEntreeParCartonModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Nouveau Stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {codeStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomService}</span>
                        </span>
                    </div>
                    <div className="ms-5 text-center">
                        <span className="text-sm text-gray-800 underline">Motif: {motif}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                            <div>
                                <span>Quantité carton initiale : {quantiteCarton ? quantiteCarton : '0'}</span>
                            </div>
                            <div>
                                <span>Mouvement : <span className="text-green-600 font-bold">+{newStockCarton}</span></span>
                            </div>
                            <div>
                                <span>Stock final carton : {finalStockCarton}</span>
                            </div>
                        </div>
                        <div className="space-y-1 ms-5 text-sm">
                            <div>
                                <span>Quantité pièce initiale : {quantitePiece ? quantitePiece : '0'}</span>
                            </div>
                            <div>
                                <span>Pièce/Carton : {quantitePieceCarton}</span>
                            </div>
                            <div>
                                <span>Mouvement : <span className="text-green-600 font-bold">+{quantitePieceCarton * newStockCarton}</span></span>
                            </div>
                            <div>
                                <span>Stock final pièce : {finalStockPiece}</span>
                            </div>
                        </div>
                    </div>
                    <div className='w-full mt-6 flex justify-center items-center'>
                        <button
                            onClick={handleValidate}
                            className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                            Valider
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={entreeParPieceModalOpen} onClose={() => setEntreeParPieceModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Nouveau Stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {codeStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomService}</span>
                        </span>
                    </div>
                    <div className="ms-5 text-center">
                        <span className="text-sm text-gray-800 underline">Motif: {motif}</span>
                    </div>
                    <div className="space-y-1 ms-5">
                        <div>
                            <span>Quantité initiale : {quantitePiece ? quantitePiece : '0'}</span>
                        </div>
                        <div>
                            <span>Mouvement : <span className="text-green-600 font-bold">+{newStockPiece}</span></span>
                        </div>
                        <div>
                            <span>Stock final : {finalStockPiece}</span>
                        </div>
                    </div>
                    <div className='w-full mt-6 flex justify-center items-center'>
                        <button
                            onClick={handleValidate}
                            className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                            Valider
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={entreeParSnModalOpen} onClose={() => setEntreeParSnModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Nouveau Stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {codeStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomService}</span>
                        </span>
                    </div>
                    <div className="ms-5 text-center">
                        <span className="text-sm text-gray-800 underline">Motif: {motif}</span>
                    </div>
                    {analysis && (
                        <div className="space-y-2">
                            <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                                <div>
                                    <span>Mouvement : <span className="text-green-600 font-bold">{analysis.serialNumberCount} </span>S/N trouvé(s)</span>
                                </div>
                            </div>
                            {analysis.cartonCount !== null && (
                                <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                                    <div>
                                        <span>Mouvement : <span className="text-green-600 font-bold">{analysis.cartonCount} </span>Carton(s) trouvé(s)</span>
                                    </div>
                                </div>
                            )}
                            {analysis.lotCount !== null && (
                                <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                                    <div>
                                        <span>Mouvement : <span className="text-green-600 font-bold">{analysis.lotCount} </span>Lot(s) trouvé(s)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className='w-full mt-6 flex justify-center items-center'>
                        <button
                            onClick={handleValidateParSn}
                            className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                            Valider
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}