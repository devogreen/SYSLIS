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
import { useNavigate, useParams, useLocation } from "react-router";

import { Stock } from "../../../backend/stock/Stock.js";
import { Users } from "../../../backend/users/Users.js";
import { Demandes } from "../../../backend/demandes/Demandes.js";

import { Dropdown } from "primereact/dropdown";

import SignatureCanvas from 'react-signature-canvas'

import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";

addLocale('fr', {
    firstDayOfWeek: 1,
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    dayNamesMin: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    monthNamesShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
});

export default function ValidateDemandeInputs() {

    const stockData = new Stock()
    const userData = new Users()
    const demandeData = new Demandes()
    const userId = localStorage.getItem('id');
    const role = localStorage.getItem("role_id")
    const navigate = useNavigate()
    const { id: idDemande } = useParams();
    const location = useLocation();
    const { from } = location.state || {};

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
    const [stockOwners, setStockOwners] = useState([])
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

    const [isReg, setIsReg] = useState(false)
    const [selectedDateValidation, setSelectedDateValidation] = useState(null)
    const [dateDemande, setDateDemande] = useState(null)

    const [isGestionStock, setIsGestionStock] = useState(false)

    const isOnlyDigits = (str) => /^\d+$/.test(str);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {

                const demande_data = await demandeData.getOneDemande(idDemande)
                const detailsDemande = JSON.parse(demande_data.details_demande)

                const demandeForm = demande_data.forms
                if (demandeForm) {
                    setIsReg(demandeForm.is_reg)
                    const dateDemande = new Date(demandeForm.last_modified_at)
                    setDateDemande(dateDemande)
                }
                const stock_data = await stockData.getAllStocks()
                const stocks = stock_data.filter((item) => {
                    return item.piece_id == demande_data.item_id &&
                        item.is_deleted == false &&
                        item.model_id == detailsDemande.selectedModel &&
                        item.service_id == detailsDemande.selectedServicePiece &&
                        item.quantite_piece > 0
                })
                console.log(stock_data)

                let userRoles_data = await userData.getUserRoles(parseInt(userId))
                const roles_id = userRoles_data.roles.map((role) => {
                    return role.id_role
                })
                if (roles_id.includes(7) && stocks.length == 0) {
                    setIsGestionStock(true)
                }

                const ownersData = await stockData.getAllUserTypeStocks(demande_data.item_id, detailsDemande.selectedModel, detailsDemande.selectedServicePiece)
                const ownersId = ownersData.map((item) => {
                    return item.id_user
                })
                console.log(ownersId)
                setStockOwners(ownersId)

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

                setMotif(demande_data.motif_demande)


                setCommentaireDemande(demande_data.commentaire)

                setQuantiteDemande(demande_data.qte_total_demande)
                setTypeDemande(detailsDemande.typeDemande)

                const stocks_data_all = await stockData.getAllStocks()
                const stocks_data = stocks_data_all.filter((item) => {
                    return item.is_deleted == false && item.piece_id == demande_data.item_id && item.quantite_piece > 0
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

                setOptionsStocks(options_stocks)

                const models_data = await stockData.getAllModels()
                setModels(models_data)

                const modelId = detailsDemande.selectedModel
                setSelectedModel(modelId)
                const model = models_data.find((item) => {
                    return item.id_model == modelId
                })
                const nomModel = model ? model.nom_model : 'N/A'
                setNomModel(nomModel)

                const serviceId = detailsDemande.selectedServicePiece
                setSelectedServicePiece(serviceId)
                const service = services_data.find((item) => {
                    return item.id == serviceId
                })
                const nomService = service ? service.nom_service : 'N/A'
                setNomServicePiece(nomService)

            } catch (error) {
                console.log(error)
                setErrorForm('Une erreur est survenue lors de la génération du formulaire.')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const checkValidate = () => {
        if (isReg) {
            if (!selectedDateValidation) {
                setError("Vous devez choisir une date !")
                return false
            }
        }
        if (quantite == 0 || isNaN(quantite) || quantite == "") {
            setError("Quantité validée invalide !")
            return false
        }

        setError('')
        return true
    }

    const handleClear = () => {
        signature.clear()
    }

    const handleConfirm = () => {
        if (!checkValidate()) {
            return
        }
        setIsConfirmModalOpen(true)

    }

    const handleConfirmSign = () => {
        setSortieParPieceModalOpen(false)
        setSortieParCartonModalOpen(false)
        setSortieParPieceCartonModalOpen(false)
        setSortieParCartonLotModalOpen(false)
        setSortieParLotModalOpen(false)

        setIsConfirmModalOpen(false)
        setIsSignModalOpen(true)
    }

    const handleValidate = async () => {
        if (signature.isEmpty()) {
            setErrorSign('Vous devez signer pour valider !')
            return;
        }
        setIsConfirmModalOpen(false)
        setLoadingValidation(true)

        try {
            const successPath = stockOwners.includes(+userId) ?
                `/livraison-demande/${idDemande}` :
                `/toutes-les-demandes`
            const sign = signature.toDataURL('image/png')
            const fd = new FormData();

            if (sign) {
                const blob = await fetch(sign).then(res => res.blob());
                fd.append('signature', blob, 'signature.png');
            }
            fd.append('demande_id', idDemande)
            fd.append('user_id', userId)
            fd.append('commentaire', commentaire)
            fd.append('quantiteValidee', quantite)
            fd.append('owners', stockOwners)
            fd.append('date_validation', new Date(selectedDateValidation))
            if (isReg) {
                await demandeData.regValidateDemande(fd)
            } else {
                await demandeData.validateDemande(fd)
            }

            Swal.fire({
                title: "Succès",
                text: "Demande validée avec succès !",
                icon: "success"
            })
            if (isGestionStock) {
                navigate(`/creer-stock`, {
                    state: {
                        from: 'demande-details',
                        idDemande
                    }
                })
            } else {
                navigate(successPath)
            }
        } catch (error) {
            console.error(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la validation !",
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
                                                <span className="text-sm font-semibold">Informations générales</span>
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
                                                        <span className="font-bold">Quantité</span>
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
                                            {isReg ? (
                                                <>
                                                    <div>
                                                        <Label>Date Validation <span className="text-red-700">*</span></Label>
                                                        <Calendar
                                                            value={selectedDateValidation}
                                                            locale="fr"
                                                            onChange={(e) => setSelectedDateValidation(e.value)}
                                                            dateFormat="dd/mm/yy"
                                                            placeholder="jj/mm/aaaa"
                                                            minDate={new Date(dateDemande)}
                                                            maxDate={new Date()}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            <div>
                                                <Label>Quantitée <span className="text-red-700">*</span></Label>
                                                <Input
                                                    type="text"
                                                    id="input"
                                                    value={quantite}
                                                    onChange={(e) => {
                                                        if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                            const value = e.target.value
                                                            setQuantite(value)
                                                        }
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
                                                                onClick={handleConfirm}
                                                            >
                                                                Valider
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
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
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Validation</span>
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
                    <div className="space-y-1 ms-5 text-center text-sm">
                        <div>
                            <span className="text-warning-700">Quantité demandée : {quantiteDemande}</span>
                        </div>
                        <div>
                            <span className="text-green-600">Quantité validée : {quantite}</span>
                        </div>
                    </div>
                    <div className='text-center mb-3 text-xs'>
                        <span>Signez manuellement pour valider la demande</span>
                    </div>
                    <div className='flex flex-col justify-center items-center'>
                        <SignatureCanvas
                            ref={data => setSignature(data)}
                            canvasProps={{ width: 300, height: 150, className: 'sigCanvas border border-gray-300 rounded' }}
                        />
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
                        {/* <div className='w-full mt-3'>
                            <Label>Commentaire</Label>
                            <TextArea
                                value={message}
                                onChange={(value) => setMessage(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                            />
                        </div> */}
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