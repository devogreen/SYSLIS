import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ValiderRebutInputs from "../../../components/form/rebut/ValiderRebutInputs"

export default function ValiderRebutForm() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Validation de mise au rebut" />
      <div className="grid grid-cols-1 xl:grid-cols-1">
        <ValiderRebutInputs />
      </div>
    </div>
  )
}