import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import RegDecomInputs from "../../../components/form/decommissionnement/RegDecomInputs"

export default function RegDecomForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Régularisation Décommissionnement TPE" />
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <RegDecomInputs />
          </div>  
        </div>
    )
}