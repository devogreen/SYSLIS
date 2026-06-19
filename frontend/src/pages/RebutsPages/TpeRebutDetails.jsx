import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router";
import { Rebut } from "../../backend/rebut/Rebut"
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Modal } from "../../components/ui/modal";
import { Stock } from "../../backend/stock/Stock";
import Checkbox from "../../components/form/input/Checkbox";
import Swal from "sweetalert2";
import { ProgressSpinner } from "primereact/progressspinner";
import { Users } from "../../backend/users/Users";

export default function TpeRebutDetails() {

    const rebutData = new Rebut()
    const stockData = new Stock()
    const userData = new Users()
    const { id } = useParams()
    const userId = localStorage.getItem('id')
    const navigate = useNavigate()

    const [terminalSn, setTerminalSn] = useState('')
    const [terminalModel, setTerminalModel] = useState('')
    const [piecesFonc, setPiecesFonc] = useState([])
    const [piecesDef, setPiecesDef] = useState([])

    const [piecesFoncFilter, setPiecesFoncFilter] = useState('')
    const [piecesDefFilter, setPiecesDefFilter] = useState('')

    const [isModalModifPieceOpen, setIsModalModifPieceOpen] = useState(false)

    const [pieces, setPieces] = useState([])

    const [selectedPiecesDef, setSelectedPiecesDef] = useState([])
    const [selectedPiecesRec, setSelectedPiecesRec] = useState([])

    const [errorValidationLot, setErrorValidationLot] = useState('')
    const [loadingValidationLot, setLoadingValidationLot] = useState(false)

    const [isAdmin, setIsAdmin] = useState(false)
    const [isGestion, setIsGestion] = useState(false)

    const [loadingRetrait, setLoadingRetrait] = useState(false)
    const [isModalRetraitPieceOpen, setIsModalRetraitPieceOpen] = useState(false)

    const [selectedPiecesRecupFonc, setSelectedPiecesRecupFonc] = useState([])

    const allPieceDef =
        pieces.length > 0 &&
        selectedPiecesDef?.length === pieces.length;

    const allPieceFunc =
        pieces.length > 0 &&
        selectedPiecesRec?.length === pieces.length;

    const allPieceRecupFonc =
        piecesFonc.length > 0 &&
        selectedPiecesRecupFonc?.length === piecesFonc.length;

    useEffect(() => {
        const fetchData = async () => {
            const terminalRebut = await rebutData.getTpeRebutDetails(id)
            setTerminalSn(terminalRebut.serial_number)
            setTerminalModel(terminalRebut.model_piece?.nom_model)

            const allItems = await stockData.getAllItems()
            const items = allItems.filter((item) => {
                return item.is_deleted == false && item.type != 'TERMINAL'
            })
            setPieces(items)

            const listePieceFonc = terminalRebut.pieces_rebut?.filter((item) => {
                return item.etat == 'fonctionnel'
            })
            const listePieceFoncId = listePieceFonc.map((item) => {
                return item.piece_id
            })
            console.log(listePieceFonc)
            setPiecesFonc(listePieceFonc)
            console.log(listePieceFonc)
            setSelectedPiecesRec(listePieceFoncId)

            const listePieceDef = terminalRebut.pieces_rebut?.filter((item) => {
                return item.etat == 'defectueux'
            })
            const listePieceDefId = listePieceDef.map((item) => {
                return item.piece_id
            })
            setPiecesDef(listePieceDef)
            setSelectedPiecesDef(listePieceDefId)

            const rolesData = await userData.getUserRoles(userId)
            const nomRoles = rolesData.roles.map((item) => {
                return item.nom_role
            })

            if (nomRoles.includes('admin_rebut')) {
                setIsAdmin(true)
            }

            if (nomRoles.includes('gestion_rebut')) {
                setIsGestion(true)
            }
        }
        fetchData()
    }, [])

    const handleSelectPieceRec = (pieceId) => {
        setSelectedPiecesRec((prevSelected) =>
            prevSelected.includes(pieceId)
                ? prevSelected.filter((id) => id !== pieceId)
                : [...prevSelected, pieceId]
        );
    }

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

    const handleSelectAllPieceDef = () => {
        if (allPieceDef) {
            setSelectedPiecesDef([]);
        } else {
            setSelectedPiecesDef(
                pieces.map(piece => piece.id_piece)
            );
        }
    };

    const handleValidateLot = async () => {
        if (selectedPiecesDef.length == 0) {
            setErrorValidationLot("Vous devez sélectionner au moins une pièce défectueuse !")
            return
        }

        if (selectedPiecesRec.length == 0) {
            setErrorValidationLot("Vous devez sélectionner au moins une pièce fonctionnelle !")
            return
        }

        setIsModalModifPieceOpen(false)

        try {
            setLoadingValidationLot(true)
            const payload = {
                listePieceDef: JSON.stringify(selectedPiecesDef),
                listePieceRec: JSON.stringify(selectedPiecesRec),
                userId,
            }

            await rebutData.changeLotPiece(id, payload)

            Swal.fire({
                title: "Succès",
                text: "Modification du lot de pièces effectuée avec succès !",
                icon: "success"
            })

            navigate('/tpe-rebuts')
        } catch (error) {
            console.log("Erreur de modification : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la modification !",
                icon: "warning"
            })
            navigate('/tpe-rebuts')
        } finally {
            setLoadingValidationLot(false)
        }
    };

    const handleSelectPieceFoncRecup = (pieceId) => {
        setSelectedPiecesRecupFonc((prevSelected) =>
            prevSelected.includes(pieceId)
                ? prevSelected.filter((id) => id !== pieceId)
                : [...prevSelected, pieceId]
        );
    }

    const handleSelectAllPieceFoncRecup = () => {
        if (allPieceRecupFonc) {
            setSelectedPiecesRecupFonc([]);
        } else {
            setSelectedPiecesRecupFonc(
                piecesFonc.map(piece => piece.items.id_piece)
            );
        }
    };

    const handleValidateRecupPiecesFonc = async () => {
        try {
            const piecesFoncRest = piecesFonc.filter((piece) => {
                return !selectedPiecesRecupFonc.includes(piece.items.id_piece)
            })

            const piecesFoncRestId = piecesFoncRest.map((piece) => {
                return piece.items.id_piece
            })

            console.log('Pièces fonctionnelles récupérées : ', selectedPiecesRecupFonc)
            console.log('Pièces fonctionnelles restantes : ', piecesFoncRestId)
            console.log('Pieces défectueuses : ', selectedPiecesDef)

            setLoadingValidationLot(true)
            setIsModalRetraitPieceOpen(false)

            const payload = {
                listePiecesRecup: JSON.stringify(selectedPiecesRecupFonc),
                listePiecesFoncReste: JSON.stringify(piecesFoncRestId),
                listePiecesDef: JSON.stringify(selectedPiecesDef),
                userId,
            }

            await rebutData.recupPieceFonc(id, payload)

            Swal.fire({
                title: "Succès",
                text: `Récupération de ${selectedPiecesRecupFonc.length} pièces fonctionnelles sur le terminal`,
                icon: "success"
            })

            navigate('/tpe-rebuts')
        } catch (error) {
            console.log("Erreur de modification : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la modification !",
                icon: "warning"
            })
            navigate('/tpe-rebuts')
        } finally {
            setLoadingValidationLot(false)
        }
    }
    return (
        <>
            <PageBreadcrumb pageTitle="Détails TPE au rebut" />
            <div className="space-y-2">
                <div>
                    <div className="grid grid-cols-2">
                        <div>
                        </div>
                        <div className="grid grid-cols-2">
                            <div>
                            </div>
                            <div>
                                <div className="col-start-2 space-y-0.5">
                                    {loadingValidationLot ? (
                                        <>
                                            <div className='text-center'>
                                                <span className=''>
                                                    <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {isAdmin ? (
                                                <>
                                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'
                                                        onClick={() => {
                                                            setIsModalModifPieceOpen(true)
                                                        }}
                                                    >
                                                        <span className='mr-4'><i className="pi pi-cog"></i></span>
                                                        <span className='text-sm text-gray-700 font-medium'>Modifier lots de pièces</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            {isGestion ? (
                                                <>
                                                    {loadingRetrait ? (
                                                        <>
                                                            <div className='text-center'>
                                                                <span className=''>
                                                                    <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'
                                                                onClick={() => {
                                                                    setIsModalRetraitPieceOpen(true)
                                                                }}
                                                            >
                                                                <span className='mr-4'><i className="pi pi-wrench"></i></span>
                                                                <span className='text-sm text-gray-700 font-medium'>Récupérer pièces fonctionnelles</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div>
                        <div className="grid grid-cols-2 p-6">
                            <div className="rounded-sm flex justify-center items-center">
                                <div>
                                    <div>
                                        <div>
                                            <span className="text-blue-400">{terminalSn}</span>
                                        </div>
                                        <div>
                                            <span>{terminalModel}</span>
                                        </div>
                                    </div>
                                    <div className=" border border-black rounded-xl bg-gray-100">
                                        <img src="/images/logo/terminal_lines_black.png" alt="terminal_image" style={{ width: '500px' }} />
                                    </div>
                                </div>
                                {/* <img src="../../public/images/logo/terminal_A8900_sided.png" alt="" style={{width: '500px'}}/> */}
                            </div>
                            <div className="">
                                <div className="border rounded-2xl p-3">
                                    <div className="space-y-3">
                                        <div className="space-y-3">
                                            <div className="text-center text-green-700">
                                                <span>Pièces fonctionnelles</span>
                                            </div>
                                            <div>
                                                <div className="relative w-full">
                                                    <Input
                                                        className="pl-10"
                                                        value={piecesFoncFilter}
                                                        onChange={(e) => setPiecesFoncFilter(e.target.value)}
                                                        placeholder="Rechercher parmis les pièces fonctionnelles..."
                                                    />
                                                    <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                                                </div>
                                            </div>
                                            <div className="min-h-50 max-h-50 overflow-y-auto">
                                                <div className="grid grid-cols-3 gap-1">
                                                    {piecesFonc.map((item) => {
                                                        return (
                                                            <>
                                                                <div className="bg-green-200 text-green-800 text-center">
                                                                    <span>{item.items.nom_piece}</span>
                                                                </div>
                                                            </>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="text-center">
                                                <span>Pièces défectueuses</span>
                                            </div>
                                            <div>
                                                <div className="relative w-full">
                                                    <Input
                                                        className="pl-10"
                                                        value={piecesFoncFilter}
                                                        onChange={(e) => setPiecesFoncFilter(e.target.value)}
                                                        placeholder="Rechercher parmis les pièces défectueuses..."
                                                    />
                                                    <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                                                </div>
                                            </div>
                                            <div className="min-h-50 max-h-50 overflow-y-auto">
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
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalModifPieceOpen} onClose={() => setIsModalModifPieceOpen(false)} className="p-4 max-w-xl">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-black text-white font-medium">Modification</span>
                    </div>
                    <div className="max-h-105 overflow-y-auto space-y-5">
                        <div className="space-y-5">
                            <div>
                                <div className="text-center text-sm font-medium">
                                    <span className="font-semibold text-sm text-blue-400">Pièces fonctionnelles</span>
                                </div>
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
                                                <div>
                                                    <div className="flex items-center gap-3 my-2">
                                                        <Checkbox
                                                            checked={selectedPiecesRec?.includes(item.id_piece)}
                                                            onChange={() => handleSelectPieceRec(item.id_piece)}
                                                            label={item.nom_piece} />
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <div className="text-center text-sm font-medium">
                                    <span className="font-semibold text-sm text-red-400">Pièces défectueuses</span>
                                </div>
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
                        </div>
                    </div>
                    <div>
                        <div>
                            <div className="w-full flex justify-center items-center">
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={handleValidateLot}
                                >
                                    Valider
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalRetraitPieceOpen} onClose={() => setIsModalRetraitPieceOpen(false)} className="p-4 max-w-xl">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-black text-white font-medium">Récupération</span>
                    </div>
                    <div className="max-h-105 overflow-y-auto space-y-5">
                        <div className="space-y-5">
                            <div>
                                <div className="text-center text-sm font-medium">
                                    <span className="font-semibold text-sm text-blue-400">Pièces fonctionnelles</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 my-2">
                                        <Checkbox
                                            checked={allPieceRecupFonc}
                                            onChange={handleSelectAllPieceFoncRecup}
                                            label="TOUT"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2">
                                    {piecesFonc.map((item) => {
                                        return (
                                            <>
                                                <div>
                                                    <div className="flex items-center gap-3 my-2">
                                                        <Checkbox
                                                            checked={selectedPiecesRecupFonc?.includes(item.items.id_piece)}
                                                            onChange={() => handleSelectPieceFoncRecup(item.items.id_piece)}
                                                            label={item.items.nom_piece} />
                                                    </div>
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
                                    onClick={handleValidateRecupPiecesFonc}
                                >
                                    Valider
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}