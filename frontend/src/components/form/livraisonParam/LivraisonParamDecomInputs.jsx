import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router";
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
import Input from "../input/InputField.tsx";
import Checkbox from "../input/Checkbox.tsx";
import TextArea from "../input/TextArea.tsx";
import Swal from "sweetalert2";

// Rôle autorisé à créer une livraison de TPE à paramétrer (id 25)
const ROLE_LIVRAISON_PARAM = 'verification_decom'

export default function LivraisonParamDecomInputs() {
    const decomData = new Decom();
    const userData = new Users();
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    // Livraison faite depuis un décom : /livraison-param-decom?decom=12
    const idDecom = searchParams.get('decom')

    const [loadingData, setLoadingData] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)
    const [errorForm, setErrorForm] = useState('')
    const [errorValidation, setErrorValidation] = useState('')

    const [listeTpe, setListeTpe] = useState([])
    const [recherche, setRecherche] = useState('')
    const [commentaire, setCommentaire] = useState('')
    const [isModalValidateOpen, setIsModalValidateOpen] = useState(false)

    const selectedTpes = listeTpe.filter((item) => item.is_selected)
    const isAllChecked = listeTpe.length > 0 && selectedTpes.length == listeTpe.length

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)

                const rolesData = await userData.getUserRoles(userId)
                const nomRoles = rolesData.roles.map((item) => item.nom_role)
                if (!nomRoles.includes(ROLE_LIVRAISON_PARAM)) {
                    Swal.fire({
                        title: "Accès refusé",
                        text: "Vous n'êtes pas autorisé à créer une livraison de TPE à paramétrer.",
                        icon: "warning",
                    });
                    navigate(idDecom ? `/decom-details/${idDecom}` : '/livraisons-param-decom')
                    return;
                }

                if (idDecom) {
                    const decom = await decomData.getOneDecom(idDecom)
                    if (!decom || decom.forms?.is_deleted || decom.statut != 'clos') {
                        Swal.fire({
                            title: "Attention",
                            text: "La livraison param n'est possible que sur un décommissionnement clôturé.",
                            icon: "warning",
                        });
                        navigate(`/decom-details/${idDecom}`)
                        return;
                    }
                }

                const tpes = await decomData.getTpeParamMaintenance(idDecom)
                // Tous les TPE sont sélectionnés par défaut
                setListeTpe(tpes.map((item) => ({ ...item, is_selected: true })))
            } catch (error) {
                console.error('Error fetching data ', error)
                setErrorForm('Erreur lors de la génération du formulaire')
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const listeAffichee = useMemo(() => {
        const terme = recherche.trim().toLowerCase()
        if (!terme) return listeTpe
        return listeTpe.filter((item) =>
            [item.sn, item.point_marchand, item.modele, item.decom_id]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(terme))
        )
    }, [listeTpe, recherche])

    const handleSelectAll = () => {
        const newValue = !isAllChecked
        setListeTpe((prev) => prev.map((item) => ({ ...item, is_selected: newValue })))
    }

    const handleSelectTpe = (sn) => {
        setListeTpe((prev) => prev.map((item) =>
            item.sn === sn ? { ...item, is_selected: !item.is_selected } : item
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
            const listeSn = selectedTpes.map(({ is_selected, ...item }) => item)
            const response = await decomData.livrerParamDecom({
                userId,
                commentaire,
                listeSn,
                decomId: idDecom ? Number(idDecom) : null,
            })
            Swal.fire({
                title: "Succès",
                text: "Livraison des TPE à paramétrer créée avec succès !",
                icon: "success"
            })
            const idLivraison = response?.data?.livraison?.id
            navigate(idLivraison ? `/livraison-param-decom-details/${idLivraison}` : '/livraisons-param-decom')
        } catch (error) {
            console.log("Erreur de livraison : ", error)
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la livraison !",
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
                        {idDecom ? (
                            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-700">
                                <span>
                                    Livraison des TPE à paramétrer du <Link to={`/decom-details/${idDecom}`} className="underline font-semibold">décom #{idDecom}</Link>.
                                    Le décom passera en <span className="font-semibold">transmis_decom_param</span> une fois tous ses TPE livrés.
                                </span>
                            </div>
                        ) : (
                            <></>
                        )}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className="p-4 pb-0 flex flex-wrap gap-3 justify-between items-center">
                                <span className="text-xs text-gray-600">Sélectionné(s) : {selectedTpes.length} / {listeTpe.length}</span>
                                <div className="relative w-full md:w-1/3">
                                    <Input
                                        className="pl-10"
                                        value={recherche}
                                        onChange={(e) => setRecherche(e.target.value)}
                                        placeholder="Rechercher un S/N, marchand, modèle..."
                                    />
                                    <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                                </div>
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
                                            <TableCell isHeader className={headerClass}>
                                                <Checkbox checked={isAllChecked} onChange={handleSelectAll} />
                                            </TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {listeAffichee.length == 0 ? (
                                            <TableRow>
                                                <TableCell className={cellClass}>
                                                    <span>Aucun TPE en attente de paramétrage.</span>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            listeAffichee.map((item, index) => (
                                                <TableRow key={item.sn} className={item.is_selected ? '' : 'bg-gray-50 opacity-60'}>
                                                    <TableCell className={cellClass}>{index + 1}</TableCell>
                                                    <TableCell className={cellClass}>{item.sn}</TableCell>
                                                    <TableCell className={cellClass}>{item.point_marchand || '-'}</TableCell>
                                                    <TableCell className={cellClass}>{item.modele || '-'}</TableCell>
                                                    <TableCell className={cellClass}>
                                                        {item.decom_id ? (
                                                            <Link to={`/decom-details/${item.decom_id}`} className="text-blue-500 underline">#{item.decom_id}</Link>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell className={cellClass}>
                                                        <Checkbox checked={item.is_selected} onChange={() => handleSelectTpe(item.sn)} />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <div className="md:w-1/2 w-full mx-auto space-y-3">
                            <div>
                                <Label>Commentaire</Label>
                                <TextArea
                                    value={commentaire}
                                    onChange={(value) => setCommentaire(value)}
                                    rows={3}
                                    placeholder="Ajoutez un commentaire"
                                />
                            </div>
                            <div className="text-center">
                                <span className="text-error-600 text-sm font-medium">{errorValidation}</span>
                            </div>
                            <div className="w-full flex justify-center items-center">
                                {loadingValidation ? (
                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                ) : (
                                    <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl disabled:opacity-50"
                                        disabled={listeTpe.length == 0}
                                        onClick={handleConfirmValidate}
                                    >
                                        Livrer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Modal isOpen={isModalValidateOpen} onClose={() => setIsModalValidateOpen(false)} className="p-4 max-w-md">
                <div className="space-y-6">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Livraison paramétrage</span>
                    </div>
                    <div className="text-center text-sm font-medium flex flex-col space-y-1">
                        <span>Livrer {selectedTpes.length} TPE(s) à paramétrer ?</span>
                        {idDecom && selectedTpes.length < listeTpe.length ? (
                            <span className="text-xs text-red-600">
                                {listeTpe.length - selectedTpes.length} TPE(s) du décom non sélectionné(s) : le décom n'avancera pas tant qu'ils ne sont pas livrés.
                            </span>
                        ) : (
                            <></>
                        )}
                    </div>
                    <div className="flex justify-between">
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={() => setIsModalValidateOpen(false)}
                            >
                                Non
                            </button>
                        </div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleValidate}
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
