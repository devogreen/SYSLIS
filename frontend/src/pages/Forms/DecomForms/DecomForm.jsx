import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import DecomInputs from "../../../components/form/decommissionnement/DecomInputs"

export default function DecomForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Décommissionnement TPE" />
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <DecomInputs />
          </div>  
        </div>
    )
}