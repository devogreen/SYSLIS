import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import RegularisationLivraisonInputs from "../../../components/form/livraisons/RegularisationLivraisonInputs";

export default function RegularisationLivraisonForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Livraison" />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
            <div className="space-y-6 flex justify-center">
              <div className="w-full">
                <RegularisationLivraisonInputs />
              </div>
            </div>
          </div>  
        </div>
    )
}