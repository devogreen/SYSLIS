import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ManipulationTpeInputs from "../../../components/form/gestionTpe/ManipulationTpeInputs"

export default function ManipulationTpeForm() {
    return (
        <div>
            <PageBreadcrumb pageTitle="Manipuler TPE" />
            <div className="grid grid-cols-1 xl:grid-cols-1">
                <ManipulationTpeInputs />
            </div>
        </div>
    )
}