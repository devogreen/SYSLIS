import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate, useLocation } from "react-router";
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

export default function ReparationTpeInputs() {
    const merchantsData = new Merchants()
    const decomData = new Decom()
    const userData = new Users()
    const stockData = new Stock()
    const gestionTpeData = new GestionTpe()
    const rebutData = new Rebut();
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const location = useLocation();
    const { from, idDecom } = location.state || {};

    const LISTE_KEY = "listeAreparer";
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

    const [listeAreparer, setListeAreparer] = useState(savedListe?.listeAreparer || [])

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

    const [listeAreparerImport, setListeAreparerImport] = useState([])
    const [isModalImportOpen, setIsModalImportOpen] = useState(false)
    const [loadingExtract, setLoadindExtract] = useState(false)

    const [isReg, setIsReg] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)

    const [errorValidation, setErrorValidation] = useState('')

    const [listeModel, setListeModel] = useState([])
    const [optionsModel, setOptionsModel] = useState([])
    const [selectedModel, setSelectedModel] = useState(null)
    const [nomModel, setNomModel] = useState('')

    const [loadingAjoutSn, setLoadingAjoutSn] = useState(false)

    const [piecesDef, setPiecesDef] = useState([])

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
                // const merchants = await merchantsData.findMerchant()
                // setMerchantList(merchants)

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

                if (idDecom) {
                    const serials = await decomData.getSnDecom(idDecom)

                    const serialStatus = await Promise.all(
                        serials.map(async (item) => {
                            const serial = item.serial_number
                            const tpeData = await gestionTpeData.getTpeInfos(serial)
                            return {
                                serial,
                                statut: tpeData.statut_tpe.statut,
                            }
                        })
                    )

                    const listeReparation = serialStatus.filter((item) => {
                        return item.statut == 'a_reparer'
                    })
                    const listeSn = listeReparation.map((item) => {
                        return item.serial
                    })

                    const response = await decomData.getPieceDefectueuseListeTpe(listeSn)
                    const terminals = response.data

                    console.log(terminals)

                    const newList = terminals.filter((terminal) => {
                        const isDuplicate = listeAreparer.some(item => {
                            return item.sn == terminal.sn
                        });
                        if (isDuplicate == false) {
                            return terminal
                        }
                    })

                    setQuantiteTotale((prev) => prev + newList.length);
                    setListeAreparer((prev) => [...prev, ...newList]);
                }
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
            listeAreparer,
            quantiteTotale,
        })
    }, [listeAreparer, quantiteTotale])

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

            let fileName = "template_mise_en_reparation";

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
            setListeAreparerImport([])

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

            const response = await decomData.extractSnReparation(fd)
            const terminals = response.data

            const listeAreparerData = terminals.map((item, index) => {
                const pieces = item.listePiece
                const listePieces = pieces.map((item) => {
                    return item.items.nom_piece
                })
                return ({
                    marchand: item.marchand,
                    terminalSN: item.sn,
                    statutTpe: item.statut,
                    piecesDef: pieces,
                })
            })
            // console.log(listeAreparerData)
            setListeAreparerImport(terminals)
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
        if (listeAreparerImport.length == 0) {
            setErrorAjout('Vous devez extraire les données du fichier Excel !')
            return
        }
        for (let m of listeAreparerImport) {
            let sn = ''
            const isDuplicate = listeAreparer.some(item => {
                if (item.sn == m.sn) {
                    sn = item.sn
                    return true
                }
                return false
            });
            if (isDuplicate) {
                setErrorAjout(`Vous avez déjà ajouté ce S/N ! (${sn})`);
                return;
            }
        }
        console.log(listeAreparerImport)
        setErrorAjout('')
        setIsModalImportOpen(true)
    }

    const handleAjoutParExcel = () => {
        setIsModalImportOpen(false)

        setQuantiteTotale((prev) => prev + listeAreparerImport.length);
        setListeAreparer((prev) => [...prev, ...listeAreparerImport]);
        setSelectedExcelFile(null)
        setListeAreparerImport([])
    }

    const handleChangeSn = async (value) => {
        setTerminalName('')
        setStatutTpe('')
        setTerminalSN(value)
        setPiecesDef([])
        try {
            if (value.length == 10) {
                setLoadingFunction(true)
                // const tpeData = await gestionTpeData.getTpeInfos(value)
                // if (tpeData) {
                //     console.log(tpeData)
                //     const statutTpe = tpeData.statut_tpe.statut
                //     setStatutTpe(statutTpe)
                //     const model = tpeData.model_id
                //     if (model) {
                //         setSelectedModel(model)
                //         setNomModel(tpeData.model_piece.nom_model)
                //     }
                // } else {
                //     setStatutTpe('non enregistré')
                // }

                const response = await decomData.getPieceDefectueuseTpe(value)
                const terminal = response.data
                setTerminalName(terminal.marchand)
                setStatutTpe(terminal.statut)
                const piecesDef = terminal.listePiece
                const listePieces = piecesDef.map((item) => {
                    return item.items.nom_piece
                })
                setPiecesDef(piecesDef)
                console.log(piecesDef)
                console.log(listePieces)

            }
        } catch (error) {
            console.error("Erreur lors du traitement du SN:", error);
            Swal.fire({
                title: "Attention",
                text: error.message,
                icon: "warning"
            })
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
        const terminal = listeAreparer.at(value)
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

            const piecesDef = terminal.pieces_defectueuses ? terminal.pieces_defectueuses : []
            setSelectedPiecesDef(piecesDef)

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
        if (statutTpe != 'a_reparer') {
            setErrorAjout("Statut du terminal invalide !")
            return
        }
        const isDuplicate = listeAreparer.some(item => {
            return item.sn == terminalSN
        });
        if (isDuplicate) {
            setErrorAjout("Vous avez déjà ajouté ce S/N !");
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

    const handleAjout = async () => {
        setIsModalConfirmOpen(false)

        const newElement = {
            marchand: terminalName,
            sn: terminalSN,
            statut: statutTpe,
            listePiece: piecesDef,
        }

        setListeAreparer((prev) => [...prev, newElement]);
        setQuantiteTotale((prev) => prev + 1);

        setTerminalSN('')
        setTerminalName('')
        setStatutTpe('')
        setPiecesDef([])
    }

    const handleModify = () => {
        setIsModalConfirmModifOpen(false)
        const idTPE = listeAreparer[indexPiece].id
        listeAreparer[indexPiece].pieces_defectueuses = selectedPiecesDef
        listeAreparer[indexPiece].etatTpe = etatTpe

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
            console.log("Liste de réparation : ", listeAreparer)
            const payload = {
                userId,
                listeSn: JSON.stringify(listeAreparer),
                commentaire,
            }
            console.log(payload)
            await decomData.reparerListeTpe(payload)
            Swal.fire({
                title: "Succès",
                text: "Réparation TPE(s) éffectuée avec succès !",
                icon: "success"
            })
            setListeAreparer([])
            setQuantiteTotale(0)
            navigate('/toutes-livraisons-reparation')
        } catch (error) {
            console.log("Erreur de demande : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la réparation !",
                icon: "warning"
            })
            navigate('/toutes-livraisons-reparation')
        } finally {
            setLoadingValidation(false)
        }
    }

    const handleDelete = (indexToRemove) => {
        setListeAreparer((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
        setQuantiteTotale((prev) => prev - 1);
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
                                    <ComponentCard className="md:w-1/2 w-full" title="Réparation TPE">
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
                                                                {loadingFunction ? (
                                                                    <>
                                                                        <div>
                                                                            <span>
                                                                                <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
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
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <Label className="text-gray-400">Point Marchand</Label>
                                                                <Input
                                                                    type="text"
                                                                    id="input"
                                                                    value={terminalName}
                                                                    disabled
                                                                />
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="text-center">
                                                                    <span className="text-sm font-semibold">Pièces défectueuses</span>
                                                                </div>
                                                                <div className="min-h-50 max-h-50 overflow-y-auto bg-black p-1">
                                                                    <div className="grid grid-cols-3 gap-1">
                                                                        {piecesDef.map((item) => {
                                                                            return (
                                                                                <>
                                                                                    <div className="bg-red-100 text-red-900 text-center">
                                                                                        <span>{item.items.nom_piece}</span>
                                                                                    </div>
                                                                                </>
                                                                            )
                                                                        })}
                                                                    </div>
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
                                                        {/* <div>
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
                                                        </div> */}
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
                                                Pièces à réparer
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
                                        {listeAreparer.map((item, index) => {

                                            return (
                                                <>
                                                    <TableRow>
                                                        <TableCell
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-3 text-gray-500 text-start text-xs dark:text-gray-400">
                                                            {item.marchand}
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            <div>
                                                                {item.sn}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            <div className="grid grid-cols-2 text-xs">
                                                                {item.listePiece?.map((piece) => {
                                                                    return (
                                                                        <>
                                                                            <div>
                                                                                <span className="text-red-700 font-medium">{piece.items.nom_piece} ,</span>
                                                                            </div>
                                                                        </>
                                                                    )
                                                                })}
                                                            </div>
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
                        {listeAreparer.length > 0 ? (
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
                            <div className="flex flex-col space-y-4">
                                <div>
                                    <span className="font-semibold text-sm">Pièces défectueuses ou absentes</span>
                                </div>
                                <div className="grid grid-cols-3 text-xs">
                                    {piecesDef?.map((item) => {
                                        return (
                                            <>
                                                <div>
                                                    <span className="text-red-700 font-medium">{item.items.nom_piece}</span>
                                                </div>
                                            </>
                                        )
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
                                {listeAreparerImport.map((item) => {
                                    return (
                                        <>
                                            <div>
                                                <div>
                                                    <span className="text-sm font-bold" style={{ fontSize: '15px' }}>{item.marchand}</span>
                                                </div>
                                                <div>
                                                    <span>S/N: </span>
                                                    <span className="font-bold text-sm">{item.sn}</span>
                                                </div>
                                                <div className="">
                                                    <div>
                                                        <div>
                                                            <span className="font-semibold text-sm">Pièces défectueuses ou absentes</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 text-xs">
                                                            {item.listePiece?.map((item) => {
                                                                return (
                                                                    <>
                                                                        <div>
                                                                            <span className="text-red-700 font-medium">{item.items.nom_piece} ,</span>
                                                                        </div>
                                                                    </>
                                                                )
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
                                        Confirmer la mise en réparation de
                                    </span>
                                    <div>
                                        <span className="font-bold"> {listeAreparer.length} TPE(s)</span>
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
                            </div>
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