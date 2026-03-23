import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import VerificationDecomInputs from "../../../components/form/decommissionnement/VerificationDecomInputs"

export default function VerificationDecomForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Vérification TPE décom" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <VerificationDecomInputs />
                </div>
            </div>
        </>
    )
}