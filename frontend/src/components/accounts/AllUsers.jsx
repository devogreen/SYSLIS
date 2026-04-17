import { useState, useEffect } from "react"
import { Link } from "react-router"
import Input from "../form/input/InputField"
import { DataTable } from "primereact/datatable"
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';

import { Users } from "../../backend/users/Users";

export default function AllUsers() {

    const usersData = new Users()
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [users, setUsers] = useState([])
    const [roles, setRoles] = useState([])
    const [userRoles, setUserRoles] = useState([])
    const [services, setServices] = useState([])
    const [userServices, setUserServices] = useState([])


    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoadingUsers(true);
                let user_data = await usersData.getAllUsers();
                setUsers(user_data);

                let roles_data = await usersData.getAllRoles();
                setRoles(roles_data);

                let userRoles_data = await usersData.getAllUserRoles();
                setUserRoles(userRoles_data);

                let services_data = await usersData.getAllServices();
                setServices(services_data);

                let userServices_data = await usersData.getAllUserServices();
                setUserServices(userServices_data);

            } catch (error) {
                console.log("Error fetch users : ", error)
            } finally {
                setLoadingUsers(false);
            }
        }

        fetchUsers();
    }, [])

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR');
    };

    const nomTemplate = (user) => {
        const nom = user.username
        const nomFinal = nom.split(".").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

        return (
            <>
                <span className="text-sm">
                    {nomFinal}
                </span>
            </>
        )
    }
    const emailTemplate = (user) => {
        const email = user.email

        return (
            <>
                <span className="text-sm font-bold">
                    {email}
                </span>
            </>
        )
    }
    const serviceTemplate = (user) => {
        const service_list = userServices.map((userServices => {
            if (userServices.user_id == user.id_user) {
                return userServices.service_id
            }
            return []
        }))

        const user_services = services.filter((service => {
            return service_list.includes(service.id)
        }))

        return (
            <>  
                <div className="max-h-40 overflow-y-auto">
                    {user_services.map((service => {

                        const nomService = service.nom_service
                        let serviceTag = 'px-1 rounded-xl bg-gray-400 text-xs text-black font-semibold'
                        return (
                            <>
                                <div className="flex-col">
                                    <span className={serviceTag}>{nomService}</span>
                                </div>
                            </>
                        )
                    }))}
                </div>
            </>
        )
    }
    const roleTemplate = (user) => {
        const role_list = userRoles.map((userRoles => {
            if (userRoles.user_id == user.id_user) {
                return userRoles.role_id
            }
            return []
        }))

        const user_roles = roles.filter((role => {
            return role_list.includes(role.id_role)
        }))

        return (
            <>
                <div className="max-h-40 overflow-y-auto">
                    {user_roles.map((role => {

                        const nomRole = role.nom_role.split("_").join(" ");
                        let roleTag = 'px-1 rounded-xl bg-gray-400 text-xs text-black font-bold'
                        return (
                            <>
                                <div className="flex-col">
                                    <span className={roleTag}>{nomRole}</span>
                                </div>
                            </>
                        )
                    }))}
                </div>
            </>
        )
    }
    const dateTemplate = (user) => {
        const date = user.created_at

        return (
            <>
                <span className="text-sm font-normal text-gray-600">
                    {formatDate(date)}
                </span>
            </>
        )
    }
    const actionsTemplate = (user) => {
        let linkModify = `/modifier-profil/${user.id_user}`

        return (
            <>
                <span className="flex items-center">
                    <Link to={linkModify}>
                        <button className="mx-1 text-gray-500 text-theme-sm dark:text-gray-400">
                            <i className="pi pi-pencil"></i>
                        </button>
                    </Link>
                </span>
            </>
        )
    }
    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">

                <div className="card">
                    <DataTable
                        value={users}
                        loading={loadingUsers}
                        removableSort
                        paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
                        tableStyle={{ minWidth: '50rem' }}
                        emptyMessage="Aucun utilisateur trouvé"
                        className="p-datatable-sm">

                        <Column field="id_user" header="ID" sortable></Column>
                        <Column field="username" header="Nom & Prénom" body={nomTemplate} sortable></Column>
                        <Column field="email" header="Email" body={emailTemplate} sortable></Column>
                        <Column header="Services" body={serviceTemplate}></Column>
                        <Column header="Rôles" body={roleTemplate}></Column>
                        <Column field="created_at" header="Date création" body={dateTemplate} sortable></Column>
                        <Column header="Actions" body={actionsTemplate}></Column>


                    </DataTable>
                </div>

            </div>
        </>
    )
}