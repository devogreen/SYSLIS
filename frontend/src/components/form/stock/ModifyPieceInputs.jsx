import { useState, useEffect } from "react"
import { Stock } from "../../../backend/stock/Stock"
import { Users } from "../../../backend/users/Users";
import ComponentCard from "../../common/ComponentCard";
import Input from "../input/InputField";
import Label from "../Label";
import Select from "../Select";
import Checkbox from "../input/Checkbox";
import { Modal } from "../../ui/modal";
import { useNavigate, useParams } from "react-router";
import Swal from 'sweetalert2'
import { ProgressSpinner } from 'primereact/progressspinner';

export default function ModifyPieceInputs() {

    const stock = new Stock();
    const usersData = new Users()
    const { id } = useParams();
    const userId = localStorage.getItem('id');
    // const role = localStorage.getItem("role_id")
    const navigate = useNavigate();

    const [loadingStock, setLoadingStock] = useState(false)
    const [nomPiece, setNomPiece] = useState('')
    const [titrePiece, setTitrePiece] = useState('')
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [errorInput, setErrorInput] = useState('')
    const [loadingModif, setLoadingModif] = useState(false);
    const [piece, setPiece] = useState()

    const [listeModels, setListeModels] = useState([])

    const [nomService, setNomService] = useState('')
    const [listeServices, setListeServices] = useState([])
    const [pieceType, setPieceType] = useState(null)
    const [nomModel, setNomModel] = useState('')
    const [codePiece, setCodePiece] = useState('')

    const [selectedModels, setSelectedModels] = useState([])
    const [selectedServices, setSelectedServices] = useState([])

    const [isTerminal, setIsTerminal] = useState(false)

    useEffect(() => {
        const fetchStock = async () => {
            setLoadingStock(true)
            try {
                const piece_data = await stock.getPiece(id)
                if (piece_data.type == 'TERMINAL') {
                    setIsTerminal(true)
                }
                setPiece(piece_data)
                setNomPiece(piece_data.nom_piece)
                setTitrePiece(piece_data.nom_piece)
                setPieceType(piece_data.type)
                setCodePiece(piece_data.code_piece)

                const models_data = await stock.getAllModels()
                setListeModels(models_data)

                const itemModels_data = await stock.getItemModels(id)
                const models_id = itemModels_data.model_piece.map((model) => {
                    return model.id_model
                })
                setSelectedModels(models_id)

                const service_data = await usersData.getAllServices()
                setListeServices(service_data)

                const itemServices_data = await stock.getItemServices(id)
                const services_id = itemServices_data.services.map((services) => {
                    return services.id
                })
                setSelectedServices(services_id)

            } catch (error) {
                console.log('Error fetching data ', error)
            } finally {
                setLoadingStock(false)
            }
        };
        fetchStock();
    }, [])

    const options_types = [
        { value: "PIECE", label: "PIECE" },
        { value: "TERMINAL", label: "TERMINAL" },
    ]

    const changeType = (value) => {
        console.log("Selected value : ", value)
        setPieceType(value)
    }

    const handleSelectModel = (modelId) => {
        setSelectedModels((prevSelected) =>
            prevSelected.includes(modelId)
                ? prevSelected.filter((id) => id !== modelId)
                : [...prevSelected, modelId]
        );
    };

    const handleSelectService = (serviceId) => {
        setSelectedServices((prevSelected) =>
            prevSelected.includes(serviceId)
                ? prevSelected.filter((id) => id !== serviceId)
                : [...prevSelected, serviceId]
        );
    };

    const handleConfirm = () => {
        if (!nomPiece.trim()) {
            setErrorInput("Vous devez saisir un nom !")
            return
        }
        if (selectedModels.length == 0) {
            setErrorInput("Vous devez choisir un model !")
            return
        }
        if (selectedServices.length == 0) {
            setErrorInput("Vous devez choisir un service !")
            return
        }

        setIsConfirmModalOpen(true)
        setErrorInput('')
    }

    const handleModify = async (e) => {
        e.preventDefault();
        
        setIsConfirmModalOpen(false)
        setLoadingModif(true)

        const payload = {
            nomPiece: nomPiece,
            type: pieceType,
            itemModels: selectedModels,
            itemServices: selectedServices,
            user_id: userId,
        }

        try {
            const response = await stock.modifyPiece(id, payload)
            console.log(response)
            console.log('pièce modifié')

            Swal.fire({
                title: "Succès",
                text: "Pièce modifiée avec succès",
                icon: "success"
            });
            navigate('/voir-items')
        } catch (error) {
            console.log('error : ', error)
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur s'est produite lors de la modification",
                icon: "warning"
            });
        } finally {
            setLoadingModif(false)
        }

    }
    return (
        <>
            <div className="flex justify-center">
                <ComponentCard className="md:w-1/2 w-full" title={`Modifier pièce ${titrePiece}`}>
                    <div className="space-y-6">
                        {isTerminal ? (
                            <></>
                        ) : (
                            <>
                                <div>
                                    <Label>Nom pièce <span className="text-red-700">*</span></Label>
                                    <Input
                                        value={nomPiece}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setNomPiece(value)
                                        }}
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <span className="text-md text-gray-700 font-medium px-0.5 border border-gray-500 rounded">Modèles pièce</span>
                            <div className="">
                                {listeModels.map((model => {
                                    const nomModel = model.nom_model
                                    return (
                                        <>
                                            <div key={model.id_model} className="flex items-center gap-3 my-2">
                                                <Checkbox
                                                    checked={selectedModels.includes(model.id_model)}
                                                    onChange={() => handleSelectModel(model.id_model)}
                                                    label={nomModel}
                                                />
                                            </div>
                                        </>
                                    )
                                }))}
                            </div>
                        </div>
                        <div>
                            <span className="text-md text-gray-700 font-medium px-0.5 border border-gray-500 rounded">Attribution services</span>
                            <div className="">
                                {listeServices.map((service => {
                                    const nomService = service.nom_service
                                    return (
                                        <>
                                            <div key={service.id} className="flex items-center gap-3 my-2">
                                                <Checkbox
                                                    checked={selectedServices.includes(service.id)}
                                                    onChange={() => handleSelectService(service.id)}
                                                    label={nomService}
                                                />
                                            </div>
                                        </>
                                    )
                                }))}
                            </div>
                        </div>
                        {/* <div>
                            <Label htmlFor="input">Code pièce</Label>
                            <Input 
                                type="text" 
                                placeholder="##" 
                                value={codePiece}
                                onChange={(e) =>{
                                    const value = e.target.value
                                    setCodePiece(value)
                                }}    
                            />
                        </div> */}
                        <div className="text-center">
                            <span className="text-sm text-error-600 font-bold">{errorInput}</span>
                        </div>
                    </div>
                    <div className='w-full flex justify-center items-center'>
                        {loadingModif ?
                            (
                                <span className="">
                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                </span>
                            ) : (
                                <>
                                    <button
                                        onClick={handleConfirm}
                                        className='w-1/2 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                        Valider
                                    </button>
                                </>
                            )}
                    </div>
                </ComponentCard>
            </div>
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} className="p-6 max-w-xl">
                <div className="space-y-6">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Modification pièce</span>
                    </div>
                    <div>
                        <span>Nom pièce : <span className="font-bold text-red-700">{nomPiece}</span></span>
                    </div>
                    <div>
                        <span>Type : <span className="text-red-500 font-medium">{pieceType}</span></span>
                    </div>
                    <div className="grid grid-cols-2 border px-1">
                        <span className="text-sm flex items-center">Modèles : </span>
                        <div className="grid grid-cols-2">
                            {selectedModels.map((id) => {
                                const selectedModel = listeModels.find((s) => s.id_model === id);
                                return (
                                    <>
                                        <span className="font-bold text-blue-900">
                                            {selectedModel ?
                                                (
                                                    selectedModel.nom_model
                                                ) : (id)
                                            } ;
                                        </span>
                                    </>
                                )
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 border px-1">
                        <span className="text-sm flex items-center">Services : </span>
                        <div className="grid grid-cols-2">
                            {selectedServices.map((id) => {
                                const selectedService = listeServices.find((s) => s.id === id);
                                return (
                                    <>
                                        <span className="font-bold text-blue-900">
                                            {selectedService ?
                                                (
                                                    selectedService.nom_service
                                                ) : (id)
                                            } ;
                                        </span>
                                    </>
                                )
                            })}
                        </div>
                    </div>
                    <div className='w-full flex justify-center items-center'>
                        <button className='w-1/3 mx-3 bg-gray-400 rounded-2xl h-10 flex justify-center items-center'
                            onClick={() => {
                                setIsConfirmModalOpen(false);
                            }}
                        >
                            Annuler
                        </button>
                        <button className='w-1/3 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'
                            onClick={handleModify}
                        >
                            Valider
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}