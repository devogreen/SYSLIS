import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router";
import { Decom } from "../../../backend/decom/Decom.js";
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
import JSZip from "jszip";
import { useDropzone } from "react-dropzone";
import { Calendar } from "primereact/calendar";
import { Users } from "../../../backend/users/Users.js";

export default function ValidationTransmissionDecomInputs() {
    const decomData = new Decom();
    const userData = new Users();
    // Rôle autorisé à valider une transmission à la maintenance (id 25)
    const ROLE_VERIFICATION = 'verification_decom'
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()
    const { id: idDecom } = useParams()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)

    const [errorForm, setErrorForm] = useState('')
    const [errorValidation, setErrorValidation] = useState('')

    const [listeDecom, setListeDecom] = useState([])
    const [quantiteTotale, setQuantiteTotale] = useState(0)

    const [isAllChecked, setIsAllChecked] = useState(true)

    const [isModalValidateOpen, setIsModalValidateOpen] = useState(false)

    const [commentaire, setCommentaire] = useState('')
    const [selectedFiles, setSelectedFiles] = useState([])

    const [isReg, setIsReg] = useState(false)
    const [dateRegul, setDateRegul] = useState(null)
    const [selectedDateValidation, setSelectedDateValidation] = useState(null)

    const selectedTpes = listeDecom.filter(item => item.is_selected);
    const totalTpe = selectedTpes.length

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

                // Contrôle du rôle : seuls les utilisateurs verification_decom peuvent valider
                const rolesData = await userData.getUserRoles(userId)
                const nomRoles = rolesData.roles.map((item) => item.nom_role)
                if (!nomRoles.includes(ROLE_VERIFICATION)) {
                    Swal.fire({
                        title: "Accès refusé",
                        text: "Vous n'êtes pas autorisé à valider cette transmission.",
                        icon: "warning",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "OK"
                    });
                    navigate(`/decom-details/${idDecom}`)
                    return;
                }

                if (decom.statut != 'transmis_decom') {
                    Swal.fire({
                        title: "Attention",
                        text: "Ce décom n'est pas en attente de validation par la maintenance.",
                        icon: "warning",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "OK"
                    });
                    navigate(`/decom-details/${idDecom}`)
                    return;
                }

                // Liste transmise à la maintenance (à défaut : la liste validée)
                const transmission = decom.reception_decom.filter((item) => item.type === 'transmission_maintenance').at(-1)
                const validation = decom.reception_decom.filter((item) => item.type === 'validation').at(-1)
                const source = transmission || validation

                if (decomForm.is_reg) {
                    setIsReg(true)
                    // La date de validation ne peut pas précéder la transmission
                    setDateRegul(source?.forms?.last_modified_at || decomForm.last_modified_at)
                }

                const liste = source?.liste_decom ? JSON.parse(source.liste_decom) : []
                const listeValidation = liste.map((item) => ({
                    ...item,
                    is_selected: true,
                }))
                setListeDecom(listeValidation)
                setQuantiteTotale(liste.length)
            } catch (error) {
                console.error('Error fetching data ', error)
                setErrorForm('Erreur lors de la génération du formulaire')
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const onDrop = useCallback(async (acceptedFiles) => {
        const updatedFiles = [...selectedFiles];

        for (const file of acceptedFiles) {

            // Handle ZIP files
            if (file.type === "application/zip" || file.name.endsWith(".zip")) {
                try {
                    const zip = await JSZip.loadAsync(file);

                    const extractedFiles = await Promise.all(
                        Object.keys(zip.files).map(async (filename) => {
                            const zipEntry = zip.files[filename];

                            if (!zipEntry.dir) {
                                const blob = await zipEntry.async("blob");

                                return new File([blob], filename, {
                                    type: blob.type,
                                });
                            }
                            return null;
                        })
                    );

                    extractedFiles.forEach((extractedFile) => {
                        if (
                            extractedFile &&
                            !updatedFiles.find(
                                (f) =>
                                    f.name === extractedFile.name &&
                                    f.size === extractedFile.size
                            )
                        ) {
                            updatedFiles.push(extractedFile);
                        }
                    });

                } catch (error) {
                    console.error("ZIP extraction error:", error);
                    Swal.fire({
                        title: "Attention",
                        text: "Erreur d'extraction de fichiers !",
                        icon: "warning"
                    })
                }
            } else {
                // Normal file
                if (
                    !updatedFiles.find(
                        (f) => f.name === file.name && f.size === file.size
                    )
                ) {
                    updatedFiles.push(file);
                }
            }
        }

        setSelectedFiles(updatedFiles);
    }, [selectedFiles]);

    const { getRootProps: getFilesRootProps,
        getInputProps: getFilesInputProps,
    } = useDropzone({
        onDrop,
        multiple: true,
    });

    const handleDeleteFile = (indexToRemove) => {
        setSelectedFiles((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
    }

    const handleSelectAll = () => {
        const newValue = !isAllChecked;

        const updatedList = listeDecom.map(item => ({
            ...item,
            is_selected: newValue
        }));

        setListeDecom(updatedList);
        setIsAllChecked(newValue);
    }

    const handleSelectTpe = (indexToToggle) => {
        const updatedList = listeDecom.map((item, i) =>
            i === indexToToggle
                ? { ...item, is_selected: !item.is_selected }
                : item
        );

        setListeDecom(updatedList);

        // Mise à jour de la case "tout sélectionner"
        const allChecked = updatedList.every(item => item.is_selected);
        setIsAllChecked(allChecked);
    }

    const handleConfirmValidate = () => {
        setErrorValidation('')
        setIsModalValidateOpen(true)
    }

    const handleValidate = async () => {
        if (isReg && !selectedDateValidation) {
            setErrorValidation("Vous devez choisir une date en cas de régularisation !")
            return
        }
        if (!selectedTpes.length > 0) {
            setErrorValidation("Vous devez sélectionner au moins un TPE !")
            return
        }
        setErrorValidation('')
        setIsModalValidateOpen(false)

        // On retire le flag d'interface avant l'envoi
        const listeValidee = selectedTpes.map(({ is_selected, ...item }) => item)
        const listeNonValidee = listeDecom
            .filter(item => !item.is_selected)
            .map(({ is_selected, ...item }) => item)

        try {
            setLoadingValidation(true)
            const fd = new FormData()
            selectedFiles.forEach((file) => {
                fd.append("files", file);
            });
            fd.append("userId", Number(userId))
            fd.append("commentaire", commentaire)
            fd.append("listeValidee", JSON.stringify(listeValidee))
            fd.append("listeNonValidee", JSON.stringify(listeNonValidee))
            fd.append("quantite", totalTpe)
            if (isReg && selectedDateValidation) {
                fd.append("date_validation", selectedDateValidation.toISOString())
            }

            await decomData.validationTransmissionDecom(idDecom, fd)
            Swal.fire({
                title: "Succès",
                text: "Transmission validée par la maintenance avec succès !",
                icon: "success"
            })
            navigate(`/decom-details/${idDecom}`)
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

    return (
        <>
            <div className="space-y-3">
                {loadingData ? (
                    <>
                        <div className="flex justify-center">
                            <span>Loading...</span>
                        </div>
                    </>
                ) : errorForm ? (
                    <>
                        <div className="flex justify-center">
                            <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                {errorForm}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                                <div className='p-4 pb-0 text-xs text-gray-600 flex flex-col'>
                                    <span>Reçu(s) par la maintenance : {totalTpe} / {quantiteTotale}</span>
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
                                                <TableCell
                                                    isHeader
                                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                    <Checkbox
                                                        checked={isAllChecked}
                                                        onChange={handleSelectAll}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        {/* Table Body */}
                                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                            {listeDecom.map((item, index) => (
                                                <TableRow key={item.terminalSN || index} className={item.is_selected ? '' : 'bg-gray-50 opacity-60'}>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-xs dark:text-gray-400">
                                                        {item.pointMarchand}
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        {item.terminalSN}
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        {item.idGim}
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        {item.idEcobank}
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        <span style={{ fontSize: '9px' }}>
                                                            {item.etat}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        {item.RI}
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        {item.nomCommercial}
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        <span style={{ fontSize: '9px' }}>
                                                            {item.commentaire}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell
                                                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                        <Checkbox
                                                            checked={item.is_selected}
                                                            onChange={() => handleSelectTpe(index)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            {selectedTpes.length > 0 ? (
                                <>
                                    <div className="mt-3">
                                        <div className="text-center">
                                            {loadingValidation ? (
                                                <>
                                                    <div>
                                                        <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-full flex justify-center items-center">
                                                        <button className="w-1/5 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                            onClick={handleConfirmValidate}
                                                        >
                                                            Valider
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <></>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Modal isOpen={isModalValidateOpen} onClose={() => setIsModalValidateOpen(false)} className="p-4 max-w-xl">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-orange-100 text-orange-500 font-medium">Validation maintenance</span>
                    </div>
                    <div className="">
                        <div className="space-y-3">
                            <div className="space-y-3">
                                <div className="text-center flex flex-col">
                                    <span className="text-sm">
                                        Valider la réception par la maintenance du décom #{idDecom}
                                    </span>
                                    <div>
                                        <span className="font-bold"> {selectedTpes.length} TPE(s) sur {listeDecom.length} confirmé(s) pour la validation</span>
                                    </div>
                                    {selectedTpes.length < listeDecom.length ? (
                                        <>
                                            <div>
                                                <span className="text-xs text-red-600">
                                                    {listeDecom.length - selectedTpes.length} TPE(s) non reçu(s) par la maintenance
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label>Commentaire</Label>
                                <TextArea
                                    placeholder="Ajoutez un commentaire"
                                    value={commentaire}
                                    onChange={(value) => setCommentaire(value)}
                                />
                            </div>
                            <div>
                                <Label>Importer des fichiers</Label>
                                <div
                                    {...getFilesRootProps()}
                                    className="border-2 border-dashed p-2 rounded-lg text-center cursor-pointer"
                                >
                                    <input {...getFilesInputProps()} />
                                    <p className="text-xs">Faites glisser les fichiers ici, ou cliquer pour les sélectionner.</p>
                                </div>
                                <div className="max-h-38 overflow-y-auto">
                                    {selectedFiles.length > 0 ? (
                                        <div className="mt-3">
                                            {selectedFiles.map((selectedFile, index) => (
                                                <div key={index} className="bg-gray-100 px-1 flex justify-between items-center rounded-sm my-1">
                                                    <span>
                                                        <i className="pi pi-file-check"></i>
                                                    </span>
                                                    <span className=" text-center" style={{ fontSize: '9px' }}>
                                                        {selectedFile.name}
                                                    </span>
                                                    <button onClick={() => handleDeleteFile(index)}>
                                                        <span className="text-error-600"><i className="pi pi-times"></i></span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                            </div>
                            {isReg ? (
                                <>
                                    <div>
                                        <Label>Date validation <span className="text-red-700">*</span></Label>
                                        <Calendar
                                            value={selectedDateValidation}
                                            locale="fr"
                                            onChange={(e) => setSelectedDateValidation(e.value)}
                                            dateFormat="dd/mm/yy"
                                            placeholder="dd/mm/yyyy"
                                            minDate={new Date(dateRegul)}
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
