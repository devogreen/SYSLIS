import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import RegVerificationInputs from "../../../components/form/decommissionnement/RegVerificationInputs"

export default function RegVerificationForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Régularisation Vérification TPE décom" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <RegVerificationInputs />
                </div>
            </div>
        </>
    )
}