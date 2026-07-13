import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import LiaisonTpePiecesInputs from "../../../components/form/maintenanceTpe/LiaisonTpePiecesInputs"

export default function LiaisonTpePiecesForm() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Liaison TPE pièces" />
      <div className="grid grid-cols-1 xl:grid-cols-1">
        <LiaisonTpePiecesInputs />
      </div>
    </div>
  )
}