import { useEffect, useState } from "react"
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

export default function DecomInputs() {

    const merchantsData = new Merchants()

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

    const handleConfirm = () => {

    }

    const handleDelete = (indexToRemove) => {
        setListeLivraison((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
        setQuantiteTotale((prev) => prev - 1);
        const element = listeLivraison.at(indexToRemove)
        setTotalQr((prev) => prev - element.quantiteQr)
    };

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
                                                <div className="pb-3 text-center">
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
                                                    <Label>Point Marchand</Label>
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
                                                    <Label>Caisse</Label>
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
                                                <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={isRAS}
                                                        onChange={(e) => {
                                                            if (isRAS) {
                                                                setIsRAS(false)
                                                            } else {
                                                                setIsRAS(true)
                                                            }
                                                        }}
                                                        label="R.A.S" />
                                                </div>
                                                <div className="flex items-center gap-3 my-2">
                                                    <Checkbox
                                                        checked={isProblem}
                                                        onChange={(e) => {
                                                            if (isProblem) {
                                                                setIsProblem(false)
                                                            } else {
                                                                setIsProblem(true)
                                                            }
                                                        }}
                                                        label="Problème signalé" />
                                                </div>
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
                                <span>Nombre élément : </span>
                                <span>Total QR Code : </span>
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

                                    </TableBody>
                                </Table>
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
                                <span className="font-bold text-sm">{terminalName}</span>
                            </div>
                            <div>
                                <span>S/N: </span>
                                <span className="font-bold text-sm">{terminalSN}</span>
                            </div>
                            <div>
                                <span>Banque: </span>
                                <span className="font-bold text-sm">{terminalBanque}</span>
                            </div>
                            <div>
                                <span>Etat: </span>
                                <span className="font-bold text-sm">{etatTpe}</span>
                            </div>
                            {hasCarton ? (
                                <>
                                    <span className="font-bold text-sm">Avec carton</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-bold text-sm">Sans carton</span>
                                </>
                            )}
                            {hasChargeur ? (
                                <>
                                    <span className="font-bold text-sm">Avec chargeur</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-bold text-sm">Sans chargeur</span>
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
                            <div>
                                <span>Etat: </span>
                                <span className="font-bold text-sm">{etatTpe}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={''}
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