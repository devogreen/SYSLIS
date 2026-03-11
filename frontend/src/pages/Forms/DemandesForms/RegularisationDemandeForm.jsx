import RegularisationDemandeInputs from "../../../components/form/demandes/RegularisationDemandeInputs"
import PageBreadcrumb from "../../../components/common/PageBreadCrumb"

export default function RegularisationDemandeForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Régularisation mouvement stock" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <RegularisationDemandeInputs />
                </div>
            </div>
        </>
    )
}