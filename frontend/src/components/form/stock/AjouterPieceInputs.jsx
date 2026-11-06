import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import ComponentCard from "../../common/ComponentCard"
import Label from "../Label"
import Input from "../input/InputField"
import Select from "../Select"
import Checkbox from "../input/Checkbox"
import Swal from "sweetalert2"
import { Modal } from "../../ui/modal"
import { ProgressSpinner } from "primereact/progressspinner"

import { Stock } from "../../../backend/stock/Stock"
import { Users } from "../../../backend/users/Users"

export default function AjouterPieceInputs() {

    const stockData = new Stock()
    const usersData = new Users()
    const userId = localStorage.getItem("id")
    const navigate = useNavigate()

    const [loadingInfos, setLoadingInfos] = useState(false)
    const [loadingCreate, setLoadindCreate] = useState(false)
    const [errorForm, setErrorForm] = useState('')
    const [errorInput, setErrorInput] = useState('')

    const [stock, setStock] = useState([])
    
    const [nomPiece, setNomPiece] = useState('')
    
    const [listeServices, setListeServices] = useState([])
    const [listeModels, setListeModels] = useState([])
    
    const [selectedModels, setSelectedModels] = useState([])
    const [selectedServices, setSelectedServices] = useState([])

    const [codePiece, setCodePiece] = useState('')

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

    const [pieceType, setPieceType] = useState('PIECE')

    const [cartonLot, setCartonLot] = useState(0)
    const [pieceCarton, setPieceCarton] = useState(0)

    useEffect( () =>{
        const fetchData = async () =>{
            try{
                setLoadingInfos(true)
                const stock_data = await stockData.getAllItems()
                const filtered_stock = stock_data.filter((item) =>{
                    return item.is_deleted == 0
                })
                setStock(filtered_stock)

                const service_data = await usersData.getAllServices()
                setListeServices(service_data)

                const models_data = await stockData.getAllModels()
                setListeModels(models_data)

            } catch(error){
                setErrorForm("Une erreur s'est produite lors de la génération du formulaire.")
                console.log(error)
            } finally{
                setLoadingInfos(false)
            }
        }
        fetchData()
    },[])

    const options_types = [
        { value: "PIECE", label: "PIECE"},
        { value: "TERMINAL", label: "TERMINAL"},
    ]

    const changeType = (value) => {
        console.log("Selected value : ",value)
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
        if(!nomPiece.trim()){
            setErrorInput("Vous devez saisir un nom !")
            return
        }
        // if(!pieceType){
        //     setErrorInput("Vous devez choisir le type de pièce !")
        //     return
        // }
        if(selectedModels.length == 0){
            setErrorInput("Vous devez choisir un model !")
            return
        }
        if(selectedServices.length == 0){
            setErrorInput("Vous devez choisir un service !")
            return
        }

        const existingPiece = stock.find((item) =>{
            const sameName = item.nom_piece.toLowerCase().trim() == nomPiece.toLowerCase().trim()
            return sameName
        })

        if(existingPiece){
            setErrorInput("Cette pièce existe déjà !")
            return
        }

        setIsConfirmModalOpen(true)
        setErrorInput('')
    }

    const handleCreate = async (e) => {
        e.preventDefault()

        const payload = {
            nomPiece: nomPiece,
            type: pieceType,
            itemModels: selectedModels,
            itemServices: selectedServices,
            user_id: userId,
        }

        try{
            setLoadindCreate(true)
            setIsConfirmModalOpen(false)
            console.log("Sending payload: ", payload);
            const response = await stockData.addPiece(payload)
            console.log(response)
            Swal.fire({
                title: "Succès",
                text: "Nouvelle pièce ajouté au stock",
                icon: "success"
            })
            navigate('/voir-items')
        } catch(error){
            Swal.fire({
                title: "Attention",
                text: error?.message || "Une erreur est survenue lors de la création",
                icon: "warning"
            })
        } finally{
            setLoadindCreate(false)
        }
    }

    return(
        <>
            <div className="flex justify-center mb-6">
                {loadingInfos? (<>Loading...</>) : (
                    <>
                        {errorForm ? (
                            <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                {errorForm}
                            </div>
                        ) : (
                            <>
                                <ComponentCard className="md:w-1/2 w-full" title="Ajouter une nouvelle pièce">
                                    <div className="space-y-6">
                                        <div>
                                            <Label htmlFor="input">Nom pièce <span className="text-red-700">*</span></Label>
                                            <Input 
                                                type="text" 
                                                value={nomPiece}
                                                placeholder="Choisir un nom"
                                                onChange={(e) =>{
                                                    const value = e.target.value
                                                    setNomPiece(value)
                                                }}    
                                            />
                                        </div>
                                        {/* <div>
                                            <Label>Type <span className="text-red-700">*</span></Label>
                                            <Select 
                                                options={options_types}
                                                placeholder="Choisir une option"
                                                onChange={changeType}
                                                className="dark:bg-dark-900"
                                            />
                                        </div> */}
                                        <div>
                                            <span className="text-md text-gray-700 font-medium px-0.5 border border-gray-500 rounded">Modèle pièce</span>
                                            <div className="">
                                                {listeModels.map((model =>{
                                                    const nomModel = model.nom_model
                                                    return(
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
                                            <span className="text-md text-gray-700 font-medium px-0.5 border border-gray-500 rounded">Service gestionnaire</span>
                                            <div className="">
                                                {listeServices.map((service =>{
                                                    const nomService = service.nom_service
                                                    return(
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
                                            <Input type="text" placeholder="##" value={codePiece}
                                                onChange={(e) =>{
                                                    const value = e.target.value
                                                    setCodePiece(value)
                                                }}    
                                            />
                                        </div> */}
                                        {/* <div className="text-center">
                                            <span className="text-sm font-semibold">Paramètres de stock par défaut</span>
                                        </div> */}
                                        {/* <div>
                                            <Label>Quantité Carton/Lot</Label>
                                            <Input type="number" id="input" value={cartonLot}
                                                onChange={(e) =>{
                                                    const value = Number(e.target.value)
                                                    if(value>=0){
                                                        setCartonLot(value)
                                                    }
                                                }} 
                                            />
                                        </div> */}
                                        {/* <div>
                                            <Label>Quantité Pièce/Carton</Label>
                                            <Input type="number" id="input" value={pieceCarton}
                                                onChange={(e) =>{
                                                    const value = Number(e.target.value)
                                                    if(value>=0){
                                                        setPieceCarton(value)
                                                    }
                                                }} 
                                            />
                                        </div> */}
                                        <div className="text-center">
                                            <span className="text-sm text-error-600 font-bold">{errorInput}</span>
                                        </div>
                                        <div className='w-full mt-6 flex justify-center items-center'>
                                            {loadingCreate ? 
                                                (
                                                    <span className="">
                                                        <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="8" animationDuration=".5s" />
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={handleConfirm}
                                                        className='w-1/2 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                                        Valider
                                                    </button>
                                                )
                                            }
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
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} className="p-6 max-w-xl">
                <div className="space-y-6">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Nouvelle pièce</span>
                    </div>
                    <div>
                        <span>Vous allez ajouter une nouvelle pièce : <span className="text-red-500 font-medium">{nomPiece}</span></span>
                    </div>
                    <div>
                        <span>Type : <span className="text-red-500 font-medium">{pieceType}</span></span>
                    </div>
                    <div className="grid grid-cols-2 border px-1">
                        <span className="text-sm flex items-center">Modèles : </span>
                        <div className="grid grid-cols-2">
                            {selectedModels.map((id) =>{
                                const selectedModel = listeModels.find((s) => s.id_model === id);
                                return(
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
                            {selectedServices.map((id) =>{
                                const selectedService = listeServices.find((s) => s.id === id);
                                return(
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
                            onClick={() =>{
                                setIsConfirmModalOpen(false);
                            }}
                        >
                            Annuler
                        </button>
                        <button className='w-1/3 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'
                            onClick={handleCreate}
                        >
                            Valider
                        </button>
                    </div>
                </div>
            </Modal> 
        </>
    )
}