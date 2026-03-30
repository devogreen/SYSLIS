import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ModifyDecomInputs from "../../../components/form/decommissionnement/ModifyDecomInputs"

export default function ModifyDecomForm() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Modifier Décom TPE" />
      <div className="grid grid-cols-1 xl:grid-cols-1">
        <ModifyDecomInputs />
      </div>
    </div>
  )
}