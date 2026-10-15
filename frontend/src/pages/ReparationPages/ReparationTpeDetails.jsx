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

// Rôles (id_role) : validation par la supervision réparation (37), livraison par la maintenance (25) ou la réparation (35)
const ROLE_VALIDATION_ID = 37
const ROLES_LIVRAISON_IDS = [25, 35]

export const STATUTS_LOT = {
    en_reparation: { label: 'en réparation', className: 'bg-warning-100 text-warning-300' },
    valide: { label: 'validé', className: 'bg-green-100 text-green-500' },
    livre: { label: 'livré', className: 'bg-blue-100 text-blue-300' },
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

// Noms des pièces réparées d'un TPE du lot
const nomsPieces = (item) => (Array.isArray(item.listePiece) ? item.listePiece : [])
    .map((p) => p?.items?.nom_piece)
    .filter(Boolean)

export default function ReparationTpeDetails() {
    const decomData = new Decom()
    const userData = new Users()
    const { id } = useParams()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingLivraison, setLoadingLivraison] = useState(false)
    const [errorData, setErrorData] = useState('')

    const [lot, setLot] = useState(null)
    const [listeSn, setListeSn] = useState([])
    const [snValides, setSnValides] = useState(null)
    const [isValidateur, setIsValidateur] = useState(false)
    const [isLivreur, setIsLivreur] = useState(false)

    const [isModalLivraisonOpen, setIsModalLivraisonOpen] = useState(false)
    const [messageLivraison, setMessageLivraison] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const data = await decomData.getOneReparationTpe(id)
                if (data.forms?.is_deleted) {
                    Swal.fire({
                        title: "Lot annulé",
                        text: "Ce lot de réparation a été annulé.",
                        icon: "warning",
                    });
                    navigate('/reparations-tpe')
                    return;
                }
                setLot(data)
                setListeSn(JSON.parse(data.liste_sn || '[]'))

                const validation = data.validation_reparation_tpe.at(-1)
                if (validation) {
                    setSnValides(new Set(JSON.parse(validation.liste_sn || '[]').map((item) => String(item.sn))))
                }

                const rolesData = await userData.getUserRoles(userId)
                const ids = (rolesData.roles || []).map((r) => r.id_role)
                setIsValidateur(ids.includes(ROLE_VALIDATION_ID))
                setIsLivreur(ids.some((r) => ROLES_LIVRAISON_IDS.includes(r)))
            } catch (error) {
                setErrorData('Erreur de données !')
                console.log('Erreur de données: ', error)
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const handleLivraison = async () => {
        setIsModalLivraisonOpen(false)
        try {
            setLoadingLivraison(true)
            const response = await decomData.livrerReparationTpe(id, {
                userId,
                commentaire: messageLivraison,
            })
            Swal.fire({
                title: "Succès",
                text: "Livraison des TPE réparés créée avec succès !",
                icon: "success"
            })
            const idLivraison = response?.data?.livraison?.id
            navigate(idLivraison ? `/livraison-reparation-details/${idLivraison}` : '/toutes-livraisons-reparation')
        } catch (error) {
            console.log("Erreur de livraison : ", error)
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la livraison !",
                icon: "warning"
            })
        } finally {
            setLoadingLivraison(false)
        }
    }

    const statut = STATUTS_LOT[lot?.statut] || { label: lot?.statut, className: '' }
    const validation = lot?.validation_reparation_tpe.at(-1)
    const estValide = lot?.statut == 'valide' || lot?.statut == 'livre'

    const headerClass = "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
    const cellClass = "px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400"
    const cellRefuse = "px-4 py-3 text-gray-500 text-start text-theme-xs opacity-20 line-through"
    const boutonClass = 'bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'

    return (
        <>
            <PageBreadcrumb pageTitle={`Détails lot de réparation #${id}`} />
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
                ) : lot ? (
                    <div className="space-y-5">
                        {/* En tête */}
                        <div className="grid grid-cols-2 justify-between items-center">
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm">{`Lot du ${formatDate(lot.forms.created_at)}`}</span>
                                </div>
                                <div className="flex flex-col text-xs">
                                    <span className="underline font-light">Créé par</span>
                                    <span>{lot.forms.users_forms_created_byTousers?.fullname || lot.forms.nom_user}</span>
                                </div>
                                {lot.decom_id ? (
                                    <div className="text-xs">
                                        <span>Décom : </span>
                                        <Link to={`/decom-details/${lot.decom_id}`} className="text-blue-500 underline">#{lot.decom_id}</Link>
                                    </div>
                                ) : (
                                    <></>
                                )}
                                {lot.livraison ? (
                                    <div className="text-xs">
                                        <span>Livraison : </span>
                                        <Link to={`/livraison-reparation-details/${lot.livraison.id}`} className="text-blue-500 underline">#{lot.livraison.id}</Link>
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
                                    {loadingLivraison ? (
                                        <div className='text-center'>
                                            <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                        </div>
                                    ) : (
                                        <>
                                            {isValidateur && lot.statut == 'en_reparation' ? (
                                                <Link to={`/validation-reparation-tpe/${id}`} className={boutonClass}>
                                                    <span className='mr-4'><i className="pi pi-check-circle"></i></span>
                                                    <span className='text-sm text-gray-700 font-medium'>Valider la réparation</span>
                                                </Link>
                                            ) : (
                                                <></>
                                            )}
                                            {isLivreur && lot.statut == 'valide' ? (
                                                <button className={boutonClass} onClick={() => setIsModalLivraisonOpen(true)}>
                                                    <span className='mr-4'><i className="pi pi-send"></i></span>
                                                    <span className='text-sm text-gray-700 font-medium'>Livrer les TPE réparés</span>
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
                            <BlocCommentaire titre="Commentaire réparation" texte={lot.forms.commentaire} />
                            <BlocCommentaire titre="Commentaire validation" texte={validation?.forms?.commentaire} />
                        </div>
                        {/* Liste des TPE */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className='p-4 pb-0 text-xs text-gray-600 space-x-3'>
                                <span>Total : {listeSn.length}</span>
                                {estValide && validation ? (<span>Total validé : {validation.quantite}</span>) : (<></>)}
                            </div>
                            <div className="max-w-full overflow-x-auto">
                                <Table>
                                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                        <TableRow>
                                            <TableCell isHeader className={headerClass}>N°</TableCell>
                                            <TableCell isHeader className={headerClass}>Marchand</TableCell>
                                            <TableCell isHeader className={headerClass}>S/N</TableCell>
                                            <TableCell isHeader className={headerClass}>Pièces réparées</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {listeSn.map((item, index) => {
                                            // Une fois le lot validé, les TPE refusés apparaissent grisés et barrés
                                            const classe = estValide && snValides && !snValides.has(String(item.sn)) ? cellRefuse : cellClass
                                            return (
                                                <TableRow key={item.sn || index}>
                                                    <TableCell className={classe}>{index + 1}</TableCell>
                                                    <TableCell className={classe}>{item.marchand || '-'}</TableCell>
                                                    <TableCell className={classe}>{item.sn}</TableCell>
                                                    <TableCell className={classe}>
                                                        <span className="text-xs">{nomsPieces(item).join(', ') || '-'}</span>
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
            <Modal isOpen={isModalLivraisonOpen} onClose={() => setIsModalLivraisonOpen(false)} className="p-4 max-w-md">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Livraison</span>
                    </div>
                    <div className="text-center text-sm font-medium">
                        <span>Livrer les {validation?.quantite ?? 0} TPE(s) réparés de ce lot ?</span>
                    </div>
                    <div>
                        <Label>Commentaire</Label>
                        <TextArea
                            value={messageLivraison}
                            onChange={(value) => setMessageLivraison(value)}
                            rows={3}
                            placeholder="Ajoutez un commentaire"
                        />
                    </div>
                    <div className="flex justify-between">
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={() => setIsModalLivraisonOpen(false)}
                            >
                                Non
                            </button>
                        </div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleLivraison}
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
