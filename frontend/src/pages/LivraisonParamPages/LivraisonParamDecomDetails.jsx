import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router";
import { Decom } from "../../backend/decom/Decom";
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
import Swal from "sweetalert2";

// Rôle qui réceptionne et clôture les livraisons param (id 36)
const ROLE_RECEPTION = 'reception_reparation'

const STATUTS = {
    en_cours: { label: 'en cours', className: 'bg-warning-100 text-warning-300' },
    livre: { label: 'livré', className: 'bg-blue-100 text-blue-300' },
    clos: { label: 'clos', className: 'bg-gray-100 text-gray-400' },
    annule: { label: 'annulé', className: 'bg-black text-white' },
}

const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : ''

function BlocCommentaire({ titre, texte }) {
    if (!texte) return <></>
    return (
        <div className='overflow-hidden pt-2 p-6 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]'>
            <div className='mb-6 pb-2 w-full border-b text-left'>
                <span className='text-sm mr-2'>{titre}</span>
                <span className='text-sm'><i className="pi pi-comment"></i></span>
            </div>
            <p className='text-sm text-blue-500 text-left'>{texte}</p>
        </div>
    )
}

export default function LivraisonParamDecomDetails() {
    const decomData = new Decom()
    const userData = new Users()
    const { id } = useParams()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingCloture, setLoadingCloture] = useState(false)
    const [errorData, setErrorData] = useState('')

    const [livraison, setLivraison] = useState(null)
    const [listeSn, setListeSn] = useState([])
    const [snRecus, setSnRecus] = useState(null)
    const [isReceptionnaire, setIsReceptionnaire] = useState(false)

    const [isModalClotureOpen, setIsModalClotureOpen] = useState(false)
    const [messageCloture, setMessageCloture] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const data = await decomData.getOneLivraisonParamDecom(id)
                if (data.forms?.is_deleted) {
                    Swal.fire({
                        title: "Livraison annulée",
                        text: "Cette livraison a été annulée.",
                        icon: "warning",
                    });
                    navigate('/livraisons-param-decom')
                    return;
                }
                setLivraison(data)
                setListeSn(JSON.parse(data.liste_sn || '[]'))

                const reception = data.reception_param_decom.filter((r) => r.type == 'reception').at(-1)
                if (reception) {
                    setSnRecus(new Set(JSON.parse(reception.liste_sn || '[]').map((item) => String(item.sn))))
                }

                const rolesData = await userData.getUserRoles(userId)
                const nomRoles = rolesData.roles.map((item) => item.nom_role)
                setIsReceptionnaire(nomRoles.includes(ROLE_RECEPTION))
            } catch (error) {
                setErrorData('Erreur de données !')
                console.log('Erreur de données: ', error)
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const handleCloture = async () => {
        setIsModalClotureOpen(false)
        try {
            setLoadingCloture(true)
            await decomData.cloturerLivraisonParamDecom(id, {
                userId,
                commentaire: messageCloture,
            })
            Swal.fire({
                title: "Succès",
                text: "Livraison clôturée : les TPE reçus sont passés en paramétrage.",
                icon: "success"
            })
            navigate('/livraisons-param-decom')
        } catch (error) {
            console.log("Erreur de clôture : ", error)
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la clôture !",
                icon: "warning"
            })
        } finally {
            setLoadingCloture(false)
        }
    }

    const statut = STATUTS[livraison?.statut] || { label: livraison?.statut, className: '' }
    const reception = livraison?.reception_param_decom.filter((r) => r.type == 'reception').at(-1)
    const cloture = livraison?.reception_param_decom.filter((r) => r.type == 'cloture').at(-1)
    const estRecue = livraison?.statut == 'livre' || livraison?.statut == 'clos'

    const headerClass = "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
    const cellClass = "px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400"
    const cellNonRecue = "px-4 py-3 text-gray-500 text-start text-theme-xs opacity-20 line-through"
    const boutonClass = 'bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'

    return (
        <>
            <PageBreadcrumb pageTitle={`Détails livraison TPE paramétrage #${id}`} />
            <div>
                {loadingData ? (
                    <div className="flex justify-center items-center h-full">
                        <span>Loading..</span>
                    </div>
                ) : errorData ? (
                    <div className="flex justify-center items-center">
                        <div className="p-3 border rounded border-red-600">
                            <span className="text-red-600 text-sm font-semibold">{errorData}</span>
                        </div>
                    </div>
                ) : livraison ? (
                    <div className="space-y-5">
                        {/* En tête */}
                        <div className="grid grid-cols-2 justify-between items-center">
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm">{`Livraison du ${formatDate(livraison.forms.created_at)}`}</span>
                                </div>
                                <div className="flex flex-col text-xs">
                                    <span className="underline font-light">Livreur</span>
                                    <span>{livraison.forms.users_forms_created_byTousers?.fullname || livraison.forms.nom_user}</span>
                                </div>
                                {livraison.decom_id ? (
                                    <div className="text-xs">
                                        <span>Décom : </span>
                                        <Link to={`/decom-details/${livraison.decom_id}`} className="text-blue-500 underline">#{livraison.decom_id}</Link>
                                    </div>
                                ) : (
                                    <></>
                                )}
                                <div>
                                    <span className={`text-center text-xs font-semibold rounded-xl p-0.5 px-2 ${statut.className}`}>
                                        {statut.label}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2">
                                <div className='col-start-2 space-y-0.5'>
                                    {loadingCloture ? (
                                        <div className='text-center'>
                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                        </div>
                                    ) : (
                                        <>
                                            {isReceptionnaire && livraison.statut == 'en_cours' ? (
                                                <Link to={`/reception-livraison-param-decom/${id}`} className={boutonClass}>
                                                    <span className='mr-4'><i className="pi pi-check-circle"></i></span>
                                                    <span className='text-sm text-gray-700 font-medium'>Confirmer réception</span>
                                                </Link>
                                            ) : (
                                                <></>
                                            )}
                                            {isReceptionnaire && livraison.statut == 'livre' ? (
                                                <button className={boutonClass} onClick={() => setIsModalClotureOpen(true)}>
                                                    <span className='mr-4'><i className="pi pi-circle-fill"></i></span>
                                                    <span className='text-sm text-gray-700 font-medium'>Clôturer la livraison</span>
                                                </button>
                                            ) : (
                                                <></>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Commentaires */}
                        <div className="space-y-3">
                            <BlocCommentaire titre="Commentaire livreur" texte={livraison.forms.commentaire} />
                            <BlocCommentaire titre="Commentaire réception" texte={reception?.forms?.commentaire} />
                            <BlocCommentaire titre="Commentaire clôture" texte={cloture?.forms?.commentaire} />
                        </div>
                        {/* Liste des TPE */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className='p-4 pb-0 text-xs text-gray-600 space-x-3'>
                                <span>Total : {listeSn.length}</span>
                                {estRecue && reception ? (<span>Total reçu : {reception.quantite}</span>) : (<></>)}
                            </div>
                            <div className="max-w-full overflow-x-auto">
                                <Table>
                                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                        <TableRow>
                                            <TableCell isHeader className={headerClass}>N°</TableCell>
                                            <TableCell isHeader className={headerClass}>S/N</TableCell>
                                            <TableCell isHeader className={headerClass}>Point Marchand</TableCell>
                                            <TableCell isHeader className={headerClass}>Modèle</TableCell>
                                            <TableCell isHeader className={headerClass}>Décom</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {listeSn.map((item, index) => {
                                            // Une fois reçue, les TPE non reçus apparaissent grisés et barrés
                                            const classe = estRecue && snRecus && !snRecus.has(String(item.sn)) ? cellNonRecue : cellClass
                                            return (
                                                <TableRow key={item.sn || index}>
                                                    <TableCell className={classe}>{index + 1}</TableCell>
                                                    <TableCell className={classe}>{item.sn}</TableCell>
                                                    <TableCell className={classe}>{item.point_marchand || '-'}</TableCell>
                                                    <TableCell className={classe}>{item.modele || '-'}</TableCell>
                                                    <TableCell className={classe}>
                                                        {item.decom_id ? (
                                                            <Link to={`/decom-details/${item.decom_id}`} className="text-blue-500 underline">#{item.decom_id}</Link>
                                                        ) : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <></>
                )}
            </div>
            <Modal isOpen={isModalClotureOpen} onClose={() => setIsModalClotureOpen(false)} className="p-4 max-w-md">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-black text-white font-medium">Clôture</span>
                    </div>
                    <div className="text-center text-sm font-medium">
                        <span>Clôturer la livraison ? Les {reception?.quantite ?? 0} TPE(s) reçus passeront au statut paramétrage.</span>
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
                                onClick={handleCloture}
                            >
                                Oui
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}
