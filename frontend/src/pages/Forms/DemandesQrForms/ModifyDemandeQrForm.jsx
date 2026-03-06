import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import ModifyDemandeQrInputs from "../../../components/form/demandes_qr/ModifyDemandeQrInputs"


export default function ModifyDemandeQrForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Modifier Demande QR code" />
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <ModifyDemandeQrInputs />
          </div>  
        </div>
    )
}