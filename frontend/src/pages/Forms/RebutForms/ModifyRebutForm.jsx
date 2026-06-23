import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ModifyRebutInputs from "../../../components/form/rebut/ModifyRebutInputs"

export default function ModifyRebutForm() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Modifier liste rebut" />
      <div className="grid grid-cols-1 xl:grid-cols-1">
        <ModifyRebutInputs />
      </div>
    </div>
  )
}