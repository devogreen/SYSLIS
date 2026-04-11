import { useState, useEffect, useSyncExternalStore } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import 'primeicons/primeicons.css';
import { Demandes } from '../../backend/demandes/Demandes';
import { Stock } from '../../backend/stock/Stock';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Users } from '../../backend/users/Users';
import { ProductDeliveries } from '../../backend/livraisons/ProductDeliveries';
import { Modal } from "../../components/ui/modal/index"
import Swal from 'sweetalert2'
import SignatureCanvas from 'react-signature-canvas'
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import { FilesHandler } from '../../backend/filesHandler/FilesHandler';
import Input from '../../components/form/input/InputField';

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

export default function DemandeDetails() {

    const demandes = new Demandes()
    const stock = new Stock()
    const { id } = useParams();
    const user_id = localStorage.getItem('id')
    const usersData = new Users()
    const livraisonData = new ProductDeliveries()
    const navigate = useNavigate();


    const [loading, setLoading] = useState(false);
    const [loadingPrint, setLoadingPrint] = useState(false);
    const [demandeDetails, setDemandeDetails] = useState('')

    const [items, setItems] = useState([])
    const [item, setItem] = useState(null)
    const [nomPiece, setNomPiece] = useState('')
    const [typeDemande, setTypeDemande] = useState('')

    const [quantiteDemande, setQuantiteDemande] = useState(0)
    const [stockDepart, setStockDepart] = useState(0)
    const [stockFinal, setStockFinal] = useState(0)
    const [stockDepartPiece, setStockDepartPiece] = useState(0)
    const [stockFinalPiece, setStockFinalPiece] = useState(0)

    const [dateDemande, setDateDemande] = useState('')
    const [actionButtons, setActionButtons] = useState(false);
    const [commentaireDemandeur, setCommentaireDemandeur] = useState('');
    const [commentaireValidateur, setCommentaireValidateur] = useState('');
    const [statutDemande, setStatutDemande] = useState('en attente');
    const [statutClass, setStatutClass] = useState('text-sm rounded-xl p-1 bg-orange-100 text-orange-500 font-bold')

    const [recu, setRecu] = useState(false);
    const [isDelivered, setIsDelivered] = useState(false);
    const [attente, setAttente] = useState(true)
    const [valide, setValide] = useState(false)
    const [retourne, setRetourne] = useState(false)
    const [refuse, setRefuse] = useState(false)

    const [serviceDemandeur, setServiceDemandeur] = useState('');
    const [nomDemandeur, setNomDemandeur] = useState('')

    const [stockDT, setStockDT] = useState([])
    const [motifDemande, setMotifDemande] = useState('');

    const [userRoles, setUserRoles] = useState([])
    const [isCompleted, setIsCompleted] = useState(false)
    const [isValidateur, setIsValidateur] = useState(false)
    const [isModificateur, setIsModificateur] = useState(false)
    const [isDemandeur, setIsDemandeur] = useState(false)
    const [isLivreur, setIsLivreur] = useState(false)
    const [isReception, setIsReception] = useState(false)

    const [signatureValidation, setSignatureValidation] = useState();
    const [isModalValidateOpen, setIsModalValidateOpen] = useState(false);
    const [isModalReturnOpen, setIsModalReturnOpen] = useState(false);
    const [errorReturn, setErrorReturn] = useState('');
    const [errorSign, setErrorSign] = useState('');
    const [isModalCancelOpen, setIsModalCancelOpen] = useState(false);
    const [errorCancel, setErrorCancel] = useState('');
    const [loadingDemande, setLoadingDemande] = useState(false);
    const [message, setMessage] = useState("");
    const [messageReturn, setMessageReturn] = useState("");
    const [messageCancel, setMessageCancel] = useState("");

    const [pieceId, setPieceId] = useState(null);

    const [livraisonDetails, setLivraisonDetails] = useState([]);
    const [livraisonID, setLivraisonID] = useState(null)
    const [statutLivraison, setStatutLivraison] = useState('en attente')
    const [statutClassLivraison, setStatutClassLivraison] = useState('text-sm rounded-xl p-1 bg-orange-100 text-orange-500 font-bold')
    const [commentaireLivraison, setCommentaireLivraison] = useState('')
    const [quantiteLivraison, setQuantiteLivraison] = useState('')
    const [nomLivreur, setNomLivreur] = useState('')
    const [modifyLivraison, setModifyLivraison] = useState(false)

    const [loadingReception, setLoadingReception] = useState(false);
    const [isModalReceptionOpen, setIsModalReceptionOpen] = useState(false);
    const [isModalReturnLivraisonOpen, setIsModalReturnLivraisonOpen] = useState(false)
    const [messageReception, setMessageReception] = useState('')
    const [messageReturnLivraison, setMessageReturnLivraison] = useState('')
    const [errorSignReception, setErrorSignReception] = useState('')
    const [errorReturnLivraison, setErrorReturnLivraison] = useState('')
    const [signatureReception, setSignatureReception] = useState()

    const [commentaireReception, setCommentaireReception] = useState('')
    const [nomRecepteur, setNomRecepteur] = useState('')
    const [isReceived, setIsReceived] = useState(false)

    const [otherFields, setOtherFields] = useState([])
    const [otherFieldsLivraison, setOtherFieldsLivraison] = useState([])

    const [stockCartonDepart, setStockCartonDepart] = useState()
    const [stockCartonDemande, setStockCartonDemande] = useState()

    const [nomenclature, setNomenclature] = useState('')

    const [nomStock, setNomStock] = useState('')
    const [stockId, setStockId] = useState(null)

    const [stocksPiece, setStocksPiece] = useState([])

    const [isModalAlerteStockOpen, setIsModalAlerterStockOpen] = useState(false)

    const [nomModel, setNomModel] = useState('')
    const [servicePiece, setServicePiece] = useState('')

    const [quantiteLivree, setQuantiteLivree] = useState(0)

    const [isGestionStock, setIsGestionStock] = useState(false)

    const [loadingLivraison, setLoadingLivraison] = useState(false)

    const [isLivre, setIslivree] = useState(false)

    const [quantiteValidee, setQuantiteValidee] = useState(0)

    const [demandeurFiles, setDemandeurFiles] = useState([])

    const [fileId, setFileId] = useState(null);

    const [isReg, setIsReg] = useState(false)

    const [commentaireValidation, setCommentaireValidation] = useState('')

    const [isModalRegReceptionOpen, setIsModalRegReceptionOpen] = useState(false)

    const [dateReceptionReg, setDateReceptionReg] = useState()

    const [dateLivraison, setDateLivraison] = useState(null)

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    useEffect(() => {
        if (id) {
            const fetchDemandeDetails = async () => {
                try {
                    setLoading(true);

                    let userRoles_data = await usersData.getUserRoles(parseInt(user_id))
                    const roles_id = userRoles_data.roles.map((role) => {
                        return role.id_role
                    })
                    setUserRoles(roles_id)
                    if (roles_id.includes(6)) {
                        setIsModificateur(true)
                    }

                    const demandeData = await demandes.getOneDemande(id);
                    const demandeForm = demandeData.forms
                    if (demandeForm) {
                        if (demandeForm.is_reg) {
                            setIsReg(true)
                        }
                    }
                    let index;
                    setDemandeDetails(demandeData);
                    setMotifDemande(demandeData.motif_demande)
                    setCommentaireDemandeur(demandeData.commentaire)
                    const details = JSON.parse(demandeData.details_demande)

                    const modelId = details.selectedModel ? details.selectedModel : details.model
                    const servicePieceId = details.selectedServicePiece ? details.selectedServicePiece : details.service

                    const ownersData = await stock.getAllUserTypeStocks(demandeData.item_id, modelId, servicePieceId)
                    const ownersId = ownersData.map((item) => {
                        return item.id_user
                    })

                    const services_data = await usersData.getAllServices()
                    const service = services_data.find((item) => {
                        return item.id == demandeData.service_demandeur
                    })
                    const nomService = service ? service.nom_service : ''
                    setServiceDemandeur(nomService)

                    setDateDemande(formatDate(demandeData.date_demande))

                    const stock_data = await stock.getAllStocks()
                    const selectedStock = stock_data.find((item) => {
                        return item.id == demandeData.stock_id
                    })
                    const stocks = stock_data.filter((item) => {
                        return item.piece_id == demandeData.item_id &&
                            item.is_deleted == false &&
                            (item.model_id == details.selectedModel || item.model_id == details.model) &&
                            (item.service_id == details.selectedServicePiece || item.service_id == details.service) &&
                            item.quantite_piece > 0
                    })
                    setStocksPiece(stocks)
                    if (roles_id.includes(7) && stocks.length == 0) {
                        setIsGestionStock(true)
                    }


                    const indexLivraison = demandeData.livraison_piece.length - 1
                    const livraison = demandeData.livraison_piece[indexLivraison]

                    const indexReception = demandeData.reception_piece.length - 1
                    const reception = demandeData.reception_piece[indexReception]

                    if (demandeData.statut_demande == 'en_cours') {
                        if (roles_id.includes(4)) {
                            setIsValidateur(true)
                        }
                        if (roles_id.includes(3)) {
                            setIsDemandeur(true)
                        }
                        setAttente(true)
                    } else if (demandeData.statut_demande == 'valide') {
                        setActionButtons(true)
                        setStatutDemande('Validée')
                        setAttente(false)
                        setValide(true)
                        setStatutClass('text-sm rounded-xl p-1 bg-green-100 text-green-500 font-bold')
                        setRecu(true)
                        index = demandeData.validation_demande.length - 1
                        setCommentaireValidateur(demandeData.validation_demande[index].commentaire)
                        setIsCompleted(true)
                        const validation = demandeData.validation_demande[index]
                        setQuantiteValidee(validation.quantite_validee)
                        if (!demandeData.demande_livree) {
                            if (ownersId.includes(+user_id)) {
                                setIsLivreur(true)
                            }
                        } else {
                            const livraisonForm = livraison ? livraison.forms : null
                            if (livraisonForm) {
                                setDateLivraison(livraisonForm.last_modified_at)
                            }
                            setIsDelivered(true);
                            if (demandeData.demande_recue) {
                                let index_reception
                                setIsReceived(true)
                                index_reception = demandeData.reception_piece.length - 1
                                setCommentaireReception(demandeData.reception_piece[index_reception].commentaire)
                                setNomRecepteur(demandeData.reception_piece[index_reception].nom_recepteur)
                                setStatutLivraison('Reçu')
                                setStatutClassLivraison('text-sm rounded-xl p-1 bg-green-100 text-green-500 font-bold')
                                const receptionForm = reception.forms
                            } else {
                                if (roles_id.includes(12)) {
                                    setIsReception(true)
                                }

                            }
                        }

                    }
                    else if (demandeData.statut_demande == 'retourne') {
                        if (roles_id.includes(3)) {
                            setIsDemandeur(true)
                        }
                        setActionButtons(false)
                        setRecu(true)
                        setAttente(true)
                        setRetourne(true)
                        setStatutDemande('Retournée')
                        setStatutClass('text-sm rounded-xl p-1 bg-red-100 text-red-500 font-bold')
                        index = demandeData.validation_demande.length - 1
                        setCommentaireValidateur(demandeData.validation_demande[index].commentaire)
                    }
                    else if (demandeData.statut_demande == 'refuse') {
                        setActionButtons(false)
                        setRecu(true)
                        setAttente(false)
                        setStatutDemande('Refusée')
                        setRefuse(true)
                        setStatutClass('text-sm rounded-xl p-1 bg-gray-dark text-white font-bold')
                        index = demandeData.validation_demande.length - 1
                        setCommentaireValidateur(demandeData.validation_demande[index].commentaire)

                        // setCommentaireValidateur(demandeData.validations[0].commentaire)
                    }

                    const nom_stock = selectedStock ? selectedStock.code_stock : ''
                    setNomStock(nom_stock)
                    const stock_id = selectedStock ? selectedStock.id : null
                    setStockId(stock_id)

                    const items_data_all = await stock.getAllItems()
                    const items_data = items_data_all.filter((item) => {
                        return item.is_deleted == false
                    })
                    setItems(items_data)
                    const piece = items_data.find((item) => {
                        return item.id_piece == demandeData.item_id
                    })
                    if (piece) {
                        setNomPiece(piece.nom_piece)
                        setPieceId(piece.id_piece)
                    }
                    setNomDemandeur(demandeData.nom_demandeur)
                    setNomenclature(demandeData.nomenclature)
                    const autres = JSON.parse(demandeData.champs_autre)

                    setOtherFields(autres)
                    setQuantiteDemande(demandeData.qte_total_demande)
                    const type_demande = details.typeMouvement
                    const stock_depart = type_demande == 1 ? details.stockInitialLot : type_demande == 2 ?
                        details.stockInitialCartonLot : type_demande == 3 ?
                            details.stockInitialPieceCarton : type_demande == 4 ?
                                details.stockInitialCarton : type_demande == 5 ?
                                    details.stockInitialPiece : 0

                    setStockDepart(stock_depart)

                    const stock_final = type_demande == 1 ? details.stockFinalLot : type_demande == 2 ?
                        details.stockFinalCartonLot : type_demande == 3 ?
                            details.stockFinalPieceCarton : type_demande == 4 ?
                                details.stockFinalCarton : type_demande == 5 ?
                                    details.stockFinalPiece : 0

                    setStockFinal(stock_final)

                    const stock_livre = type_demande == 1 ? details.quantiteMouvementLot : type_demande == 2 ?
                        details.quantiteMouvementCartonLot : type_demande == 3 ?
                            details.quantiteMouvementPieceCarton : type_demande == 4 ?
                                details.quantiteMouvementCarton : type_demande == 5 ?
                                    details.quantiteMouvement : 0

                    setQuantiteLivree(stock_livre)

                    const intial_piece = type_demande == 5 ? details.stockInitialPiece : details.stockInitialPiece
                    setStockDepartPiece(intial_piece)

                    const final_piece = type_demande == 5 ? details.stockFinalPiece : details.stockFinalPiece
                    setStockFinalPiece(final_piece)

                    const typesMouvement_data = await stock.getAllTypeMouvementStock()
                    const typeMouvement = typesMouvement_data.find((item) => {
                        return item.id == type_demande
                    })

                    const nomType = typeMouvement ? typeMouvement.titre : ''
                    if (typeMouvement) {
                        setTypeDemande(nomType)
                    } else {
                        setTypeDemande(details.typeDemande)
                    }

                    const models_data = await stock.getAllModels()
                    const model = models_data.find((item) => {
                        return item.id_model == details.selectedModel
                    })
                    if (model) {
                        setNomModel(model.nom_model)
                    }
                    const serviceItem = services_data.find((item) => {
                        return item.id == details.selectedServicePiece
                    })
                    if (serviceItem) {
                        setServicePiece(serviceItem.nom_service)
                    }

                    const allFiles = await demandes.getAllDemandeFiles(id)
                    const dFiles = allFiles.filter((item) => {
                        return item.role == 'demandeur'
                    })
                    setDemandeurFiles(dFiles)

                } catch (error) {
                    console.log("Error fetchind data ", error)
                } finally {
                    setLoading(false)
                }
            };
            fetchDemandeDetails();
        }
    }, [id]);

    const handleGeneratePdf = async () => {
        setLoadingPrint(true);
        try {
            const blob = await demandes.getPdf(id);
            const fileURL = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            window.open(fileURL, '_blank');
        } catch (error) {
            console.log(error)
            setLoadingPrint(false)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de la génération du formulaire",
                icon: "warning"
            });

        } finally {
            setLoadingPrint(false);
        }
    }

    const handleDemandeurFiles = () => {
        for (let blob in demandeurFiles) {
            const fileURL = URL.createObjectURL(new Blob([blob], { type: `${blob.mimeType}` }));
            window.open(fileURL, '_blank');
        }
    }
    const handleSingleFile = async (id) => {
        try {
            setFileId(id)
            const service = new FilesHandler();
            const response = await service.downloadFile(id);

            const url = window.URL.createObjectURL(response.data);

            const a = document.createElement("a");
            a.href = url;

            // Extract filename from headers if backend sends it
            const contentDisposition = response.headers["content-disposition"];
            let fileName = "download";

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match?.[1]) fileName = match[1];
            }

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Download error:", error);
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors du téléchargement !",
                icon: "warning"
            });
        } finally {
            setFileId(null)
        }
    };

    const handleClearValidation = () => {
        signature.clear()
    }

    const handleClearReception = () => {
        signatureReception.clear()
    }

    const handleValidate = async (e) => {
        e.preventDefault();
        if (signature.isEmpty()) {
            setErrorSign('Vous devez signer pour valider !')
            return;
        }
        const sign = signature.toDataURL('image/png')
        let commentaire = message
        try {
            setLoadingDemande(true);
            setIsModalValidateOpen(false)
            const fd = new FormData();
            fd.append('demande_id', id);
            fd.append('user_id', user_id);
            fd.append('commentaire', commentaire);
            fd.append('stock_id', stockId);

            if (sign) {
                const blob = await fetch(sign).then(res => res.blob());
                fd.append('signature', blob, 'signature.png');
            }

            for (let [key, value] of fd.entries()) {
                console.log(`${key}:`, value);
            }
            const response = await demandes.validateDemande(fd);
            Swal.fire({
                title: "Succès",
                text: "Demande validée avec succès",
                icon: "success"
            });
            console.log(response)
            navigate('/toutes-les-demandes');
        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la validation",
                icon: "warning"
            });
            navigate('/toutes-les-demandes');
        } finally {
            setLoadingDemande(false)
        }
    }

    const handleReturn = async (e) => {
        e.preventDefault();
        if (!messageReturn) {
            setErrorReturn("Ajoutez un commentaire avant de retourner une demande!")
            return;
        }

        const payload = {
            demande_id: id,
            commentaire_return: messageReturn,
            user_id: user_id,
        }
        try {
            setLoadingDemande(true);
            setIsModalReturnOpen(false);
            const response = await demandes.returnDemande(payload);

            Swal.fire({
                title: "Succès",
                text: "Demande retournée avec succès",
                icon: "success"
            });
            console.log(response)
            setIsModalReturnOpen(false)
            navigate('/toutes-les-demandes');
        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors du retour",
                icon: "warning"
            });
            navigate('/toutes-les-demandes');
        } finally {
            setLoadingDemande(false)
        }
    }

    const handleCancel = async (e) => {
        e.preventDefault();

        if (!messageCancel) {
            setErrorCancel("Ajoutez un commentaire avant de refuser la demande!")
            return;
        }

        const payload = {
            demande_id: id,
            commentaire_refus: messageCancel,
            user_id: user_id,
        }
        try {
            setLoadingDemande(true);
            setIsModalCancelOpen(false);
            const response = await demandes.cancelDemande(payload);
            Swal.fire({
                title: "Succès",
                text: "Demande refusée avec succès",
                icon: "success"
            });
            console.log(response)
            setIsModalReturnOpen(false)
            navigate('/toutes-les-demandes');
        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors du refus",
                icon: "warning"
            });
            navigate('/toutes-les-demandes');
        } finally {
            setLoadingDemande(false)
        }
    }

    const handleReception = async (e) => {
        e.preventDefault();
        if (signatureReception.isEmpty()) {
            setErrorSignReception('Vous devez signer pour valider !')
            return;
        }
        try {
            setLoadingReception(true);
            setIsModalReceptionOpen(false)
            const sign = signatureReception.toDataURL('image/png')
            const fd = new FormData();

            fd.append('itemId', pieceId);
            fd.append('demandeId', id);
            fd.append('commentaire', messageReception);
            fd.append('user_id', user_id);
            if (sign) {
                const blob = await fetch(sign).then(res => res.blob());
                fd.append('signature', blob, 'signature.png');
            }
            for (let [key, value] of fd.entries()) {
                console.log(`${key}:`, value);
            }
            const response = await demandes.receivePiece(fd);

            Swal.fire({
                title: "Succès",
                text: "Formulaire réceptionné avec succès",
                icon: "success"
            });
            console.log(response)
            navigate('/toutes-les-demandes');
        } catch (error) {
            setLoadingReception(false)
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de la réception",
                icon: "warning"
            });
            navigate('/toutes-les-demandes');
        } finally {
            setLoadingReception(false)
        }
    }

    const handleReturnLivraison = async (e) => {
        e.preventDefault();
        if (!commentaire_return) {
            setErrorReturnLivraison("Ajoutez un commentaire avant de retourner une livraison!")
            return;
        }
        const payload = {
            userId: user_id,
            livraison_id: livraisonID,
            commentaire_return: messageReturn,
        }
        try {
            setLoadingReception(true);
            setIsModalReturnLivraisonOpen(false);
            console.log("Sending payload: ", payload);
            // const response = await reception.returnDelivery(payload);
            Swal.fire({
                title: "Succès",
                text: "Livraison retournée avec succès",
                icon: "success"
            });
            // console.log(response)
            navigate('/toutes-les-demandes');
        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors du retour de la livraison",
                icon: "warning"
            });
            console.log(response)
            navigate('/toutes-les-demandes');
        } finally {
            setLoadingReception(false)
        }
    }

    const handleRegReception = async (e) => {
        e.preventDefault();
        if (signatureReception.isEmpty()) {
            setErrorSignReception('Vous devez signer pour valider !')
            return;
        }
        if (!dateReceptionReg) {
            setErrorSignReception('Vous devez sélectionner une date de réception !')
            return;
        }
        try {
            setLoadingReception(true);
            setIsModalRegReceptionOpen(false)
            const sign = signatureReception.toDataURL('image/png')
            const fd = new FormData();

            fd.append('itemId', pieceId);
            fd.append('demandeId', id);
            fd.append('commentaire', messageReception);
            fd.append('user_id', user_id);
            fd.append('date_reception', new Date(dateReceptionReg))
            if (sign) {
                const blob = await fetch(sign).then(res => res.blob());
                fd.append('signature', blob, 'signature.png');
            }
            for (let [key, value] of fd.entries()) {
                console.log(`${key}:`, value);
            }
            await demandes.regReceptionDemande(fd);

            Swal.fire({
                title: "Succès",
                text: "Formulaire réceptionné avec succès",
                icon: "success"
            });
            console.log(response)
            navigate('/toutes-les-demandes');
        } catch (error) {
            setLoadingReception(false)
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de la réception",
                icon: "warning"
            });
            navigate('/toutes-les-demandes');
        } finally {
            setLoadingReception(false)
        }
    }

    return (
        <>
            <PageBreadcrumb pageTitle="Mouvement de stock" />
            <div>
                {loading ?
                    (
                        <>
                            Loading...
                        </>
                    ) : (
                        <>
                            <div>
                                <div className='space-y-5'>
                                    <div className='grid grid-cols-2 justify-between items-center mb-6'>
                                        <div className='space-y-2'>
                                            {isReg ? (
                                                <>
                                                    <div>
                                                        <div className="">
                                                            <span className="border p-1.5 border-red-800 text-red-800 text-xs font-light">Régularisation</span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            <div>
                                                <span>{`Demande du ${dateDemande}`}</span>
                                            </div>
                                            <div className=''>
                                                <span className={statutClass}>
                                                    {statutDemande}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='text-right'>
                                            <div className='grid grid-cols-2'>
                                                <div className='col-start-2 space-y-0.5'>
                                                    {isCompleted ? (
                                                        <>
                                                            {loadingPrint ? (
                                                                <>
                                                                    <div className='text-center'>
                                                                        <span className=''>
                                                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                                        onClick={handleGeneratePdf}>
                                                                        <span className='mr-4'><i className="pi pi-print"></i></span>
                                                                        <span className='text-sm text-gray-700 font-medium'>Voir formulaire PDF</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isModificateur ? (
                                                        <>
                                                            <Link to={`/modification-admin-demande/${demandeDetails.id}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                <span className='mr-4'><i className="pi pi-cog"></i></span>
                                                                <span className='text-sm text-gray-700 font-medium'>Modification Admin</span>
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isDemandeur ? (
                                                        <>
                                                            <Link to={`/modifier-demande/${demandeDetails.id}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                <span className='mr-4'><i className="pi pi-pencil"></i></span>
                                                                <span className='text-sm text-gray-700 font-medium'>Modifier demande</span>
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isGestionStock ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    navigate(`/creer-stock`, {
                                                                        state: {
                                                                            from: 'demande-details',
                                                                            idDemande: id
                                                                        }
                                                                    })
                                                                }}
                                                                className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200' >
                                                                <span className='mr-4'><i className="pi pi-plus"></i></span>
                                                                <span className='text-sm text-gray-700 font-medium'>Créer nouveau stock</span>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isValidateur ? (
                                                        <>
                                                            {loadingDemande ? (
                                                                <>
                                                                    <div className='text-center'>
                                                                        <span className=''>
                                                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Link to={`/valider-demande/${id}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                        <span className='mr-4'><i className="pi pi-check"></i></span>
                                                                        <span className='text-sm text-gray-700 font-medium'>
                                                                            {isReg ? 'REG validation' : 'Valider demande'}
                                                                        </span>
                                                                    </Link>
                                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                                        onClick={() => {
                                                                            setIsModalReturnOpen(true)
                                                                        }}>
                                                                        <span className='mr-4'><i className="pi pi-arrow-left"></i></span>
                                                                        <span className='text-sm text-gray-700 font-medium'>Retourner demande</span>
                                                                    </button>
                                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                                        onClick={() => {
                                                                            setIsModalCancelOpen(true)
                                                                        }}>
                                                                        <span className='mr-4'><i className="pi pi-times"></i></span>
                                                                        <span className='text-sm text-gray-700 font-medium'>Refuser demande</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isLivreur ? (
                                                        <>
                                                            <Link to={`/livraison-demande/${demandeDetails.id}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                <span className='mr-4'><i className="pi pi-truck"></i></span>
                                                                <span className='text-sm text-gray-700 font-medium'>{isReg ? 'Reg Livraison' : 'Livraison Stock'}</span>
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isReception ? (
                                                        <>
                                                            {loadingReception ? (
                                                                <>
                                                                    <div className='text-center'>
                                                                        <span className=''>
                                                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {isReg ? (
                                                                        <>
                                                                            <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                                                onClick={() => {
                                                                                    setIsModalRegReceptionOpen(true)
                                                                                }}>
                                                                                <span className='mr-4'><i className="pi pi-inbox"></i></span>
                                                                                <span className='text-sm text-gray-700 font-medium'>Reg Réception</span>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                                                onClick={() => {
                                                                                    setIsModalReceptionOpen(true)
                                                                                }}>
                                                                                <span className='mr-4'><i className="pi pi-inbox"></i></span>
                                                                                <span className='text-sm text-gray-700 font-medium'>Réceptionner Pièces</span>
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='space-y-3'>
                                        {commentaireDemandeur ? (
                                            <>
                                                <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                    <div className='mb-6 pb-2 w-full border-b text-left'>
                                                        <span className='text-sm mr-2'>Commentaire demandeur</span>
                                                        <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                    </div>
                                                    <p className='text-sm text-blue-500 text-left'>{commentaireDemandeur}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        <div>
                                            {demandeurFiles.length > 0 ? (
                                                <>
                                                    <div>
                                                        <span className="text-xs text-gray-500">Pièce(s) jointe(s) demandeur</span>
                                                    </div>
                                                    <div className='grid grid-cols-6 text-xs gap-1'>
                                                        {demandeurFiles.map((file) => {
                                                            let icon = 'pi pi-file'
                                                            let fileClass = 'flex items-center justify-between bg-gray-300 rounded p-0.5'
                                                            if (file.path.endsWith('.pdf')) {
                                                                icon = 'pi pi-file-pdf'
                                                                fileClass = 'flex items-center justify-between bg-red-100 text-red-500 rounded p-0.5'
                                                            } else if (file.path.endsWith('.docx')) {
                                                                icon = 'pi pi-file-word'
                                                                fileClass = 'flex items-center justify-between bg-blue-100 text-blue-600 rounded p-0.5'
                                                            } else if (file.path.endsWith('.xlsx')) {
                                                                icon = 'pi pi-file-excel'
                                                                fileClass = 'flex items-center justify-between bg-green-100 text-green-600 rounded p-0.5'
                                                            }
                                                            return (
                                                                <>
                                                                    {fileId == file.id ? (
                                                                        <>
                                                                            <div className='text-center'>
                                                                                <span className='mx-1'>
                                                                                    <ProgressSpinner style={{ width: '15px', height: '15px' }} strokeWidth="8" animationDuration=".5s" />
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <button key={file.id} className={fileClass} style={{ fontSize: '8px' }} onClick={() => handleSingleFile(file.id)}>
                                                                            <i className={icon}></i>
                                                                            <span className=''>{file.filename}</span>
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )
                                                        })}
                                                    </div>
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                        </div>
                                        {commentaireValidateur ? (
                                            <>
                                                <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                    <div className='mb-6 pb-2 w-full border-b text-left'>
                                                        <span className='text-sm mr-2'>Commentaire validateur</span>
                                                        <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                    </div>
                                                    <p className='text-sm text-blue-500 text-left'>{commentaireValidateur}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                    </div>
                                    {isDelivered ? (
                                        <>
                                            <div className='grid grid-cols-2 justify-between items-center mb-6'>
                                                <div>
                                                    <div>
                                                        <span>Statut réception</span>
                                                    </div>
                                                    <div className='mt-3'>
                                                        <span className={statutClassLivraison}>
                                                            {statutLivraison}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isReceived ? (
                                                <div>
                                                    <div className='overflow-hidden mb-6 pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                        <div className='mb-6 pb-2 w-full border-b text-right'>
                                                            <span className='text-sm mr-2'>Commentaire réception</span>
                                                            <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                        </div>
                                                        {commentaireReception ? (
                                                            <p className='text-sm text-orange-500 text-right'>{commentaireReception}</p>
                                                        ) : (
                                                            <p className='text-xs opacity-20 text-right'>Sans commentaire</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <></>
                                            )}
                                        </>
                                    ) : (
                                        <></>
                                    )
                                    }
                                    <div className='flex justify-center items-center'>
                                        <div className='w-full px-20 py-6 bg-white rounded-2xl border'>
                                            <div className='w-full text-center mb-4'>
                                                <span className='text-md underline'>
                                                    Mouvement de stock
                                                </span>
                                            </div>
                                            <div className='w-full text-center mb-4'>
                                                <span className='font-bold'>
                                                    {motifDemande}
                                                </span>
                                            </div>
                                            <table className='border w-full text-xs'>
                                                <tbody>
                                                    <tr className='border h-15'>
                                                        <th className='border w-1/2'>Pièce demandée</th>
                                                        <th className='border w-1/2 flex-col'>
                                                            <div className='text-sm'>{nomPiece}</div>
                                                            <div className='font-medium'>{nomModel}</div>
                                                            <div className='font-medium'>{servicePiece}</div>
                                                        </th>
                                                    </tr>
                                                    {nomStock ? (
                                                        <>
                                                            <tr className='border h-15'>
                                                                <th className='border w-1/2'>Code Stock</th>
                                                                <th className='border w-1/2'>{nomStock}</th>
                                                            </tr>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    <tr className='border h-15'>
                                                        <th className='border w-1/2'>Service demandeur</th>
                                                        <th className='border w-1/2'>{serviceDemandeur}</th>
                                                    </tr>
                                                    <tr className='border h-15'>
                                                        <th className='border w-1/2'>Demandeur</th>
                                                        <th className='border w-1/2'>{nomDemandeur}</th>
                                                    </tr>
                                                    <tr className='border h-15'>
                                                        <th className='border w-1/2'>Mouvement stock</th>
                                                        <th className='border w-1/2'>{typeDemande}</th>
                                                    </tr>
                                                    <tr className='border h-15'>
                                                        <th className='border w-1/2'>Quantité demandée</th>
                                                        <th className='border w-1/2'>{quantiteDemande}</th>
                                                    </tr>
                                                    {valide ? (
                                                        <>
                                                            <tr className='border h-15'>
                                                                <th className='border w-1/2'>Quantité validée</th>
                                                                <th className='border w-1/2'>{quantiteValidee}</th>
                                                            </tr>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isDelivered ? (
                                                        <>
                                                            <tr className='border h-15'>
                                                                <th className='border w-1/2'>Quantité initiale</th>
                                                                <th className='border w-1/2'>{stockDepart}</th>
                                                            </tr>
                                                            <tr className='border h-15'>
                                                                <th className='border w-1/2'>Quantité livrée</th>
                                                                <th className='border w-1/2'>{quantiteLivree}</th>
                                                            </tr>
                                                            <tr className='border h-15'>
                                                                <th className='border w-1/2'>Quantité finale</th>
                                                                <th className='border w-1/2'>{stockFinal}</th>
                                                            </tr>
                                                        </>
                                                    ) : (
                                                        <>
                                                        </>
                                                    )}
                                                    {/* <tr className='border h-15'>
                                                    <th className='border w-1/2'>Stock initial pièce</th>
                                                    <th className='border w-1/2'>{stockDepartPiece}</th>
                                                </tr>
                                                <tr className='border h-15'>
                                                    <th className='border w-1/2'>Stock final pièce</th>
                                                    <th className='border w-1/2'>{stockFinalPiece}</th>
                                                </tr> */}
                                                    {nomenclature ? (
                                                        <tr className='border h-15'>
                                                            <th className='border w-1/2'>Nomenclature</th>
                                                            <th className='border w-1/2'>{nomenclature}</th>
                                                        </tr>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {otherFields.map((field) => {
                                                        return (
                                                            <>
                                                                <tr className='border h-15'>
                                                                    <th className='border w-1/2'>{field.titre}</th>
                                                                    <th className='border w-1/2'>{field.information}</th>
                                                                </tr>
                                                            </>
                                                        )
                                                    })}
                                                    {isReceived ? (
                                                        <>
                                                            <tr className='border h-15'>
                                                                <th className='border w-1/2'>Recepteur</th>
                                                                <th className='border w-1/2'>{nomRecepteur}</th>
                                                            </tr>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </tbody>
                                            </table>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>)
                }
            </div>
            <Modal isOpen={isModalValidateOpen} onClose={() => setIsModalValidateOpen(false)} className="p-4 max-w-md">
                <div className='p-1'>
                    <div className="w-full text-center mb-3">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium text-sm">Validation</span>
                    </div>
                    <div className='text-center mb-3 text-xs'>
                        <span>Signez manuellement pour valider la réception</span>
                    </div>
                    <div className='flex flex-col justify-center items-center space-y-3'>
                        <SignatureCanvas
                            ref={data => setSignatureValidation(data)}
                            canvasProps={{ width: 300, height: 150, className: 'sigCanvas border border-gray-300 rounded' }}
                        />
                        <div className='w-full'>
                            <Label>Commentaire</Label>
                            <TextArea
                                value={commentaireValidation}
                                onChange={(value) => setCommentaireValidation(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                            />
                        </div>
                        <div className='w-full flex justify-center items-center'>
                            <button
                                onClick={handleClearValidation}
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
                            {errorSignReception}
                        </span>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalReturnOpen} onClose={() => setIsModalReturnOpen(false)} className="p-4 max-w-md">
                <div className='p-1'>
                    <div className='text-center mb-3 text-sm'>
                        <span>Indiquez la raison du retour pour valider</span>
                    </div>
                    <div className='flex flex-col justify-center items-center'>
                        <div className='w-full mt-3'>
                            <Label>Commentaire *</Label>
                            <TextArea
                                value={messageReturn}
                                onChange={(value) => setMessageReturn(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                                error={errorReturn}
                                hint={errorReturn}
                            />
                        </div>
                        <div className='w-full mt-6 flex justify-center items-center'>
                            <button
                                onClick={handleReturn}
                                className='w-48 mx-3 bg-red-400 rounded-2xl h-10 flex justify-center items-center'>
                                Retourner
                            </button>
                            <button
                                onClick={() => {
                                    setIsModalReturnOpen(false);
                                    setErrorReturn('')
                                }}
                                className='w-48 mx-3 bg-gray-400 rounded-2xl h-10 flex justify-center items-center'>
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalCancelOpen} onClose={() => setIsModalCancelOpen(false)} className='p-4 max-w-md'>
                <div className='p-1'>
                    <div className='text-center mb-3 text-sm'>
                        <span>Indiquez la raison du refus pour valider</span>
                    </div>
                    <div className='flex flex-col justify-center items-center'>
                        <div className='w-full mt-3'>
                            <Label>Commentaire *</Label>
                            <TextArea
                                value={messageCancel}
                                onChange={(value) => setMessageCancel(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                                error={errorCancel}
                                hint={errorCancel}
                            />
                        </div>
                        <div className='w-full mt-6 flex justify-center items-center'>
                            <button
                                onClick={handleCancel}
                                className='w-48 mx-3 bg-red-400 rounded-2xl h-10 flex justify-center items-center'>
                                Refuser
                            </button>
                            <button
                                onClick={() => {
                                    setIsModalCancelOpen(false);
                                    setErrorCancel('')
                                }}
                                className='w-48 mx-3 bg-gray-400 rounded-2xl h-10 flex justify-center items-center'>
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalReceptionOpen} onClose={() => setIsModalReceptionOpen(false)} className="p-4 max-w-md">
                <div className='p-1'>
                    <div className='text-center mb-3 text-sm'>
                        <span>Signez manuellement pour valider la livraison</span>
                    </div>
                    <div className='flex flex-col justify-center items-center'>
                        <SignatureCanvas
                            ref={data => setSignatureReception(data)}
                            canvasProps={{ width: 300, height: 250, className: 'sigCanvas border border-gray-300 rounded' }}
                        />
                        <div className='w-full mt-3'>
                            <Label>Commentaire</Label>
                            <TextArea
                                value={messageReception}
                                onChange={(value) => setMessageReception(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                            />
                        </div>
                        <div className='w-full mt-6 flex justify-center items-center'>
                            <button
                                onClick={handleClearReception}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Clear
                            </button>
                            <button
                                onClick={handleReception}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Valider
                            </button>
                        </div>
                    </div>
                    <div className="text-center">
                        <span className="text-error-500 text-xs">
                            {errorSignReception}
                        </span>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalReturnLivraisonOpen} onClose={() => setIsModalReturnLivraisonOpen(false)} className="p-4 max-w-md">
                <div className='p-1'>
                    <div className='text-center mb-3 text-sm'>
                        <span>Indiquez la raison du retour pour valider</span>
                    </div>
                    <div className='flex flex-col justify-center items-center'>
                        <div className='w-full mt-3'>
                            <Label>Commentaire *</Label>
                            <TextArea
                                value={messageReturnLivraison}
                                onChange={(value) => setMessageReturnLivraison(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                                error={errorReturnLivraison}
                                hint={errorReturnLivraison}
                            />
                        </div>
                        <div className='w-full mt-6 flex justify-center items-center'>
                            <button
                                onClick={'handleReturnLivraison'}
                                className='w-48 mx-3 bg-red-400 rounded-2xl h-10 flex justify-center items-center'>
                                Retourner
                            </button>
                            <button
                                onClick={() => {
                                    setIsModalReturnLivraisonOpen(false);
                                    setErrorReturn('')
                                }}
                                className='w-48 mx-3 bg-gray-400 rounded-2xl h-10 flex justify-center items-center'>
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalAlerteStockOpen} onClose={() => setIsModalAlerterStockOpen(false)} className="p-4 max-w-md">
                <div className='p-1 space-y-9'>
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-warning-200 text-warning-500 font-medium">Attention</span>
                    </div>
                    <div className='text-center text-sm font-normal'>
                        <span>Aucun stock n'existe pour cette pièce !</span>
                    </div>
                    {/* <div>
                        <Link to={'/creer-stock'} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center justify-center hover:bg-gray-200'>
                            <span className='text-sm text-gray-700 font-medium'>Créer nouveau stock</span>
                        </Link>
                    </div> */}
                </div>
            </Modal>
            <Modal isOpen={isModalRegReceptionOpen} onClose={() => setIsModalRegReceptionOpen(false)} className="p-4 max-w-md">
                <div className='p-1'>
                    <div className="w-full text-center mb-3">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium text-sm">Réception</span>
                    </div>
                    <div className='text-center mb-3 text-xs'>
                        <span>Signez manuellement pour valider la réception</span>
                    </div>
                    <div className='flex flex-col justify-center items-center space-y-3'>
                        <SignatureCanvas
                            ref={data => setSignatureReception(data)}
                            canvasProps={{ width: 300, height: 150, className: 'sigCanvas border border-gray-300 rounded' }}
                        />
                        <div className='w-full'>
                            <Label>Date Réception <span className="text-red-700">*</span></Label>
                            <Calendar
                                value={dateReceptionReg}
                                locale="fr"
                                onChange={(e) => setDateReceptionReg(e.value)}
                                dateFormat="dd/mm/yy"
                                placeholder="dd/mm/yyyy"
                                maxDate={new Date()}
                                minDate={new Date(dateLivraison)}
                                className="w-full"
                                style={{ fontSize: '2px' }}
                            />
                        </div>
                        <div className='w-full'>
                            <Label>Commentaire</Label>
                            <TextArea
                                value={messageReception}
                                onChange={(value) => setMessageReception(value)}
                                rows={4}
                                placeholder="Ajoutez un commentaire"
                            />
                        </div>

                        <div className='w-full flex justify-center items-center'>
                            <button
                                onClick={handleClearReception}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Clear
                            </button>
                            <button
                                onClick={handleRegReception}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Valider
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <span className="text-error-500 text-xs">
                            {errorSignReception}
                        </span>
                    </div>
                </div>
            </Modal>
        </>
    )
}