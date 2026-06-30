import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useEffect, useState, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router";
import { Decom } from "../../backend/decom/decom"
import { Users } from "../../backend/users/Users";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../components/ui/table"
import { Modal } from "../../components/ui/modal";
import { ProgressSpinner } from "primereact/progressspinner";
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import JSZip, { loadAsync } from "jszip";
import { useDropzone } from "react-dropzone"
import Swal from "sweetalert2";
import { FilesHandler } from "../../backend/filesHandler/FilesHandler";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";
import { Stock } from "../../backend/stock/Stock";
import { set } from "date-fns";

addLocale('fr', {
    firstDayOfWeek: 1,
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    dayNamesMin: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    monthNamesShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
});

export default function DecomDetails() {
    const decomData = new Decom()
    const userData = new Users()
    const stockData = new Stock()
    const { id: idDecom } = useParams()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()
    const filesData = new FilesHandler()


    const [loadingData, setLoadingData] = useState(false)
    const [loadingCancel, setLoadingCancel] = useState(false)
    const [loadingReception, setLoadingReception] = useState(false)
    const [loadingVerification, setLoadingVerification] = useState(false)

    const [errorData, setErrorData] = useState('')

    const [dateDecom, setDateDecom] = useState('')
    const [statutDecom, setStatutDecom] = useState('')
    const [statutClass, setStatutClass] = useState('')

    const [isReg, setIsReg] = useState(false)
    const [enAttente, setEnAttente] = useState(false)

    const [isLivreur, setIsLivreur] = useState(false)
    const [isReceveur, setIsReceveur] = useState(false)
    const [isVerificateur, setIsVerificateur] = useState(false)
    const [isValidateur, setIsValidateur] = useState(false)

    const [listeDecom, setListeDecom] = useState([])
    const [quantiteDecom, setQuantiteDecom] = useState(0)

    const [commentaireDecom, setCommentaireDecom] = useState('')
    const [commentaireReception, setCommentaireReception] = useState('')
    const [commentaireVerification, setCommentaireVerification] = useState('')

    const [fileId, setFileId] = useState(null);
    const [decomFiles, setDecomFiles] = useState([])

    const [messageReception, setMessageReception] = useState('')
    const [messageReturn, setMessageReturn] = useState('')
    const [messageCloture, setMessageCloture] = useState('')

    const [isModalCancelOpen, setIsModalCancelOpen] = useState(false)
    const [isModalReturnOpen, setIsModalReturnOpen] = useState(false)
    const [isModalReceptionOpen, setIsModalReceptionOpen] = useState(false)
    const [isModalClotureOpen, setIsModalClotureOpen] = useState(false)

    const [checking, setChecking] = useState(false)
    const [listeChecking, setListeChecking] = useState([])

    const [pieces, setPieces] = useState([])

    const [dateRegul, setDateRegul] = useState(null)
    const [selectedDateReception, setSelectedDateReception] = useState(null)
    const [selectedDateCloture, setSelectedDateCloture] = useState(null)

    const [errorReception, setErrorReception] = useState('')

    const [loadingExtract, setLoadingExtract] = useState(false)

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const decom = await decomData.getOneDecom(idDecom)
                const decomForm = decom.forms

                if (decomForm.is_deleted) {
                    Swal.fire({
                        title: "Décommissionnement annulé",
                        text: "Ce décom a été annulé.",
                        icon: "warning",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "OK"
                    });
                    navigate('/tous-les-decommissionnements')
                    return;
                }

                const listeDecom = JSON.parse(decom.liste_decom)
                setListeDecom(listeDecom)
                setQuantiteDecom(listeDecom.length)

                const statut = decom.statut
                let statutClass = ''
                const dateDecom = formatDate(decomForm.last_modified_at)
                setDateDecom(dateDecom)

                const regularisation = decomForm.is_reg
                if (regularisation) {
                    setIsReg(true)
                    setDateRegul(decomForm.last_modified_at)
                }

                const rolesData = await userData.getUserRoles(userId)
                const nomRoles = rolesData.roles.map((item) => {
                    return item.nom_role
                })

                const indexReception = decom.reception_decom.length - 1
                const reception = decom.reception_decom[indexReception]

                const indexVerification = decom.retour_decom.length - 1
                const verification = decom.retour_decom[indexVerification]

                if (statut == 'en_cours') {
                    setStatutDecom('en cours')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-1 bg-warning-100 text-warning-300')
                    if (nomRoles.includes('decom')) {
                        setIsLivreur(true)
                    }
                    if (nomRoles.includes('reception_decom')) {
                        setIsReceveur(true)
                    }
                } else if (statut == 'recu' && reception && reception.type == 'validation') {
                    setStatutDecom('en vérification')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-1 bg-blue-100 text-blue-300')

                    if (nomRoles.includes('verification_decom')) {
                        setIsVerificateur(true)
                    }
                    if (nomRoles.includes('cloture_decom')) {
                        setIsValidateur(true)
                    }
                    setChecking(true)
                } else if (statut == 'retourne' && reception && reception.type == 'retour') {
                    setStatutDecom('retourné')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-1 bg-red-100 text-red-300')
                    if (nomRoles.includes('decom')) {
                        setIsLivreur(true)
                    }
                } else if (statut == 'clos' && verification && verification.type == 'cloture') {
                    setStatutDecom('clos')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-2 bg-gray-100 text-gray-400')
                    setChecking(true)
                }

                if (statut == 'recu' || statut == 'clos') {
                    const listeSn = await decomData.getSnDecom(idDecom)
                    setListeDecom(listeSn)
                    console.log('Liste SN: ', listeSn)
                    const listeChecking = listeSn.filter((item) => {
                        return item.statut == 'checking'
                    })
                    setListeChecking(listeChecking)
                }

                const allItems = await stockData.getAllItems()
                const items = allItems.filter((item) => {
                    return item.is_deleted == false && item.type != 'TERMINAL'
                })
                setPieces(items)

                setCommentaireDecom(decomForm.commentaire)
                setCommentaireReception(reception?.forms.commentaire)
                setCommentaireVerification(verification?.forms.commentaire)


                const allFiles = await filesData.getAllFormFiles(decomForm.id)
                const dFiles = allFiles.filter((item) => {
                    return item.role == 'livreur'
                })
                setDecomFiles(dFiles)

            } catch (error) {
                setErrorData('Erreur de données !')
                console.log('Erreur de données: ', error)
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const handleCancelDecom = async () => {
        setIsModalCancelOpen(false)
        try {
            setLoadingCancel(true)
            const payload = {
                userId,
            }
            const id = idDecom
            await decomData.cancelDecom(id, payload)
            Swal.fire({
                title: "Succès",
                text: "Décommissionnement annulé avec succès !",
                icon: "success"
            })
            navigate('/tous-les-decommissionnements')
        } catch (error) {
            console.log("Erreur d'annulation : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de l'annulation !",
                icon: "warning"
            })
            navigate('/tous-les-decommissionnements')
        } finally {
            setLoadingCancel(false)
        }
    }

    const handleReception = async () => {
        if (isReg) {
            if (!selectedDateReception) {
                setErrorReception('Veuillez sélectionner une date de réception pour cette régularisation.')
                return
            }
        }
        setIsModalReceptionOpen(false)
        try {
            setLoadingReception(true)
            setErrorReception('')
            let payload = {}
            if (isReg && selectedDateReception) {
                payload = {
                    userId,
                    commentaire: messageReception,
                    date_reception: selectedDateReception ? selectedDateReception.toISOString() : null,
                }
            } else {
                payload = {
                    userId,
                    commentaire: messageReception,
                }
            }
            const id = idDecom

            await decomData.receptionDecom(id, payload)

            Swal.fire({
                title: "Succès",
                text: "Réception enregistrée avec succès !",
                icon: "success"
            })
            navigate('/tous-les-decommissionnements')
        } catch (error) {
            console.log("Erreur de la réception : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la réception !",
                icon: "warning"
            })
            navigate('/tous-les-decommissionnements')
        } finally {
            setLoadingReception(false)
        }
    }

    const handleReturn = async () => {
        setIsModalReturnOpen(false)
        try {
            setLoadingReception(true)
            const payload = {
                userId,
                commentaire: messageReturn,
            }
            const id = idDecom

            await decomData.returnDecom(id, payload)

            Swal.fire({
                title: "Succès",
                text: "Retour enregistrée avec succès !",
                icon: "success"
            })
            navigate('/tous-les-decommissionnements')
        } catch (error) {
            console.log("Erreur de la réception : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la réception !",
                icon: "warning"
            })
            navigate('/tous-les-decommissionnements')
        } finally {
            setLoadingReception(false)
        }
    }

    const handleClotureDecom = async () => {
        setIsModalClotureOpen(false)
        // console.log("Liste checking avant cloture: ", listeDecom)
        try {
            setLoadingVerification(true)
            const payload = {
                userId,
                commentaire: messageCloture,
                listeDecom,
                isReg,
            }
            const id = idDecom

            await decomData.clotureDecom(id, payload)

            Swal.fire({
                title: "Succès",
                text: "Décom clôturé avec succès !",
                icon: "success"
            })
            navigate('/tous-les-decommissionnements')
        } catch (error) {
            console.log("Erreur de la réception : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la clôture !",
                icon: "warning"
            })
            navigate('/tous-les-decommissionnements')
        } finally {
            setLoadingVerification(false)
        }
    }

    const handleExtractXLSX = async () => {
        try {
            setLoadingExtract(true);

            const response = await decomData.exportOneDecomToExcel(idDecom);

            const url = window.URL.createObjectURL(
                new Blob([response.data])
            );

            const a = document.createElement("a");
            a.href = url;
            a.download = `decom_${idDecom}.xlsx`;

            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.log(error);

            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors du téléchargement",
                icon: "warning"
            });

        } finally {
            setLoadingExtract(false);
        }
    };


    const totalRebut = listeDecom.filter((item) => { return item.statut == 'rebut' || item.statut == 'rebus' }).length
    const totalParam = listeDecom.filter((item) => { return item.statut == 'parametrage' }).length
    const totalRepar = listeDecom.filter((item) => { return item.statut == 'a_reparer' }).length

    const totals = {
        rebut: totalRebut,
        param: totalParam,
        a_reparer: totalRepar,
    }

    return (
        <>
            <PageBreadcrumb pageTitle={`Détails décom ${idDecom}`} />
            <div>
                {loadingData ? (
                    <>
                        <div className="flex justify-center items-center h-full">
                            <span>Loading..</span>
                        </div>
                    </>
                ) : (
                    <>
                        {errorData ? (
                            <>
                                <div>
                                    <div className="flex justify-center items-center">
                                        <div className="p-3 border rounded border-red-600">
                                            <span className="text-red-600 text-sm font-semibold">{errorData}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <div className="space-y-5">
                                        {/* En tête de page avec les différents statuts et les options */}
                                        <div className="grid grid-cols-2 justify-between items-center">
                                            <div className="space-y-2">
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
                                                    <span className="text-sm">{`Décom du ${dateDecom}`}</span>
                                                </div>
                                                <div className=''>
                                                    <span className={statutClass}>
                                                        {statutDecom}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2">
                                                <div className='col-start-2 space-y-0.5'>
                                                    {isLivreur ? (
                                                        <>
                                                            <div>
                                                                {loadingCancel ? (
                                                                    <>
                                                                        <div className='text-center'>
                                                                            <span className=''>
                                                                                <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="space-y-0.5">
                                                                            <Link to={`/modifier-decom/${idDecom}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                                <span className='mr-4'><i className="pi pi-pen-to-square"></i></span>
                                                                                <span className='text-sm text-gray-700 font-medium'>Modifier la liste</span>
                                                                            </Link>
                                                                            <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'
                                                                                onClick={() => {
                                                                                    setIsModalCancelOpen(true)
                                                                                }}
                                                                            >
                                                                                <span className='mr-4'><i className="pi pi-times-circle"></i></span>
                                                                                <span className='text-sm text-gray-700 font-medium'>Annuler la demande</span>
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isReceveur ? (
                                                        <>
                                                            <div>
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
                                                                        <div className="space-y-0.5">
                                                                            <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'
                                                                                onClick={() => {
                                                                                    setIsModalReceptionOpen(true)
                                                                                }}
                                                                            >
                                                                                <span className='mr-4'><i className="pi pi-check-circle"></i></span>
                                                                                <span className='text-sm text-gray-700 font-medium'>Confirmer réception</span>
                                                                            </button>
                                                                            <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'
                                                                                onClick={() => {
                                                                                    setIsModalReturnOpen(true)
                                                                                }}
                                                                            >
                                                                                <span className='mr-4'><i className="pi pi-ban"></i></span>
                                                                                <span className='text-sm text-gray-700 font-medium'>Retourner décom</span>
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {isVerificateur ? (
                                                        <>
                                                            {loadingVerification ? (
                                                                <>
                                                                    <div className='text-center'>
                                                                        <span className=''>
                                                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div>
                                                                        {isReg ? (
                                                                            <>
                                                                                <div className="space-y-0.5">
                                                                                    <Link to={`/reg-verification-decom/${idDecom}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                                        <span className='mr-4'><i className="pi pi-clipboard"></i></span>
                                                                                        <span className='text-sm text-gray-700 font-medium'>Vérification technique</span>
                                                                                    </Link>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className="space-y-0.5">
                                                                                    <Link to={`/verification-decom/${idDecom}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                                        <span className='mr-4'><i className="pi pi-clipboard"></i></span>
                                                                                        <span className='text-sm text-gray-700 font-medium'>Vérification technique</span>
                                                                                    </Link>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        {listeChecking.length == 0 && isValidateur ? (
                                                                            <>
                                                                                <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'
                                                                                    onClick={() => {
                                                                                        setIsModalClotureOpen(true)
                                                                                    }}
                                                                                >
                                                                                    <span className='mr-4'><i className="pi pi-circle-fill"></i></span>
                                                                                    <span className='text-sm text-gray-700 font-medium'>Cloturer décomm</span>
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <></>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Première partie de page avec les commentaires et les fichiers uploads */}
                                        <div>
                                            <div className="space-y-3">
                                                {commentaireDecom ? (
                                                    <>
                                                        <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                            <div className='mb-6 pb-2 w-full border-b text-left'>
                                                                <span className='text-sm mr-2'>Commentaire livreur</span>
                                                                <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                            </div>
                                                            <p className='text-sm text-blue-500 text-left'>{commentaireDecom}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {/* Les fichiers que le décommissionneur a upload lors du remplissage de formulaire de décom */}
                                                <div>
                                                    {decomFiles.length > 0 ? (
                                                        <>
                                                            <div>
                                                                <span className="text-xs text-gray-500">Pièce(s) jointe(s) décommissionneur</span>
                                                            </div>
                                                            <div className='grid grid-cols-6 text-xs gap-1'>
                                                                {decomFiles.map((file) => {
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
                                                {/* La suite des commentaires (commentaire de réception) */}
                                                {commentaireReception ? (
                                                    <>
                                                        <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                            <div className='mb-6 pb-2 w-full border-b text-left'>
                                                                <span className='text-sm mr-2'>Commentaire réception</span>
                                                                <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                            </div>
                                                            <p className='text-sm text-blue-500 text-left'>{commentaireReception}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {commentaireVerification ? (
                                                    <>
                                                        <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                            <div className='mb-6 pb-2 w-full border-b text-left'>
                                                                <span className='text-sm mr-2'>Commentaire vérification</span>
                                                                <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                            </div>
                                                            <p className='text-sm text-blue-500 text-left'>{commentaireVerification}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        </div>
                                        {/* Deuxième partie de page avec le tableau de la liste de décommissionnement */}
                                        <div>
                                            <div>
                                                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                                                    <div className="flex justify-between p-4 pb-0">
                                                        <div className='p-4 pb-0 text-xs text-gray-600 space-x-3'>
                                                            <span>Total : {quantiteDecom}</span>
                                                            {checking ? (
                                                                <>
                                                                    <span className=" font-medium">a réparer : <span className="text-blue-600">{totals.a_reparer}</span></span>
                                                                    <span className=" font-medium">paramétrage : <span className="text-blue-300">{totals.param}</span></span>
                                                                    <span className=" font-medium">rebut : <span className="text-red-500">{totals.rebut}</span></span>
                                                                </>
                                                            ) : (
                                                                <></>
                                                            )}
                                                        </div>
                                                        <div>
                                                            {loadingExtract ?
                                                                (
                                                                    <>
                                                                        <span className='flex items-center justify-center'>
                                                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button className="flex items-center text-red-600 justify-center rounded-full h-4 w-4 p-4 hover:text-white hover:bg-gray-dark hover:border-black transition-colors"
                                                                            onClick={handleExtractXLSX}>
                                                                            <span className="">
                                                                                <i className="pi pi-download"></i>
                                                                            </span>
                                                                        </button>
                                                                    </>
                                                                )
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="max-w-full overflow-x-auto">
                                                        {checking ? (
                                                            <>
                                                                <Table>
                                                                    {/* Table Header */}
                                                                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                                                        <TableRow>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                N°
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Point Marchand
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                S/N
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Statut
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Retour technique
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Pièces Défectueuses
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Pièces Récupérées
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    {/* Table Body */}
                                                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                                                        {listeDecom.map((item, index) => {
                                                                            let statutClass = ''
                                                                            let statut = item.statut
                                                                            if (item.statut == 'checking') {
                                                                                statutClass = 'text-warning-200 font-semi-bold'
                                                                            } else if (item.statut == 'parametrage') {
                                                                                statutClass = 'text-blue-200 font-semi-bold'
                                                                            } else if (item.statut == 'rebus') {
                                                                                statut = 'rebut'
                                                                                statutClass = 'text-red-500 font-semi-bold'
                                                                            } else if (item.statut == 'a_reparer') {
                                                                                statutClass = 'text-blue-600 font-semi-bold'
                                                                            }

                                                                            const piecesDefectueuses = JSON.parse(item.pieces_defectueuses)
                                                                            const piecesRecuperables = JSON.parse(item.pieces_recuperees)
                                                                            return (
                                                                                <>
                                                                                    <TableRow>
                                                                                        <TableCell
                                                                                            isHeader
                                                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                            {index + 1}
                                                                                        </TableCell>
                                                                                        <TableCell
                                                                                            isHeader
                                                                                            className="px-4 py-3 text-gray-500 text-start text-xs dark:text-gray-400">
                                                                                            {item.point_marchand}
                                                                                        </TableCell>
                                                                                        <TableCell
                                                                                            isHeader
                                                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                            {item.serial_number}
                                                                                        </TableCell>
                                                                                        <TableCell
                                                                                            isHeader
                                                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                            <span className={statutClass}>
                                                                                                {statut}
                                                                                            </span>
                                                                                        </TableCell>
                                                                                        <TableCell
                                                                                            isHeader
                                                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                            {item.commentaire_retour}
                                                                                        </TableCell>
                                                                                        <TableCell
                                                                                            isHeader
                                                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                            <div className="grid grid-cols-2 text-xs">
                                                                                                {piecesDefectueuses?.map((item) => {
                                                                                                    const piece = pieces.find((p) => {
                                                                                                        return p.id_piece == parseInt(item)
                                                                                                    })
                                                                                                    if (piece) {
                                                                                                        return (
                                                                                                            <>
                                                                                                                <div>
                                                                                                                    <span className="text-red-700 font-medium">{piece.nom_piece}</span>
                                                                                                                </div>
                                                                                                            </>
                                                                                                        )
                                                                                                    }
                                                                                                })}
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell
                                                                                            isHeader
                                                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                            <div className="grid grid-cols-2 text-xs">
                                                                                                {piecesRecuperables?.map((item) => {
                                                                                                    const piece = pieces.find((p) => {
                                                                                                        return p.id_piece == parseInt(item)
                                                                                                    })
                                                                                                    if (piece) {
                                                                                                        return (
                                                                                                            <>
                                                                                                                <div>
                                                                                                                    <span className="text-green-700 font-medium">{piece.nom_piece}</span>
                                                                                                                </div>
                                                                                                            </>
                                                                                                        )
                                                                                                    }
                                                                                                })}
                                                                                            </div>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                </>
                                                                            )
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Table>
                                                                    {/* Table Header */}
                                                                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                                                        <TableRow>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                N°
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Point Marchand
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                S/N
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                TID GIM
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                TID ECOBANK
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Etat
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                RI
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Commercial
                                                                            </TableCell>
                                                                            <TableCell
                                                                                isHeader
                                                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                Commentaire
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    {/* Table Body */}
                                                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                                                        {listeDecom.map((item, index) => (
                                                                            <TableRow>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {index + 1}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {item.pointMarchand}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {item.terminalSN}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {item.idGim}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {item.idEcobank}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    <span style={{ fontSize: '9px' }}>
                                                                                        {item.etat}
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {item.RI}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {item.nomCommercial}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    isHeader
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    <span style={{ fontSize: '9px' }}>
                                                                                        {item.commentaire}
                                                                                    </span>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            <Modal isOpen={isModalCancelOpen} onClose={() => setIsModalCancelOpen(false)} className="p-4 max-w-md">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-black text-white font-medium">Annuler</span>
                    </div>
                    <div className="text-center text-sm font-medium">
                        <span>Êtes-vous sûr de vouloir annuler ce décommissionnement ?</span>
                    </div>
                    <div>
                        <div className="flex justify-between">
                            <div className="w-full flex justify-center items-center">
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={() => setIsModalCancelOpen(false)}
                                >
                                    Non
                                </button>
                            </div>
                            <div className="w-full flex justify-center items-center">
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={handleCancelDecom}
                                >
                                    Oui
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalReceptionOpen} onClose={() => setIsModalReceptionOpen(false)} className="p-4 max-w-md">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Confirmer</span>
                    </div>
                    <div className="text-center text-sm font-medium">
                        <span>Confirmer la réception de {quantiteDecom} TPE(s) à décommissionner</span>
                    </div>
                    {isReg ? (
                        <>
                            <div className='w-full'>
                                <Label>Date Réception <span className="text-red-700">*</span></Label>
                                <Calendar
                                    value={selectedDateReception}
                                    locale="fr"
                                    onChange={(e) => setSelectedDateReception(e.value)}
                                    dateFormat="dd/mm/yy"
                                    placeholder="dd/mm/yyyy"
                                    minDate={new Date(dateRegul)}
                                    maxDate={new Date()}
                                    className="w-full"
                                    style={{ fontSize: '2px' }}
                                />
                            </div>
                        </>
                    ) : (
                        <></>
                    )}
                    <div>
                        <Label>Commentaire</Label>
                        <TextArea
                            value={messageReception}
                            onChange={(value) => setMessageReception(value)}
                            rows={3}
                            placeholder="Ajoutez un commentaire"
                        />
                    </div>
                    <div className="text-center">
                        <span className="text-red-700 text-xs">{errorReception}</span>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleReception}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalReturnOpen} onClose={() => setIsModalReturnOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-red-200 text-red-500 font-medium">Retourner</span>
                    </div>
                    <div className="text-center text-sm font-medium">
                        <span>Donnez la raison du retour</span>
                    </div>
                    <div>
                        <Label>Commentaire <span className="text-red-700">*</span></Label>
                        <TextArea
                            value={messageReturn}
                            onChange={(value) => setMessageReturn(value)}
                            rows={3}
                            placeholder="Ajoutez un commentaire"
                        />
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleReturn}
                            >
                                Retourner
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalClotureOpen} onClose={() => setIsModalClotureOpen(false)} className="p-4 max-w-md">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-black text-white font-medium">Clôture</span>
                    </div>
                    <div className="text-center text-sm font-medium">
                        <span>Êtes-vous sûr de vouloir clôturer ce décommissionnement ?</span>
                    </div>
                    <div>
                        <Label>Commentaire</Label>
                        <TextArea
                            value={messageCloture}
                            onChange={(value) => setMessageCloture(value)}
                            rows={3}
                            placeholder="Ajoutez un commentaire"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between">
                            <div className="w-full flex justify-center items-center">
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={() => setIsModalClotureOpen(false)}
                                >
                                    Non
                                </button>
                            </div>
                            <div className="w-full flex justify-center items-center">
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={handleClotureDecom}
                                >
                                    Oui
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}