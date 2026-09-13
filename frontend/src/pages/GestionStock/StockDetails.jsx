import PageBreadcrumb from "../../components/common/PageBreadCrumb"
import { useEffect, useState, useMemo, useRef } from "react"
import { useParams, Link, useNavigate } from "react-router"
import { Stock } from "../../backend/stock/Stock"
import { Users } from "../../backend/users/Users"
import { Demandes } from "../../backend/demandes/Demandes"
import { ProductDeliveries } from "../../backend/livraisons/ProductDeliveries"
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressSpinner } from "primereact/progressspinner"
import { Dropdown } from "primereact/dropdown"
import { TreeSelect } from "primereact/treeselect"
import DatePicker from "../../components/form/date-picker"
import { Modal } from "../../components/ui/modal"
import Label from "../../components/form/Label"
import Input from "../../components/form/input/InputField"
import Checkbox from "../../components/form/input/Checkbox"
import { MultiSelect } from "primereact/multiselect"
import Swal from "sweetalert2"
import TextArea from "../../components/form/input/TextArea"
import { Toast } from 'primereact/toast';


export default function StockDetails() {
    const stockData = new Stock()
    const userData = new Users()
    const demandeData = new Demandes()
    const deliveryData = new ProductDeliveries()
    const { id } = useParams()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [codeStock, setCodeStock] = useState('')
    const [nomPiece, setNomPiece] = useState('')
    const [nomModel, setNomModel] = useState('')
    const [nomService, setNomService] = useState('')
    const [nomAuteur, setNomAuteur] = useState('')
    const [dateCreation, setDateCreation] = useState('')
    const [allMouvements, setAllMouvements] = useState([])

    const [quantitePiece, setQuantitePiece] = useState(0)
    const [quantiteCarton, setQuantiteCarton] = useState(0)
    const [quantiteLot, setQuantiteLot] = useState(0)

    const [cartonsStock, setCartonsStock] = useState([])

    const [lotsStock, setLotsStock] = useState([])
    const [cartonsLot, setCartonsLot] = useState([])

    const [initialisation, setInitialisation] = useState([])
    const [detailsInitialisation, setDetailsInitialisation] = useState([])

    const [services, setServices] = useState([])

    const [typesMouvement, setTypesMouvement] = useState([])

    const [users, setUsers] = useState([])
    const [demandes, setDemandes] = useState([])

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationState"));
    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 3);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [livraisons, setLivraisons] = useState([])

    const [loadingActions, setLoadingActions] = useState(false)

    const [allUsers, setAllUsers] = useState([])

    const [isModalModifStockOpen, setIsModalModifStockOpen] = useState(false)

    const [newCodeStock, setNewCodeStock] = useState('')

    const [optionsUsers, setOptionsUsers] = useState([])

    const [selectedOwner, setSelectedOwner] = useState(null)
    const [selectedSubOwners, setSelectedSubOwners] = useState([])

    const optionSubOwners = useMemo(
        () => optionsUsers.filter((o) => o.value !== selectedOwner),
        [allUsers, selectedOwner]
    )

    const [errorAction, setErrorAction] = useState('')

    const [isModalStockOpen, setIsModalStockOpen] = useState(false)

    const [parPiece, setParPiece] = useState(false)

    const [selectedTypeMouvement, setSelectedTypeMouvement] = useState(null)

    const optionsTypes = [
        { value: 'entree', label: 'entree' },
        { value: 'sortie', label: 'sortie' },
    ]

    const [stockModel, setStockModel] = useState(null)
    const [stockService, setStockService] = useState(null)
    const [stockPiece, setStockPiece] = useState(null)

    const [quantite, setQuantite] = useState(0)

    const [newStockPiece, setNewStockPiece] = useState(0)

    const [finaleStockPiece, setFinaleStockPiece] = useState(0)

    const [detailsMouvement, setDetailsMouvement] = useState([])

    const [origine, setOrigine] = useState('')
    const [destination, setDestination] = useState('')
    const [commentaire, setCommentaire] = useState('')
    const [motif, setMotif] = useState('')
    // const [typeMouvementStock, setTypeMouvementStock] = useState(null)

    const [isOwner, setIsOwner] = useState(false)
    const [isSubOwner, setIsSubOwner] = useState(false)

    const toast = useRef(null);

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
    const isOnlyDigits = (str) => /^\d+$/.test(str);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const stock_data = await stockData.getOneStock(id)
                setCodeStock(stock_data.code_stock)
                setQuantitePiece(stock_data.quantite_piece)
                setQuantiteCarton(stock_data.quantite_carton)
                setQuantiteLot(stock_data.quantite_lot)
                setDateCreation(formatDate(stock_data.created_at))

                const piece_data = await stockData.getPiece(stock_data.piece_id)
                setNomPiece(piece_data.nom_piece)

                const user_data = await userData.getOneUser(stock_data.owner)
                setNomAuteur(user_data.fullname)

                const models = await stockData.getAllModels()
                const model = models.find((item) => {
                    return item.id_model == stock_data.model_id
                })
                const nom_model = model ? model.nom_model : ''
                setNomModel(nom_model)

                const cartons_data_all = await stockData.getCartonStock(id)
                const cartons_data_simple = cartons_data_all.filter((item) => {
                    return item.is_deleted == false && item.lot_id == null
                })
                const cartons_simples = cartons_data_simple.map((item) => ({
                    label: `Carton ${item.numero_carton} - ${item.quantite_totale_piece} pièce(s)`,
                    numero: item.numero_carton,
                }))
                setCartonsStock(cartons_simples)

                const lots_data_all = await stockData.getLotStock(id)
                const lots_data = lots_data_all.filter((item) => {
                    return item.is_deleted == false
                })
                // const lots =  lots_data.map(async (item) =>{
                //     const cartons_lot_all = await stockData.getCartonLot(item.id)
                //     const cartons_lot = cartons_lot_all.filter((item) => {
                //         return item.is_deleted == false
                //     })
                //     console.log(cartons_lot)
                //     const cartons = cartons_lot.map((item) =>({
                //         label: `Carton - ${item.numero_carton} - ${item.quantite_totale_piece} pièce(s)`
                //     }))
                //     return(
                //         {
                //             label: `Lot ${item.numero_lot} - ${item.quantite_carton} cartons - ${item.quantite_piece} pièces`,
                //             liste: cartons,
                //         }
                //     )
                // })
                const lots = await Promise.all(
                    lots_data.map(async (lot, lotIndex) => {
                        const cartons_lot_all = await stockData.getCartonLot(lot.id);
                        const cartons_lot = cartons_lot_all.filter((item) => !item.is_deleted);

                        const cartons = cartons_lot.map((carton, cartonIndex) => ({
                            key: `${lotIndex}-${cartonIndex}`,
                            label: `Carton ${carton.numero_carton} - ${carton.quantite_totale_piece} pièce(s)`
                        }));

                        return {
                            key: `${lotIndex}`,
                            label: `Lot ${lot.numero_lot} - ${lot.quantite_carton} cartons - ${lot.quantite_piece} pièces`,
                            children: cartons
                        };
                    })
                );
                setLotsStock(lots)

                const mouvements = await stockData.getOneStockMouvements(id)
                const first = mouvements[mouvements.length - 1]
                setInitialisation(first)
                const details_first = JSON.parse(first.details_mouvement)
                setDetailsInitialisation(details_first)

                const services_data = await userData.getAllServices()
                setServices(services_data)

                const service = services_data.find((item) => {
                    return item.id == stock_data.service_id
                })
                const nom_service = service ? service.nom_service : ''
                setNomService(nom_service)

                const mouvement_data = await stockData.getOneStockMouvements(id)
                setAllMouvements(mouvement_data)

                const typesMouvement_data = await stockData.getAllTypeMouvementStock()
                setTypesMouvement(typesMouvement_data)

                const allUser_data = await userData.getAllUsers()
                setUsers(allUser_data)

                const demandes_data = await demandeData.getAllDemandes()
                setDemandes(demandes_data)

                const livraisons_data = await deliveryData.getAllLivraisons()
                setLivraisons(livraisons_data)

                setNewCodeStock(stock_data.code_stock)

                const [users_data, subOwners_data] = await Promise.all([
                    userData.getAllUsers(),
                    stockData.getAllStockSubOwners(id),
                ])
                setAllUsers(users_data)

                const optionsUsers = users_data.map((item) => ({
                    label: item.fullname,
                    value: item.id_user,
                }))
                setOptionsUsers(optionsUsers)

                const optionsSub = users_data.
                    filter((item) => item.id_user != stock_data.owner).
                    map((item) => ({
                        label: item.fullname,
                        value: item.id_user,
                    }))
                // setOptionsSubOwners(optionsSub)

                setSelectedSubOwners(subOwners_data.map((item) => item.user_id))
                setSelectedOwner(stock_data.owner)

                setStockModel(stock_data.model_id)
                setStockService(stock_data.service_id)
                setStockPiece(stock_data.piece_id)

                if (parseInt(userId) == stock_data.owner) {
                    setIsOwner(true)
                }

                const subOwners = subOwners_data.map((item) => item.user_id)
                if (subOwners.includes(parseInt(userId))) {
                    setIsSubOwner(true)
                }

                // const subOwners_data = await stockData.getAllStockSubOwners(id)
                // console.log("subOwners_data : ", subOwners_data)

                // const subOwners = subOwners_data.map((item) => ({
                //     label: item.fullname,
                //     value: item.id_user,
                // }))
                // setSelectedSubOwners(subOwners.map((item) => item.value))

            } catch (error) {
                console.log('Error fetching the data ', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const cartonSimplesTemplate = (carton) => {
        return (
            <>
                <span>{carton.label}</span>
            </>
        )
    }
    const listeLotTemplate = (lot) => {
        return (
            <>
                <span>{lot.label}</span>
            </>
        )
    }

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
    const mouvementTemplate = (mouvement) => {
        const type = typesMouvement.find((item) => {
            return mouvement.mouvement == item.id
        })

        const nomType = type ? type.titre : 'N/A'

        return (
            <>
                <span className="text-theme-xs font-medium text-gray-800">{nomType}</span>
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
    const demandeurTemplate = (mouvement) => {
        const demande = demandes.find((item) => {
            return item.id == mouvement.demande_id
        })
        // const idDemandeur = demande ? demande.id_demandeur : null
        // const demandeur = users.find((item) => {
        //     return item.id_user == idDemandeur
        // })
        const nomDemandeur = demande ? demande.nom_demandeur : 'N/A'

        return (
            <>
                <span>{nomDemandeur}</span>
            </>
        )
    }
    const receveurTemplate = (mouvement) => {
        const demande = demandes.find((item) => {
            return item.id == mouvement.demande_id
        })
        const livraison = livraisons.find((item) => {
            return item.id_livraison == mouvement.formulaire_id
        })
        let nomRecepteur = 'N/A'
        if (demande) {
            if (demande.demande_reçue == true) {
                let index_reception = demande.reception_piece.length - 1
                nomRecepteur = demande.reception_piece[index_reception].nom_recepteur
            }
        } else if (livraison) {
            let index_reception = livraison.validations.length - 1
            nomRecepteur = livraison.validations[index_reception].nom_recepteur
        }

        return (
            <>
                <span>{nomRecepteur}</span>
            </>
        )
    }
    const origineTemplate = (mouvement) => {
        const service = services.find((item) => {
            return mouvement.service_origine == item.id
        })
        const origine = mouvement.origine

        const nomService = service ? service.nom_service : origine ? origine : 'N/A'

        return (
            <>
                <span className="text-theme-xs font-bold">{nomService}</span>
            </>
        )
    }
    const destinationTemplate = (mouvement) => {
        const service = services.find((item) => {
            return mouvement.service_destination == item.id
        })

        const destination = mouvement.destination

        const nomService = service ? service.nom_service : destination ? destination : 'N/A'

        return (
            <>
                <span className="text-theme-xs font-bold">{nomService}</span>
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

    const selectedOwnerTemplate = (option, props) => {
        if (option) {
            return (
                <div className="flex align-items-center">
                    <div>{option.label}</div>
                </div>
            );
        }

        return <span>{props.placeholder}</span>;
    };

    const usersTemplate = (option) => {
        return (
            <div className="flex align-items-center">
                <div>{option.label}</div>
            </div>
        );
    };

    const handleModifyStock = async () => {
        try {
            if (!newCodeStock) {
                setErrorAction('Vous devez préciser un code stock !')
                return
            }
            if (!selectedOwner) {
                setErrorAction('Un stock ne peut rester sans propriétaire !')
                return
            }
            setIsModalModifStockOpen(false)
            setLoadingActions(true)
            setErrorAction('')
            const payload = {
                code_stock: newCodeStock,
                selectedOwner,
                selectedSubOwners,
                userId,
            }

            console.log("Payload: ", payload)
            await stockData.modifyStock(id, payload)

            Swal.fire({
                title: "Succès",
                text: "Stock modifié avec succès !",
                icon: "success"
            })
            window.location.reload();
        } catch (error) {
            console.error("Erreur de modification : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de la modification !",
                icon: "warning"
            })
            navigate("/voir-stocks")
        } finally {
            setLoadingActions(false)
        }
    }

    const filteredMouvements = allMouvements.filter((item) => {
        let itemDate = new Date(item.date)

        const matchesStartDate = startDate ? itemDate >= startDate : true;
        const matchesEndDate = endDate ? itemDate <= endDate : true;

        return matchesStartDate && matchesEndDate
    })

    const SelectedTypeMouvementTemplate = (option, props) => {
        if (option) {
            return (
                <div className="flex align-items-center">
                    <div>{option.label}</div>
                </div>
            );
        }

        return <span>{props.placeholder}</span>;
    };

    const typeMouvementTemplate = (option) => {
        return (
            <div className="flex align-items-center">
                <div>{option.label}</div>
            </div>
        );
    };

    const handleOwnerChange = (e) => {
        const newOwner = e.value
        setSelectedOwner(newOwner)

        if (newOwner != null && selectedSubOwners.includes(newOwner)) {
            const user = optionsUsers.find((o) => o.value === newOwner)
            setSelectedSubOwners((prev) => prev.filter((v) => v !== newOwner))
            // toast.current?.show({
            //     severity: 'info',
            //     summary: 'Sous-propriétaire retiré',
            //     detail: `${user?.label} a été retiré des sous-propriétaires car il est maintenant propriétaire du stock.`,
            //     life: 4000,
            // })

            const show = () => {
                toast.current.show({ severity: 'info', summary: 'Sous-propriétaire retiré', detail: `${user?.label} a été retiré(e) des sous-propriétaires car il/elle est maintenant propriétaire du stock.`, life:4000 });
            };

            show()
        }
    }

    const checkValidate = () => {
        if (!motif) {
            setErrorAction("Veuillez préciser le motif !")
            return false
        }
        if (!selectedTypeMouvement) {
            setErrorAction("Veuillez sélectionner le type de mouvement !")
            return false
        }
        if (selectedTypeMouvement == 'entree' && !origine) {
            setErrorAction("Veuillez préciser l'origine !")
            return false
        }
        if (selectedTypeMouvement == 'sortie' && !destination) {
            setErrorAction("Veuillez préciser la destination !")
            return false
        }
        return true
    }

    // FONCTIONS POUR MOUVEMENT STOCK PAR PIECE
    const handleMouvementParPiece = () => {
        console.log('PAR PIECE')
        if (newStockPiece == 0 || newStockPiece == '' || !isOnlyDigits(newStockPiece)) {
            setErrorAction("Quantité invalide !")
            return
        }
        let final = 0
        const qty = Number(newStockPiece)
        if (selectedTypeMouvement == 'entree') {
            final = quantitePiece + qty
        } else if (selectedTypeMouvement == 'sortie') {
            if (qty > quantitePiece) {
                setErrorAction("Stock insuffisant !")
                return
            }
            final = quantitePiece - qty
        }

        setFinaleStockPiece(final)
        setErrorAction('')

        setQuantite(newStockPiece)
        const details = {
            model: stockModel,
            service: stockService,
            typeMouvement: 5,
            stockInitialPiece: quantitePiece ? quantitePiece : 0,
            quantiteMouvement: qty,
            stockFinalPiece: final,
        }
        console.log("details : ", details)
        setDetailsMouvement(details)

        return details
    }

    const handleStockMouvement = async () => {
        if (!checkValidate()) {
            return
        }
        try {
            setLoadingActions(true)
            setErrorAction('')
            setIsModalStockOpen(false)

            let detailsMouvement = null
            if (parPiece) {
                detailsMouvement = handleMouvementParPiece()
                if (!detailsMouvement) {
                    return
                }
            }

            const stockId = id
            const payload = {
                pieceId: stockPiece,
                origine: selectedTypeMouvement === 'entree' ? origine : null,
                serviceOrigine: selectedTypeMouvement === 'sortie' ? stockService : null,
                serviceDestination: selectedTypeMouvement === 'entree' ? stockService : null,
                destination: selectedTypeMouvement === 'sortie' ? destination : null,
                modelId: stockModel,
                details: JSON.stringify(detailsMouvement),
                userId,
                typeMouvement: selectedTypeMouvement,
                motif,
                commentaire,
            }

            // console.log("detailsMouvement : ", detailsMouvement)
            // console.log("Payload pour le mouvement de stock : ", payload)

            await stockData.createMouvementStock(stockId, payload)

            window.location.reload();
            Swal.fire({
                title: "Succès",
                text: "Mouvement de stock enregistré avec succès !",
                icon: "success"
            })
            // navigate('/voir-stocks')

        } catch (error) {
            console.error("Erreur lors de l'enregistrement du mouvement de stock : ", error)
            window.location.reload();
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de l'enregistrement du mouvement de stock !",
                icon: "warning"
            })
            // navigate('/voir-stocks')
        } finally {
            setLoadingActions(false)
        }

    }

    return (
        <>
            <PageBreadcrumb pageTitle={`Stock #${id}`} />
            {loading ? (
                <>
                    <div className="text-center">
                        <span>
                            Loading...
                        </span>
                    </div>
                </>
            ) : (
                <>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2">
                            <div className="col-start-2 col-end-3 grid grid-cols-2">
                                <div className="col-start-2 col-end-3 space-y-1.5">
                                    {loadingActions ? (
                                        <>
                                            <div className='text-center'>
                                                <span className=''>
                                                    <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {isOwner ? (
                                                <>
                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                        onClick={() => { setIsModalModifStockOpen(true) }}>
                                                        <span className='mr-4'><i className="pi pi-file-edit"></i></span>
                                                        <span className='text-sm text-gray-700 font-medium'>Modifier stock</span>
                                                    </button>
                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                        onClick={''}>
                                                        <span className='mr-4'><i className="pi pi-clone"></i></span>
                                                        <span className='text-sm text-gray-700 font-medium'>Associer stocks</span>
                                                    </button>
                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                        onClick={''}>
                                                        <span className='mr-4'><i className="pi pi-trash"></i></span>
                                                        <span className='text-sm text-gray-700 font-medium'>Supprimer stocks</span>
                                                    </button>

                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            {isOwner || isSubOwner ? (
                                                <>
                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                        onClick={() => { setIsModalStockOpen(true) }}>
                                                        <span className='mr-4'><i className="pi pi-arrow-right-arrow-left"></i></span>
                                                        <span className='text-sm text-gray-700 font-medium'>Faire une entrée/sortie</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="border rounded-sm bg-white">
                            <div className="p-3">
                                <div>
                                    <div className="border-b flex justify-between pb-3">
                                        <div className="flex flex-col">
                                            <span className="text-cyan-700 font-semibold text-xl">{codeStock}</span>
                                            <span className="text-sm font-normal">{nomPiece} - <span className="text-xs font-bold text-red-900">{nomModel}</span> - <span className="text-xs font-bold text-red-900">{nomService}</span></span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span style={{ fontSize: '11px' }}>Propriétaire</span>
                                            <span className="text-xs font-bold">{nomAuteur}</span>
                                            <span style={{ fontSize: '11px' }}>Date création</span>
                                            <span className="text-xs font-medium">{dateCreation}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col border-b py-3">
                                        <div>
                                            <span className="font-bold text-red-800">Initialisation de stock le {formatDate(initialisation.created_at)} </span>
                                        </div>
                                        <div className="flex flex-col text-sm">
                                            <span>Quantité initiale lot(s) :
                                                <span className="text-cyan-800 font-semibold"> {detailsInitialisation.stockFinalLot ? detailsInitialisation.stockFinalLot : 0}</span>
                                            </span>
                                            <span>Quantité initiale carton(s) :
                                                <span className="text-cyan-800 font-semibold"> {detailsInitialisation.stockFinalCarton ? detailsInitialisation.stockFinalCarton : 0}</span>
                                            </span>
                                            <span>Quantité initiale pièce(s) :
                                                <span className="text-cyan-800 font-semibold"> {detailsInitialisation.stockFinalPiece ? detailsInitialisation.stockFinalPiece : 0}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="text-center mt-3">
                                            <span className="font-semibold text-gray-800">Tous les mouvements du stock</span>
                                        </div>
                                        <div>
                                            <div className="flex justify-normal flex-wrap gap-3">
                                                <div className="flex gap-2">
                                                    <DatePicker
                                                        id="date-picker-debut"
                                                        label="Date de début"
                                                        placeholder="Date de début"
                                                        value={startDate}
                                                        onChange={(dates) => {
                                                            setStartDate(dates[0])
                                                        }}
                                                        dateFormat="dd/mm/yy" />
                                                    <DatePicker
                                                        id="date-picker-fin"
                                                        label="Date de fin"
                                                        placeholder="Date de fin"
                                                        value={endDate}
                                                        onChange={(dates) => {
                                                            if (dates && dates[0]) {
                                                                let selectedDate = new Date(dates[0]);
                                                                let nextDay = new Date(selectedDate);
                                                                nextDay.setDate(selectedDate.getDate() + 1);
                                                                setEndDate(nextDay);
                                                            }
                                                        }}
                                                        dateFormat="dd/mm/yy" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs">
                                                {filteredMouvements.length} mouvement(s) trouvé(s).
                                            </span>
                                        </div>
                                        <div>
                                            <DataTable
                                                value={filteredMouvements}
                                                loading={loading}
                                                removableSort
                                                paginator
                                                rows={rows}
                                                first={first}
                                                onPage={handlePageChange}
                                                rowsPerPageOptions={[1, 2, 3, 4, 5, 10, 20, 50, 100]}
                                                tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                                                emptyMessage="Aucun mouvement trouvé"
                                                className="p-datatable-sm flex-wrap">

                                                <Column field="id" header="ID" body={idTemplate} sortable></Column>
                                                <Column field="type" header="Type" body={typeTemplate}></Column>
                                                <Column field="mouvement" header="Mouvement" body={mouvementTemplate}></Column>
                                                <Column field="stock_initial" header="Stock Initial" body={initialTemplate} sortable></Column>
                                                <Column field="quantite" header="Quantité" body={quantiteTemplate} sortable></Column>
                                                <Column field="stock_final" header="Stock Final" body={finalTemplate} sortable></Column>
                                                <Column field="quantite_totale_piece" header="Quantité totale" body={totalTemplate} sortable></Column>
                                                <Column header="Demandeur" body={demandeurTemplate}></Column>
                                                <Column header="Receveur" body={receveurTemplate}></Column>
                                                {/* <Column field="service_origine" header="Origine" body={origineTemplate}></Column> */}
                                                {/* <Column field="service_destination" header="Destination" body={destinationTemplate}></Column> */}
                                                <Column field="created_at" header="Date" body={dateTemplate} sortable></Column>
                                                {/* <Column header="Actions" body={actionsTemplate}></Column> */}
                                                {/* <Column field="formulaire_id" header="ID Livraison" body={livraisonTemplate} sortable></Column> */}
                                                {/* <Column field="demande_id" header="ID Demande" body={demandeTemplate} sortable></Column> */}

                                            </DataTable>
                                        </div>
                                    </div>
                                    <div className="border-b">
                                        <div className="grid grid-cols-3">
                                            <div className="border-r">
                                                <div>
                                                    <span className="font-bold text-red-800">Etat actuel du stock</span>
                                                </div>
                                                <div className="flex flex-col ">
                                                    <span className="text-sm">Quantité pièces</span>
                                                    <span className="text-5xl font-medium">{quantitePiece}</span>
                                                </div>
                                                <div>
                                                    <span className="font-light text-sm">Quantité cartons: </span>
                                                    <span className="font-semibold">{quantiteCarton}</span>
                                                </div>
                                                <div>
                                                    <span className="font-light text-sm">Quantité lots: </span>
                                                    <span className="font-semibold">{quantiteLot}</span>
                                                </div>
                                            </div>
                                            {lotsStock.length > 0 ? (
                                                <>
                                                    <div className="flex justify-center items-center border-r">
                                                        <div>
                                                            <TreeSelect options={lotsStock}
                                                                placeholder="Voir lots"
                                                                filter
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            {cartonsStock.length > 0 ? (
                                                <>
                                                    <div className="flex justify-center items-center border-r">
                                                        <div>
                                                            <Dropdown options={cartonsStock}
                                                                optionLabel="label"
                                                                placeholder="Voir Cartons Simples"
                                                                filter filterDelay={400}
                                                                filterBy="numero"
                                                                filterPlaceholder="Numéro carton"
                                                                itemTemplate={cartonSimplesTemplate}
                                                            />
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
                </>
            )}

            <Modal isOpen={isModalModifStockOpen} onClose={() => setIsModalModifStockOpen(false)} className="p-4 max-w-4xl">
                <div>
                    <div className="space-y-3">
                        <Toast ref={toast} />
                        <div className="flex justify-center">
                            <span className="border px-6">Modifier Stock</span>
                        </div>
                        <div className="flex justify-center">
                            <div className="w-3/5 space-y-4">
                                <div>
                                    <Label className="">Code Stock <span className="text-red-700">*</span></Label>
                                    <Input type="text" id="input"
                                        className=""
                                        value={newCodeStock}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setNewCodeStock(value)
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label className="">Propriétaire du stock <span className="text-red-700">*</span></Label>
                                    <Dropdown value={selectedOwner}
                                        onChange={handleOwnerChange}
                                        options={optionsUsers}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Choisir un propriétaire"
                                        filter
                                        filterBy="label"
                                        showClear
                                        valueTemplate={selectedOwnerTemplate}
                                        itemTemplate={usersTemplate}
                                        className="w-full md:w-14rem"
                                    />
                                </div>
                                <div>
                                    <Label className="">Sous-propriétaire(s) du stock</Label>
                                    <MultiSelect value={selectedSubOwners}
                                        onChange={(e) => setSelectedSubOwners(e.value)}
                                        options={optionSubOwners}
                                        optionLabel="label"
                                        optionValue="value"
                                        display="chip"
                                        filter
                                        filterBy="label"
                                        showClear
                                        placeholder="Choisir des sous-propriétaires"
                                        maxSelectedLabels={3}
                                        className="w-full md:w-20rem"
                                    />
                                </div>
                                <div>
                                    <div className="w-full flex justify-center items-center">
                                        <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                            onClick={handleModifyStock}
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-center">
                                        <span className="text-error-600 font-medium flex items-center justify-center text-sm">
                                            {errorAction}
                                        </span>
                                    </div>
                                    <div className="text-right text-gray-500">
                                        <span className="text-xs font-medium">
                                            Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalStockOpen} onClose={() => setIsModalStockOpen(false)} className="p-4 max-w-4xl">
                <div>
                    <div className="space-y-3">
                        <div className="flex justify-center">
                            <span className="border px-6">Entrée / Sortie</span>
                        </div>
                        <div className="flex justify-center">
                            <div className="w-3/5 space-y-4">
                                <div>
                                    <Label className="">Motif <span className="text-red-700">*</span></Label>
                                    <Input type="text" id="input"
                                        className=""
                                        value={motif} s
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setMotif(value)
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label>Type <span className="text-red-700">*</span></Label>
                                    <Dropdown onChange={(e) => setSelectedTypeMouvement(e.value)}
                                        options={optionsTypes}
                                        optionLabel="Label"
                                        placeholder="Choisir type de mouvement"
                                        itemTemplate={typeMouvementTemplate}
                                        className="w-full"
                                        value={selectedTypeMouvement}
                                        valueTemplate={SelectedTypeMouvementTemplate}
                                    />
                                </div>
                                {selectedTypeMouvement == 'sortie' ? (
                                    <>
                                        <div className="space-y-3">
                                            <div>
                                                <Label>Destination</Label>
                                                <Input
                                                    type="text"
                                                    value={destination}
                                                    onChange={(e) => {
                                                        const value = e.target.value
                                                        setDestination(value)
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <span>Faire une sortie  : </span>
                                                <div>
                                                    <div className="flex items-center gap-3 my-2">
                                                        {/* Par piece */}
                                                        <Checkbox
                                                            checked={parPiece}
                                                            onChange={() => {
                                                                if (parPiece) {
                                                                    setParPiece(false)
                                                                } else {
                                                                    setParPiece(true)
                                                                }
                                                            }}
                                                            label="Par Pièce"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {parPiece ? (
                                                    <>
                                                        <div className="space-y-5">
                                                            <div>
                                                                <div>
                                                                    <Label>Quantité <span className="text-red-700">*</span></Label>
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
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                    </>
                                )}
                                {selectedTypeMouvement == 'entree' ? (
                                    <>
                                        <div className="space-y-3">
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
                                            <div>
                                                <span>Faire une entrée : </span>
                                                <div>
                                                    <div className="flex items-center gap-3 my-2">
                                                        {/* Par piece */}
                                                        <Checkbox
                                                            checked={parPiece}
                                                            onChange={() => {
                                                                if (parPiece) {
                                                                    setParPiece(false)
                                                                } else {
                                                                    setParPiece(true)
                                                                }
                                                            }}
                                                            label="Par Pièce"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {parPiece ? (
                                                    <>
                                                        <div className="space-y-5">
                                                            <div>
                                                                <div>
                                                                    <Label>Quantité <span className="text-red-700">*</span></Label>
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
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <></>
                                )}
                                <div>
                                    <Label>Commentaire</Label>
                                    <TextArea
                                        type="text"
                                        placeholder="Ajoutez un commentaire"
                                        value={commentaire}
                                        onChange={(value) => setCommentaire(value)}
                                    />
                                </div>
                                <div>
                                    <div className="w-full flex justify-center items-center">
                                        <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                            onClick={handleStockMouvement}
                                        >
                                            Confirmer
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-center">
                                        <span className="text-error-600 font-medium flex items-center justify-center text-sm">
                                            {errorAction}
                                        </span>
                                    </div>
                                    <div className="text-right text-gray-500">
                                        <span className="text-xs font-medium">
                                            Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

        </>
    )
}