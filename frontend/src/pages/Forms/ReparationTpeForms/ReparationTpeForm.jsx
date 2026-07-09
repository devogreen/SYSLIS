import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ReparationTpeInputs from "../../../components/form/reparationTpe/ReparationTpeInputs"

export default function ReparationTpeForm() {
    return (
        <div>
            <PageBreadcrumb pageTitle="Réparation TPE" />
            <div className="grid grid-cols-1 xl:grid-cols-1">
                <ReparationTpeInputs />
            </div>
        </div>
    )
}