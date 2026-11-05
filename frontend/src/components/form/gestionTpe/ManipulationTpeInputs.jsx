import { useEffect, useState, useCallback } from "react";
import ComponentCard from "../../common/ComponentCard";
import { GestionTpe } from "../../../backend/gestionTpe/GestionTpe";
import { Stock } from "../../../backend/stock/Stock.js";
import { useAuth } from "../../../context/AuthContext";

// Rôle autorisé à corriger un modèle déjà enregistré au parc (vérifié aussi côté serveur)
const ROLE_CORRECTION_MODELE = 27
import Swal from "sweetalert2";
import { Dropdown } from "primereact/dropdown";
import Select from "../Select";
import DatePicker from "../date-picker";
import Label from "../Label";
import Input from "../input/InputField";
import Checkbox from "../input/Checkbox";
import TextArea from "../input/TextArea";
import { ProgressSpinner } from "primereact/progressspinner";
import { Modal } from "../../ui/modal";
import { useParams, Link, useNavigate } from "react-router";
import { useDropzone } from "react-dropzone"

export default function ManipulationTpeInputs() {

    const gestionTpeData = new GestionTpe()
    const stockData = new Stock()
    const { user } = useAuth()
    const peutCorrigerModele = Boolean(user?.roleList?.some((role) => Number(role) === ROLE_CORRECTION_MODELE))
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingFunction, setLoadingFunction] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)

    const [errorForm, setErrorForm] = useState('')
    const [errorAjout, setErrorAjout] = useState('')

    const [terminalSn, setTerminalSn] = useState('')
    const [statutTpe, setStatutTpe] = useState('')
    const [statutTpeId, setStatutTpeId] = useState(null)

    const [statuts, setStatuts] = useState([])
    const [optionsStatut, setOptionStatut] = useState([])

    const [isModalConfirmOpen, setIsModalConfirmOpen] = useState(false)

    const [nomStatut, setNomStatut] = useState('')
    const [selectedStatut, setSelectedStatut] = useState(null)

    const [isSingle, setIsSingle] = useState(false)
    const [isMultiple, setIsMultiple] = useState(false)

    const [loadingExtract, setLoadingExtract] = useState(false)

    const [selectedExcelFile, setSelectedExcelFile] = useState(null)

    const [listeSn, setListeSn] = useState([])

    const [isModalStatutsOpen, setIsModalStatutsOpen] = useState(false)

    const [isModalConfirmMultipleOpen, setIsModalConfirmMultipleOpen] = useState(false)

    // Modèle du TPE : celui enregistré au parc fait foi ; sinon il est choisi ici
    // (obligatoire pour un TPE non enregistré au parc, qui y sera créé)
    const [modelList, setModelList] = useState([])
    const [optionsModels, setOptionsModels] = useState([])
    const [selectedModel, setSelectedModel] = useState(null)
    const [nomModel, setNomModel] = useState('')
    const [modeleParc, setModeleParc] = useState(null)
    // Correction du modèle enregistré au parc (rôle 27) : le statut devient alors facultatif
    const [corrigerModele, setCorrigerModele] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const statuts = await gestionTpeData.getAllStatut()
                const statutsOptions = statuts.map((item) => ({
                    value: item.id,
                    label: item.statut,
                }))
                setStatuts(statuts)
                setOptionStatut(statutsOptions)

                const models = await stockData.getAllModels()
                setModelList(models)
                setOptionsModels(models.map((model) => ({
                    value: String(model.id_model),
                    label: model.nom_model,
                })))

            } catch (error) {
                console.log('Error fetching data ', error)
                setErrorForm("Une erreur s'est produite lors de la génération du formulaire !")
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const onDropExcel = useCallback(async (acceptedFiles) => {
        setSelectedExcelFile(acceptedFiles[0])
    }, [selectedExcelFile]);

    const {
        getRootProps: getExcelRootProps,
        getInputProps: getExcelInputProps,
    } = useDropzone({
        onDrop: onDropExcel,
        multiple: false,
        accept: {
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
        }
    });

    const handleExtract = async () => {
        try {
            setErrorAjout('')
            setListeSn([])
            setCorrigerModele(false)

            if (!selectedExcelFile) {
                Swal.fire({
                    title: "Attention",
                    text: "Veuillez sélectionner un fichier Excel !",
                    icon: "warning"
                })
                return
            }
            setLoadingExtract(true)

            const fd = new FormData()
            fd.append('file', selectedExcelFile)
            fd.append('userId', userId)

            const response = await gestionTpeData.extractSn(fd)
            const serials = response.data
            console.log(serials)

            setListeSn(serials)
            Swal.fire({
                title: "Succès",
                text: `Données Excel extraites avec succès : ${serials.length} SN trouvés !`,
                icon: "success"
            })
        } catch (error) {
            console.error("Erreur lors de l'extraction des données Excel:", error);
            Swal.fire({
                title: "Attention",
                text: error.message,
                icon: "warning"
            })
        } finally {
            setLoadingExtract(false)
        }
    }

    const handleSn = async (value) => {
        try {
            setLoadingFunction(true)
            setTerminalSn(value)
            setModeleParc(null)
            setSelectedModel(null)
            setNomModel('')
            setCorrigerModele(false)
            if (value.length == 10) {
                const tpeData = await gestionTpeData.getTpeInfos(value)
                // console.log(tpeData)
                if (tpeData) {
                    const statutTpe = tpeData.statut_tpe.statut
                    setStatutTpe(statutTpe)
                    setStatutTpeId(tpeData.statut_tpe.id)
                    if (tpeData.model_id) {
                        setModeleParc({ id: tpeData.model_id, nom: tpeData.model_piece?.nom_model || '' })
                    }
                } else {
                    setStatutTpe('non enregistré')
                }
            }
        } catch (error) {
            console.log('Error fetching data ', error)
        } finally {
            setLoadingFunction(false)
        }
    }

    const handleSelectModel = (value) => {
        setSelectedModel(value)
        const model = modelList.find((item) => item.id_model == value)
        setNomModel(model ? model.nom_model : '')
    }

    // Liste par fichier : SN non enregistrés au parc et sans modèle (ni au parc, ni dans le fichier)
    const snNonEnregistresSansModele = listeSn.filter((item) => !item.enregistre && !item.modele_id)
    const snSansModele = listeSn.filter((item) => !item.modele_id)
    // SN dont le fichier indique un autre modèle que celui du parc (corrigeables avec le rôle 27)
    const snConflitModele = listeSn.filter((item) => item.conflit_modele)

    const handleSelectStatut = async (value) => {
        // '0' = "Statut inchangé" (proposé uniquement en correction de modèle)
        if (value === '0') {
            setSelectedStatut(null)
            setNomStatut('')
            return
        }
        setSelectedStatut(value)
        const statut = statuts.find((item) => {
            return item.id == value
        })
        if (statut) {
            setNomStatut(statut.statut)
        }
    }

    const handleConfirmSingle = () => {
        if (!terminalSn || terminalSn.length < 10) {
            setErrorAjout('S/N invalide !')
            return
        }
        if (!selectedStatut && !corrigerModele) {
            setErrorAjout('Vous devez choisir un statut !')
            return
        }
        if (selectedStatut && selectedStatut == statutTpeId) {
            setErrorAjout('Le terminal est déjà à ce statut !')
            return
        }
        if (corrigerModele && !selectedModel) {
            setErrorAjout('Vous devez choisir le nouveau modèle du TPE !')
            return
        }
        if (corrigerModele && modeleParc && Number(selectedModel) === Number(modeleParc.id)) {
            setErrorAjout('Le TPE a déjà ce modèle !')
            return
        }
        if (statutTpe === 'non enregistré' && !selectedModel) {
            setErrorAjout("Vous devez choisir le modèle : ce TPE n'est pas encore enregistré au parc !")
            return
        }
        setErrorAjout('')
        setIsModalConfirmOpen(true)
    }
    const handleConfirmMultiple = () => {
        if (listeSn.length == 0) {
            setErrorAjout('Liste de S/N invalide !')
            return
        }
        if (!selectedStatut && !(corrigerModele && snConflitModele.length > 0)) {
            setErrorAjout('Vous devez choisir un statut !')
            return
        }
        if (!selectedStatut && snNonEnregistresSansModele.length > 0) {
            setErrorAjout(`Sans changement de statut, les TPE non enregistrés au parc ne peuvent pas être créés : retirez-les du fichier ou choisissez un statut.`)
            return
        }
        if (snNonEnregistresSansModele.length > 0 && !selectedModel) {
            setErrorAjout(`Vous devez choisir le modèle des ${snNonEnregistresSansModele.length} TPE non enregistrés au parc et sans modèle dans le fichier !`)
            return
        }

        setErrorAjout('')
        setIsModalConfirmMultipleOpen(true)
    }

    const handleValidate = async () => {
        setIsModalConfirmOpen(false)
        setIsModalConfirmMultipleOpen(false)
        try {
            setLoadingValidation(true)
            if (isSingle) {
                const payload = {
                    statutId: selectedStatut,
                    userId,
                    // Le modèle du parc fait foi : on n'envoie un modèle que s'il n'y en a pas, ou pour le corriger
                    modelId: modeleParc && !corrigerModele ? null : selectedModel,
                    corrigerModele,
                }
                const sn = terminalSn
                await gestionTpeData.changeTpeStatut(sn, payload)
                Swal.fire({
                    title: "Succès",
                    text: "Opération effectuée avec succès !",
                    icon: "success"
                })
                reinitialiser()
            } else if (isMultiple) {
                const serials = listeSn.map((item) => {
                    return item.sn
                })
                const payload = {
                    statutId: selectedStatut,
                    userId,
                    serials,
                    // Modèle par SN (parc ou colonne MODELE du fichier), et modèle par défaut pour les autres
                    // En correction, le modèle du fichier remplace celui du parc
                    terminaux: listeSn.map((item) => ({
                        sn: item.sn,
                        modelId: corrigerModele ? (item.modele_fichier_id || item.modele_id) : item.modele_id,
                    })),
                    modelId: selectedModel,
                    corrigerModele,
                }
                await gestionTpeData.changeListeStatut(payload)
                Swal.fire({
                    title: "Succès",
                    text: "Opération effectuée avec succès !",
                    icon: "success"
                })
                reinitialiser()
                navigate('/parc-tpe')
            } else {
                Swal.fire({
                    title: "Attention",
                    text: "Une erreur s'est produite !",
                    icon: "warning"
                })
                navigate('/parc-tpe')
            }
        } catch (error) {
            // Le formulaire est conservé pour permettre la correction (ex. modèle manquant)
            console.log("Erreur : ", error)
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur s'est produite !",
                icon: "warning"
            })
        } finally {
            setLoadingValidation(false)
        }
    }

    const reinitialiser = () => {
        setTerminalSn('')
        setSelectedExcelFile(null)
        setListeSn([])
        setStatutTpeId(null)
        setStatutTpe('')
        setModeleParc(null)
        setSelectedModel(null)
        setNomModel('')
        setCorrigerModele(false)
    }
    return (
        <>
            <div className="space-y-3">
                <div className="flex justify-center">
                    {loadingData ? (
                        <>
                            <span>Loading...</span>
                        </>
                    ) : (
                        <>
                            {errorForm ? (
                                <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                    {errorForm}
                                </div>
                            ) : (
                                <>
                                    <ComponentCard className="md:w-1/2 w-full" title="Modifier le statut de TPE">
                                        <div className="space-y-3">
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex flex-col">
                                                        <div>
                                                            <span className="text-sm">Mode d'insertion</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 my-2">
                                                            <Checkbox
                                                                checked={isSingle}
                                                                onChange={(e) => {
                                                                    if (isSingle) {
                                                                        setIsSingle(false)
                                                                    } else {
                                                                        setIsSingle(true)
                                                                        setIsMultiple(false)
                                                                    }
                                                                }}
                                                                label="Par S/N" />
                                                        </div>
                                                        <div className="flex items-center gap-3 my-2">
                                                            <Checkbox
                                                                checked={isMultiple}
                                                                onChange={(e) => {
                                                                    if (isMultiple) {
                                                                        setIsMultiple(false)
                                                                    } else {
                                                                        setIsMultiple(true)
                                                                        setIsSingle(false)
                                                                    }
                                                                }}
                                                                label="Par fichier" />
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSingle ? (
                                                    <>
                                                        <div>
                                                            {loadingFunction ? (
                                                                <>
                                                                    <div className="text-center">
                                                                        <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Label htmlFor="input">Numéro de série <span className="text-red-700">*</span></Label>
                                                                    <span className="text-xs text-blue-500 text-center">{statutTpe}</span>
                                                                    <Input type="text" id="input" value={terminalSn} onChange={(e) => {
                                                                        const value = e.target.value
                                                                        // Allow only digits
                                                                        if (/^\d*$/.test(value)) {
                                                                            // Only allow up to 10 characters
                                                                            if (value.length <= 10) {
                                                                                // setTerminalSN(value);
                                                                                handleSn(value)
                                                                            }
                                                                        }
                                                                    }} />
                                                                </>
                                                            )}
                                                        </div>
                                                        {terminalSn.length == 10 && !loadingFunction ? (
                                                            <div>
                                                                {modeleParc ? (
                                                                    <>
                                                                        <Label>Modèle (enregistré au parc)</Label>
                                                                        <Input type="text" value={String(modeleParc.nom).toUpperCase()} disabled />
                                                                        {peutCorrigerModele ? (
                                                                            <div className="pt-2 space-y-2">
                                                                                <Checkbox
                                                                                    checked={corrigerModele}
                                                                                    onChange={(checked) => {
                                                                                        setCorrigerModele(checked)
                                                                                        setSelectedModel(null)
                                                                                        setNomModel('')
                                                                                    }}
                                                                                    label="Corriger le modèle"
                                                                                />
                                                                                {corrigerModele ? (
                                                                                    <>
                                                                                        <Label>Nouveau modèle <span className="text-red-700">*</span></Label>
                                                                                        <Select
                                                                                            key={`correction-${terminalSn}`}
                                                                                            options={optionsModels.filter((option) => Number(option.value) !== Number(modeleParc.id))}
                                                                                            placeholder="Choisir une option"
                                                                                            onChange={handleSelectModel}
                                                                                            className="dark:bg-dark-900"
                                                                                        />
                                                                                        <span className="text-xs text-orange-600">Le statut devient facultatif : la correction peut se faire sans changer le statut.</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <></>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <></>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Label>Modèle {statutTpe === 'non enregistré' ? <span className="text-red-700">*</span> : <span className="text-xs text-gray-500">(le TPE n'a pas de modèle au parc)</span>}</Label>
                                                                        <Select
                                                                            key={terminalSn}
                                                                            options={optionsModels}
                                                                            placeholder="Choisir une option"
                                                                            onChange={handleSelectModel}
                                                                            className="dark:bg-dark-900"
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <></>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>

                                                    </>
                                                )}
                                                {isMultiple ? (
                                                    <>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <Label>Fichier Excel</Label>
                                                                <div className="flex space-x-1.5">
                                                                    <div
                                                                        {...getExcelRootProps()}
                                                                        className="border-2 border-dashed p-2 rounded-lg text-center cursor-pointer w-full"
                                                                    >
                                                                        <input {...getExcelInputProps()} />
                                                                        <p className="text-xs font-light">Faites glisser le fichier ici, ou cliquer pour le sélectionner.</p>
                                                                    </div>
                                                                    {selectedExcelFile ? (
                                                                        <>
                                                                            {loadingExtract ? (
                                                                                <>
                                                                                    <div>
                                                                                        <ProgressSpinner style={{ width: '10px', height: '10px' }} strokeWidth="8" animationDuration=".5s" />
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <button
                                                                                        onClick={handleExtract}
                                                                                        className="border rounded-lg text-center p-1.5 hover:text-cyan-600 hover:border-cyan-500"
                                                                                    >
                                                                                        <span>
                                                                                            <i className="pi pi-external-link"></i>
                                                                                        </span>
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                {listeSn.length > 0 ? (
                                                                    <>
                                                                        <div className="">
                                                                            <div className="w-full flex items-center">
                                                                                <button className="w-1/5 flex items-center justify-center bg-blue-400 p-1 rounded text-xs"
                                                                                    onClick={() => {
                                                                                        setIsModalStatutsOpen(true)
                                                                                    }}
                                                                                >
                                                                                    Voir statuts
                                                                                </button>
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-semibold text-xs text-green-700">
                                                                                    {listeSn.length} S/N.
                                                                                </span>
                                                                            </div>
                                                                            {snConflitModele.length > 0 ? (
                                                                                <div className="pt-2 space-y-1">
                                                                                    <span className="text-xs text-orange-600">
                                                                                        {snConflitModele.length} TPE ont dans le fichier un autre modèle que celui du parc (voir les statuts).
                                                                                    </span>
                                                                                    {peutCorrigerModele ? (
                                                                                        <Checkbox
                                                                                            checked={corrigerModele}
                                                                                            onChange={(checked) => setCorrigerModele(checked)}
                                                                                            label={`Corriger le modèle au parc avec celui du fichier (${snConflitModele.length} TPE)`}
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="block text-xs text-gray-500">Le modèle du parc sera conservé.</span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <></>
                                                                            )}
                                                                            {snSansModele.length > 0 ? (
                                                                                <div className="pt-2">
                                                                                    <Label>
                                                                                        Modèle des {snSansModele.length} TPE sans modèle (ni au parc, ni dans le fichier)
                                                                                        {snNonEnregistresSansModele.length > 0 ? <span className="text-red-700"> *</span> : <></>}
                                                                                    </Label>
                                                                                    <Select
                                                                                        options={optionsModels}
                                                                                        placeholder="Choisir une option"
                                                                                        onChange={handleSelectModel}
                                                                                        className="dark:bg-dark-900"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <></>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                <div>
                                                    <Label>Nouveau Statut {corrigerModele ? <span className="text-xs text-gray-500">(facultatif)</span> : <span className="text-red-700">*</span>}</Label>
                                                    <Select
                                                        options={corrigerModele ? [{ value: '0', label: '— Statut inchangé —' }, ...optionsStatut] : optionsStatut}
                                                        placeholder="Choisir une option"
                                                        onChange={handleSelectStatut}
                                                        className="dark:bg-dark-900"
                                                    />
                                                </div>
                                                <div>
                                                    <div>
                                                        <div className="text-center">
                                                            {loadingValidation ? (
                                                                <>
                                                                    <div>
                                                                        <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="8" animationDuration=".5s" />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-full flex justify-center items-center">
                                                                        {isSingle ? (
                                                                            <>
                                                                                <button className="w-1/5 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                                    onClick={handleConfirmSingle}
                                                                                >
                                                                                    Valider
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <></>
                                                                        )}
                                                                        {isMultiple ? (
                                                                            <>
                                                                                <button className="w-1/5 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                                    onClick={handleConfirmMultiple}
                                                                                >
                                                                                    Valider
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <></>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">
                                                            {errorAjout}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right text-gray-500">
                                                    <span className="text-xs font-medium">
                                                        Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </ComponentCard>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Modal isOpen={isModalConfirmOpen} onClose={() => setIsModalConfirmOpen(false)} className="p-4 max-w-md">
                <div className="space-y-6">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Confirmation</span>
                    </div>
                    <div>
                        <div className="space-y-2">
                            <div className="text-xl font-semibold text-center">
                                <span>{terminalSn}</span>
                            </div>
                            <div className="text-center text-sm ">
                                <div className="space-x-3.5 flex justify-center items-center">
                                    <span className="text-red-600 font-medium">{statutTpe}</span>
                                    <span><i className="pi pi-arrow-right"></i></span>
                                    <span className="font-bold">{selectedStatut ? nomStatut : 'statut inchangé'}</span>
                                </div>
                            </div>
                            {corrigerModele && modeleParc ? (
                                <div className="text-center text-sm space-x-2">
                                    <span className="font-medium">Correction du modèle :</span>
                                    <span className="text-red-600 font-medium">{String(modeleParc.nom).toUpperCase()}</span>
                                    <span><i className="pi pi-arrow-right"></i></span>
                                    <span className="font-bold text-blue-600">{String(nomModel).toUpperCase()}</span>
                                </div>
                            ) : modeleParc || nomModel ? (
                                <div className="text-center text-sm">
                                    <span className="font-medium">Modèle : </span>
                                    <span className="font-bold text-blue-600">{String(modeleParc ? modeleParc.nom : nomModel).toUpperCase()}</span>
                                </div>
                            ) : (
                                <></>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleValidate}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalStatutsOpen} onClose={() => setIsModalStatutsOpen(false)} className="p-4 max-w-md">
                <div className="space-y-6 pb-2">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Statuts</span>
                    </div>
                    <div>
                        <div className="space-y-2 flex flex-col justify-center items-center w-full">
                            <div className="text-md font-semibold text-center">
                                <span>S/N extraits</span>
                            </div>
                            <div className="h-80 overflow-y-auto w-full">
                                <table className="border w-full">
                                    <tbody>
                                        <tr className="border-2 border-black">
                                            <th>Serial Number</th>
                                            <th>Statut</th>
                                            <th>Modèle</th>
                                        </tr>
                                        {listeSn.map((item) => {
                                            return (
                                                <>
                                                    <tr className="border border-black">
                                                        <th className="text-sm font-normal">{item.sn}</th>
                                                        <th className="text-sm font-normal">{item.statut}</th>
                                                        <th className="text-sm font-normal">
                                                            {item.modele || <span className="text-gray-400">—</span>}
                                                            {item.conflit_modele ? <span className="block text-xs text-orange-600">fichier : {item.modele_fichier}</span> : <></>}
                                                        </th>
                                                    </tr>
                                                </>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalConfirmMultipleOpen} onClose={() => setIsModalConfirmMultipleOpen(false)} className="p-4 max-w-md">
                <div className="space-y-6">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Confirmation</span>
                    </div>
                    <div>
                        <div className="space-y-2">
                            <div className="text-xl font-semibold text-center">
                                <span>{listeSn.length} TPEs</span>
                            </div>
                            <div className="text-center text-sm ">
                                <div className="">
                                    <span className="font-medium">Nouveau Statut : </span>
                                    <span className="font-bold text-blue-600">{selectedStatut ? nomStatut : 'inchangé'}</span>
                                </div>
                                {corrigerModele && snConflitModele.length > 0 ? (
                                    <div>
                                        <span className="font-medium">Modèles corrigés avec ceux du fichier : </span>
                                        <span className="font-bold text-orange-600">{snConflitModele.length} TPE</span>
                                    </div>
                                ) : (
                                    <></>
                                )}
                                {snSansModele.length > 0 && nomModel ? (
                                    <div>
                                        <span className="font-medium">Modèle des {snSansModele.length} TPE sans modèle : </span>
                                        <span className="font-bold text-blue-600">{String(nomModel).toUpperCase()}</span>
                                    </div>
                                ) : (
                                    <></>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleValidate}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}