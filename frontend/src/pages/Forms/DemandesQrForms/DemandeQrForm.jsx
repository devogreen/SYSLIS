import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import DemandeQrInputs from "../../../components/form/demandes_qr/DemandeQrInputs"


export default function DemandeQrForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Demande QR code" />
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <DemandeQrInputs />
          </div>  
        </div>
    )
}