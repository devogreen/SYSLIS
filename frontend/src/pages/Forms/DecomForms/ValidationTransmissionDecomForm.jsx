import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ValidationTransmissionDecomInputs from "../../../components/form/decommissionnement/ValidationTransmissionDecomInputs"

export default function ValidationTransmissionDecomForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Validation maintenance décom" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <ValidationTransmissionDecomInputs />
                </div>
            </div>
        </>
    )
}
