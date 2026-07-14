import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router";
import { Decom } from "../../../backend/decom/decom.js"
import { Users } from "../../../backend/users/Users.js";
import { Stock } from "../../../backend/stock/Stock.js";
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
import ComponentCard from "../../common/ComponentCard.tsx";
import Select from "../Select.tsx";
import { Dropdown } from "primereact/dropdown";
import { Merchants } from "../../../backend/livraisons/Merchants.js";
import { GestionTpe } from "../../../backend/gestionTpe/GestionTpe.js";
import { useDropzone } from "react-dropzone";
import { Rebut } from "../../../backend/rebut/Rebut.js";
import { Calendar } from "primereact/calendar";

export default function RebutInputs() {
    const merchantsData = new Merchants()
    const decomData = new Decom()
    const userData = new Users()
    const stockData = new Stock()
    const gestionTpeData = new GestionTpe()
    const rebutData = new Rebut();
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const LISTE_KEY = "listeRebut";
    const saveListe = (liste) => {
        sessionStorage.setItem(LISTE_KEY, JSON.stringify(liste));
    };
    const loadListe = () => {
        const stored = sessionStorage.getItem(LISTE_KEY);
        return stored ? JSON.parse(stored) : null;
    };
    const savedListe = loadListe()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)

    const [errorForm, setErrorForm] = useState('')
    const [errorAjout, setErrorAjout] = useState('')

    const [listeRebut, setListeRebut] = useState(savedListe?.listeRebut || [])

    const [selectedTpe, setSelectedTpe] = useState(null)

    const [quantiteTotale, setQuantiteTotale] = useState(savedListe?.quantiteTotale || 0)

    const [isRAS, setIsRAS] = useState(false)
    const [isProblem, setIsProblem] = useState(false)
    const [isRebut, setIsRebut] = useState(false)
    const [isParam, setIsParam] = useState(false)

    const [isRI, setIsRI] = useState(false)
    const [etatTpe, setEtatTpe] = useState('')

    const [pieces, setPieces] = useState([])
    const [selectedPiecesDef, setSelectedPiecesDef] = useState([])
    const [selectedPiecesRec, setSelectedPiecesRec] = useState([])

    const [isModalConfirmModifOpen, setIsModalConfirmModifOpen] = useState(false)
    const [isModalValidateOpen, setIsModalValidateOpen] = useState(false)

    const [listeVerified, setListeVerified] = useState([])
    const [listeChecked, setListeChecked] = useState([])

    const [indexPiece, setIndexPiece] = useState(null)

    const [checkMail, setCheckMail] = useState(false)
    const [commentaire, setCommentaire] = useState('')

    const [selectedStatut, setSelectedStatut] = useState('')

    const [expandedPieceDef, setExpandedPieceDef] = useState(false)
    const [expandedPieceRec, setExpandedPieceRec] = useState(false)

    const [merchantList, setMerchantList] = useState([])
    const [terminalSN, setTerminalSN] = useState('')
    const [terminalName, setTerminalName] = useState('');
    const [statutTpe, setStatutTpe] = useState('')
    const [loadingFunction, setLoadingFunction] = useState(false)

    const [isModalConfirmOpen, setIsModalConfirmOpen] = useState(false)

    const [importExcel, setImportExcel] = useState(false)
    const [isManual, setIsManual] = useState(false)

    const [loadingDownloadTemplate, setLoadingDownloadTemplate] = useState(false)

    const [selectedFiles, setSelectedFiles] = useState([])

    const [selectedExcelFile, setSelectedExcelFile] = useState(null)

    const [listeRebutImport, setListeRebutImport] = useState([])
    const [isModalImportOpen, setIsModalImportOpen] = useState(false)
    const [loadingExtract, setLoadindExtract] = useState(false)

    const [isReg, setIsReg] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)

    const [errorValidation, setErrorValidation] = useState('')

    const [listeModel, setListeModel] = useState([])
    const [optionsModel, setOptionsModel] = useState([])
    const [selectedModel, setSelectedModel] = useState([])
    const [nomModel, setNomModel] = useState('')

    const allPieceDef =
        pieces.length > 0 &&
        selectedPiecesDef?.length === pieces.length;

    const allPieceFunc =
        pieces.length > 0 &&
        selectedPiecesRec?.length === pieces.length;

    const targetRef = useRef(null);

    const optionStatuts = [
        { value: 'Paramétrage', label: 'Paramétrage' },
        { value: 'Rebut', label: 'Rebut' },
    ]

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const merchants = await merchantsData.findMerchant()
                setMerchantList(merchants)

                const allItems = await stockData.getAllItems()
                const items = allItems.filter((item) => {
                    return item.is_deleted == false && item.type != 'TERMINAL'
                })
                setPieces(items)

                const modelData = await stockData.getAllModels()
                setListeModel(modelData)
                const optionsModel = modelData.map((item) => ({
                    label: item.nom_model,
                    value: item.id_model,
                }))
                setOptionsModel(optionsModel)
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
        saveListe({
            listeRebut,
            quantiteTotale,
        })
    }, [listeRebut, quantiteTotale])

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

    const onDropExcel = useCallback(async (acceptedFiles) => {
        setSelectedExcelFile(acceptedFiles[0])
    }, [selectedExcelFile]);

    const { getRootProps: getFilesRootProps,
        getInputProps: getFilesInputProps,
    } = useDropzone({
        onDrop,
        multiple: true,
    });

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

    const handleDownloadTemplate = async () => {
        setLoadingDownloadTemplate(true)
        try {
            const response = await rebutData.downloadTemplateRebut(userId);

            const url = window.URL.createObjectURL(response.data);

            const a = document.createElement("a");
            a.href = url;

            let fileName = "template_rebut";

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Download error:", error);
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors du téléchargement !",
                icon: "warning"
            });
        } finally {
            setLoadingDownloadTemplate(false)
        }
    }

    const handleExtractExcelData = async () => {
        try {
            setErrorAjout('')
            setListeRebutImport([])

            if (!selectedExcelFile) {
                Swal.fire({
                    title: "Attention",
                    text: "Veuillez sélectionner un fichier Excel !",
                    icon: "warning"
                })
                return
            }
            setLoadindExtract(true)

            const fd = new FormData()
            fd.append('file', selectedExcelFile)
            fd.append('userId', userId)

            const response = await rebutData.extractRebut(fd)
            const terminals = response.data
            const listeRebutData = terminals.map((item, index) => {
                const model = listeModel.find((m) => m.nom_model == item.model)
                return ({
                    pointMarchand: item.pointMarchand,
                    terminalSN: item.terminalSN,
                    modele: model ? model.id_model : null,
                    etatTpe: item.etatTpe,
                    pieces_recuperees: item.listePieceRec,
                    pieces_defectueuses: item.listePieceDef,
                })
            })
            // console.log(listeRebutData)
            setListeRebutImport(listeRebutData)
            Swal.fire({
                title: "Succès",
                text: "Données Excel extraites avec succès !",
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
            setLoadindExtract(false)
        }
    }

    const handleCheckAjoutParExcel = () => {
        if (listeRebutImport.length == 0) {
            setErrorAjout('Vous devez extraire les données du fichier Excel !')
            return
        }
        for (let m of listeRebutImport) {
            let sn = ''
            const isDuplicate = listeRebut.some(item => {
                if (item.terminalSN == m.terminalSN) {
                    sn = item.terminalSN
                    return true
                }
                return false
            });
            if (isDuplicate) {
                setErrorAjout(`Vous avez déjà ajouté ce S/N ! (${sn})`);
                return;
            }
        }
        setErrorAjout('')
        setIsModalImportOpen(true)
    }

    const handleAjoutParExcel = () => {
        setIsModalImportOpen(false)

        setQuantiteTotale((prev) => prev + listeRebutImport.length);
        setListeRebut((prev) => [...prev, ...listeRebutImport]);
        setSelectedExcelFile(null)
        setListeRebutImport([])
    }

    const handleChangeSn = async (value) => {
        setTerminalName('')
        setStatutTpe('')
        setTerminalSN(value)
        try {
            const pointMarchand = merchantList.find((terminal) => {
                return terminal.SERIAL_NUMBER == value
            })
            if (pointMarchand) {
                setTerminalName(pointMarchand.POINT_MARCHAND)
            }
            if (value.length == 10) {
                setLoadingFunction(true)
                const tpeData = await gestionTpeData.getTpeInfos(value)
                if (tpeData) {
                    const statutTpe = tpeData.statut_tpe.statut
                    setStatutTpe(statutTpe)
                    const model = tpeData.model_id 
                    if (model) {
                        setSelectedModel(model)
                        setNomModel(tpeData.model_piece.nom_model)
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
        const model = listeModel.find((item) => {
            return item.id_model == value
        })
        if (model) {
            setNomModel(model.nom_model)
        }
    }

    const handleSelectTerminal = (value) => {
        if (indexPiece === value) {
            setSelectedTpe(null)
            setIndexPiece(null)
            targetRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
            return
        }
        setSelectedPiecesDef([])
        setSelectedPiecesRec([])
        const terminal = listeRebut.at(value)
        if (terminal) {
            setSelectedTpe(terminal)

            setSelectedModel(terminal.modele)

            const model = listeModel.find((m) => {
                return m.id_model == terminal.modele
            })
            if (model) {
                setNomModel(model.nom_model)
            }

            setEtatTpe(terminal.etatTpe)

            const piecesDef = terminal.pieces_defectueuses ? new Array(...terminal.pieces_defectueuses) : []
            setSelectedPiecesDef(piecesDef)

            const piecesFonc = terminal.pieces_defectueuses ? new Array(...terminal.pieces_recuperees) : []
            setSelectedPiecesRec(piecesFonc)
            setIndexPiece(value)
        }
        targetRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    const handleSelectAllPieceDef = () => {
        if (allPieceDef) {
            setSelectedPiecesDef([]);
        } else {
            setSelectedPiecesDef(
                pieces.map(piece => piece.id_piece)
            );
        }
    };

    const handleSelectPieceDef = (pieceId) => {
        setSelectedPiecesDef((prevSelected) =>
            prevSelected.includes(pieceId)
                ? prevSelected.filter((id) => id !== pieceId)
                : [...prevSelected, pieceId]
        );
    }

    const handleSelectAllPieceRec = () => {
        if (allPieceFunc) {
            setSelectedPiecesRec([]);
        } else {
            setSelectedPiecesRec(
                pieces.map(piece => piece.id_piece)
            );
        }
    };

    const handleSelectPieceRec = (pieceId) => {
        setSelectedPiecesRec((prevSelected) =>
            prevSelected.includes(pieceId)
                ? prevSelected.filter((id) => id !== pieceId)
                : [...prevSelected, pieceId]
        );
    }

    const handleConfirm = () => {
        if (terminalSN.length < 10) {
            setErrorAjout("S/N non valide !")
            return
        }
        if (statutTpe == 'rebut') {
            setErrorAjout("Ce terminal est déjà au rebut !")
            return
        }
        if (!selectedModel) {
            setErrorAjout("Vous devez préciser le modèle du terminal !")
            return
        }
        const isDuplicate = listeRebut.some(item => {
            return item.terminalSN == terminalSN
        });
        if (isDuplicate) {
            setErrorAjout("Vous avez déjà ajouté ce S/N !");
            return
        }
        if (selectedPiecesDef.length == 0) {
            setErrorAjout("Vous devez choisir au moins une pièce défectueuse !")
            return
        }
        setIsModalConfirmOpen(true)
        setErrorAjout('')
    }

    const handleConfirmModif = () => {
        if (!selectedModel) {
            setErrorAjout("Vous devez préciser le modèle du terminal !")
            return
        }
        if (selectedPiecesDef.length == 0) {
            setErrorAjout("Vous devez choisir au moins une pièce défectueuse !")
            return
        }
        setIsModalConfirmModifOpen(true)
        setErrorAjout('')
    }

    const handleAjout = () => {
        setIsModalConfirmOpen(false)
        const newElement = {
            pointMarchand: terminalName,
            terminalSN,
            modele: selectedModel,
            etatTpe,
            commentaire,
            pieces_recuperees: selectedPiecesRec,
            pieces_defectueuses: selectedPiecesDef,
        }

        setListeRebut((prev) => [...prev, newElement]);
        setQuantiteTotale((prev) => prev + 1);

        setTerminalSN('')
        setTerminalName('')
        setStatutTpe('')
        setIndexPiece(null)
    }

    const handleModify = () => {
        setIsModalConfirmModifOpen(false)
        const idTPE = listeRebut[indexPiece].id
        listeRebut[indexPiece].pieces_defectueuses = new Array(...selectedPiecesDef)
        listeRebut[indexPiece].pieces_recuperees = new Array(...selectedPiecesRec)
        listeRebut[indexPiece].etatTpe = etatTpe

        setSelectedTpe(null)
        setEtatTpe('')
        setSelectedPiecesDef([])
        setSelectedPiecesRec([])
        setIndexPiece(null)
    }

    const handleConfirmValidate = () => {
        setIsModalValidateOpen(true)
    }

    const handleValidate = async () => {
        if (isReg && !selectedDate) {
            setErrorValidation("Vous devez choisir une date en cas de régularisation !")
            return
        }
        setErrorValidation('')
        setIsModalValidateOpen(false)
        try {
            setLoadingValidation(true)
            const fd = new FormData()
            selectedFiles.forEach((file) => {
                fd.append("files", file);
            });
            fd.append("commentaire", commentaire)
            fd.append("listeRebut", JSON.stringify(listeRebut))
            fd.append("quantite", quantiteTotale)
            fd.append("userId", Number(userId))
            fd.append("dateRebut", selectedDate?.toISOString())
            fd.append("isReg", isReg)

            console.log("Sending data : ")

            await rebutData.demandeRebut(fd)
            Swal.fire({
                title: "Succès",
                text: "Demande de mise au rebut éffectuée avec succès !",
                icon: "success"
            })
            setListeRebut([])
            setQuantiteTotale(0)
            navigate('/toutes-les-demandes-rebut')
        } catch (error) {
            console.log("Erreur de demande : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la demande !",
                icon: "warning"
            })
            navigate('/toutes-les-demandes-rebut')
        } finally {
            setLoadingValidation(false)
        }
    }

    const handleDelete = (indexToRemove) => {
        setListeRebut((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
        setQuantiteTotale((prev) => prev - 1);
        setIndexPiece(null)
        setSelectedTpe(null)
    };

    return (
        <>
            <div className="space-y-3" ref={targetRef}>
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
                                    {selectedTpe ? (
                                        <>
                                            <ComponentCard className="md:w-1/2 w-full border-2 border-green-500" title="Vérification Technique">
                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="text-center">
                                                            <span className="text-sm font-semibold">Informations Terminal</span>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-400">Numéro de série <span className="text-gray-700">*</span></Label>
                                                            <Input
                                                                type="text"
                                                                id="input"
                                                                value={selectedTpe.terminalSN}
                                                                disabled
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-400">Modèle <span className="text-gray-700">*</span></Label>
                                                            <Input
                                                                type="text"
                                                                id="input"
                                                                value={nomModel}
                                                                disabled
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-400">Point Marchand <span className="text-gray-700">*</span></Label>
                                                            <Input
                                                                type="text"
                                                                id="input"
                                                                value={selectedTpe.pointMarchand}
                                                                disabled
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="text-center">
                                                            <span className="text-sm font-semibold">Vérification du terminal</span>
                                                        </div>
                                                        <div>
                                                            <div className="space-y-6">
                                                                <div className="space-y-3">
                                                                    <button className="flex space-x-2" onClick={() => setExpandedPieceDef(!expandedPieceDef)}>
                                                                        <span className="text-sm font-semibold">Pièces défectueuses ou absentes <span className="text-red-700">*</span></span>
                                                                        {expandedPieceDef ? (
                                                                            <span><i className="pi pi-angle-down"></i></span>
                                                                        ) : (
                                                                            <span><i className="pi pi-angle-up"></i></span>
                                                                        )}
                                                                    </button>
                                                                    {expandedPieceDef ? (
                                                                        <>
                                                                            <div>
                                                                                <div>
                                                                                    <div className="flex items-center gap-3 my-2">
                                                                                        <Checkbox
                                                                                            checked={allPieceDef}
                                                                                            onChange={handleSelectAllPieceDef}
                                                                                            label="TOUT"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid grid-cols-2">
                                                                                    {pieces.map((item) => {
                                                                                        return (
                                                                                            <>
                                                                                                <div>
                                                                                                    <div className="flex items-center gap-3 my-2">
                                                                                                        <Checkbox
                                                                                                            checked={selectedPiecesDef?.includes(item.id_piece)}
                                                                                                            onChange={() => handleSelectPieceDef(item.id_piece)}
                                                                                                            label={item.nom_piece} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <button className="flex space-x-2" onClick={() => setExpandedPieceRec(!expandedPieceRec)}>
                                                                        <span className="text-sm font-semibold">Pièces fonctionnelles</span>
                                                                        {expandedPieceRec ? (
                                                                            <span><i className="pi pi-angle-down"></i></span>
                                                                        ) : (
                                                                            <span><i className="pi pi-angle-up"></i></span>
                                                                        )}
                                                                    </button>
                                                                    {expandedPieceRec ? (
                                                                        <>
                                                                            <div>
                                                                                <div>
                                                                                    <div className="flex items-center gap-3 my-2">
                                                                                        <Checkbox
                                                                                            checked={allPieceFunc}
                                                                                            onChange={handleSelectAllPieceRec}
                                                                                            label="TOUT"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid grid-cols-2">
                                                                                    {pieces.map((item) => {
                                                                                        return (
                                                                                            <>
                                                                                                <div className="flex items-center gap-3 my-2">
                                                                                                    <Checkbox
                                                                                                        checked={selectedPiecesRec?.includes(item.id_piece)}
                                                                                                        onChange={() => handleSelectPieceRec(item.id_piece)}
                                                                                                        label={item.nom_piece} />
                                                                                                </div>
                                                                                            </>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <Label>Autre</Label>
                                                                <TextArea
                                                                    value={etatTpe}
                                                                    onChange={(value) => setEtatTpe(value)}
                                                                    rows={2}
                                                                    placeholder="Ajoutez des détails sur l'état du TPE"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div>
                                                            <div className="w-full flex justify-center items-center">
                                                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                    onClick={handleConfirmModif}
                                                                >
                                                                    Confirmer
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
                                            </ComponentCard>
                                        </>
                                    ) : (
                                        <>
                                            <ComponentCard className="md:w-1/2 w-full" title="Vérification Technique">
                                                <div className="space-y-6">
                                                    <div>
                                                        <div className="text-center">
                                                            <span className="text-sm font-semibold">Mode d'enregistrement</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-3 my-2">
                                                                    <Checkbox
                                                                        checked={importExcel}
                                                                        onChange={(e) => {
                                                                            if (importExcel) {
                                                                                setImportExcel(false)
                                                                            } else {
                                                                                setIsManual(false)
                                                                                setImportExcel(true)
                                                                            }
                                                                        }}
                                                                        label="Import Excel" />
                                                                </div>
                                                                <div className="flex items-center gap-3 my-2">
                                                                    <Checkbox
                                                                        checked={isManual}
                                                                        onChange={(e) => {
                                                                            if (isManual) {
                                                                                setIsManual(false)
                                                                            } else {
                                                                                setIsManual(true)
                                                                                setImportExcel(false)
                                                                            }
                                                                        }}
                                                                        label="Par S/N" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isManual ? (
                                                        <>
                                                            <div className="space-y-6">
                                                                <div className="space-y-4">
                                                                    <div className="text-center">
                                                                        <span className="text-sm font-semibold">Informations Terminal</span>
                                                                    </div>
                                                                    <div>
                                                                        <Label className="">Numéro de série <span className="text-red-700">*</span></Label>
                                                                        <span className="text-xs text-blue-500 text-center">{statutTpe}</span>
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
                                                                        <Label>Modèle <span className="text-red-700">*</span></Label>
                                                                        <Select
                                                                            options={optionsModel}
                                                                            defaultValue={selectedModel}
                                                                            placeholder={nomModel ? nomModel : 'Choisir une option'}
                                                                            className="dark:bg-dark-900"
                                                                            onChange={handleSelectModel}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="">Point Marchand</Label>
                                                                        <Input type="text" id="input"
                                                                            className=""
                                                                            value={terminalName}
                                                                            placeholder="N/A"
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                setTerminalName(value)
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    <div className="text-center">
                                                                        <span className="text-sm font-semibold">Vérification du terminal</span>
                                                                    </div>
                                                                    <div>
                                                                        <div className="space-y-6">
                                                                            <div className="space-y-3">
                                                                                <button className="flex space-x-2" onClick={() => setExpandedPieceDef(!expandedPieceDef)}>
                                                                                    <span className="text-sm font-semibold">Pièces défectueuses ou absentes <span className="text-red-700">*</span></span>
                                                                                    {expandedPieceDef ? (
                                                                                        <span><i className="pi pi-angle-down"></i></span>
                                                                                    ) : (
                                                                                        <span><i className="pi pi-angle-up"></i></span>
                                                                                    )}
                                                                                </button>
                                                                                {expandedPieceDef ? (
                                                                                    <>
                                                                                        <div>
                                                                                            <div>
                                                                                                <div className="flex items-center gap-3 my-2">
                                                                                                    <Checkbox
                                                                                                        checked={allPieceDef}
                                                                                                        onChange={handleSelectAllPieceDef}
                                                                                                        label="TOUT"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-2">
                                                                                                {pieces.map((item) => {
                                                                                                    return (
                                                                                                        <>
                                                                                                            <div>
                                                                                                                <div className="flex items-center gap-3 my-2">
                                                                                                                    <Checkbox
                                                                                                                        checked={selectedPiecesDef?.includes(item.id_piece)}
                                                                                                                        onChange={() => handleSelectPieceDef(item.id_piece)}
                                                                                                                        label={item.nom_piece} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </>
                                                                                                    )
                                                                                                })}
                                                                                            </div>
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <></>
                                                                                )}
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                <button className="flex space-x-2" onClick={() => setExpandedPieceRec(!expandedPieceRec)}>
                                                                                    <span className="text-sm font-semibold">Pièces fonctionnelles</span>
                                                                                    {expandedPieceRec ? (
                                                                                        <span><i className="pi pi-angle-down"></i></span>
                                                                                    ) : (
                                                                                        <span><i className="pi pi-angle-up"></i></span>
                                                                                    )}
                                                                                </button>
                                                                                {expandedPieceRec ? (
                                                                                    <>
                                                                                        <div>
                                                                                            <div>
                                                                                                <div className="flex items-center gap-3 my-2">
                                                                                                    <Checkbox
                                                                                                        checked={allPieceFunc}
                                                                                                        onChange={handleSelectAllPieceRec}
                                                                                                        label="TOUT"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-2">
                                                                                                {pieces.map((item) => {
                                                                                                    return (
                                                                                                        <>
                                                                                                            <div className="flex items-center gap-3 my-2">
                                                                                                                <Checkbox
                                                                                                                    checked={selectedPiecesRec?.includes(item.id_piece)}
                                                                                                                    onChange={() => handleSelectPieceRec(item.id_piece)}
                                                                                                                    label={item.nom_piece} />
                                                                                                            </div>
                                                                                                        </>
                                                                                                    )
                                                                                                })}
                                                                                            </div>
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <></>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <Label>Autre</Label>
                                                                            <TextArea
                                                                                value={etatTpe}
                                                                                onChange={(value) => setEtatTpe(value)}
                                                                                rows={2}
                                                                                placeholder="Ajoutez des détails sur l'état du TPE"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div>
                                                                        <div className="w-full flex justify-center items-center">
                                                                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                                onClick={handleConfirm}
                                                                            >
                                                                                Confirmer
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                    {importExcel ? (
                                                        <>
                                                            <div className="space-y-5">
                                                                <div>
                                                                    {loadingDownloadTemplate ? (
                                                                        <>
                                                                            <div>
                                                                                <ProgressSpinner style={{ width: '25px', height: '25px' }} strokeWidth="8" animationDuration=".5s" />
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button className="space-x-1.5 text-cyan-500" onClick={handleDownloadTemplate}>
                                                                                <span className="text-sm font-medium">
                                                                                    Télécharger template
                                                                                </span>
                                                                                <span className="">
                                                                                    <i className="pi pi-download"></i>
                                                                                </span>
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <Label>Fichier Excel</Label>
                                                                    <div className="flex space-x-1.5">
                                                                        <div
                                                                            {...getExcelRootProps()}
                                                                            className="border border-dashed p-2 rounded-lg text-center cursor-pointer border-green-500 w-full"
                                                                        >
                                                                            <input {...getExcelInputProps()} />
                                                                            <p className="text-xs font-light text-green-500">Faites glisser le fichier ici, ou cliquer pour le sélectionner.</p>
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
                                                                                            onClick={handleExtractExcelData}
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
                                                                    <div className="w-full flex justify-center items-center">
                                                                        <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                            onClick={handleCheckAjoutParExcel}
                                                                        >
                                                                            Ajouter
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
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
                                            </ComponentCard>
                                        </>
                                    )}

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
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Modifier
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
                                                        <TableCell
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            <button
                                                                className="text-black hover:text-blue-700"
                                                                onClick={() => handleSelectTerminal(index)}
                                                            >
                                                                <i className="pi pi-pen-to-square"></i>
                                                            </button>
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            <button
                                                                className="text-red-500 hover:text-red-700"
                                                                onClick={() => handleDelete(index)}
                                                            >
                                                                <i className="pi pi-delete-left" style={{ color: 'red' }}></i>
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                </>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        {listeRebut.length > 0 ? (
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
                        <div className="text-xs text-center space-y-3">
                            <div>
                                <span>Point Marchand: </span>
                                <span className="font-bold text-sm">{terminalName}</span>
                            </div>
                            <div>
                                <span>S/N: </span>
                                <span className="font-bold text-sm">{terminalSN}</span>
                            </div>
                            <div>
                                <span>Modèle: </span>
                                <span className="font-bold text-sm">{nomModel}</span>
                            </div>
                            <div className="flex flex-col space-y-4">
                                {etatTpe ? (
                                    <>
                                        <div className="flex flex-col">
                                            <span>Etat: </span>
                                            <span className="font-bold text-sm">{etatTpe}</span>
                                        </div>
                                    </>
                                ) : (
                                    <></>
                                )}
                                <div>
                                    <span className="font-semibold text-sm">Pièces défectueuses ou absentes</span>
                                </div>
                                <div className="grid grid-cols-3 text-xs">
                                    {selectedPiecesDef?.map((item) => {
                                        const piece = pieces.find((p) => {
                                            return p.id_piece == parseInt(item)
                                        })
                                        if (piece) {
                                            return (
                                                <>
                                                    <div>
                                                        <span className="text-red-700 font-medium">{piece.nom_piece}</span>
                                                    </div>
                                                </>
                                            )
                                        } else {
                                            return (
                                                <></>
                                            )
                                        }
                                    })}
                                </div>
                                <div>
                                    <span className="font-semibold text-sm">Pièces récupérables</span>
                                </div>
                                <div className="grid grid-cols-3 text-xs">
                                    {selectedPiecesRec?.map((item) => {
                                        const piece = pieces.find((p) => {
                                            return p.id_piece == parseInt(item)
                                        })
                                        if (piece) {
                                            return (
                                                <>
                                                    <div>
                                                        <span className="text-green-700 font-medium">{piece.nom_piece}</span>
                                                    </div>
                                                </>
                                            )
                                        } else {
                                            return (
                                                <></>
                                            )
                                        }
                                    })}
                                </div>
                            </div>
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
            <Modal isOpen={isModalConfirmModifOpen} onClose={() => setIsModalConfirmModifOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Modification</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-3">
                            <div>
                                <span>Point Marchand: </span>
                                <span className="font-bold text-sm">{selectedTpe?.pointMarchand}</span>
                            </div>
                            <div>
                                <span>S/N: </span>
                                <span className="font-bold text-sm">{selectedTpe?.terminalSN}</span>
                            </div>
                            <div className="flex flex-col space-y-4">
                                {etatTpe ? (
                                    <>
                                        <div className="flex flex-col">
                                            <span>Etat: </span>
                                            <span className="font-bold text-sm">{etatTpe}</span>
                                        </div>
                                    </>
                                ) : (
                                    <></>
                                )}
                                <div>
                                    <span className="font-semibold text-sm">Pièces défectueuses ou absentes</span>
                                </div>
                                <div className="grid grid-cols-3 text-xs">
                                    {selectedPiecesDef?.map((item) => {
                                        const piece = pieces.find((p) => {
                                            return p.id_piece == parseInt(item)
                                        })
                                        if (piece) {
                                            return (
                                                <>
                                                    <div>
                                                        <span className="text-red-700 font-medium">{piece.nom_piece}</span>
                                                    </div>
                                                </>
                                            )
                                        } else {
                                            return (
                                                <></>
                                            )
                                        }
                                    })}
                                </div>
                                <div>
                                    <span className="font-semibold text-sm">Pièces récupérables</span>
                                </div>
                                <div className="grid grid-cols-3 text-xs">
                                    {selectedPiecesRec?.map((item) => {
                                        const piece = pieces.find((p) => {
                                            return p.id_piece == parseInt(item)
                                        })
                                        if (piece) {
                                            return (
                                                <>
                                                    <div>
                                                        <span className="text-green-700 font-medium">{piece.nom_piece}</span>
                                                    </div>
                                                </>
                                            )
                                        } else {
                                            return (
                                                <></>
                                            )
                                        }
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleModify}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalImportOpen} onClose={() => setIsModalImportOpen(false)} className="p-4 max-w-xl">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Confirmation</span>
                    </div>
                    <div>
                        <div className="text-xs text-center space-y-5">
                            <div className="h-44 overflow-y-auto space-y-5">
                                {listeRebutImport.map((item) => {
                                    const model = listeModel.find((m) => {
                                        return m.id_model == item.modele
                                    })
                                    const nomModel = model ? model.nom_model : '%%%'
                                    return (
                                        <>
                                            <div>
                                                <div>
                                                    <span className="text-sm font-bold" style={{ fontSize: '15px' }}>{item.pointMarchand}</span>
                                                </div>
                                                <div>
                                                    <span>S/N: </span>
                                                    <span className="font-bold text-sm">{item.terminalSN}</span>
                                                </div>
                                                <div>
                                                    <span>Modèle: </span>
                                                    <span className="font-bold text-sm">{nomModel}</span>
                                                </div>
                                                <div>
                                                    <span>Etat: </span>
                                                    <span className="font-bold text-sm">{item.etatTpe}</span>
                                                </div>
                                                <div className="grid grid-cols-2">
                                                    <div>
                                                        <div>
                                                            <span className="font-semibold text-sm">Pièces défectueuses ou absentes</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 text-xs">
                                                            {item.pieces_defectueuses?.map((item) => {
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
                                                                } else {
                                                                    return (
                                                                        <></>
                                                                    )
                                                                }
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div>
                                                            <span className="font-semibold text-sm">Pièces récupérables</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 text-xs">
                                                            {item.pieces_recuperees?.map((item) => {
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
                                                                } else {
                                                                    return (
                                                                        <></>
                                                                    )
                                                                }
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleAjoutParExcel}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalValidateOpen} onClose={() => setIsModalValidateOpen(false)} className="p-4 max-w-xl">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Validation</span>
                    </div>
                    <div className="">
                        <div className="space-y-3">
                            <div className="space-y-3">
                                <div className="text-center flex flex-col">
                                    <span className="text-sm">
                                        Confirmer la demande de mise au rebut de
                                    </span>
                                    <div>
                                        <span className="font-bold"> {listeRebut.length} TPE(s)</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label>Commentaire</Label>
                                <TextArea
                                    type="text"
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
                                        <Label>Date <span className="text-red-700">*</span></Label>
                                        <Calendar
                                            value={selectedDate}
                                            locale="fr"
                                            onChange={(e) => setSelectedDate(e.value)}
                                            dateFormat="dd/mm/yy"
                                            placeholder="dd/mm/yyyy"
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