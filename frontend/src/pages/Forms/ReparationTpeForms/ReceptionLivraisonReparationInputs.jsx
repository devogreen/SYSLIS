import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ReceptionLivraisonReparationInputs from "../../../components/form/reparationTpe/ReceptionLivraisonReparationInputs"

export default function ReceptionLivraisonReparationForm() {
    return (
        <div>
            <PageBreadcrumb pageTitle="Réception des TPE réparés" />
            <div className="grid grid-cols-1 xl:grid-cols-1">
                <ReceptionLivraisonReparationInputs />
            </div>
        </div>
    )
}