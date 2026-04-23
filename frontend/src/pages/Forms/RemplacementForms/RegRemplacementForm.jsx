import PageBreadcrumb from "../../../components/common/PageBreadCrumb";;
import RegRemplacementInputs from "../../../components/form/remplacements/RegRemplacementInputs";

export default function RegRemplacementForm() {
    return (
      <div>
        <PageBreadcrumb pageTitle="Régularisation Remplacement" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
          <div className="space-y-6 flex justify-center">
            <div className="w-full">
              <RegRemplacementInputs />
            </div>
          </div>
        </div>  
      </div>
    )
}