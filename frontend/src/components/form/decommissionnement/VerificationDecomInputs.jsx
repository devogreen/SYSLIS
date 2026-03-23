import { useState, useEffect } from "react"
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

    const [errorForm, setErrorForm] = useState('')

    const [listeDecom, setListeDecom] = useState([])

    const [selectedTpe, setSelectedTpe] = useState(null)

    const [quantiteTotale, setQuantiteTotale] = useState(0)

    const [isRAS, setIsRAS] = useState(false)
    const [isProblem, setIsProblem] = useState(false)
    const [isRebus, setIsRebus] = useState(false)

    const [isRI, setIsRI] = useState(false)
    const [etatTpe, setEtatTpe] = useState('')

    const [pieces, setPieces] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const decom = await decomData.getOneDecom(idDecom)
                const listeDecom = JSON.parse(decom.liste_decom)
                setQuantiteTotale(listeDecom.length)
                const listeChecking = listeDecom.map((item) => ({
                    pointMarchand: item.pointMarchand,
                    terminalSN: item.terminalSN,
                    retour: '',
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

    const handleSelect = (value) => {
        const terminal = listeDecom.at(value)
        if (terminal) {
            setSelectedTpe(terminal)
        }
    }
    return (
        <>
            <div>
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
                                    <div className="md:w-1/2 w-full">
                                        {selectedTpe ? (
                                            <>
                                                <ComponentCard title="Vérification Technique">
                                                    <div className="space-y-3">
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
                                                                <Label className="text-gray-400">Point Marchand <span className="text-gray-700">*</span></Label>
                                                                <Input
                                                                    type="text"
                                                                    id="input"
                                                                    value={selectedTpe.pointMarchand}
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
                                                                    label="TPE défectueux" />
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
                                                            {isProblem ? (
                                                                <>
                                                                    <div className="space-y-4">
                                                                        <div className="flex flex-col">
                                                                            <div>
                                                                                <span className="text-sm">Pièces défectueuses</span>
                                                                            </div>
                                                                            {pieces.map((item) => {
                                                                                return (
                                                                                    <>
                                                                                        <div className="flex items-center gap-3 my-2">
                                                                                            <Checkbox
                                                                                                checked={false}
                                                                                                label={item.nom_piece} />
                                                                                        </div>
                                                                                    </>
                                                                                )
                                                                            })}
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
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <></>
                                                            )}
                                                            {isRebus ? (
                                                                <>
                                                                    <div>
                                                                        <div className="flex flex-col">
                                                                            <div>
                                                                                <span className="text-sm">Pièces récupérables</span>
                                                                            </div>
                                                                            {pieces.map((item) => {
                                                                                return (
                                                                                    <>
                                                                                        <div className="flex items-center gap-3 my-2">
                                                                                            <Checkbox
                                                                                                checked={false}
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
                                                            <div>
                                                                <div>
                                                                    <div className="w-full flex justify-center items-center">
                                                                        <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                            onClick={''}
                                                                        >
                                                                            Ajouter
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">

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
                                    </div>

                                </>
                            )}
                        </>
                    )}
                </div>
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
                                            Sélectionner
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
                                                {item.retour}
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                <button
                                                    className="text-black hover:text-blue-700"
                                                    onClick={() => handleSelect(index)}
                                                >
                                                    <i className="pi pi-pen-to-square"></i>
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    {/* {listeDecom.length > 0 ? (
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
                                            )} */}
                </div>
            </div>
        </>
    )
}