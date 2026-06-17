import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router";
import { Rebut } from "../../backend/rebut/Rebut"
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Modal } from "../../components/ui/modal";

export default function TpeRebutDetails() {

    const rebutData = new Rebut()
    const { id } = useParams()

    const [terminalSn, setTerminalSn] = useState('')
    const [terminalModel, setTerminalModel] = useState('')
    const [piecesFonc, setPiecesFonc] = useState([])
    const [piecesDef, setPiecesDef] = useState([])

    const [piecesFoncFilter, setPiecesFoncFilter] = useState('')
    const [piecesDefFilter, setPiecesDefFilter] = useState('')

    const [isModalAjoutPieceFoncOpen, SetIsModalAjoutPieceFoncOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const terminalRebut = await rebutData.getTpeRebutDetails(id)
            setTerminalSn(terminalRebut.serial_number)
            setTerminalModel(terminalRebut.model_piece?.nom_model)

            const listePieceFonc = terminalRebut.pieces_rebut?.filter((item) => {
                return item.etat == 'fonctionnel'
            })
            setPiecesFonc(listePieceFonc)
        }
        fetchData()
    }, [])

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
                                    <button className='bg-gray-100 rounded py-3 px-5 h-8 w-full flex items-center hover:bg-gray-200 mt-1'
                                        onClick={() => {
                                            SetIsModalAjoutPieceFoncOpen(true)
                                        }}
                                    >
                                        <span className='mr-4'><i className="pi pi-plus-circle"></i></span>
                                        <span className='text-sm text-gray-700 font-medium'>Modifier lots de pièces</span>
                                    </button>
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
                                        <img src="../../public/images/logo/terminal_lines_black.png" alt="" style={{ width: '500px' }} />
                                    </div>
                                </div>
                                {/* <img src="../../public/images/logo/terminal_A8900_sided.png" alt="" style={{width: '500px'}}/> */}
                            </div>
                            <div className="">
                                <div className="border rounded-2xl">
                                    <div className="space-y-3">
                                        <div>
                                            <div>
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
                                            <div className="border">
                                                <div>
                                                    {piecesFonc.map((item) => {
                                                        return (
                                                            <>
                                                                <div>
                                                                    <span>{item.nom_piece}</span>
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

            <Modal isOpen={isModalAjoutPieceFoncOpen} onClose={() => SetIsModalAjoutPieceFoncOpen(false)} className="p-4 max-w-md">
                <div className="space-y-7">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-black text-white font-medium">Modification</span>
                    </div>
                    <div className="text-center text-sm font-medium">
                        <span>Êtes-vous sûr de vouloir annuler ce décommissionnement ?</span>
                    </div>
                    <div>
                        <div className="flex justify-between">
                            <div className="w-full flex justify-center items-center">
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={() => setIsModalCancelOpen(false)}
                                >
                                    Non
                                </button>
                            </div>
                            <div className="w-full flex justify-center items-center">
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                    onClick={handleCancelDecom}
                                >
                                    Oui
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}