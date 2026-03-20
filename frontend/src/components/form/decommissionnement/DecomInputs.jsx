import { useEffect, useState, useCallback } from "react"
import { Merchants } from "../../../backend/livraisons/Merchants"
import ComponentCard from "../../common/ComponentCard"
import Label from "../Label.tsx";
import Input from "../input/InputField.tsx";
import Checkbox from "../input/Checkbox.tsx";
import Select from "../Select.tsx";
import TextArea from "../input/TextArea.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../ui/table";
import { Modal } from "../../ui/modal";
import { useDropzone } from "react-dropzone"
import Swal from "sweetalert2";
import { ProgressSpinner } from "primereact/progressspinner";
import JSZip from "jszip";
import { Decom } from "../../../backend/decom/decom.js";

export default function DecomInputs() {

    const merchantsData = new Merchants()
    const userId = localStorage.getItem('id');
    const decomData = new Decom()

    const LISTE_KEY = "listeDecom";
    const saveListe = (liste) => {
        sessionStorage.setItem(LISTE_KEY, JSON.stringify(liste));
    };
    const loadListe = () => {
        const stored = sessionStorage.getItem(LISTE_KEY);
        return stored ? JSON.parse(stored) : null;
    };
    const savedListe = loadListe()

    const [errorForm, setErrorForm] = useState('')
    const [errorAjout, setErrorAjout] = useState('')
    const [loadingData, setLoadingData] = useState(false)

    const [merchantList, setMerchantList] = useState([])
    const [terminalSN, setTerminalSN] = useState('')
    const [terminalName, setTerminalName] = useState('');
    const [terminalBanque, setTerminalBanque] = useState('');
    const [terminalCaisse, setTerminalCaisse] = useState('');
    const [idGim, setIdGim] = useState('')
    const [idEcobank, setIdEcobank] = useState('')
    const [etatTpe, setEtatTpe] = useState('')
    const [hasCarton, setHasCarton] = useState(false)
    const [hasChargeur, setHasChargeur] = useState(false)
    const [isRI, setIsRI] = useState(false)
    const [nomCommercial, setNomCommercial] = useState('')
    const [commentaire, setCommentaire] = useState('')

    const [isModalConfirmOpen, setIsModalConfirmOpen] = useState(false)

    const [isRAS, setIsRAS] = useState(false)
    const [isProblem, setIsProblem] = useState(false)

    const [listeDecom, setListeDecom] = useState(savedListe?.listeDecom || [])
    const [quantiteTotale, setQuantiteTotale] = useState(savedListe?.quantiteTotale || 0)

    const [message, setMessage] = useState('')
    const [selectedFiles, setSelectedFiles] = useState([])

    const [loadingValidation, setLoadingValidation] = useState(false)

    const [isModalValidateOpen, setIsModalValidateOpen] = useState(false)
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const merchants = await merchantsData.findMerchant()
                console.log(merchants)
                setMerchantList(merchants)

            } catch (error) {
                console.error('Error fetching data ', error)
                setErrorForm('Erreur lors de la génération du formulaire')
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    useEffect(() => {
        console.log(savedListe)
        saveListe({
            listeDecom,
            quantiteTotale,
        })
    }, [listeDecom, quantiteTotale])

    const handleChangeSn = (value) => {
        setTerminalName('')
        setTerminalBanque('')
        setTerminalCaisse('')
        setTerminalSN(value)
        const pointMarchand = merchantList.find((terminal) => {
            return terminal.SERIAL_NUMBER == value
        })
        if (pointMarchand) {
            setTerminalName(pointMarchand.POINT_MARCHAND)
            setTerminalBanque(pointMarchand.BANQUE)
            setTerminalCaisse(pointMarchand.TPE)
            setIdGim(pointMarchand.Id_Terminal_GIM)
            setIdEcobank(pointMarchand.Id_Terminal_CB)
        }
    }

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
                        text: "Erreur d'exctraction de fichiers !",
                        icon: "warining"
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

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        multiple: true,
    });

    const checkValidate = () => {
        if (!terminalSN) {
            setErrorAjout("S/N invalide !")
            return false
        }
        const isDuplicate = listeDecom.some(item => {
            return item.terminalSN == terminalSN
        });
        if (isDuplicate) {
            setErrorAjout("Vous avez déjà ajouté ce S/N !");
            return false;
        }
        if (!terminalName) {
            setErrorAjout("Nom du marchand invalide !")
            return false
        }
        if (!terminalCaisse) {
            setErrorAjout("Caisse du terminal invalide !")
            return false
        }
        if (!isRAS && !isProblem) {
            setErrorAjout("Vous devez confirmer l'état du TPE !")
            return false
        }

        return true
    }

    const handleConfirm = () => {
        if (!checkValidate()) {
            return
        }
        setErrorAjout('')
        setIsModalConfirmOpen(true)
    }

    const handleAjout = () => {
        setIsModalConfirmOpen(false)
        let etat = ''
        if (isRAS) {
            etat = 'R.A.S'
            if (!hasCarton) {
                etat = 'Sans Carton / R.A.S'
            }
        } else {
            etat = (hasCarton ? 'Avec Carton' : 'Sans Carton') + ' / ' + (hasChargeur ? 'Avec Chargeur' : 'Sans Chargeur') + ' / ' + `${etatTpe}`
        }
        const newElement = {
            pointMarchand: terminalName,
            terminalSN,
            idGim,
            idEcobank,
            etat,
            RI: isRAS ? '' : isRI ? 'OK' : 'NOK',
            nomCommercial,
            commentaire,
        }
        setListeDecom((prev) => [...prev, newElement]);
        setQuantiteTotale((prev) => prev + 1);
        saveListe({ listeDecom })
        setTerminalSN('')
        setTerminalName('')
        setTerminalCaisse('')
        setTerminalBanque('')
        setIdGim('')
        setIdEcobank('')
        setIsRAS(false)
        setIsProblem(false)
        setCommentaire('')
    }

    const handleDelete = (indexToRemove) => {
        setListeDecom((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
        setQuantiteTotale((prev) => prev - 1);
    };

    const handleConfirmValidate = () => {
        if (listeDecom.length == 0) {
            Swal.fire({
                title: "Attention",
                text: "Aucun S/N enregistré !",
                icon: "warning"
            })
            return
        }

        setIsModalValidateOpen(true)
    }
    const handleValidate = async () => {
        setIsModalValidateOpen(false)
        setLoadingValidation(true)
        try {
            const fd = new FormData()
            selectedFiles.forEach((file) => {
                fd.append("files", file);
            });
            fd.append("commentaire", commentaire)
            fd.append("listeDecom", JSON.stringify(listeDecom))
            fd.append("quantite", quantiteTotale)
            fd.append("userId", Number(userId))

            console.log("Sending data : ")

            await decomData.faireDecom(fd)
            Swal.fire({
                title: "Succès",
                text: "Décommissionement éffectuée avec succès !",
                icon: "success"
            })
            // navigate('/toutes-les-demandes-qr')
        } catch (error) {
            console.log("Erreur de demande : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite !",
                icon: "warning"
            })
            // navigate('/toutes-les-demandes-qr')
        } finally {
            setLoadingValidation(false)
            setListeDecom([])
            setQuantiteTotale(0)
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
                                <>
                                    <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                        {errorForm}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <ComponentCard className="md:w-1/2 w-full" title="Décommissionnement">
                                        <div className="space-y-3">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>Commentaire Général</Label>
                                                    <TextArea
                                                        type="text"
                                                        placeholder="Ajoutez un commentaire"
                                                        value={message}
                                                        onChange={(value) => setMessage(value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Importer des fichiers <span className="text-red-700">*</span></Label>
                                                    <div
                                                        {...getRootProps()}
                                                        className="border-2 border-dashed p-2 rounded-lg text-center cursor-pointer"
                                                    >
                                                        <input {...getInputProps()} />
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
                                                <div className="text-center">
                                                    <span className="text-sm font-semibold">Informations Terminal</span>
                                                </div>
                                                <div>
                                                    <Label htmlFor="input">Numéro de série <span className="text-red-700">*</span></Label>
                                                    <Input type="text" id="input" value={terminalSN} onChange={(e) => {
                                                        const value = e.target.value
                                                        // Allow only digits
                                                        if (/^\d*$/.test(value)) {
                                                            // Only allow up to 10 characters
                                                            if (value.length <= 10) {
                                                                // setTerminalSN(value);
                                                                handleChangeSn(value)
                                                            }
                                                        }
                                                    }} />
                                                </div>
                                                <div>
                                                    <Label>Point Marchand <span className="text-red-700">*</span></Label>
                                                    <Input type="text" id="input"
                                                        className=""
                                                        value={terminalName}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            setTerminalName(value)
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Caisse <span className="text-red-700">*</span></Label>
                                                    <Input type="text" id="input"
                                                        className=""
                                                        value={terminalCaisse}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            setTerminalCaisse(value)
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Banque</Label>
                                                    <Input type="text" id="input"
                                                        className=""
                                                        value={terminalBanque}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            setTerminalBanque(value)
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>TID GIM</Label>
                                                    <Input type="text" id="input"
                                                        className=""
                                                        value={idGim}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            setIdGim(value)
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>TID ECOBANK</Label>
                                                    <Input type="text" id="input"
                                                        className=""
                                                        value={idEcobank}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            setIdEcobank(value)
                                                        }}
                                                    />
                                                </div>
                                                <div className="pb-3 text-center">
                                                    <span className="text-sm font-semibold">Etat du terminal</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={isRAS}
                                                        onChange={(e) => {
                                                            if (isRAS) {
                                                                setIsRAS(false)
                                                            } else {
                                                                setIsRAS(true)
                                                                setIsProblem(false)
                                                            }
                                                        }}
                                                        label="R.A.S" />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={isProblem}
                                                        onChange={(e) => {
                                                            if (isProblem) {
                                                                setIsProblem(false)
                                                            } else {
                                                                setIsProblem(true)
                                                                setIsRAS(false)
                                                            }
                                                        }}
                                                        label="Problème signalé" />
                                                </div>
                                                {isProblem ? (
                                                    <>
                                                        <div className="space-y-4">
                                                            <div className="flex flex-col">
                                                                <div>
                                                                    <span className="text-sm">Récupéré avec</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 my-2">
                                                                    <Checkbox
                                                                        checked={hasCarton}
                                                                        onChange={(e) => {
                                                                            if (hasCarton) {
                                                                                setHasCarton(false)
                                                                            } else {
                                                                                setHasCarton(true)
                                                                            }
                                                                        }}
                                                                        label="Carton" />
                                                                </div>
                                                                <div className="flex items-center gap-3 my-2">
                                                                    <Checkbox
                                                                        checked={hasChargeur}
                                                                        onChange={(e) => {
                                                                            if (hasChargeur) {
                                                                                setHasChargeur(false)
                                                                            } else {
                                                                                setHasChargeur(true)
                                                                            }
                                                                        }}
                                                                        label="Chargeur" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label>Autre</Label>
                                                                <TextArea
                                                                    value={etatTpe}
                                                                    onChange={(value) => setEtatTpe(value)}
                                                                    rows={2}
                                                                    placeholder="Précisez l'état dans lequel le TPE est récupéré"
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3 my-2">
                                                                    <Checkbox
                                                                        checked={isRI}
                                                                        onChange={(e) => {
                                                                            if (isRI) {
                                                                                setIsRI(false)
                                                                            } else {
                                                                                setIsRI(true)
                                                                            }
                                                                        }}
                                                                        label="Rapport d'Incident" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {isRAS ? (
                                                            <>
                                                                <div>
                                                                    <div className="flex flex-col">
                                                                        <div>
                                                                            <span className="text-sm">Récupéré avec</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 my-2">
                                                                            <Checkbox
                                                                                checked={hasCarton}
                                                                                onChange={(e) => {
                                                                                    if (hasCarton) {
                                                                                        setHasCarton(false)
                                                                                    } else {
                                                                                        setHasCarton(true)
                                                                                    }
                                                                                }}
                                                                                label="Carton" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <></>
                                                        )}
                                                    </>
                                                )}
                                                <div>
                                                    <Label>Commercial</Label>
                                                    <Input type="text" id="input"
                                                        className=""
                                                        value={nomCommercial}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            setNomCommercial(value)
                                                        }}
                                                    />
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
                                                <div>
                                                    <div>
                                                        <div className="w-full flex justify-center items-center">
                                                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                onClick={handleConfirm}
                                                            >
                                                                Ajouter
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">
                                                            {errorAjout}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right text-gray-500">
                                                <span className="text-xs font-medium">
                                                    Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                                </span>
                                            </div>
                                        </div>
                                    </ComponentCard>
                                </>
                            )}
                        </>
                    )}
                </div>
                <div>
                    <div>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className='p-4 pb-0 text-xs text-gray-600 flex flex-col'>
                                <span>Total : {quantiteTotale}</span>
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
                                                Supprimer
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
                                                <TableCell
                                                    isHeader
                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                    <button
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => handleDelete(index)}
                                                    >
                                                        <i className="pi pi-trash" style={{ color: 'black' }}></i>
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        {listeDecom.length > 0 ? (
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
                </div>
            </div>

            <Modal isOpen={isModalConfirmOpen} onClose={() => setIsModalConfirmOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Vérification</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-1">
                            <div>
                                <span>Point Marchand: </span>
                                <span className="font-bold text-sm">{terminalName}</span>
                            </div>
                            <div>
                                <span>S/N: </span>
                                <span className="font-bold text-sm">{terminalSN}</span>
                            </div>
                            {terminalBanque ? (
                                <>
                                    <div>
                                        <span>Banque: </span>
                                        <span className="font-bold text-sm">{terminalBanque}</span>
                                    </div>
                                </>
                            ) : (
                                <></>
                            )}
                            {isRAS ? (
                                <>
                                    <div>
                                        <div>
                                            <span>Etat: </span>
                                            <span className="font-bold text-sm">R.A.S</span>
                                        </div>
                                        {hasCarton ? (
                                            <>
                                                <div>
                                                    <span>Avec Carton</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <span>Sans Carton</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex flex-col">
                                            <span>Etat: </span>
                                            <span className="font-bold text-sm">{etatTpe}</span>
                                        </div>
                                        {hasCarton ? (
                                            <>
                                                <span className="font-bold text-sm">Avec Carton</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-bold text-sm">Sans Carton</span>
                                            </>
                                        )}
                                        {hasChargeur ? (
                                            <>
                                                <span className="font-bold text-sm">Avec Chargeur</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-bold text-sm">Sans Chargeur</span>
                                            </>
                                        )}
                                        {isRI ? (
                                            <>
                                                <span className="font-bold text-sm">RI OK</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-bold text-sm">RI NOK</span>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleAjout}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalValidateOpen} onClose={() => setIsModalValidateOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Validation</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-1">
                            <div>
                                <span>Total decom : </span>
                                <span className="font-bold text-sm">{quantiteTotale}</span>
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