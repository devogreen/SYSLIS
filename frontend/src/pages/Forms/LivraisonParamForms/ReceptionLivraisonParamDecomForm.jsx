import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ReceptionLivraisonParamDecomInputs from "../../../components/form/livraisonParam/ReceptionLivraisonParamDecomInputs"

export default function ReceptionLivraisonParamDecomForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Réception livraison TPE à paramétrer" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <ReceptionLivraisonParamDecomInputs />
                </div>
            </div>
        </>
    )
}
