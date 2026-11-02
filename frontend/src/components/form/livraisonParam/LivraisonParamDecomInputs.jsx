import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router";
import { Decom } from "../../../backend/decom/Decom.js";
import { Users } from "../../../backend/users/Users.js";
import { GestionTpe } from "../../../backend/gestionTpe/GestionTpe.js";
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
import * as XLSX from "xlsx";

// Rôle autorisé à créer une livraison de TPE à paramétrer (id 25)
const ROLE_LIVRAISON_PARAM = 'verification_decom'
// Statut parc_tpe attendu pour une livraison param (param_maintenance)
const STATUT_PARAM_MAINTENANCE = 13

/* ---------------------------- Import Excel des S/N ---------------------------- */

// En-têtes acceptés pour la colonne des S/N (comparés après normalisation)
const EN_TETES_SN = ['SN', 'S/N', 'SERIALNUMBER', 'NUMERODESERIE', 'NSERIE']
// Nombre de lignes parcourues pour trouver la ligne d'en-tête
const LIGNES_RECHERCHE_EN_TETE = 10

const normaliserEnTete = (valeur) => String(valeur ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s._°-]/g, '')

// Les cellules peuvent être texte ou nombre (ex : 3210038510) : on ramène tout à une chaîne propre
const normaliserSn = (valeur) => {
    if (valeur === null || valeur === undefined) return ''
    const texte = typeof valeur === 'number'
        ? (Number.isInteger(valeur) ? valeur.toFixed(0) : String(valeur))
        : String(valeur)
    return texte.replace(/\s+/g, '').toUpperCase()
}

// Cherche la première feuille contenant une colonne SN / S/N et renvoie ses valeurs avec le n° de ligne Excel
const extraireSnExcel = (workbook) => {
    for (const nomFeuille of workbook.SheetNames) {
        const feuille = workbook.Sheets[nomFeuille]
        if (!feuille || !feuille['!ref']) continue

        const premiereLigne = XLSX.utils.decode_range(feuille['!ref']).s.r
        const lignes = XLSX.utils.sheet_to_json(feuille, { header: 1, raw: true, defval: null, blankrows: true })

        for (let i = 0; i < Math.min(lignes.length, LIGNES_RECHERCHE_EN_TETE); i++) {
            const colonne = (lignes[i] || []).findIndex((cellule) => EN_TETES_SN.includes(normaliserEnTete(cellule)))
            if (colonne === -1) continue

            const entrees = []
            for (let j = i + 1; j < lignes.length; j++) {
                const sn = normaliserSn(lignes[j]?.[colonne])
                if (sn) entrees.push({ ligne: premiereLigne + j + 1, sn })
            }
            return { feuille: nomFeuille, entrees }
        }
    }
    return null
}

export default function LivraisonParamDecomInputs() {
    const decomData = new Decom();
    const userData = new Users();
    const gestionTpeData = new GestionTpe();
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

    // Import Excel
    const fileInputRef = useRef(null)
    const [loadingImport, setLoadingImport] = useState(false)
    const [rapportImport, setRapportImport] = useState(null)
    const [snImportes, setSnImportes] = useState(new Set())

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
                setListeTpe(tpes.map((item) => ({ ...item, is_selected: false })))
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

    const handleImportExcel = async (e) => {
        const fichier = e.target.files?.[0]
        // Permet de ré-importer le même fichier
        e.target.value = ''
        if (!fichier) return

        try {
            setLoadingImport(true)
            setRapportImport(null)

            const workbook = XLSX.read(await fichier.arrayBuffer(), { type: 'array' })
            const extraction = extraireSnExcel(workbook)
            if (!extraction) {
                Swal.fire({
                    title: "Fichier invalide",
                    text: "Aucune colonne « SN » ou « S/N » trouvée dans le fichier.",
                    icon: "warning",
                })
                return
            }
            if (extraction.entrees.length == 0) {
                Swal.fire({
                    title: "Fichier vide",
                    text: "La colonne des S/N ne contient aucune valeur.",
                    icon: "warning",
                })
                return
            }

            // Dédoublonnage (on garde la première occurrence)
            const premiereLigneParSn = new Map()
            const doublons = []
            extraction.entrees.forEach(({ ligne, sn }) => {
                if (premiereLigneParSn.has(sn)) {
                    doublons.push({ ligne, sn, premiereLigne: premiereLigneParSn.get(sn) })
                } else {
                    premiereLigneParSn.set(sn, ligne)
                }
            })
            const snFichier = [...premiereLigneParSn.keys()]

            // Correspondance avec les TPE disponibles sur la page
            const snPage = new Set(listeTpe.map((t) => normaliserSn(t.sn)))
            const trouves = new Set(snFichier.filter((sn) => snPage.has(sn)))
            const absents = snFichier.filter((sn) => !snPage.has(sn))

            // Pour les S/N absents de la page, on demande au serveur pourquoi
            let anomalies = []
            if (absents.length > 0) {
                const verification = await gestionTpeData.checkSerials(absents)
                const verifParSn = new Map(verification.map((v) => [normaliserSn(v.sn), v]))

                // Depuis un décom, un TPE en param_maintenance absent de la page peut être
                // soit d'un autre décom, soit déjà en livraison : on lève l'ambiguïté
                let snDisponiblesGlobal = null
                const ambigus = verification.some((v) => v.exists && v.statut_id === STATUT_PARAM_MAINTENANCE)
                if (idDecom && ambigus) {
                    const tous = await decomData.getTpeParamMaintenance()
                    snDisponiblesGlobal = new Set(tous.map((t) => normaliserSn(t.sn)))
                }

                anomalies = absents.map((sn) => {
                    const ligne = premiereLigneParSn.get(sn)
                    const v = verifParSn.get(sn)
                    if (!v || !v.exists) {
                        return { ligne, sn, type: 'invalide', raison: 'S/N inexistant dans le parc' }
                    }
                    if (v.statut_id !== STATUT_PARAM_MAINTENANCE) {
                        return { ligne, sn, type: 'statut', raison: `Statut actuel : ${v.statut || 'inconnu'}` }
                    }
                    if (snDisponiblesGlobal?.has(sn)) {
                        return { ligne, sn, type: 'statut', raison: `N'appartient pas au décom #${idDecom}` }
                    }
                    return { ligne, sn, type: 'statut', raison: 'Déjà dans une livraison param ouverte' }
                }).sort((a, b) => a.ligne - b.ligne)
            }

            // La sélection est remplacée par celle du fichier
            setListeTpe((prev) => prev.map((item) => ({ ...item, is_selected: trouves.has(normaliserSn(item.sn)) })))
            setSnImportes(trouves)
            setRecherche('')
            setErrorValidation('')
            setRapportImport({
                fichier: fichier.name,
                feuille: extraction.feuille,
                total: extraction.entrees.length,
                selectionnes: trouves.size,
                nbStatut: anomalies.filter((a) => a.type === 'statut').length,
                nbInvalides: anomalies.filter((a) => a.type === 'invalide').length,
                anomalies,
                doublons,
            })
        } catch (error) {
            console.error("Erreur lors de l'import Excel : ", error)
            Swal.fire({
                title: "Attention",
                text: error?.message || "Impossible de lire le fichier Excel.",
                icon: "warning",
            })
        } finally {
            setLoadingImport(false)
        }
    }

    const handleExportAnomalies = () => {
        if (!rapportImport) return
        const lignes = [
            ...rapportImport.anomalies.map((a) => ({
                'Ligne Excel': a.ligne,
                'S/N': a.sn,
                'Type': a.type === 'invalide' ? 'S/N invalide' : 'Statut non conforme',
                'Motif': a.raison,
            })),
            ...rapportImport.doublons.map((d) => ({
                'Ligne Excel': d.ligne,
                'S/N': d.sn,
                'Type': 'Doublon',
                'Motif': `Déjà présent à la ligne ${d.premiereLigne}`,
            })),
        ].sort((a, b) => a['Ligne Excel'] - b['Ligne Excel'])

        const feuille = XLSX.utils.json_to_sheet(lignes)
        feuille['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 45 }]
        const classeur = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(classeur, feuille, 'Anomalies')
        const date = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(classeur, `anomalies_import_param_${date}.xlsx`)
    }

    const handleCloseRapport = () => {
        setRapportImport(null)
        setSnImportes(new Set())
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
                                <div className="flex flex-wrap gap-3 items-center">
                                    <span className="text-xs text-gray-600">Sélectionné(s) : {selectedTpes.length} / {listeTpe.length}</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={handleImportExcel}
                                    />
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl border border-green-400 text-green-700 hover:bg-green-50 disabled:opacity-50"
                                        disabled={loadingImport}
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Fichier Excel avec une colonne « SN » ou « S/N »"
                                    >
                                        <i className={loadingImport ? "pi pi-spin pi-spinner" : "pi pi-file-excel"}></i>
                                        {loadingImport ? 'Import en cours...' : 'Importer Excel (S/N)'}
                                    </button>
                                </div>
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
                            {rapportImport ? (
                                <div className="m-4 mb-0 p-3 rounded-xl border border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03] space-y-3">
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                            <div>
                                                Import de <span className="font-semibold">{rapportImport.fichier}</span> (feuille « {rapportImport.feuille} ») :
                                                {' '}{rapportImport.total} S/N lu(s). La sélection précédente a été remplacée.
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-2 py-1 rounded-lg bg-green-100 text-green-700 font-medium">{rapportImport.selectionnes} sélectionné(s)</span>
                                                <span className="px-2 py-1 rounded-lg bg-orange-100 text-orange-700 font-medium">{rapportImport.nbStatut} statut non conforme</span>
                                                <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700 font-medium">{rapportImport.nbInvalides} S/N invalide(s)</span>
                                                {rapportImport.doublons.length > 0 ? (
                                                    <span className="px-2 py-1 rounded-lg bg-gray-200 text-gray-700 font-medium">{rapportImport.doublons.length} doublon(s)</span>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {rapportImport.anomalies.length + rapportImport.doublons.length > 0 ? (
                                                <button type="button" onClick={handleExportAnomalies}
                                                    className="flex items-center gap-1 px-3 py-1 text-xs rounded-xl border border-gray-300 hover:bg-white">
                                                    <i className="pi pi-download"></i> Exporter les anomalies
                                                </button>
                                            ) : (
                                                <></>
                                            )}
                                            <button type="button" onClick={handleCloseRapport}
                                                className="px-3 py-1 text-xs rounded-xl border border-gray-300 hover:bg-white">
                                                Fermer
                                            </button>
                                        </div>
                                    </div>
                                    {rapportImport.anomalies.length + rapportImport.doublons.length > 0 ? (
                                        <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-transparent">
                                            <table className="w-full text-xs">
                                                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                                                    <tr className="text-gray-500 text-start">
                                                        <th className="px-3 py-2 text-start font-medium">Ligne</th>
                                                        <th className="px-3 py-2 text-start font-medium">S/N</th>
                                                        <th className="px-3 py-2 text-start font-medium">Type</th>
                                                        <th className="px-3 py-2 text-start font-medium">Motif</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                                    {rapportImport.anomalies.map((a) => (
                                                        <tr key={`a-${a.ligne}-${a.sn}`} className="text-gray-600 dark:text-gray-400">
                                                            <td className="px-3 py-1">{a.ligne}</td>
                                                            <td className="px-3 py-1 font-mono">{a.sn}</td>
                                                            <td className="px-3 py-1">
                                                                {a.type === 'invalide' ? (
                                                                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">S/N invalide</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">Statut non conforme</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-1">{a.raison}</td>
                                                        </tr>
                                                    ))}
                                                    {rapportImport.doublons.map((d) => (
                                                        <tr key={`d-${d.ligne}-${d.sn}`} className="text-gray-600 dark:text-gray-400">
                                                            <td className="px-3 py-1">{d.ligne}</td>
                                                            <td className="px-3 py-1 font-mono">{d.sn}</td>
                                                            <td className="px-3 py-1">
                                                                <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">Doublon</span>
                                                            </td>
                                                            <td className="px-3 py-1">Déjà présent à la ligne {d.premiereLigne}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                            ) : (
                                <></>
                            )}
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
                                                <TableRow key={item.sn} className={!item.is_selected ? 'bg-gray-50 opacity-60' : snImportes.has(normaliserSn(item.sn)) ? 'bg-green-50 dark:bg-green-500/10' : ''}>
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
                        {rapportImport && rapportImport.anomalies.length > 0 ? (
                            <span className="text-xs text-orange-600">
                                {rapportImport.anomalies.length} S/N du fichier importé ignoré(s) (voir le rapport d'import).
                            </span>
                        ) : (
                            <></>
                        )}
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
