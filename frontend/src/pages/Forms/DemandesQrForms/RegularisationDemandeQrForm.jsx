import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import RegularisationDemandeQrInputs from "../../../components/form/demandes_qr/RegularisationDemandeQrInputs"


export default function RegularisationDemandeQrForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Régularisation Demande QR code" />
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <RegularisationDemandeQrInputs />
          </div>  
        </div>
    )
}