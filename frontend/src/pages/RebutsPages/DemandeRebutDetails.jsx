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
import { Rebut } from "../../backend/rebut/Rebut";

addLocale('fr', {
    firstDayOfWeek: 1,
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    dayNamesMin: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    monthNamesShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
});

export default function DemandeRebutDetails() {
    const rebutData = new Rebut()
    const userData = new Users()
    const stockData = new Stock()
    const { id } = useParams()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()
    const filesData = new FilesHandler()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingCancel, setLoadingCancel] = useState(false)
    const [loadingReception, setLoadingReception] = useState(false)
    const [loadingVerification, setLoadingVerification] = useState(false)

    const [errorData, setErrorData] = useState('')

    const [dateRebut, setDateRebut] = useState('')
    const [statutDecom, setStatutRebut] = useState('')
    const [statutClass, setStatutClass] = useState('')

    const [isReg, setIsReg] = useState(false)

    const [isDemandeur, setIsDemandeur] = useState(false)
    const [isValidateur, setIsValidateur] = useState(false)

    const [listeRebut, setListeRebut] = useState([])
    const [quantiteDecom, setQuantiteRebut] = useState(0)

    const [commentaireRebut, setCommentaireRebut] = useState('')
    const [commentaireValidation, setCommentaireValidation] = useState('')

    const [fileId, setFileId] = useState(null);
    const [rebutFiles, setRebutFiles] = useState([])

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

    const [isEnAttente, setIsEnAttente] = useState(false)
    const [isRetourne, setIsRetourne] = useState(false)
    const [isValide, setIsValide] = useState(false)

    const [loadingButtons, setLoadingButtons] = useState(false)

    const [listeModel, setListeModel] = useState([])

    const [nomDemandeur, setNomDemandeur] = useState('')
    const [nomUpdate, setNomUpdate] = useState('')

    const [dateUpdate, setDateUpdate] = useState('')

    const [isGestion, setIsGestion] = useState(true)

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const rebut = await rebutData.getOneDemandeRebut(id)
                const rebutForm = rebut.forms

                if (rebutForm.is_deleted) {
                    Swal.fire({
                        title: "Mise au rebut annulée",
                        text: "Ce demande a été annulée.",
                        icon: "warning",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "OK"
                    });
                    navigate('/toutes-les-demandes-rebut')
                    return;
                }

                const listeRebut = JSON.parse(rebut.liste_rebut)
                setListeRebut(listeRebut)
                setQuantiteRebut(listeRebut.length)
                console.log(listeRebut)

                const statut = rebut.statut
                let statutClass = ''
                const dateRebut = formatDate(rebutForm.created_at)
                setDateRebut(dateRebut)
                setNomDemandeur(rebutForm.users_forms_created_byTousers.fullname)

                const dateUpdate = rebutForm.updated_at ? formatDate(rebutForm.updated_at) : null
                setDateUpdate(dateUpdate)
                setNomUpdate(rebutForm.users_forms_updated_byTousers?.fullname)

                const regularisation = rebutForm.is_reg
                if (regularisation) {
                    setIsReg(true)
                    setDateRegul(rebutForm.last_modified_at)
                }

                const rolesData = await userData.getUserRoles(userId)
                const nomRoles = rolesData.roles.map((item) => {
                    return item.nom_role
                })

                const indexValidation = rebut.validation_rebut.length - 1
                const validation = rebut.validation_rebut[indexValidation]

                if (statut == 'en_cours') {
                    setStatutRebut('en cours')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-1 bg-warning-100 text-warning-300')
                    setIsEnAttente(true)
                    if (nomRoles.includes('gestion_rebut')) {
                        setIsGestion(true)
                    }
                    if (nomRoles.includes('demande_rebut')) {
                        setIsDemandeur(true)
                    }
                    if (nomRoles.includes('validation_rebut')) {
                        setIsValidateur(true)
                    }
                } else if (statut == 'retourne') {
                    setStatutRebut('retourné')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-1 bg-red-100 text-red-300')

                    if (nomRoles.includes('demande_rebut')) {
                        setIsDemandeur(true)
                    }
                    if (nomRoles.includes('validation_rebut')) {
                        setIsValidateur(true)
                    }
                } else if (statut == 'valide') {
                    setStatutRebut('validé')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-1 bg-blue-100 text-blue-300')
                    if (nomRoles.includes('demande_rebut')) {
                        setIsDemandeur(true)
                    }
                    if (nomRoles.includes('validation_rebut')) {
                        setIsValidateur(true)
                    }
                } else if (statut == 'clos' && validation && validation.type == 'cloture') {
                    setStatutRebut('clos')
                    setStatutClass('text-center text-xs font-semibold rounded-xl p-0.5 px-2 bg-gray-100 text-gray-400')
                }

                const allItems = await stockData.getAllItems()
                const items = allItems.filter((item) => {
                    return item.is_deleted == false && item.type != 'TERMINAL'
                })
                setPieces(items)

                const modelData = await stockData.getAllModels()
                setListeModel(modelData)

                setCommentaireRebut(rebutForm.commentaire)
                setCommentaireValidation(validation?.forms.commentaire)

                const allFiles = await filesData.getAllFormFiles(rebutForm.id)
                const dFiles = allFiles.filter((item) => {
                    return item.role == 'demandeur'
                })
                setRebutFiles(dFiles)

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
            await rebutData.cancelDecom(id, payload)
            Swal.fire({
                title: "Succès",
                text: "Décommissionnement annulé avec succès !",
                icon: "success"
            })
            navigate('/tous-les-rebutmissionnements')
        } catch (error) {
            console.log("Erreur d'annulation : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de l'annulation !",
                icon: "warning"
            })
            navigate('/tous-les-rebutmissionnements')
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
        // console.log("Liste checking avant cloture: ", listeRebut)
        try {
            setLoadingVerification(true)
            const payload = {
                userId,
                commentaire: messageCloture,
                listeRebut,
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

    return (
        <>
            <PageBreadcrumb pageTitle={`Détails rebut ${id}`} />
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
                                                    <span className="text-sm">{`Mise au rebut du ${dateRebut}`}</span>
                                                </div>
                                                <div className="flex flex-col text-xs">
                                                    <span className="underline font-light">Demandeur</span>
                                                    <span>{nomDemandeur}</span>
                                                </div>
                                                {dateUpdate ? (
                                                    <>
                                                        <div>
                                                            <span className="text-sm">{`Dernière modification ${dateUpdate}`}</span>
                                                        </div>
                                                        <div className="flex flex-col text-xs">
                                                            <span className="underline font-light">Modifié par</span>
                                                            <span>{nomUpdate}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                <div className=''>
                                                    <span className={statutClass}>
                                                        {statutDecom}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2">
                                                <div className='col-start-2 space-y-0.5'>
                                                    {loadingButtons ? (
                                                        <>
                                                            <div className='text-center'>
                                                                <span className=''>
                                                                    <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {isEnAttente ? (
                                                                <>
                                                                    {isDemandeur || isGestion ? (
                                                                        <>
                                                                            <div className="space-y-0.5">
                                                                                <Link to={`/modifier-rebut/${id}`} className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200'>
                                                                                    <span className='mr-4'><i className="pi pi-pen-to-square"></i></span>
                                                                                    <span className='text-sm text-gray-700 font-medium'>Modifier la liste</span>
                                                                                </Link>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                    {isDemandeur ? (
                                                                        <>
                                                                            <div>
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
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                    {isValidateur ? (
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
                                                                    ) : (
                                                                        <></>
                                                                    )}

                                                                </>
                                                            ) : (
                                                                <></>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Première partie de page avec les commentaires et les fichiers uploads */}
                                        <div>
                                            <div className="space-y-3">
                                                {commentaireRebut ? (
                                                    <>
                                                        <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                            <div className='mb-6 pb-2 w-full border-b text-left'>
                                                                <span className='text-sm mr-2'>Commentaire demandeur</span>
                                                                <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                            </div>
                                                            <p className='text-sm text-blue-500 text-left'>{commentaireRebut}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {/* Les fichiers que le décommissionneur a upload lors du remplissage de formulaire de décom */}
                                                <div>
                                                    {rebutFiles.length > 0 ? (
                                                        <>
                                                            <div>
                                                                <span className="text-xs text-gray-500">Pièce(s) jointe(s) décommissionneur</span>
                                                            </div>
                                                            <div className='grid grid-cols-6 text-xs gap-1'>
                                                                {rebutFiles.map((file) => {
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
                                                {commentaireValidation ? (
                                                    <>
                                                        <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
                                                            <div className='mb-6 pb-2 w-full border-b text-left'>
                                                                <span className='text-sm mr-2'>Commentaire Validation</span>
                                                                <span className='text-sm'><i className="pi pi-comment"></i></span>
                                                            </div>
                                                            <p className='text-sm text-blue-500 text-left'>{commentaireValidation}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        </div>
                                        {/* Deuxième partie de page avec le tableau de la liste de rebut */}
                                        <div>
                                            <div>
                                                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                                                    <div className="flex justify-between p-4 pb-0">
                                                        <div className='p-4 pb-0 text-xs text-gray-600 flex flex-col'>
                                                            <span>Total : {quantiteDecom}</span>
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
                                                                {listeRebut.map((item, index) => {
                                                                    const piecesDefectueuses = new Array(...item.pieces_defectueuses)
                                                                    const piecesRecuperables = new Array(...item.pieces_recuperees)

                                                                    const model = listeModel.find((m) => {
                                                                        return m.id_model == item.modele
                                                                    })
                                                                    const nomModel = model ? model.nom_model : '%%%'

                                                                    return (
                                                                        <>
                                                                            <TableRow>
                                                                                <TableCell
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {index + 1}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    className="px-4 py-3 text-gray-500 text-start text-xs dark:text-gray-400">
                                                                                    {item.pointMarchand ? item.pointMarchand : 'N/A'}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    <div>
                                                                                        {item.terminalSN}
                                                                                    </div>
                                                                                    <div className=" text-gray-700 font-medium" style={{ fontSize: '11px' }}>{nomModel}</div>
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                                                    {item.etatTpe}
                                                                                </TableCell>
                                                                                <TableCell
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
                                                                                                            <span className="text-red-700 font-medium">{piece.nom_piece} ,</span>
                                                                                                        </div>
                                                                                                    </>
                                                                                                )
                                                                                            }
                                                                                        })}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell
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
                                                                                                            <span className="text-green-700 font-medium">{piece.nom_piece} ,</span>
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