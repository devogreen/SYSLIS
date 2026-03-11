import { useEffect, useState, useRef } from "react"
import ComponentCard from "../../common/ComponentCard.tsx";
import Label from "../Label.tsx";
import Input from "../input/InputField.tsx";
import Checkbox from "../input/Checkbox.tsx";
import Select from "../Select.tsx";
import { MultiSelect } from "primereact/multiselect";
import TextArea from "../input/TextArea.tsx";
import Swal from 'sweetalert2'
import { Modal } from "../../ui/modal/index.tsx";
import { ProgressSpinner } from 'primereact/progressspinner';
import { useNavigate, useParams } from "react-router";

import { Stock } from "../../../backend/stock/Stock.js";
import { Users } from "../../../backend/users/Users.js";
import { Demandes } from "../../../backend/demandes/Demandes.js";

import { Dropdown } from "primereact/dropdown";

import SignatureCanvas from 'react-signature-canvas'
import { useSyncExternalStore } from "react";

export default function RegularisationDemandeInputs() {

    const stockData = new Stock()
    const userData = new Users()
    const demandeData = new Demandes()
    const userId = localStorage.getItem('id');
    const role = localStorage.getItem("role_id")
    const navigate = useNavigate()
    const { id: idDemande } = useParams();

    const [loading, setLoading] = useState(false)
    const [errorForm, setErrorForm] = useState('')

    const [items, setItems] = useState([])
    const [optionsItems, setOptionsItems] = useState([])

    const [models, setModels] = useState([])
    const [optionsModels, setOptionsModels] = useState([])
    const [selectedModel, setSelectedModel] = useState(null)
    const [nomModel, setNomModel] = useState('')

    const [servicesPiece, setServicesPiece] = useState([])
    const [optionsServicesPiece, setOptionsServicesPieces] = useState([])
    const [selectedServicePiece, setSelectedServicePiece] = useState(null)
    const [nomServicePiece, setNomServicePiece] = useState('')

    const [selectedPiece, setSelectedPiece] = useState(null)
    const [nomPiece, setNomPiece] = useState('')

    const [parLot, setParLot] = useState(false)
    const [parCartonLot, setParCartonLot] = useState(false)
    const [parPieceCarton, setParPieceCarton] = useState(false)
    const [parCarton, setParCarton] = useState(false)
    const [parPiece, setParPiece] = useState(false)

    const [quantitePiece, setQuantitePiece] = useState(null)
    const [newStockPiece, setNewStockPiece] = useState(0)
    const [finalStockPiece, setFinaleStockPiece] = useState(0)
    const [entreeParPieceModalOpen, setEntreeParPieceModalOpen] = useState(false)
    const [sortieParPieceModalOpen, setSortieParPieceModalOpen] = useState(false)

    const [quantiteCarton, setQuantiteCarton] = useState(null)
    const [newStockCarton, setNewStockCarton] = useState(0)
    const [finalStockCarton, setFinalStockCarton] = useState(0)
    const [quantitePieceCarton, setQuantitePieceCarton] = useState(0)
    const [entreeParCartonModalOpen, setEntreeParCartonModalOpen] = useState(false)
    const [sortieParCartonModalOpen, setSortieParCartonModalOpen] = useState(false)
    const [selectedCartons, setSelectedCartons] = useState([])
    const [listeCartons, setListeCartons] = useState([])

    const [stockPieceCarton, setStockPieceCarton] = useState(0)
    const [finalStockPieceCarton, setFinalStockPieceCarton] = useState(0)
    const [selectedCarton, setSelectedCarton] = useState(null)
    const [entreeParPieceCartonModalOpen, setEntreeParPieceCartonModalOpen] = useState(false)
    const [sortieParPieceCartonModalOpen, setSortieParPieceCartonModalOpen] = useState(false)
    const [nomCarton, setNomCarton] = useState('')

    const [stockCartonLot, setStockCartonLot] = useState(0)
    const [finalStockCartonLot, setFinalStockCartonLot] = useState(0)
    const [selectedLot, setSelectedLot] = useState(null)
    const [nomLot, setNomLot] = useState('')
    const [entreeParCartonLotModalOpen, setEntreeParCartonLotModalOpen] = useState(false)
    const [sortieParCartonLotModalOpen, setSortieParCartonLotModalOpen] = useState(false)
    const [stockPieceLot, setStockPieceLot] = useState(0)
    const [finalStockPieceLot, setFinalStockPieceLot] = useState(0)

    const [quantiteLot, setQuantiteLot] = useState(null)
    const [newStockLot, setNewStockLot] = useState(0)
    const [finalStockLot, setFinalStockLot] = useState(0)
    const [quantiteCartonLot, setQuantiteCartonLot] = useState(0)
    const [selectedLots, setSelectedLots] = useState([])
    const [listeLots, setListeLots] = useState([])
    const [entreeParLotModalOpen, setEntreeParLotModalOpen] = useState(false)
    const [sortieParLotModalOpen, setSortieParLotModalOpen] = useState(false)

    const [optionsLot, setOptionsLot] = useState([])
    const [optionsCartons, setOptionsCartons] = useState([])

    const [servicesUsers, setServicesUsers] = useState([])
    const [serviceUser, setServiceUser] = useState(null)
    const [nomServiceUser, setNomServiceUser] = useState('')
    const [optionsServicesUsers, setOptionsServicesUsers] = useState([])

    const [userList, setUserList] = useState([])
    const [selectedUser, setSelectedUser] = useState(null)
    const [nomUser, setNomUser] = useState('')
    const [optionsUsers, setOptionsUsers] = useState([])

    const [motif, setMotif] = useState('')

    const [commentaireDemande, setCommentaireDemande] = useState('')

    const [nomenclature, setNomenclature] = useState('')

    const [fields, setFields] = useState([])
    const [otherFields, setOtherFields] = useState([])

    const [error, setError] = useState('')

    const [loadingValidation, setLoadingValidation] = useState(false)

    const [detailsDemande, setDetailsDemande] = useState([])
    const [detailsDemandeur, setDetailsDemandeur] = useState([])

    const [quantite, setQuantite] = useState(0)

    const [quantitePieceDemandeur, setQuantitePieceDemandeur] = useState(0)
    const [quantiteCartonDemandeur, setQuantiteCartonDemandeur] = useState(0)
    const [quantiteLotDemandeur, setQuantiteLotDemandeur] = useState(0)

    const [stocks, setStocks] = useState([])
    const [optionsStocks, setOptionsStocks] = useState([])
    const [selectedStock, setSelectedStock] = useState([])
    const [nomStock, setNomStock] = useState('')

    const [hasLot, setHasLot] = useState(false)
    const [hasCarton, setHasCarton] = useState(false)

    const [quantiteDemande, setQuantiteDemande] = useState(0)
    const [typeDemande, setTypeDemande] = useState('')

    const [signature, setSignature] = useState();
    const [message, setMessage] = useState("");
    const [isSignModalOpen, setIsSignModalOpen] = useState(false)
    const [errorSign, setErrorSign] = useState('');

    const [commentaire, setCommentaire] = useState('')

    const [commentaireValidation, setCommentaireValidation] = useState('')
    const [quantiteValidee, setQuantiteValidee] = useState(0)

    const [validateur, setValidateur] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {

                const demande_data = await demandeData.getOneDemande(idDemande)
                const detailsDemande = JSON.parse(demande_data.details_demande)

                const index = demande_data.validation_demande.length - 1
                const validation = demande_data.validation_demande[index]
                setCommentaireValidation(validation.commentaire)
                setQuantiteValidee(validation.quantite_validee)

                const items_data = await stockData.getAllItems()
                setItems(items_data)
                const options_items = items_data.map((item) => ({
                    value: item.id_piece,
                    label: item.nom_piece.toUpperCase(),
                }))
                setOptionsItems(options_items)

                const pieceDemande = items_data.find((item) => {
                    return item.id_piece == demande_data.item_id
                })
                setSelectedPiece(demande_data.item_id)
                if (pieceDemande) {
                    setNomPiece(pieceDemande.nom_piece)
                }

                const services_data = await userData.getAllServices()
                setServicesUsers(services_data)
                setServicesPiece(services_data)
                const options_services = services_data.map((item) => ({
                    value: item.id,
                    label: item.nom_service.toUpperCase()
                }))
                setOptionsServicesUsers(options_services)
                const serviceDemandeur = services_data.find((item) => {
                    return item.id == demande_data.service_demandeur
                })
                if (serviceDemandeur) {
                    setNomServiceUser(serviceDemandeur.nom_service)
                }
                setServiceUser(demande_data.service_demandeur)

                const users_data = await userData.getAllUsers()
                setUserList(users_data)
                const options_users = users_data.map((item) => ({
                    value: item.id_user,
                    label: item.fullname,
                }))
                setOptionsUsers(options_users)
                const demandeur = users_data.find((item) => {
                    return item.id_user == demande_data.userId
                })
                setNomUser(demande_data.nom_demandeur)
                setSelectedUser(demande_data.id_demandeur)

                setValidateur(validation.nom_validateur)

                setMotif(demande_data.motif_demande)

                setCommentaireDemande(demande_data.commentaire)

                setQuantiteDemande(demande_data.qte_total_demande)
                setTypeDemande(detailsDemande.typeDemande)

                const stocks_data_all = await stockData.getAllStocks()
                const stocks_data = stocks_data_all.filter((item) => {
                    return item.is_deleted == false && 
                        item.piece_id == demande_data.item_id && 
                        item.quantite_piece > 0 &&
                        item.created_by == +userId
                })
                setStocks(stocks_data)
                const options_stocks = stocks_data.map((item) => {
                    const serviceStock = services_data.find((s) => {
                        return s.id == item.service_id
                    })
                    const nomService = serviceStock ? serviceStock.nom_service : ''
                    return ({
                        value: item.id,
                        label: `${item.code_stock} - ${nomService}`
                    })
                })

                const models_data = await stockData.getAllModels()
                setModels(models_data)
                setOptionsStocks(options_stocks)

            } catch (error) {
                console.log(error)
                setErrorForm('Une erreur est survenue lors de la génération du formulaire.')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleSelectServiceUser = (value) => {
        console.log("Selected value:", value);
        setServiceUser(value)
        const service = servicesUsers.find(
            (item) => {
                return item.id == parseInt(value)
            }
        )
        const nom = service ? service.nom_service.toUpperCase() : ''
        setNomServiceUser(nom)
    };

    const handleSelectUser = (value) => {
        console.log("Selected value:", value);
        setSelectedUser(value)
        const user = userList.find(
            (item) => {
                return item.id_user == parseInt(value)
            }
        )
        const nom = user ? user.fullname : ''
        setNomUser(nom)
    }

    const handleSelectPiece = async (value) => {
        setSelectedPiece(value)
        const piece = items.find((item) => {
            return item.id_piece == value
        })

        const nom = piece ? piece.nom_piece.toUpperCase() : ''
        setNomPiece(nom)

        const itemModels_data = await stockData.getItemModels(value)
        const options_models = itemModels_data.model_piece.map((item) => ({
            value: item.id_model,
            label: item.nom_model.toUpperCase()
        }))
        setOptionsModels(options_models)
        setModels(itemModels_data.model_piece)

        const itemService_data = await stockData.getItemServices(value)
        const options_services = itemService_data.services.map((item) => ({
            value: item.id,
            label: item.nom_service.toUpperCase()
        }))
        setOptionsServicesPieces(options_services)
        setServicesPiece(itemService_data.services)
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

    const handleSelectServicePiece = (value) => {
        console.log('Selected service value: ', value)
        const service = servicesPiece.find((item) => {
            return item.id == value
        })
        const nomService = service ? service.nom_service : ''
        setNomServicePiece(nomService)
        setSelectedServicePiece(value)
    }

    const stocksTemplate = (stock) => {
        return (
            <>
                <span className="text-sm font-semibold">{stock.label}</span>
            </>
        )
    }

    const selectedStockTemplate = (option, props) => {
        if (option) {
            return (
                <>
                    <span className="text-sm font-semibold">{option.label}</span>
                </>
            )
        }
        return <span>{props.placeholder}</span>;
    }

    const handleSelectStock = async (e) => {
        const value = e.value
        console.log(value)
        console.log(typeof (value))
        setSelectedStock(value)
        const stock = stocks.find((item) => {
            return item.id == value
        })
        if (stock) {
            setNomStock(stock.code_stock)
            setQuantitePiece(stock.quantite_piece)
            // setQuantiteCarton(stock.quantite_carton)
            // setQuantiteLot(stock.quantite_lot)

            const stock_carton_all = await stockData.getCartonStock(value)
            const stock_carton = stock_carton_all.filter((item) => {
                return item.is_deleted == false
            })
            setQuantiteCarton(stock_carton.length)
            if (stock_carton.length > 0) {
                setHasCarton(true)
            } else {
                setHasCarton(false)
            }
            const carton_simple = stock_carton.filter((item) => {
                return item.lot_id == null
            })
            const options_carton = carton_simple.map((item) => ({
                value: item.id,
                label: `Carton ${item.numero_carton} - ${item.quantite_totale_piece} pièces`
            }))
            setOptionsCartons(options_carton)
            setListeCartons(stock_carton)

            const stock_lot_all = await stockData.getLotStock(value)
            const stock_lot = stock_lot_all.filter((item) => {
                return item.is_deleted == false
            })
            setQuantiteLot(stock_lot.length)
            setListeLots(stock_lot)
            const options_lot = stock_lot.map((item) => ({
                value: item.id,
                label: `Lot ${item.numero_lot} - ${item.quantite_carton} cartons - ${item.quantite_piece} pièces`
            }))
            setOptionsLot(options_lot)
            if (stock_lot.length > 0) {
                setHasLot(true)
            } else {
                setHasLot(false)
            }

            if (stock && stock.piece_id == 1 && stock.service_id == 5) {
                const stock_demandeur = stocks.find((item) => {
                    return item.service_id == 3 && item.piece_id == 1 && item.code_stock == stock.code_stock
                })
                if (stock_demandeur) {
                    setQuantitePieceDemandeur(stock_demandeur.quantite_piece)

                    const stock_carton_all = await stockData.getCartonStock(stock_demandeur.id)
                    const stock_carton = stock_carton_all.filter((item) => {
                        return item.is_deleted == false
                    })
                    setQuantiteCartonDemandeur(stock_carton.length)

                    const stock_lot_all = await stockData.getLotStock(stock_demandeur.id)
                    const stock_lot = stock_lot_all.filter((item) => {
                        return item.is_deleted == false
                    })
                    setQuantiteLotDemandeur(stock_lot.length)
                }
            }
        }

        const pieceId = stock ? stock.piece_id : null
        setSelectedPiece(pieceId)
        const piece = items.find((item) => {
            return item.id_piece == pieceId
        })
        const nomPiece = piece ? piece.nom_piece : 'N/A'
        setNomPiece(nomPiece)

        const modelId = stock ? stock.model_id : null
        setSelectedModel(modelId)
        const model = models.find((item) => {
            return item.id_model == modelId
        })
        const nomModel = model ? model.nom_model : 'N/A'
        setNomModel(nomModel)

        const serviceId = stock ? stock.service_id : null
        setSelectedServicePiece(serviceId)
        const service = servicesPiece.find((item) => {
            return item.id == serviceId
        })
        const nomService = service ? service.nom_service : 'N/A'
        setNomServicePiece(nomService)
    }

    // useEffect(() => {
    //   const fetchQuantite = async () => {
    //     if (!selectedModel || !selectedServicePiece) return // wait until both are chosen
    //     try {
    //       const quantite_piece = await stockData.getStockPiece(selectedPiece, selectedModel, selectedServicePiece)
    //       setQuantitePiece(quantite_piece)

    //       const stock_carton_all = await stockData.getCartonPiece(selectedPiece, selectedModel, selectedServicePiece)
    //       const stock_carton = stock_carton_all.filter((item) => {
    //         return item.is_deleted == false
    //       })
    //       setQuantiteCarton(stock_carton.length)
    //       const carton_simple = stock_carton.filter((item) => {
    //         return item.lot_id == null
    //       })
    //       const options_carton = carton_simple.map((item) => ({
    //         value: item.id,
    //         label: `Carton ${item.numero_carton} - ${item.quantite_totale_piece} pièces`
    //       }))
    //       setOptionsCartons(options_carton)
    //       setListeCartons(stock_carton)

    //       const stock_lot_all = await stockData.getLotPiece(selectedPiece, selectedModel, selectedServicePiece)
    //       const stock_lot = stock_lot_all.filter((item) => {
    //         return item.is_deleted == false
    //       })
    //       setQuantiteLot(stock_lot.length)
    //       setListeLots(stock_lot)
    //       const options_lot = stock_lot.map((item) => ({
    //         value: item.id,
    //         label: `Lot ${item.numero_lot} - ${item.quantite_carton} cartons - ${item.quantite_piece} pièces`
    //       }))
    //       setOptionsLot(options_lot)
    //     } catch (error) {
    //       console.log("Error fetching quantity", error)
    //     }
    //   }

    //   fetchQuantite()
    // }, [selectedPiece, selectedModel, selectedServicePiece])

    // useEffect(() => {
    //   const fetchQuantite = async () => {
    //     if (!selectedModel || !serviceUser) return // wait until both are chosen
    //     try {
    //       const quantite_piece_demandeur = await stockData.getStockPiece(selectedPiece, selectedModel, serviceUser)
    //       setQuantitePieceDemandeur(quantite_piece_demandeur)

    //       const stock_carton_all_demandeur = await stockData.getCartonPiece(selectedPiece, selectedModel, serviceUser)
    //       const stock_carton_demandeur = stock_carton_all_demandeur.filter((item) => {
    //         return item.is_deleted == false
    //       })
    //       setQuantiteCartonDemandeur(stock_carton_demandeur.length)

    //       const stock_lot_demandeur_all = await stockData.getLotPiece(selectedPiece, selectedModel, serviceUser)
    //       const stock_lot_demandeur = stock_lot_demandeur_all.filter((item) => {
    //         return item.is_deleted == false
    //       })
    //       setQuantiteLotDemandeur(stock_lot_demandeur.length)

    //     } catch (error) {
    //       console.log("Error fetching quantity", error)
    //     }
    //   }

    //   fetchQuantite()
    // }, [selectedPiece, selectedModel, serviceUser])

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

    const handleAddField = () => {
        setFields((prev) => [
            ...prev,
            { id: Date.now(), titre: "", information: "" }
        ]);
    };

    const handleFieldChange = (id, fieldName, value) => {
        setFields((prev) =>
            prev.map((f) =>
                f.id === id ? { ...f, [fieldName]: value } : f
            )
        );
    };

    const handleRemoveField = (id) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
    };

    const checkValidate = () => {
        if (selectedStock.length == 0) {
            setError("Vous devez choisir le stock !")
            return false
        }
        // if (!serviceUser) {
        //     setError("Vous devez choisir le service demandeur")
        //     return false
        // }
        // if (!selectedUser) {
        //     setError("Vous devez choisir le demandeur")
        //     return false
        // }
        // if (!motif) {
        //     setError("Vous devez précisier le motif !")
        //     return false
        // }
        // if (!selectedServicePiece) {
        //     setError("Vous devez choisir le service !")
        //     return false
        // }
        // if (!selectedModel) {
        //     setError("Vous devez choisir le modèle !")
        //     return false
        // }
        setError('')
        return true
    }

    // FONCTIONS POUR MOUVEMENT PAR LOT
    const handleSortieParLot = () => {
        if (!checkValidate()) {
            return
        }
        if (selectedLots.length == 0) {
            setError("Vous devez selectionner des lots !")
            return
        }

        let destockPiece = 0
        let destockCarton = 0

        for (let id of selectedLots) {
            const cartons = listeCartons.filter((item) => {
                return item.lot_id == id
            })
            destockCarton += cartons.length
            for (let carton of cartons) {
                destockPiece += carton.quantite_totale_piece
            }
        }
        setNewStockPiece(destockPiece)
        setNewStockCarton(destockCarton)
        setFinalStockCarton(quantiteCarton - destockCarton)
        setFinaleStockPiece(quantitePiece - destockPiece)
        setNewStockLot(selectedLots.length)
        setFinalStockLot(quantiteLot - selectedLots.length)
        setSortieParLotModalOpen(true)
        setError('')

        const finalStockLotDemandeur = quantiteLotDemandeur + selectedLots.length
        const finalStockPieceDemandeur = quantitePieceDemandeur + destockPiece
        const finalStockCartonDemandeur = quantiteCartonDemandeur + destockCarton

        const listeLots = selectedLots ? selectedLots : []
        setQuantite(selectedLots.length)
        const details = {
            model: selectedModel,
            service: selectedServicePiece,
            typeMouvement: 1,
            stockInitialLot: quantiteLot ? quantiteLot : 0,
            quantiteMouvementLot: selectedLots.length,
            stockFinalLot: quantiteLot - selectedLots.length,
            stockInitialPiece: quantitePiece ? quantitePiece : 0,
            quantiteMouvementPiece: destockPiece,
            stockFinalPiece: quantitePiece - destockPiece,
            quantitePieceCarton: quantitePieceCarton ? quantitePieceCarton : 0,
            stockInitialCarton: quantiteCarton ? quantiteCarton : 0,
            quantiteMouvementCarton: destockCarton,
            stockFinalCarton: quantiteCarton - destockCarton,
            quantiteCartonLot: quantiteCartonLot ? quantiteCartonLot : 0,
            listeLots,
            stockFinalPieceDemandeur: finalStockPieceDemandeur,
            stockInitialLotDemandeur: quantiteLotDemandeur ? quantiteLotDemandeur : 0,
            stockFinalLotDemandeur: finalStockLotDemandeur,
        }
        setDetailsDemande(details)
        const details_demandeur = {
            model: selectedModel,
            service: serviceUser,
            typeMouvement: 1,
            stockInitialLot: quantiteLotDemandeur ? quantiteLotDemandeur : 0,
            quantiteMouvementLot: selectedLots.length,
            stockFinalLot: finalStockLotDemandeur,
            stockInitialCarton: quantiteCartonDemandeur ? quantiteCartonDemandeur : 0,
            quantiteMouvementCarton: destockCarton,
            stockFinalCarton: finalStockCartonDemandeur,
            quantiteCartonLot: quantiteCartonLot ? quantiteCartonLot : 0,
            stockInitialPiece: quantitePieceDemandeur ? quantitePieceDemandeur : 0,
            quantiteMouvementPiece: destockPiece,
            stockFinalPiece: finalStockPieceDemandeur,
            quantitePieceCarton: quantitePieceCarton ? quantitePieceCarton : 0,
            listeLots,
        }
        setDetailsDemandeur(details_demandeur)
    }

    // FONCTIONS POUR MOUVEMENT PAR CARTONS LOT
    const handleSortieParCartonLot = () => {
        if (!checkValidate()) {
            return
        }
        if (!selectedLot) {
            setError('Vous devez choisir le lot !')
            return
        }
        if (selectedCartons.length == 0) {
            setError("Vous devez selectionner des cartons !")
            return
        }

        let destockPiece = 0

        for (let id of selectedCartons) {
            const carton = listeCartons.find((item) => {
                return item.id == id
            })
            destockPiece += carton ? carton.quantite_totale_piece : 0
        }

        setNewStockPiece(destockPiece)
        setNewStockCarton(selectedCartons.length)
        setFinalStockCarton(quantiteCarton - selectedCartons.length)
        setFinaleStockPiece(quantitePiece - destockPiece)
        setFinalStockCartonLot(stockCartonLot - selectedCartons.length)
        setFinalStockPieceLot(stockPieceLot - destockPiece)
        setSortieParCartonLotModalOpen(true)
        setError('')

        const finalStockPieceDemandeur = quantitePieceDemandeur + destockPiece
        const finalStockCartonDemandeur = quantiteCartonDemandeur + selectedCartons.length

        const cartons = selectedCartons ? selectedCartons : []
        setQuantite(selectedCartons.length)
        const details = {
            model: selectedModel,
            service: selectedServicePiece,
            typeMouvement: 2,
            stockInitialCartonLot: stockCartonLot ? stockCartonLot : 0,
            quantiteMouvementCartonLot: selectedCartons.length,
            stockFinalCartonLot: stockCartonLot - selectedCartons.length,
            stockInitialPiece: quantitePiece ? quantitePiece : 0,
            quantiteMouvementPiece: destockPiece,
            stockFinalPiece: quantitePiece - destockPiece,
            stockInitialCarton: quantiteCarton ? quantiteCarton : 0,
            quantiteMouvementCarton: selectedCartons.length,
            stockFinalCarton: quantiteCarton - selectedCartons.length,
            quantitePieceCarton: quantitePieceCarton ? quantitePieceCarton : 0,
            stockInitialPieceLot: stockPieceLot,
            stockFinalPieceLot: stockPieceLot - destockPiece,
            cartons,
            selectedLot,
            stockFinalPieceDemandeur: finalStockPieceDemandeur,
            stockInitialCartonDemandeur: quantiteCartonDemandeur ? quantiteCartonDemandeur : 0,
            stockFinalCartonDemandeur: finalStockCartonDemandeur,
        }
        setDetailsDemande(details)
        const details_demandeur = {
            model: selectedModel,
            service: serviceUser,
            typeMouvement: 4,
            stockInitialCarton: quantiteCartonDemandeur ? quantiteCartonDemandeur : 0,
            quantiteMouvementCarton: selectedCartons.length,
            stockFinalCarton: finalStockCartonDemandeur,
            stockInitialPiece: quantitePieceDemandeur ? quantitePieceDemandeur : 0,
            quantiteMouvementPiece: destockPiece,
            stockFinalPiece: finalStockPieceDemandeur,
            quantitePieceCarton: quantitePieceCarton ? quantitePieceCarton : 0,
            cartons,
        }
        setDetailsDemandeur(details_demandeur)
    }

    // FONCTIONS POUR MOUVEMENT PAR PIECES CARTON
    const handleSortieParPieceCarton = () => {
        if (!checkValidate()) {
            return
        }
        if (!selectedCarton) {
            setError('Vous devez choisir le carton !')
            return
        }
        if (newStockPiece == 0) {
            setError('Quantité invalide !')
            return
        }
        if (newStockPiece > stockPieceCarton) {
            setError('Stock insuffisant !')
            return
        }

        setFinalStockPieceCarton(stockPieceCarton - newStockPiece)
        setFinaleStockPiece(quantitePiece - newStockPiece)
        if (selectedLot) { setFinalStockPieceLot(stockPieceLot - newStockPiece) }
        setSortieParPieceCartonModalOpen(true)
        setError('')

        const finalPieceLot = stockPieceLot - newStockPiece

        const finalStockPieceDemandeur = quantitePieceDemandeur + newStockPiece

        setQuantite(newStockPiece)
        const details = {
            model: selectedModel,
            service: selectedServicePiece,
            typeMouvement: 3,
            stockInitialPieceCarton: stockPieceCarton,
            quantiteMouvementPieceCarton: newStockPiece,
            stockFinalPieceCarton: stockPieceCarton - newStockPiece,
            stockInitialPiece: quantitePiece ? quantitePiece : 0,
            quantiteMouvementPiece: newStockPiece,
            stockFinalPiece: quantitePiece - newStockPiece,
            quantitePieceCarton,
            selectedCarton,
            stockInitialPieceLot: stockPieceLot ? stockPieceLot : null,
            stockFinalPieceLot: finalPieceLot ? finalPieceLot : null,
            selectedLot: selectedLot ? selectedLot : null,
            stockInitialPieceDemandeur: quantitePieceDemandeur ? quantitePieceDemandeur : 0,
            stockFinalPieceDemandeur: finalStockPieceDemandeur,
        }
        setDetailsDemande(details)
        const details_demandeur = {
            model: selectedModel,
            service: selectedServicePiece,
            typeMouvement: 5,
            stockInitial: quantitePiece ? quantitePiece : 0,
            quantiteMouvement: newStockPiece,
            stockFinal: final,
            stockInitialPieceDemandeur: quantitePieceDemandeur ? quantitePieceDemandeur : 0,
            stockFinalPieceDemandeur: finalStockPieceDemandeur,
        }
        setDetailsDemandeur(details_demandeur)
    }

    // FONCTIONS POUR MOUVEMENT PAR CARTON
    const handleSortieParCarton = () => {

        if (!checkValidate()) {
            return
        }
        if (selectedCartons.length == 0) {
            setError("Vous devez selectionner des cartons !")
            return
        }

        let destockPiece = 0

        for (let id of selectedCartons) {
            const carton = listeCartons.find((item) => {
                return item.id == id
            })
            destockPiece += carton ? carton.quantite_totale_piece : 0
        }
        setNewStockPiece(destockPiece)
        setNewStockCarton(selectedCartons.length)
        setFinalStockCarton(quantiteCarton - selectedCartons.length)
        setFinaleStockPiece(quantitePiece - destockPiece)
        setSortieParCartonModalOpen(true)
        setError('')

        const finalStockPieceDemandeur = quantitePieceDemandeur + destockPiece
        const finalStockCartonDemandeur = quantiteCartonDemandeur + selectedCartons.length

        const cartons = selectedCartons ? selectedCartons : []
        setQuantite(selectedCartons.length)
        const details = {
            model: selectedModel,
            service: selectedServicePiece,
            typeMouvement: 4,
            stockInitialCarton: quantiteCarton ? quantiteCarton : 0,
            quantiteMouvementCarton: selectedCartons.length,
            stockFinalCarton: quantiteCarton - selectedCartons.length,
            stockInitialPiece: quantitePiece ? quantitePiece : 0,
            quantiteMouvementPiece: destockPiece,
            stockFinalPiece: quantitePiece - destockPiece,
            quantitePieceCarton: quantitePieceCarton ? quantitePieceCarton : 0,
            cartons,
            stockFinalPieceDemandeur: finalStockPieceDemandeur,
            stockInitialCartonDemandeur: quantiteCartonDemandeur ? quantiteCartonDemandeur : 0,
            stockFinalCartonDemandeur: finalStockCartonDemandeur,
        }
        setDetailsDemande(details)
        const details_demandeur = {
            model: selectedModel,
            service: serviceUser,
            typeMouvement: 4,
            stockInitialCarton: quantiteCartonDemandeur ? quantiteCartonDemandeur : 0,
            quantiteMouvementCarton: selectedCartons.length,
            stockFinalCarton: finalStockCartonDemandeur,
            stockInitialPiece: quantitePieceDemandeur ? quantitePieceDemandeur : 0,
            quantiteMouvementPiece: destockPiece,
            stockFinalPiece: finalStockPieceDemandeur,
            quantitePieceCarton: quantitePieceCarton ? quantitePieceCarton : 0,
            cartons,
        }
        setDetailsDemandeur(details_demandeur)
    }

    // FONCTIONS POUR MOUVEMENT STOCK PAR PIECE
    const handleSortieParPiece = () => {
        if (!checkValidate()) {
            return
        }
        if (newStockPiece == 0) {
            setError("Quantité invalide !")
            return
        }
        if (newStockPiece > quantitePiece) {
            setError("Stock insuffisant !")
            return
        }
        setSortieParPieceModalOpen(true)
        const final = quantitePiece - newStockPiece
        setFinaleStockPiece(final)
        setError('')

        const finalStockPieceDemandeur = quantitePieceDemandeur + newStockPiece

        setQuantite(newStockPiece)
        const details = {
            model: selectedModel,
            service: selectedServicePiece,
            typeMouvement: 5,
            stockInitialPiece: quantitePiece ? quantitePiece : 0,
            quantiteMouvement: newStockPiece,
            stockFinalPiece: final,
            stockInitialPieceDemandeur: quantitePieceDemandeur ? quantitePieceDemandeur : 0,
            stockFinalPieceDemandeur: finalStockPieceDemandeur,
        }
        setDetailsDemande(details)
        const details_demandeur = {
            model: selectedModel,
            service: serviceUser,
            typeMouvement: 5,
            stockInitialPiece: quantitePieceDemandeur ? quantitePieceDemandeur : 0,
            quantiteMouvement: newStockPiece,
            stockFinalPiece: finalStockPieceDemandeur,
        }
        setDetailsDemandeur(details_demandeur)
    }

    const handleClear = () => {
        signature.clear()
    }

    const handleConfirmSign = () => {
        setSortieParPieceModalOpen(false)
        setSortieParCartonModalOpen(false)
        setSortieParPieceCartonModalOpen(false)
        setSortieParCartonLotModalOpen(false)
        setSortieParLotModalOpen(false)

        setIsSignModalOpen(true)
    }

    const handleValidate = async () => {

        setIsSignModalOpen(false)
        setSortieParPieceModalOpen(false)
        setSortieParCartonModalOpen(false)
        setSortieParPieceCartonModalOpen(false)
        setSortieParCartonLotModalOpen(false)
        setSortieParLotModalOpen(false)

        // const sign = signature.toDataURL('image/png')
        // const fd = new FormData();
        // if (sign) {
        //     const blob = await fetch(sign).then(res => res.blob());
        //     fd.append('signature', blob, 'signature.png');
        // }
        // fd.append('demande_id', idDemande)
        // fd.append('user_id', userId)
        // fd.append('commentaire', message)
        // fd.append('stock_id', selectedStock)
        // fd.append('nomDemandeur', nomUser)
        // fd.append('quantite_demande', quantite)
        // fd.append('nomenclature', nomenclature)
        // fd.append('detailsDemande', JSON.stringify(detailsDemande))
        // fd.append('detailsDemandeur', JSON.stringify(detailsDemandeur))
        // fd.append('itemId', selectedPiece)
        // fd.append('idDemandeur', selectedUser)
        // fd.append('motif', motif)
        // fd.append('serviceDemandeur', serviceUser)
        // fd.append('champsAutre', otherFields)
        const payload = {
            demande_id: idDemande,
            user_id: userId,
            commentaire: message,
            stock_id: selectedStock,
            nomenclature,
            detailsDemande: JSON.stringify(detailsDemande),
            detailsDemandeur: JSON.stringify(detailsDemandeur),
            itemId: selectedPiece,
        }

        try {
            setLoadingValidation(true)
            console.log('Sendind payload...')

            const response = await demandeData.validateDemande(payload)
            // const response = await demandeData.validateDemande(fd)

            console.log(response)
            Swal.fire({
                title: "Succès",
                text: "Stock livré avec succès !",
                icon: "success"
            })
            navigate('/toutes-les-demandes')

        } catch (error) {
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la livraison !",
                icon: "warning"
            })
            navigate(`/demande-details/${idDemande}`)
        } finally {
            setLoadingValidation(false)
        }
    }

    return (
        <>
            <div className="flex justify-center">
                {loading ? (
                    <>
                        <span className="">Loading...</span>
                    </>
                ) : (
                    <>
                        {errorForm ? (
                            <>
                                <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                    {errorForm}
                                </div>
                            </>
                        ) : (
                            <>
                                <ComponentCard className="md:w-1/2 w-full" title={`Demande ${nomPiece}`}>
                                    <div className="space-y-6">
                                        <div className="space-y-5">
                                            <div className="text-center">
                                                <span className="text-sm font-semibold">Informations demande</span>
                                            </div>
                                            <div className="text-xs space-y-4">
                                                <div className="grid grid-cols-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">Service</span>
                                                        <span className="">{nomServiceUser}</span>
                                                    </div>
                                                    <div className="flex flex-col text-right">
                                                        <span className="font-bold">Demandeur</span>
                                                        <span>{nomUser}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">Type demande</span>
                                                        <span className="text-sm">{typeDemande}</span>
                                                    </div>
                                                    <div className="flex flex-col text-right">
                                                        <span className="font-bold">Quantité demandée</span>
                                                        <span className="text-sm">{quantiteDemande}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">Motif</span>
                                                    <span className="font-light">{motif}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">Commentaire</span>
                                                    {commentaireDemande ? (
                                                        <span className="font-light">{commentaireDemande}</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-light">sans commentaire</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-5">
                                            <div className="text-center">
                                                <span className="text-sm font-semibold">Validation</span>
                                            </div>
                                            <div className="text-xs space-y-4">
                                                <div className="grid grid-cols-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">Validateur</span>
                                                        <span className="">{validateur}</span>
                                                    </div>
                                                    <div className="flex flex-col text-right">
                                                        <span className="font-bold text-green-700">Quantité validée</span>
                                                        <span className="text-green-600">{quantiteValidee}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">Commentaire</span>
                                                    {commentaireValidation ? (
                                                        <span className="font-light">{commentaireValidation}</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-light">sans commentaire</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-5">
                                            <div className="text-center">
                                                <span className="text-sm font-semibold">Informations sur stock</span>
                                            </div>
                                            <div>
                                                <Label>Stock <span className="text-red-700">*</span></Label>
                                                <Dropdown
                                                    options={optionsStocks}
                                                    optionLabel="Label"
                                                    placeholder="Choisir Stock"
                                                    filter
                                                    filterBy="label"
                                                    itemTemplate={stocksTemplate}
                                                    className="w-full"
                                                    onChange={handleSelectStock}
                                                    value={selectedStock}
                                                    valueTemplate={selectedStockTemplate}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col  border-b pb-2 border-black">
                                                    <span className="text-xs text-gray-700 font-normal">{nomPiece} {nomModel}</span>
                                                    <span className="font-medium">QUANTITE ACTUELLE</span>
                                                    <span className="text-title-md font-bold">{quantitePiece ? quantitePiece : '0'}</span>
                                                    <span className="text-sm">Stock carton - {quantiteCarton ? quantiteCarton : 'N/A'}</span>
                                                    <span className="text-sm">Stock lot - {quantiteLot ? quantiteLot : 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span><i className="pi pi-box" style={{ fontSize: '3rem' }}></i></span>
                                                </div>
                                            </div>
                                            <div>
                                                <span>Faire une sortie  : </span>
                                                <div>
                                                    {hasLot ? (
                                                        <>
                                                            <div className="flex items-center gap-3 my-2">
                                                                {/* Demande par lot */}
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
                                                                        }
                                                                    }}
                                                                    label="Par Lot"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-3 my-2">
                                                                {/* Par carton lot */}
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
                                                                    label="Par Carton"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {hasCarton || hasLot ? (
                                                        <>
                                                            <div className="flex items-center gap-3 my-2">
                                                                {/* Par piece carton */}
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
                                                                    label="Par Pièce"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {hasCarton && !hasLot ? (
                                                        <>
                                                            <div className="flex items-center gap-3 my-2">
                                                                {/* Par carton */}
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
                                                                        }
                                                                    }}
                                                                    label="Par Carton"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {(!hasCarton && !hasLot) ? (
                                                        <>
                                                            <div className="flex items-center gap-3 my-2">
                                                                {/* Par piece */}
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
                                                                        }
                                                                    }}
                                                                    label="Par Pièce"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                {parLot ? (
                                                    <>
                                                        <div className="">
                                                            <div className="space-y-5">
                                                                <div className="py-3 text-center">
                                                                    <span className="text-sm font-semibold">Livraison par lots</span>
                                                                </div>
                                                                <div>
                                                                    <div>
                                                                        <MultiSelect
                                                                            value={selectedLots}
                                                                            options={optionsLot}
                                                                            display="chip"
                                                                            optionLabel="label"
                                                                            maxSelectedLabels={3}
                                                                            onChange={(e) => setSelectedLots(e.value)}
                                                                            placeholder="Choisir le(s) lot(s)"
                                                                            className="w-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {parCartonLot ? (
                                                    <>
                                                        <div>
                                                            <div className="space-y-5">
                                                                <div className="py-3 text-center">
                                                                    <span className="text-sm font-semibold">Livraison par cartons-lot</span>
                                                                </div>
                                                                <div className="space-y-5">
                                                                    <div>
                                                                        <Label>Choisir le lot</Label>
                                                                        <Select
                                                                            options={optionsLot}
                                                                            placeholder="Choisir une option"
                                                                            className="dark:bg-dark-900"
                                                                            onChange={handleSelectLotCarton}
                                                                        />
                                                                    </div>
                                                                    {selectedLot ? (
                                                                        <>
                                                                            <div>
                                                                                <MultiSelect
                                                                                    value={selectedCartons}
                                                                                    options={optionsCartons}
                                                                                    display="chip"
                                                                                    optionLabel="label"
                                                                                    maxSelectedLabels={4}
                                                                                    onChange={(e) => setSelectedCartons(e.value)}
                                                                                    placeholder="Choisir le(s) carton(s)"
                                                                                    className="w-full"
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {parPieceCarton ? (
                                                    <>
                                                        <div className="space-y-5">
                                                            <div>
                                                                <div className="py-3 text-center">
                                                                    <span className="text-sm font-semibold">Livraison par pièce-carton</span>
                                                                </div>
                                                                <div className="space-y-5">
                                                                    {hasLot ? (
                                                                        <>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div>
                                                                                    <Label>Choisir le lot</Label>
                                                                                    <Select
                                                                                        options={optionsLot}
                                                                                        placeholder="Choisir une option"
                                                                                        className="dark:bg-dark-900"
                                                                                        onChange={handleSelectLotCarton}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <Label>Choisir le carton</Label>
                                                                                    <Select
                                                                                        options={optionsCartons}
                                                                                        placeholder="Choisir une option"
                                                                                        className="dark:bg-dark-900"
                                                                                        onChange={handleSelectCarton}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div>
                                                                                <Label>Choisir le carton</Label>
                                                                                <Select
                                                                                    options={optionsCartons}
                                                                                    placeholder="Choisir une option"
                                                                                    className="dark:bg-dark-900"
                                                                                    onChange={handleSelectCarton}
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    <div>
                                                                        <Label>Quantité pièce</Label>
                                                                        <Input type="number" id="input" value={newStockPiece}
                                                                            onChange={(e) => {
                                                                                const value = Number(e.target.value)
                                                                                if (value >= 0) {
                                                                                    setNewStockPiece(value)
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
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
                                                                    <span className="text-sm font-semibold">Livraison par cartons</span>
                                                                </div>
                                                                <div>
                                                                    <MultiSelect
                                                                        value={selectedCartons}
                                                                        options={optionsCartons}
                                                                        display="chip"
                                                                        optionLabel="label"
                                                                        maxSelectedLabels={3}
                                                                        onChange={(e) => setSelectedCartons(e.value)}
                                                                        placeholder="Choisir le(s) carton(s)"
                                                                        className="w-full"
                                                                    />
                                                                </div>
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
                                                                    <span className="text-sm font-semibold">Livraison par pièce</span>
                                                                </div>
                                                                <div>
                                                                    <Label>Quantité</Label>
                                                                    <Input type="number" id="input" value={newStockPiece}
                                                                        onChange={(e) => {
                                                                            const value = Number(e.target.value)
                                                                            if (value >= 0) {
                                                                                setNewStockPiece(value)
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                            <div>
                                                <Label>Nomenclature</Label>
                                                <Input
                                                    type="text"
                                                    value={nomenclature}
                                                    onChange={(e) => {
                                                        const value = e.target.value
                                                        setNomenclature(value)
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                {fields.map((field, index) => (
                                                    <div
                                                        key={field.id}
                                                        className="flex justify-center items-center relative mb-2 rounded"
                                                    >
                                                        {/* Remove button */}
                                                        <div className="absolute right-0 top-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveField(field.id)}
                                                                className="text-red-500"
                                                            >
                                                                <i className="pi pi-times"></i>
                                                            </button>
                                                        </div>

                                                        {/* First input */}
                                                        <div className="me-1">
                                                            <Label htmlFor={`titre-${field.id}`}>
                                                                Titre champ {index + 1}
                                                            </Label>
                                                            <Input
                                                                type="text"
                                                                id={`titre-${field.id}`}
                                                                value={field.titre}
                                                                onChange={(e) =>
                                                                    handleFieldChange(field.id, "titre", e.target.value)
                                                                }
                                                                className="border rounded px-2 py-1"
                                                            />
                                                        </div>

                                                        {/* Second input */}
                                                        <div className="ms-1">
                                                            <Label htmlFor={`info-${field.id}`}>Information</Label>
                                                            <Input
                                                                type="text"
                                                                id={`info-${field.id}`}
                                                                value={field.information}
                                                                onChange={(e) =>
                                                                    handleFieldChange(field.id, "information", e.target.value)
                                                                }
                                                                className="border rounded px-2 py-1"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* <div>
                                                <button
                                                    type="button"
                                                    onClick={handleAddField}
                                                >
                                                    <span className="text-xs text-gray-500 font-medium"> <span className="underline">Ajouter un champ </span><span className="text-xl">+</span></span>
                                                </button>
                                            </div> */}
                                        </div>
                                        {parLot ? (
                                            <>
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
                                                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                    onClick={handleSortieParLot}
                                                                >
                                                                    Valider
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {parCartonLot ? (
                                            <>
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
                                                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                    onClick={handleSortieParCartonLot}
                                                                >
                                                                    Valider
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {parPieceCarton ? (
                                            <>
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
                                                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                    onClick={handleSortieParPieceCarton}
                                                                >
                                                                    Valider
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {parCarton ? (
                                            <>
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
                                                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                    onClick={handleSortieParCarton}
                                                                >
                                                                    Valider
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {parPiece ? (
                                            <>
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
                                                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                    onClick={handleSortieParPiece}
                                                                >
                                                                    Valider
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        <div>
                                            <span className="text-error-600 font-medium flex items-center justify-center text-sm">
                                                {error}
                                            </span>
                                        </div>
                                        <div className="text-right text-gray-500">
                                            <span className="text-xs font-medium">
                                                Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                            </span>
                                        </div>
                                    </div>
                                </ComponentCard>
                            </>
                        )}
                    </>
                )}
            </div>
            {/* DEMANDE PAR LOT */}
            <Modal isOpen={sortieParLotModalOpen} onClose={() => setSortieParLotModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Sortie stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {nomStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomServicePiece}</span>
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
                                <span>Mouvement : <span className="text-red-600 font-bold">-{selectedLots.length}</span></span>
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
                                <span>Mouvement : <span className="text-red-600 font-bold">-{newStockCarton}</span></span>
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
                                <span>Mouvement : <span className="text-red-600 font-bold">-{newStockPiece}</span></span>
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
                            Confirmer
                        </button>
                    </div>
                </div>
            </Modal>
            {/* DEMANDE PAR CARTON LOT */}
            <Modal isOpen={sortieParCartonLotModalOpen} onClose={() => setSortieParCartonLotModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Sortie stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {nomStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomServicePiece}</span>
                        </span>
                    </div>
                    <div className="ms-5 text-center">
                        <span className="text-sm text-gray-800 underline">Motif: {motif}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                            <div>
                                <span>Lot sélectionné : {nomLot}</span>
                            </div>
                            <div>
                                <span>Quantité initiale : {stockCartonLot}</span>
                            </div>
                            <div>
                                <span>Mouvement : <span className="text-red-600 font-bold">-{newStockCarton}</span></span>
                            </div>
                            <div>
                                <span>Stock final : {finalStockCartonLot}</span>
                            </div>
                        </div>
                        <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                            <div>
                                <span>Quantité carton initiale : {quantiteCarton ? quantiteCarton : '0'}</span>
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
                                <span>Stock final pièce : {finalStockPiece}</span>
                            </div>
                        </div>
                    </div>
                    <div className='w-full mt-6 flex justify-center items-center'>
                        <button
                            onClick={handleValidate}
                            className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                            Confirmer
                        </button>
                    </div>
                </div>
            </Modal>
            {/* DEMANDE PAR PIECE CARTON */}
            <Modal isOpen={sortieParPieceCartonModalOpen} onClose={() => setSortieParPieceCartonModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Sortie stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {nomStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomServicePiece}</span>
                        </span>
                    </div>
                    <div className="ms-5 text-center">
                        <span className="text-sm text-gray-800 underline">Motif: {motif}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="space-y-1 ms-5 border-b pb-2 text-sm">
                            <div>
                                <span>Carton sélectionné : {nomCarton}</span>
                            </div>
                            <div>
                                <span>Quantité initiale : {stockPieceCarton}</span>
                            </div>
                            <div>
                                <span>Mouvement : <span className="text-red-600 font-bold">-{newStockPiece}</span></span>
                            </div>
                            <div>
                                <span>Stock final : {finalStockPieceCarton}</span>
                            </div>
                        </div>
                        <div className="space-y-1 ms-5 text-sm">
                            <div>
                                <span>Quantité pièce initiale : {quantitePiece ? quantitePiece : '0'}</span>
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
                            Confirmer
                        </button>
                    </div>
                </div>
            </Modal>
            {/* DEMANDE PAR CARTON */}
            <Modal isOpen={sortieParCartonModalOpen} onClose={() => setSortieParCartonModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Sortie stock</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {nomStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomServicePiece}</span>
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
                                <span>Mouvement : <span className="text-red-600 font-bold">-{selectedCartons.length}</span></span>
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
                                <span>Mouvement : <span className="text-red-600 font-bold">-{newStockPiece}</span></span>
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
                            Confirmer
                        </button>
                    </div>
                </div>
            </Modal>
            {/* DEMANDE PAR PIECE */}
            <Modal isOpen={sortieParPieceModalOpen} onClose={() => setSortieParPieceModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Demande</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="font-bold text-sm">
                            {nomStock}
                        </span>
                        <span>
                            <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
                            -
                            <span className="font-semibold"> {nomModel}</span> |
                            <span className="font-medium text-gray-700"> {nomServicePiece}</span>
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
                            <span>Demande : <span className="text-red-600 font-bold">-{newStockPiece}</span></span>
                        </div>
                        <div>
                            <span>Stock final : {finalStockPiece}</span>
                        </div>
                    </div>
                    <div className='w-full mt-6 flex justify-center items-center'>
                        <button
                            onClick={handleValidate}
                            className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                            Confirmer
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} className="p-4 max-w-md">
                <div className='p-1'>
                    <div className="w-full text-center mb-3">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium text-sm">Validation</span>
                    </div>
                    <div className='text-center mb-3 text-xs'>
                        <span>Signez manuellement pour valider la demande</span>
                    </div>
                    <div className='flex flex-col justify-center items-center'>
                        <SignatureCanvas
                            ref={data => setSignature(data)}
                            canvasProps={{ width: 300, height: 150, className: 'sigCanvas border border-gray-300 rounded' }}
                        />
                        <div className='w-full mt-3'>
                            <Label>Commentaire</Label>
                            <TextArea
                                value={message}
                                onChange={(value) => setMessage(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                            />
                        </div>
                        <div className='w-full mt-6 flex justify-center items-center'>
                            <button
                                onClick={handleClear}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Clear
                            </button>
                            <button
                                onClick={handleValidate}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Valider
                            </button>
                        </div>
                    </div>
                    <div className="text-center">
                        <span className="text-error-500 text-xs">
                            {errorSign}
                        </span>
                    </div>
                </div>
            </Modal>
        </>
    )
}