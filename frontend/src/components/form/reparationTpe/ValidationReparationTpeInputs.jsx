import { useEffect, useState } from "react"
import { useNavigate, useParams, Link } from "react-router";
import { Decom } from "../../../backend/decom/Decom.js";
import { Users } from "../../../backend/users/Users.js";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../ui/table/index.tsx"
import { Modal } from "../../ui/modal/index.tsx";
import { ProgressSpinner } from "primereact/progressspinner";
import Label from "../Label.tsx";
import Checkbox from "../input/Checkbox.tsx";
import TextArea from "../input/TextArea.tsx";
import Swal from "sweetalert2";

// Rôle (id_role) autorisé à valider un lot de réparation : supervision réparation
const ROLE_VALIDATION_ID = 37

const nomsPieces = (item) => (Array.isArray(item.listePiece) ? item.listePiece : [])
    .map((p) => p?.items?.nom_piece)
    .filter(Boolean)

export default function ValidationReparationTpeInputs() {
    const decomData = new Decom();
    const userData = new Users();
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()
    const { id: idLot } = useParams()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)
    const [errorForm, setErrorForm] = useState('')
    const [errorValidation, setErrorValidation] = useState('')

    const [idDecom, setIdDecom] = useState(null)
    const [listeTpe, setListeTpe] = useState([])
    const [commentaire, setCommentaire] = useState('')
    const [isModalValidateOpen, setIsModalValidateOpen] = useState(false)

    const selectedTpes = listeTpe.filter((item) => item.is_selected)
    const isAllChecked = listeTpe.length > 0 && selectedTpes.length == listeTpe.length

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)

                const rolesData = await userData.getUserRoles(userId)
                const ids = (rolesData.roles || []).map((r) => r.id_role)
                if (!ids.includes(ROLE_VALIDATION_ID)) {
                    Swal.fire({
                        title: "Accès refusé",
                        text: "Vous n'êtes pas autorisé à valider ce lot de réparation.",
                        icon: "warning",
                    });
                    navigate(`/reparation-tpe-details/${idLot}`)
                    return;
                }

                const lot = await decomData.getOneReparationTpe(idLot)
                if (lot.forms?.is_deleted || lot.statut != 'en_reparation') {
                    Swal.fire({
                        title: "Attention",
                        text: "Ce lot n'est pas en attente de validation.",
                        icon: "warning",
                    });
                    navigate(`/reparation-tpe-details/${idLot}`)
                    return;
                }

                setIdDecom(lot.decom_id)
                const liste = JSON.parse(lot.liste_sn || '[]')
                setListeTpe(liste.map((item) => ({ ...item, is_selected: true })))
            } catch (error) {
                console.error('Error fetching data ', error)
                setErrorForm('Erreur lors de la génération du formulaire')
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const handleSelectAll = () => {
        const newValue = !isAllChecked
        setListeTpe((prev) => prev.map((item) => ({ ...item, is_selected: newValue })))
    }

    const handleSelectTpe = (index) => {
        setListeTpe((prev) => prev.map((item, i) =>
            i === index ? { ...item, is_selected: !item.is_selected } : item
        ))
    }

    const handleConfirmValidate = () => {
        setErrorValidation('')
        if (selectedTpes.length == 0) {
            setErrorValidation('Vous devez sélectionner au moins un TPE !')
            return
        }
        setIsModalValidateOpen(true)
    }

    const handleValidate = async () => {
        setIsModalValidateOpen(false)
        try {
            setLoadingValidation(true)
            const listeValidee = selectedTpes.map(({ is_selected, ...item }) => item)
            await decomData.validerReparationTpe(idLot, {
                userId,
                commentaire,
                listeValidee,
            })
            Swal.fire({
                title: "Succès",
                text: "Lot de réparation validé : il peut maintenant être livré.",
                icon: "success"
            })
            navigate(`/reparation-tpe-details/${idLot}`)
        } catch (error) {
            console.log("Erreur de validation : ", error)
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la validation !",
                icon: "warning"
            })
        } finally {
            setLoadingValidation(false)
        }
    }

    const headerClass = "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
    const cellClass = "px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400"

    return (
        <>
            <div className="space-y-3">
                {loadingData ? (
                    <div className="flex justify-center">
                        <span>Loading...</span>
                    </div>
                ) : errorForm ? (
                    <div className="flex justify-center">
                        <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                            {errorForm}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className='p-4 pb-0 text-xs text-gray-600 flex flex-wrap gap-3'>
                                <span>Réparé(s) : {selectedTpes.length} / {listeTpe.length}</span>
                                {idDecom ? (
                                    <span>Décom : <Link to={`/decom-details/${idDecom}`} className="text-blue-500 underline">#{idDecom}</Link></span>
                                ) : (
                                    <></>
                                )}
                            </div>
                            <div className="max-w-full overflow-x-auto">
                                <Table>
                                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                        <TableRow>
                                            <TableCell isHeader className={headerClass}>N°</TableCell>
                                            <TableCell isHeader className={headerClass}>Marchand</TableCell>
                                            <TableCell isHeader className={headerClass}>S/N</TableCell>
                                            <TableCell isHeader className={headerClass}>Pièces réparées</TableCell>
                                            <TableCell isHeader className={headerClass}>
                                                <Checkbox checked={isAllChecked} onChange={handleSelectAll} />
                                            </TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {listeTpe.map((item, index) => (
                                            <TableRow key={item.sn || index} className={item.is_selected ? '' : 'bg-gray-50 opacity-60'}>
                                                <TableCell className={cellClass}>{index + 1}</TableCell>
                                                <TableCell className={cellClass}>{item.marchand || '-'}</TableCell>
                                                <TableCell className={cellClass}>{item.sn}</TableCell>
                                                <TableCell className={cellClass}>
                                                    <span className="text-xs">{nomsPieces(item).join(', ') || '-'}</span>
                                                </TableCell>
                                                <TableCell className={cellClass}>
                                                    <Checkbox checked={item.is_selected} onChange={() => handleSelectTpe(index)} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <div className="w-full flex justify-center items-center">
                            {loadingValidation ? (
                                <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                            ) : (
                                <button className="w-1/5 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={handleConfirmValidate}
                                >
                                    Valider
                                </button>
                            )}
                        </div>
                        <div className="text-center">
                            <span className="text-error-600 text-sm font-medium">{errorValidation}</span>
                        </div>
                    </div>
                )}
            </div>
            <Modal isOpen={isModalValidateOpen} onClose={() => setIsModalValidateOpen(false)} className="p-4 max-w-xl">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-green-100 text-green-600 font-medium">Validation réparation</span>
                    </div>
                    <div className="text-center flex flex-col">
                        <span className="text-sm">Validation du lot de réparation #{idLot}</span>
                        <span className="font-bold">{selectedTpes.length} TPE(s) sur {listeTpe.length} réparé(s)</span>
                        {selectedTpes.length < listeTpe.length ? (
                            <span className="text-xs text-red-600">
                                {listeTpe.length - selectedTpes.length} TPE(s) non validé(s) : ils repasseront au statut "à réparer"{idDecom ? " et le décom n'avancera pas tant qu'ils ne sont pas réparés" : ''}.
                            </span>
                        ) : (
                            <></>
                        )}
                    </div>
                    <div>
                        <Label>Commentaire</Label>
                        <TextArea
                            value={commentaire}
                            onChange={(value) => setCommentaire(value)}
                            rows={3}
                            placeholder="Ajoutez un commentaire"
                        />
                    </div>
                    <div className="w-full flex justify-center items-center">
                        <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                            onClick={handleValidate}
                        >
                            Valider
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}
