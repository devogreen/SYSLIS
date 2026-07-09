import { useEffect, useState, useCallback } from "react";
import ComponentCard from "../../common/ComponentCard";
import { GestionTpe } from "../../../backend/gestionTpe/GestionTpe";
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
import { Decom } from "../../../backend/decom/decom";
import { Calendar } from "primereact/calendar";

export default function ReparationTpeInputs() {

    const gestionTpeData = new GestionTpe()
    const decomData = new Decom()
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

    const [commentaire, setCommentaire] = useState('')

    const [isReg, setIsReg] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)
    const [errorValidation, setErrorValidation] = useState('')

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

            const response = await decomData.extractSnReparation(fd)
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
            if (value.length == 10) {
                const tpeData = await gestionTpeData.getTpeInfos(value)
                // console.log(tpeData)
                if (tpeData) {
                    const statutTpe = tpeData.statut_tpe.statut
                    setStatutTpe(statutTpe)
                    setStatutTpeId(tpeData.statut_tpe.id)
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

    const handleSelectStatut = async (value) => {
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
        if (statutTpe != 'a_reparer') {
            setErrorAjout('Statut de terminal non conforme !')
            return
        }
        setIsModalConfirmOpen(true)
    }

    const handleConfirmMultiple = () => {
        if (listeSn.length == 0) {
            setErrorAjout('Liste de S/N invalide !')
            return
        }

        setIsModalConfirmMultipleOpen(true)
    }

    const handleValidate = async () => {
        if (isReg && !selectedDate) {
            setErrorValidation("Vous devez choisir une date en cas de régularisation !")
            return
        }
        setIsModalConfirmOpen(false)
        setIsModalConfirmMultipleOpen(false)
        try {
            setLoadingValidation(true)
            if (isSingle) {
                const payload = {
                    statutId: selectedStatut,
                    userId,
                }
                const sn = terminalSn
                await decomData.reparerTpe(sn, payload)
                Swal.fire({
                    title: "Succès",
                    text: "Opération effectuée avec succès !",
                    icon: "success"
                })
            } else if (isMultiple) {
                const serials = listeSn.map((item) => {
                    return item.sn
                })
                console.log(listeSn)
                const payload = {
                    statutId: selectedStatut,
                    userId,
                    listeSn: JSON.stringify(listeSn),
                    commentaire,
                    isReg,
                }
                await decomData.reparerListeTpe(payload)
                Swal.fire({
                    title: "Succès",
                    text: "Opération effectuée avec succès !",
                    icon: "success"
                })
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
            console.log("Erreur : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite !",
                icon: "warning"
            })
            navigate('/parc-tpe')
        } finally {
            setLoadingValidation(false)
            setTerminalSn('')
            setSelectedExcelFile(null)
            setListeSn([])
            setStatutTpeId(null)
            setStatutTpe('')
        }
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
                                    <ComponentCard className="md:w-1/2 w-full" title="Réparation de TPE">
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
                                                {/* <div>
                                                    <Label>Nouveau Statut <span className="text-red-700">*</span></Label>
                                                    <Select
                                                        options={optionsStatut}
                                                        placeholder="Choisir une option"
                                                        onChange={handleSelectStatut}
                                                        className="dark:bg-dark-900"
                                                    />
                                                </div> */}
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
                                    <span className="font-bold">réparé</span>
                                </div>
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
                                        </tr>
                                        {listeSn.map((item) => {
                                            return (
                                                <>
                                                    <tr className="border border-black">
                                                        <th className="text-sm font-normal">{item.sn}</th>
                                                        <th className="text-sm font-normal">{item.statut}</th>
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
                                <span>{listeSn.length} TPEs à réparer</span>
                            </div>
                            <div className="text-center text-sm ">
                                <div className="">
                                    <span className="font-medium">Nouveau Statut : </span>
                                    <span className="font-bold text-blue-600">réparé</span>
                                </div>
                            </div>
                            <div>
                                <div>
                                    <Label>Commentaire</Label>
                                    <TextArea
                                        type="text"
                                        placeholder="Ajoutez un commentaire"
                                        value={commentaire}
                                        onChange={(value) => setCommentaire(value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 my-2">
                                    <Checkbox
                                        checked={isReg}
                                        onChange={(e) => {
                                            if (isReg) {
                                                setIsReg(false)
                                            } else {
                                                setIsReg(true)
                                            }
                                        }}
                                        label="Régularisation"
                                    />
                                </div>
                            </div>
                            {isReg ? (
                                <>
                                    <div>
                                        <Label>Date Opération <span className="text-red-700">*</span></Label>
                                        <Calendar
                                            value={selectedDate}
                                            locale="fr"
                                            onChange={(e) => setSelectedDate(e.value)}
                                            dateFormat="dd/mm/yy"
                                            placeholder="dd/mm/yyyy"
                                            minDate={new Date(selectedDate)}
                                            maxDate={new Date()}
                                            className="w-full"
                                        />
                                    </div>
                                </>
                            ) : (
                                <></>
                            )}
                        </div>
                        <div>
                            <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">
                                {errorValidation}
                            </span>
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