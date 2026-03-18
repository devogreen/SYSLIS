import { useEffect, useState, useRef, use } from "react";
import { useNavigate, useParams } from "react-router";
import ComponentCard from "../../common/ComponentCard.tsx";
import Label from "../Label.tsx";
import Input from "../input/InputField.tsx";
import Checkbox from "../input/Checkbox";
import Select from "../Select.tsx";
import Swal from 'sweetalert2'
import { Modal } from "../../ui/modal/index.tsx";
import { ProgressSpinner } from "primereact/progressspinner";

import { Users } from "../../../backend/users/Users.js";

export default function ModifyProfilInputs() {

    const { id } = useParams();
    const userData = new Users()
    const navigate = useNavigate();

    const [loadingInfos, setLoadingInfos] = useState(false)
    const [loadingCreate, setLoadindCreate] = useState(false)
    const [errorForm, setErrorForm] = useState('')
    const [errorInput, setErrorInput] = useState('')

    const [user, setUser] = useState()
    const [users, setUsers] = useState([])
    const [nom, setNom] = useState([])
    const [nomUser, setNomUser] = useState('')
    const [prenomUser, setPrenomUser] = useState('')
    const [emailUser, setEmailUser] = useState('')
    const [passwordUser, setPasswordUser] = useState('')
    const [fullName, setFullName] = useState('')
    const [userName, setUserName] = useState('')

    const [roles, setRoles] = useState([])
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [services, setServices] = useState([])
    const [selectedServices, setSelectedServices] = useState([])

    const [isModalConfirmOpen, setIsModalConfirmOpen] = useState(false)

    const [mailChecked, setMailCheck] = useState(true)

    useEffect( ()=>{
        const fetchUserInfos = async () => {
            try{
                setLoadingInfos(true);

                const user_data = await userData.getOneUser(id)
                setUser(user_data)
                setNom(user_data.username.toUpperCase().replace("."," "))
                const fullName = user_data.fullname.split(" ")
                const nom = fullName.shift()
                setNomUser(nom.charAt(0) + nom.slice(1).toLowerCase())
                setPrenomUser(fullName.map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(" "))
                setEmailUser(user_data.email)
                
                const roles_data = await userData.getAllRoles()
                setRoles(roles_data)
                
                const services_data = await userData.getAllServices()
                setServices(services_data)

                const userRoles_data = await userData.getUserRoles(id)
                const roles_id = userRoles_data.roles.map((role) =>{
                    return role.id_role
                })
                setSelectedRoles(roles_id)

                const userServices_data = await userData.getUserServices(id)
                console.log(userServices_data)
                const services_id = userServices_data.services.map((service) =>{
                    return service.id
                })
                setSelectedServices(services_id)

            } catch(error){
                console.log("Erreur lors de la récupération des données : ",error)
            } finally{
                setLoadingInfos(false)
            }
        }
        fetchUserInfos();
    },[])

    const handleSelectRole = (roleId) => {
        setSelectedRoles((prevSelected) =>
        prevSelected.includes(roleId)
            ? prevSelected.filter((id) => id !== roleId)
            : [...prevSelected, roleId]
        );
    };

    const handleSelectService = (serviceId) => {
        setSelectedServices((prevSelected) =>
        prevSelected.includes(serviceId)
            ? prevSelected.filter((id) => id !== serviceId)
            : [...prevSelected, serviceId]
        );
    };

    const handleConfirm = () =>{
        
        if(!nomUser){
            setErrorInput("Vous devez saisir un nom !")
            return
        }
        if(!prenomUser){
            setErrorInput("Vous devez saisir un prénom !")
            return
        }
        if(!emailUser){
            setErrorInput("Vous devez saisir un email !")
            return
        }
        const existingUser = users.find((user) =>{
            return user.email == emailUser
        })

        if(existingUser){
            setErrorInput("Addresse e-mail déjà utilisée !")
            return
        }

        // if(!passwordUser){
        //     setErrorInput("Vous devez saisir un mot de passe !")
        //     return
        // }
        
        
        setIsModalConfirmOpen(true)

        const FULLNAME = (nomUser + " " + prenomUser).toUpperCase()
        setFullName(FULLNAME)

        const USERNAME = prenomUser.trim().split(' ')[0].toLowerCase() + '.' + nomUser.split(' ')[0].toLowerCase() 
        setUserName(USERNAME)

        setErrorInput('')

    }

    const handleModifyUser = async (e) =>{
        e.preventDefault()

        const payload = {
            fullname: fullName,
            username: userName,
            email: emailUser,
            userServices: selectedServices,
            userRoles: selectedRoles, 
            mailChecked: mailChecked,
        };
        try{
            setLoadindCreate(true) 
            setIsModalConfirmOpen(false)          
            console.log("Sending payload: ", payload);

            const response =  await userData.updateUser(id, payload)

            console.log(response)
            Swal.fire({
                title: "Succès",
                text: "Utilisateur modifié avec succès.",
                icon: "success"
            });
            navigate('/tous-les-utilisateurs');
        } catch(error){
            setLoadindCreate(false) 
            console.log("Erreur dans la modification de l'utilisateur : ",error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur est survenue lors de la modification de l'utilisateur.",
                icon: "warning"
            });
            navigate('/tous-les-utilisateurs');
        } finally{
            setLoadindCreate(false)
        }

    }

    return (
        <>
            <div className="flex justify-center mb-6">
                {loadingInfos ? (<>Loading...</>) : 
                    (
                        errorForm ? (
                            <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                {errorForm}
                            </div>
                            ) : (
                                    <>
                                        <ComponentCard className="md:w-1/2 w-full" title={`Modifier profil ${nom}`}>
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label htmlFor="input">Nom <span className="text-red-700">*</span></Label>
                                                        <Input type="text" placeholder="Amon" value={nomUser} onChange={(e) =>{
                                                            const value = e.target.value
                                                            if(/^[a-zA-Z\s]*$/.test(value)){
                                                                if(!(value.split(" ").length>1)){
                                                                    setNomUser(value)
                                                                }
                                                            }
                                                        }} />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="input">Prénoms <span className="text-red-700">*</span></Label>
                                                        <Input type="text" placeholder="Dorcas" value={prenomUser} onChange={(e) =>{
                                                            const value = e.target.value
                                                            if(/^[a-zA-Z\s]*$/.test(value)){
                                                                setPrenomUser(value)
                                                            }
                                                        }}  />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label htmlFor="input">Email <span className="text-red-700">*</span></Label>
                                                    <Input type="email" placeholder="dorcas@greenpayci.com" value={emailUser} onChange={(e) =>{
                                                        const value = e.target.value
                                                        setEmailUser(value)
                                                    }} />
                                                </div>
                                                {/* <div>
                                                    <Label htmlFor="input">Nouveau mot de passe</Label>
                                                    <Input type="text" value={passwordUser} onChange={(e) =>{
                                                        const value = e.target.value
                                                        setPasswordUser(value)
                                                    }}  />
                                                </div> */}
                                                <div>
                                                    <span className="text-md text-gray-700 font-medium px-0.5 border border-gray-500 rounded">Services utilisateur</span>
                                                    <div className="grid grid-cols-2">
                                                        {services.map((service =>{
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
                                                <div className="">
                                                    <span className="text-md text-gray-700 font-medium px-0.5 border border-gray-500 rounded">Rôles utilisateur</span>
                                                    <div className="grid grid-cols-2">
                                                        {roles.map((role =>{
                                                            const nomRole = role.nom_role.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                                                            return(
                                                                <>
                                                                    <div key={role.id_role} className="flex items-center gap-3 my-2">
                                                                        <Checkbox
                                                                            checked={selectedRoles.includes(role.id_role)}
                                                                            onChange={() => handleSelectRole(role.id_role)}
                                                                            label={nomRole} 
                                                                        />
                                                                    </div>
                                                                </>
                                                            )
                                                        }))}
                                                    </div>
                                                </div>
                                                <div className="text-right text-gray-500">
                                                    <span className="text-xs font-medium">
                                                        Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                                    </span>
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
                                                        )}
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-error-600">{errorInput}</span>
                                                </div>

                                            </div>
                                        </ComponentCard>
                                    </>
                                )
                    )
                }
            </div>

            <Modal isOpen={isModalConfirmOpen} onClose={() => setIsModalConfirmOpen(false)} className="p-6 max-w-xl">
                <div className=" space-y-8">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Modification profil</span>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 border px-1">
                            <span className="text-sm flex items-center">Nom complet : </span>
                            <span className="font-medium text-gray-600">{fullName}</span>
                        </div>
                        <div className="grid grid-cols-2 border px-1">
                            <span className="text-sm flex items-center">Username : </span>
                            <span className="font-medium text-gray-600">{userName}</span>
                        </div>
                        <div className="grid grid-cols-2 border px-1">
                            <span className="text-sm flex items-center">Email : </span>
                            <span className="font-medium text-gray-600">{emailUser}</span>
                        </div>
                        {passwordUser? (
                            <div className="grid grid-cols-2 border px-1">
                                <span className="text-sm flex items-center">Mot de passe : </span>
                                <span className="font-medium text-gray-600"> <i>{passwordUser}</i></span>
                            </div>
                        ) : (
                            <></>
                        )}
                        <div className="grid grid-cols-2 border px-1">
                            <span className="text-sm flex items-center">Services : </span>
                            <div className="grid grid-cols-2">
                                {selectedServices.map((id) =>{
                                    const selectedService = services.find((s) => s.id === id);
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
                        <div className="grid grid-cols-2 border px-1">
                            <span className="text-sm flex items-center">Rôles : </span>
                            <div className="grid grid-cols-2">
                                {selectedRoles.map((id) =>{
                                        const selectedRole = roles.find((r) => r.id_role === id);
                                        return(
                                            <>
                                                <span className="font-extrabold text-blue-900 text-sm">
                                                    {selectedRole ? 
                                                        (
                                                            selectedRole.nom_role.split("_").join(" ")
                                                            
                                                        ) : (id)
                                                    } ;
                                                </span>
                                            </>
                                        )
                                    })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <Checkbox
                            label="Envoyer mail de modification de profil"
                            checked={mailChecked}
                            onChange={() => {
                                if(mailChecked){
                                    setMailCheck(false)
                                } else{
                                    setMailCheck(true)
                                }
                            }}/>
                    </div>
                    <div className='w-full flex justify-center items-center'>
                        <button className='w-1/3 mx-3 bg-gray-400 rounded-2xl h-10 flex justify-center items-center'
                            onClick={() =>{
                                setIsModalConfirmOpen(false);
                            }}
                        >
                            Annuler
                        </button>
                        <button className='w-1/3 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'
                            onClick={handleModifyUser}
                        >
                            Valider
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}