import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';

import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../components/ui/table"

import 'primeicons/primeicons.css';

import { Remplacements } from '../../backend/livraisons/Remplacements';
import { Users } from '../../backend/users/Users';
import { Reception } from '../../backend/receptions/Reception';
import { Stock } from '../../backend/stock/Stock';
import { generatePdf } from '../../backend/receptions/GeneratePDF';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Modal } from '../../components/ui/modal';
import Swal from 'sweetalert2'
import SignatureCanvas from 'react-signature-canvas'
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import { addLocale } from "primereact/api";
import { Calendar } from 'primereact/calendar';

export default function RemplacementDetails() {

    const remplacements = new Remplacements()
    const { id } = useParams();
    const usersData = new Users()
    const reception = new Reception()
    const stockData = new Stock()

    const userId = localStorage.getItem('id')
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [loadingPrint, setLoadingPrint] = useState(false);
    const [deliveryDetails, setDeliveryDetails] = useState('')
    const [typeLivraison, setTypeLivraison] = useState('')
    const [dateLivraison, setDateLivraison] = useState('')
    const [commentaire, setCommentaire] = useState('');
    const [commentaireReception, setCommentaireReception] = useState('');
    const [statutLivraison, setStatutLivraison] = useState('en attente');
    const [statutClass, setStatutClass] = useState('text-sm rounded-xl p-1 bg-orange-100 text-orange-500 font-bold')
    const [recu, setRecu] = useState(false);
    const [actionButtons, setActionButtons] = useState(false);
    const [attente, setAttente] = useState(true)

    const [isRecepteur, setIsRecepteur] = useState(false)
    const [isLivreur, setIsLivreur] = useState(false)
    const [isModificateur, setIsModificateur] = useState(false)

    const [loadingReception, setLoadingReception] = useState(false);
    const [isModalReceptionOpen, setIsModalReceptionOpen] = useState(false);
    const [isModalReturnLivraisonOpen, setIsModalReturnLivraisonOpen] = useState(false)
    const [messageReception, setMessageReception] = useState('')
    const [messageReturnLivraison, setMessageReturnLivraison] = useState('')
    const [errorSignReception, setErrorSignReception] = useState('')
    const [errorReturnLivraison, setErrorReturnLivraison] = useState('')
    const [signatureReception, setSignatureReception] = useState()

    const [livraisonID, setLivraisonID] = useState('')

    const [isCompleted, setIsCompleted] = useState(false)

    const [quantiteLivraison, setQuantiteLivraison] = useState()

    const [oldModel, setOldModel] = useState('')
    const [newModel, setNewModel] = useState('')

    const [detailsParametrage, setDetailsParametrage] = useState([])

    const [isReg, setIsReg] = useState(false)

    const [selectedDateReception, setSelectedDateReception] = useState(null)
    const [isModalRegularisationReceptionOpen, setIsModalRegularisationReceptionOpen] = useState(false);
    const [dateLivraisonReg, setDateLivraisonReg] = useState(null)

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

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

    useEffect(() => {
        if (id) {
            const fetchDeliveryDetails = async () => {
                try {
                    setLoading(true);

                    let userRoles_data = await usersData.getUserRoles(parseInt(userId))
                    const roles_id = userRoles_data.roles.map((role) => {
                        return role.id_role
                    })

                    if (roles_id.includes(6)) {
                        setIsModificateur(true)
                    }

                    let livraison_data;
                    livraison_data = await remplacements.getOneRemplacement(id);
                    let index;
                    // console.log(livraison_data)
                    setDeliveryDetails({
                        ...livraison_data,
                        produitsLivre: JSON.parse(livraison_data.details_remplacement)
                    });
                    const produits = JSON.parse(livraison_data.details_remplacement)
                    setQuantiteLivraison(livraison_data.quantite)
                    setDateLivraison(formatDate(livraison_data.date_remplacement))
                    setCommentaire(livraison_data.commentaire)

                    let details_parametrage = JSON.parse(livraison_data.details_parametrage)
                    console.log(details_parametrage)
                    setDetailsParametrage(details_parametrage)

                    const models_data = await stockData.getAllModels()
                    const ancienModel = models_data.find((item) => {
                        return item.id_model == livraison_data.old_model_id
                    })
                    if (ancienModel) {
                        setOldModel(ancienModel.nom_model)
                    }
                    const nouveauModel = models_data.find((item) => {
                        return item.id_model == livraison_data.new_model_id
                    })
                    if (nouveauModel) {
                        setNewModel(nouveauModel.nom_model)
                    }

                    const remplacementForm = livraison_data.forms
                    if (remplacementForm) {
                        if (remplacementForm.is_reg) {
                            setIsReg(true)
                            setDateLivraisonReg(remplacementForm.last_modified_at)
                        }
                    }

                    if (livraison_data.statut == 'livre') {
                        setIsCompleted(true)
                        setActionButtons(true)
                        setStatutLivraison('Livré')
                        setAttente(false)
                        setStatutClass('text-sm border rounded-xl p-1 bg-green-100 text-green-500 font-bold')
                        setRecu(true)
                        index = livraison_data.validation_remplacement.length - 1
                        setCommentaireReception(livraison_data.validation_remplacement[index].commentaire)
                    }
                    else if (livraison_data.statut == 'en_cours') {
                        if (roles_id.includes(livraison_data.role_id) || roles_id.includes(2)) {
                            setIsRecepteur(true)
                        }
                        if (roles_id.includes(1)) {
                            setIsLivreur(true)
                        }
                    }
                    else if (livraison_data.statut == 'en_attente') {
                        setActionButtons(false)
                        setRecu(true)
                        setAttente(true)
                        setStatutLivraison('Retourné')
                        setStatutClass('text-sm border rounded-xl p-1 bg-red-100 text-red-500 font-bold')
                        index = livraison_data.validation_remplacement.length - 1
                        setCommentaireReception(livraison_data.validation_remplacement[index].commentaire)
                        if (roles_id.includes(1)) {
                            setIsLivreur(true)
                        }
                    }

                } catch (error) {
                    console.log("Error fetchind data ", error)
                } finally {
                    setLoading(false)
                }
            };
            fetchDeliveryDetails();
        }
    }, [id]);

    const handleGeneratePdf = async () => {
        setLoadingPrint(true);
        try {
            const blob = await remplacements.generateRemplacementPDF(id);
            const fileURL = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            window.open(fileURL, '_blank');
        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de la génération du pdf",
                icon: "warning"
            });
        } finally {
            setLoadingPrint(false);
        }
    }

    const handleClearReception = () => {
        signatureReception.clear()
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
            setIsModalRegularisationReceptionOpen(false)
            const sign = signatureReception.toDataURL('image/png')
            const fd = new FormData();
            fd.append('remplacement_id', id)
            fd.append('commentaire', messageReception);
            fd.append('user_id', userId);
            if (isReg && selectedDateReception) {
                fd.append('date_validation', selectedDateReception);
            }
            if (sign) {
                const blob = await fetch(sign).then(res => res.blob());
                fd.append('signature', blob, 'signature.png');
            }
            // for (let [key, value] of fd.entries()) {
            //     console.log(`${key}:`, value);
            // }
            const response = await remplacements.validateRemplacement(fd);

            Swal.fire({
                title: "Succès",
                text: "Formulaire réceptionné avec succès",
                icon: "success"
            });
            console.log(response)
            navigate('/tous-les-remplacements');
        } catch (error) {
            setLoadingReception(false)
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de la réception",
                icon: "warning"
            });
            navigate('/tous-les-remplacements');
        } finally {
            setLoadingReception(false)
        }
    }

    const handleReturnLivraison = async (e) => {
        e.preventDefault();
        if (!messageReturnLivraison) {
            setErrorReturnLivraison("Ajoutez un commentaire avant de retourner une livraison!")
            return;
        }
        const payload = {
            remplacement_id: id,
            commentaire_return: messageReturnLivraison,
            user_id: userId,
        }
        try {
            setLoadingReception(true);
            setIsModalReturnLivraisonOpen(false);
            console.log("Sending payload: ", payload);
            const response = await remplacements.returnRemplacement(payload);
            Swal.fire({
                title: "Succès",
                text: "Livraison retournée avec succès",
                icon: "success"
            });
            console.log(response)
            navigate('/tous-les-remplacements');
        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors du retour de la livraison",
                icon: "warning"
            });
            navigate('/tous-les-remplacements');
        } finally {
            setLoadingReception(false)
        }
    }

    return (
        <>
            {loading ?
                (<>Loading...</>) :
                (<>
                    <PageBreadcrumb pageTitle={`Remplacement`} />
                    <div>
                        <div className='grid grid-cols-2 justify-between items-center mb-6'>
                            <div className='space-y-4'>
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
                                    <span>{`Remplacement TPE ${oldModel} en ${newModel} du ${dateLivraison}`}</span>
                                </div>
                                <div className='mt-3'>
                                    <span className={statutClass}>
                                        {statutLivraison}
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
                                                <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                    <span className='mr-4'><i className="pi pi-cog"></i></span>
                                                    <span className='text-sm text-gray-700 font-medium'>Modification Admin</span>
                                                </button>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {isLivreur ? (
                                            <>
                                                <Link to={`/modifier-remplacement/${id}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                    <span className='mr-4'><i className="pi pi-pencil"></i></span>
                                                    <span className='text-sm text-gray-700 font-medium'>Modifier Remplacement</span>
                                                </Link>
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                        {isRecepteur ? (
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
                                                                        setIsModalRegularisationReceptionOpen(true)
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
                                                                    <span className='text-sm text-gray-700 font-medium'>Réceptionner Livraison</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'
                                                            onClick={() => {
                                                                setIsModalReturnLivraisonOpen(true)
                                                            }}>
                                                            <span className='mr-4'><i className="pi pi-arrow-left"></i></span>
                                                            <span className='text-sm text-gray-700 font-medium'>Retourner Livraison</span>
                                                        </button>
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
                        <div className='overflow-hidden mb-6 pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                            <div className='mb-6 pb-2 w-full border-b'>
                                <span className='text-sm mr-2'>Commentaire livraison</span>
                                <span className='text-sm'><i className="pi pi-comment"></i></span>
                            </div>
                            {commentaire ? (
                                <p className='text-sm text-cyan-700'>{commentaire}</p>
                            ) : (
                                <p className='text-xs opacity-20'>Sans commentaire</p>
                            )}
                        </div>
                        {recu ? (
                            <>
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
                            </>
                        ) : (
                            <></>
                        )}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className='p-4 text-xs text-gray-600 flex'>
                                <span>Quantité : {quantiteLivraison}</span>
                                <div className="ms-6 flex">
                                    {detailsParametrage.map((param) => {
                                        let quantite = param.quantite
                                        let classQuantite = "text-gray-600 font-medium"
                                        if (quantite > 0) {
                                            classQuantite = "text-blue-700 font-medium"
                                        }
                                        return (
                                            <>
                                                <div className="mx-6">
                                                    <span className="text-xs text-gray-600">{param.nom} : <span className={classQuantite}>{param.quantite}</span></span>
                                                </div>
                                            </>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="max-w-full overflow-x-auto">
                                <Table>
                                    {/* Table Header */}
                                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                        <TableRow>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Point Marchand
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Remplacement S/N
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Parametrage
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Banque
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                OM
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                MTN
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                MOOV
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                RNE
                                            </TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    {/* Table Body */}
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {deliveryDetails.produitsLivre?.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="px-5 py-4 sm:px-6 text-start">
                                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                        {item.pointMarchand}
                                                    </span>
                                                    <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                                        {item.caisse}
                                                    </span>
                                                    {item.commentaireTPE ? (
                                                        <span className="block text-gray-700 text-theme-xs dark:text-gray-400">
                                                            « {item.commentaireTPE} »
                                                        </span>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-start dark:text-gray-400">
                                                    <span className="block">
                                                        <span className="text-xs text-gray-400">
                                                            Ancien S/N : <span className="text-theme-sm text-gray-600">{item.ancienSN}</span>
                                                        </span>
                                                    </span>
                                                    <span className="block">
                                                        <span className="text-xs text-gray-400">
                                                            Nouvel S/N : <span className="text-theme-sm text-gray-600">{item.nouvelSN}</span>
                                                        </span>
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.parametrageTPE}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.banque}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.mobile_money.includes("OM") ?
                                                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.mobile_money.includes("MTN") ?
                                                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.mobile_money.includes("MOOV") ?
                                                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.mobile_money.includes("RNE") ?
                                                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>

                                </Table>
                            </div>
                        </div>
                    </div>
                </>)
            }
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
                                onClick={handleReturnLivraison}
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
            {/* Ajout du modal de reception d'une regularisation de livraison */}
            <Modal isOpen={isModalRegularisationReceptionOpen} onClose={() => setIsModalRegularisationReceptionOpen(false)} className="p-4 max-w-md">
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
                                value={selectedDateReception}
                                locale="fr"
                                onChange={(e) => setSelectedDateReception(e.value)}
                                dateFormat="dd/mm/yy"
                                placeholder="dd/mm/yyyy"
                                minDate={new Date(dateLivraisonReg)}
                                maxDate={new Date()}
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
        </>
    )
}