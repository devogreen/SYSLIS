import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import UpdateReparationTpeInputs from "../../../components/form/reparationTpe/UpdateReparationTpeInputs"

export default function UpdateReparationTpeForm() {
    return (
        <div>
            <PageBreadcrumb pageTitle="Modifier la liste de réparation des TPE" />
            <div className="grid grid-cols-1 xl:grid-cols-1">
                <UpdateReparationTpeInputs />
            </div>
        </div>
    )
}