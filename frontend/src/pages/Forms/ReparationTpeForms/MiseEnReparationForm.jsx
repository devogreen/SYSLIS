import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import MiseEnReparationInputs from "../../../components/form/reparationTpe/MiseEnReparationInputs"

export default function MiseEnReparationForm() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Mise en réparation" />
      <div className="grid grid-cols-1 xl:grid-cols-1">
        <MiseEnReparationInputs />
      </div>
    </div>
  )
}