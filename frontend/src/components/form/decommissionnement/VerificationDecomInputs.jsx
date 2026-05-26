import { useState, useEffect, useRef } from "react"
import { useParams, Link, useNavigate } from "react-router";
import { Decom } from "../../../backend/decom/decom"
import { Users } from "../../../backend/users/Users";
import { Stock } from "../../../backend/stock/Stock";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../../components/ui/table"
import { Modal } from "../../../components/ui/modal";
import { ProgressSpinner } from "primereact/progressspinner";
import Label from "../../../components/form/Label";
import Input from "../input/InputField.tsx";
import Checkbox from "../input/Checkbox.tsx";
import TextArea from "../../../components/form/input/TextArea";
import Swal from "sweetalert2";
import ComponentCard from "../../common/ComponentCard";

export default function VerificationDecomInputs() {
    const decomData = new Decom()
    const userData = new Users()
    const stockData = new Stock()
    const { id: idDecom } = useParams()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)

    const [errorForm, setErrorForm] = useState('')
    const [errorAjout, setErrorAjout] = useState('')

    const [listeDecom, setListeDecom] = useState([])

    const [selectedTpe, setSelectedTpe] = useState(null)

    const [quantiteTotale, setQuantiteTotale] = useState(0)

    const [isRAS, setIsRAS] = useState(false)
    const [isProblem, setIsProblem] = useState(false)
    const [isRebus, setIsRebus] = useState(false)

    const [isRI, setIsRI] = useState(false)
    const [etatTpe, setEtatTpe] = useState('')

    const [pieces, setPieces] = useState([])
    const [selectedPiecesDef, setSelectedPiecesDef] = useState([])
    const [selectedPiecesRec, setSelectedPiecesRec] = useState([])

    const [isModalConfirmOpen, setIsModalConfirmOpen] = useState(false)
    const [isModalValidateOpen, setIsModalValidateOpen] = useState(false)

    const [listeVerified, setListeVerified] = useState([])
    const [listeChecked, setListeChecked] = useState([])

    const [indexPiece, setIndexPiece] = useState(null)

    const [checkMail, setCheckMail] = useState(false)
    const [commentaire, setCommentaire] = useState('')

    const itemRefs = useRef({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const decom = await decomData.getOneDecom(idDecom)
                // const listeDecom = JSON.parse(decom.liste_decom)
                const listeDecom = await decomData.getSnDecom(idDecom)
                setQuantiteTotale(listeDecom.length)
                const listeChecking = listeDecom.map((item) => ({
                    id: item.id,
                    serial_number: item.serial_number,
                    point_marchand: item.point_marchand,
                    retour: item.commentaire_retour,
                    pieces_defectueuses: item.pieces_defectueuses,
                    pieces_recuperees: item.pieces_recuperees,
                    statut: item.statut,
                    is_ok: item.is_ok,
                }))
                setListeDecom(listeChecking)

                const allItems = await stockData.getAllItems()
                const items = allItems.filter((item) => {
                    return item.is_deleted == false && item.type != 'TERMINAL'
                })
                setPieces(items)
            } catch (error) {
                console.error('Error fetching data ', error)
                setErrorForm('Erreur lors de la génération du formulaire')
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const handleSelectTerminal = (value) => {
        if (value == indexPiece) {
            setSelectedTpe(null)
            return
        }
        setIsRAS(false)
        setIsProblem(false)
        setIsRebus(false)
        setSelectedPiecesDef([])
        setSelectedPiecesRec([])
        const terminal = listeDecom.at(value)
        if (terminal) {
            setSelectedTpe(terminal)
            if (terminal.is_ok) {
                setIsRAS(true)
            } else if (!terminal.is_ok && terminal.statut == 'parametrage') {
                setIsProblem(true)
                const piecesDef = JSON.parse(terminal.pieces_defectueuses)
                setSelectedPiecesDef(piecesDef)
            } else if (!terminal.is_ok && terminal.statut == 'rebus') {
                setIsRebus(true)
                const piecesRec = JSON.parse(terminal.pieces_recuperees)
                setSelectedPiecesRec(piecesRec)
            }
        }
        setIndexPiece(value)
        itemRefs.current[value]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    const handleSelectPieceDef = (pieceId) => {
        setSelectedPiecesDef((prevSelected) =>
            prevSelected.includes(pieceId)
                ? prevSelected.filter((id) => id !== pieceId)
                : [...prevSelected, pieceId]
        );
    }

    const handleSelectPieceRec = (pieceId) => {
        setSelectedPiecesRec((prevSelected) =>
            prevSelected.includes(pieceId)
                ? prevSelected.filter((id) => id !== pieceId)
                : [...prevSelected, pieceId]
        );
    }

    const handleConfirm = () => {
        if (isProblem && selectedPiecesDef.length == 0) {
            setErrorAjout("Vous devez choisir au moins une pièce défectueuse !")
            return
        }
        setIsModalConfirmOpen(true)
    }
    const handleModify = () => {
        setIsModalConfirmOpen(false)
        const idTPE = listeDecom[indexPiece].id
        if (isRAS) {
            listeDecom[indexPiece].is_ok = true
            listeDecom[indexPiece].statut = 'parametrage'
            listeDecom[indexPiece].retour = 'TPE OK ' + (etatTpe ? ' : ' + etatTpe : '')
        } else {
            listeDecom[indexPiece].is_ok = false
        }
        if (isProblem) {
            listeDecom[indexPiece].pieces_recuperees = null
            listeDecom[indexPiece].pieces_defectueuses = JSON.stringify(selectedPiecesDef)
            listeDecom[indexPiece].statut = 'parametrage'
            listeDecom[indexPiece].retour = 'Problèmes contastés ' + (etatTpe ? ' : ' + etatTpe : '')
        }
        if (isRebus) {
            listeDecom[indexPiece].pieces_defectueuses = null
            listeDecom[indexPiece].pieces_recuperees = JSON.stringify(selectedPiecesRec)
            listeDecom[indexPiece].statut = 'rebus'
            listeDecom[indexPiece].retour = 'TPE inutilisable ' + (etatTpe ? ' : ' + etatTpe : '')
        }
        if (!isRAS && !isProblem && !isRebus) {
            listeDecom[indexPiece].statut = 'checking'
            listeDecom[indexPiece].pieces_defectueuses = []
            listeDecom[indexPiece].pieces_recuperees = []
        }
        // console.log(listeDecom)
        const checked = listeChecked.find(item => {
            return item.id == idTPE
        });
        setListeChecked(prev =>
            prev.some(item => item.id === idTPE)
                ? prev.map(item => item.id === idTPE ? listeDecom[indexPiece] : item)
                : [...prev, listeDecom[indexPiece]]
        );
        setSelectedTpe(null)
        setIsRAS(false)
        setIsProblem(false)
        setIsRebus(false)
        setEtatTpe('')
        setSelectedPiecesDef([])
        setSelectedPiecesRec([])
    }

    const handleConfirmValidate = () => {
        const listeCheck = listeDecom.filter((item) => {
            return item.statut != 'checking'
        })
        setListeVerified(listeCheck)
        setIsModalValidateOpen(true)
    }
    const handleValidate = async () => {
        setIsModalValidateOpen(false)
        console.log(listeChecked)
        try {
            setLoadingValidation(true)
            const payload = {
                commentaire,
                userId,
                checkMail,
                listeDecom: JSON.stringify(listeChecked),
            }

            const id = idDecom
            await decomData.verifyDecom(id, payload)
            Swal.fire({
                title: "Succès",
                text: "Nouvelles vérifications avec succès !",
                icon: "success"
            })
            navigate('/tous-les-decommissionnements')
        } catch (error) {
            console.log("Erreur de vérification : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la vérification !",
                icon: "warning"
            })
            navigate('/tous-les-decommissionnements')
        } finally {
            setLoadingValidation(false)
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
                                    {selectedTpe ? (
                                        <>
                                            <ComponentCard className="md:w-1/2 w-full" title="Vérification Technique">
                                                <div className="space-y-3">
                                                    <div className="space-y-4">
                                                        <div className="text-center">
                                                            <span className="text-sm font-semibold">Informations Terminal</span>
                                                        </div>
                                                        <div ref={targetRef}>
                                                            <Label className="text-gray-400">Numéro de série <span className="text-gray-700">*</span></Label>
                                                            <Input
                                                                type="text"
                                                                id="input"
                                                                value={selectedTpe.serial_number}
                                                                disabled
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-400">Point Marchand <span className="text-gray-700">*</span></Label>
                                                            <Input
                                                                type="text"
                                                                id="input"
                                                                value={selectedTpe.point_marchand}
                                                                disabled
                                                            />
                                                        </div>
                                                        <div className="pb-3 text-center">
                                                            <span className="text-sm font-semibold">Vérification du terminal</span>
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
                                                                        setIsRebus(false)
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
                                                                        setIsRebus(false)
                                                                    }
                                                                }}
                                                                label="Problèmes détectés" />
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox
                                                                checked={isRebus}
                                                                onChange={(e) => {
                                                                    if (isRebus) {
                                                                        setIsRebus(false)
                                                                    } else {
                                                                        setIsProblem(false)
                                                                        setIsRAS(false)
                                                                        setIsRebus(true)
                                                                    }
                                                                }}
                                                                label="TPE rebus" />
                                                        </div>
                                                        {/* {isRAS ? (
                                                            <>
                                                            </>
                                                        ) : (
                                                            <></>
                                                        )} */}
                                                        {isProblem ? (
                                                            <>
                                                                <div className="space-y-4">
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <span className="text-sm font-semibold">Pièces défectueuses ou absentes <span className="text-red-700">*</span></span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2">
                                                                            {pieces.map((item) => {
                                                                                return (
                                                                                    <>
                                                                                        <div className="flex items-center gap-3 my-2">
                                                                                            <Checkbox
                                                                                                checked={selectedPiecesDef.includes(item.id_piece)}
                                                                                                onChange={() => handleSelectPieceDef(item.id_piece)}
                                                                                                label={item.nom_piece} />
                                                                                        </div>
                                                                                    </>
                                                                                )
                                                                            })}
                                                                        </div>
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
                                                            <></>
                                                        )}
                                                        {isRebus ? (
                                                            <>
                                                                <div>
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <span className="text-sm font-semibold">Pièces récupérables</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2">
                                                                            {pieces.map((item) => {
                                                                                return (
                                                                                    <>
                                                                                        <div className="flex items-center gap-3 my-2">
                                                                                            <Checkbox
                                                                                                checked={selectedPiecesRec.includes(item.id_piece)}
                                                                                                onChange={() => handleSelectPieceRec(item.id_piece)}
                                                                                                label={item.nom_piece} />
                                                                                        </div>
                                                                                    </>
                                                                                )
                                                                            })}
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
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <></>
                                                        )}
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
                                    ) : (
                                        <></>
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
                                                Statut
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
                                                Sélectionner
                                            </TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    {/* Table Body */}
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {listeDecom.map((item, index) => {
                                            let statutClass = ''
                                            if (item.statut == 'checking') {
                                                statutClass = 'text-warning-200 font-semi-bold'
                                            } else if (item.statut == 'parametrage') {
                                                statutClass = 'text-blue-200 font-semi-bold'
                                            } else if (item.statut == 'rebus') {
                                                statutClass = 'text-red-500 font-semi-bold'
                                            }

                                            const piecesDefectueuses = JSON.parse(item.pieces_defectueuses)
                                            const piecesRecuperables = JSON.parse(item.pieces_recuperees)
                                            return (
                                                <>
                                                    <TableRow>
                                                        <TableCell
                                                            isHeader
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell
                                                            isHeader
                                                            className="px-4 py-3 text-gray-500 text-start text-xs dark:text-gray-400">
                                                            {item.point_marchand}
                                                        </TableCell>
                                                        <TableCell
                                                            isHeader
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            {item.serial_number}
                                                        </TableCell>
                                                        <TableCell
                                                            isHeader
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            <span className={statutClass}>
                                                                {item.statut}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell
                                                            isHeader
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            {item.retour}
                                                        </TableCell>
                                                        <TableCell
                                                            isHeader
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
                                                                                    <span className="text-red-700 font-medium">{piece.nom_piece}</span>
                                                                                </div>
                                                                            </>
                                                                        )
                                                                    }
                                                                })}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell
                                                            isHeader
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
                                                                                    <span className="text-green-700 font-medium">{piece.nom_piece}</span>
                                                                                </div>
                                                                            </>
                                                                        )
                                                                    }
                                                                })}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell
                                                            key={index}
                                                            ref={(el) => (itemRefs.current[index] = el)}
                                                            isHeader
                                                            className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                            <button
                                                                className="text-black hover:text-blue-700"
                                                                onClick={() => handleSelectTerminal(index)}
                                                            >
                                                                <i className="pi pi-pen-to-square"></i>
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
                                <span className="font-bold text-sm">{selectedTpe?.point_marchand}</span>
                            </div>
                            <div>
                                <span>S/N: </span>
                                <span className="font-bold text-sm">{selectedTpe?.serial_number}</span>
                            </div>
                            {isRAS ? (
                                <>
                                    <div>
                                        <div>
                                            <span>Etat: </span>
                                            <span className="font-bold text-sm">R.A.S</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                </>
                            )}
                            {isProblem ? (
                                <>
                                    <div className="flex flex-col space-y-2">
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
                                            <span>Pièces défectueuses ou absentes</span>
                                        </div>
                                        <div className="grid grid-cols-3 text-xs">
                                            {selectedPiecesDef.map((item) => {
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
                            ) : (
                                <></>
                            )}
                            {isRebus ? (
                                <>
                                    <div className="flex flex-col space-y-2">
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
                                            <span>Pièces récupérables</span>
                                        </div>
                                        <div className="grid grid-cols-3 text-xs">
                                            {selectedPiecesRec.map((item) => {
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
                            ) : (
                                <></>
                            )}
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
            <Modal isOpen={isModalValidateOpen} onClose={() => setIsModalValidateOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Validation</span>
                    </div>
                    <div className="">
                        <div className="space-y-3">
                            <div className="space-y-3">
                                <div className="text-center flex flex-col">
                                    <span className="text-sm">
                                        Confirmer la vérification de
                                    </span>
                                    <div>
                                        <span className="font-bold"> {listeVerified.length} TPE</span> sur
                                        <span className="font-bold"> {listeDecom.length}</span>
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
                            {listeVerified.length > 0 ? (
                                <>
                                    <div>
                                        <Checkbox
                                            label="Envoyer mail de rapport de vérifaction"
                                            checked={checkMail}
                                            onChange={() => {
                                                if (checkMail) {
                                                    setCheckMail(false)
                                                } else {
                                                    setCheckMail(true)
                                                }
                                            }} />
                                    </div>
                                </>
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
        </>
    )
}