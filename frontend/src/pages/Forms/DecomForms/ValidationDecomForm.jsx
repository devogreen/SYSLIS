import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ValidationDecomInputs from "../../../components/form/decommissionnement/ValidationDecomInputs"

export default function ValidationDecomForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Validation liste décom" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <ValidationDecomInputs />
                </div>
            </div>
        </>
    )
}
