import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import LivraisonParamDecomInputs from "../../../components/form/livraisonParam/LivraisonParamDecomInputs"

export default function LivraisonParamDecomForm() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Livraison TPE à paramétrer" />
                <div className="grid grid-cols-1 xl:grid-cols-1">
                    <LivraisonParamDecomInputs />
                </div>
            </div>
        </>
    )
}
