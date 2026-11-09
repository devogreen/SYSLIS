import { useState, useEffect } from "react";
import { Users } from "../../backend/users/Users";
import { Tooltip } from 'primereact/tooltip';
import { ProgressSpinner } from 'primereact/progressspinner';
import AideGuideButton from "../../components/guide/AideGuideButton";

export default function UserDetails() {

    const userData = new Users()

    const userId = window.localStorage.getItem("id") || null;
    const rawName = window.localStorage.getItem("username") || "";
    const userName = rawName.split(".").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")

    const email = window.localStorage.getItem("email") || "";

    const [loading, setLoading] = useState(false)
    const [userServices, setUserServices] = useState([])
    const [userRoles, setUserRoles] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const services_data = await userData.getAllServices()

                const user_services_data = await userData.getUserServices(userId)
                const user_services_id = user_services_data.services.map((service) =>{
                    return service.id
                })

                const services = services_data.filter((item) => {
                    return user_services_id.includes(item.id)
                })
                setUserServices(services)

                const roles_data = await userData.getAllRoles()
                
                const user_roles_data = await userData.getUserRoles(userId)
                const user_roles_id = user_roles_data.roles.map((role) =>{
                    return role.id_role
                })

                const roles = roles_data.filter((item) =>{
                    return user_roles_id.includes((item.id_role))
                })
                setUserRoles(roles)

            } catch(error) {
                console.log('Error fetching data ',error)
            } finally {
                setLoading(false)
            }
        }
        fetchData();
    }, [])
    return (
        <>
            <div>
                <div className="flex justify-end mb-2">
                    <AideGuideButton />
                </div>
                <div className="border rounded-2xl bg-white">
                    {loading ? (
                        <>
                            <div className="flex justify-center items-center h-70">
                                <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="8" animationDuration=".5s" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-6 space-y-2">
                                <div className="flex items-center space-x-3">
                                    <span className="border rounded-full flex justify-center items-center h-20 w-20 text-gray-700">
                                        <i className="pi pi-user" style={{fontSize: '40px'}}></i>
                                    </span>
                                    <div>
                                        <span className="font-bold">{userName}</span>
                                        <div className="text-xs font-light">
                                            {userServices.map((item) => {
                                                const nom = item.nom_service
                                                return(
                                                    <>
                                                        <div className="flex-col">
                                                            <span>{nom}</span>
                                                        </div>
                                                    </>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="font-medium rounded-2xl px-1 bg-cyan-50 text-sm">
                                        {email}
                                    </span>
                                </div>
                                <div className="border rounded-2xl p-3 space-y-4">
                                    <div>
                                        <span className="border p-1 text-sm rounded-sm font-bold">RÔLES</span>
                                    </div>
                                    <div className="grid grid-cols-5 text-xs space-y-3">
                                        {userRoles.map((item) => {
                                            const nom = item.nom_role.split('_').join(' ')
                                            const description = item.description
                                            return(
                                                <>
                                                    <div>
                                                        <Tooltip target=".role" mouseTrack mouseTrackLeft={10} />
                                                        <span className="role p-0.5 font-medium border rounded-2xl bg-gray-200 cursor-pointer" data-pr-tooltip={description}>{nom}</span>
                                                    </div>
                                                </>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}