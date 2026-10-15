import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ValidationReparationTpeInputs from "../../../components/form/reparationTpe/ValidationReparationTpeInputs"

export default function ValidationReparationTpeForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Validation lot de réparation" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <ValidationReparationTpeInputs />
                </div>
            </div>
        </>
    )
}
