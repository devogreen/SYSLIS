import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import SelectionQrInputs from "../../../components/form/demandes_qr/SelectionQrInputs"


export default function SelectionQrForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Sélection QR code" />
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <SelectionQrInputs />
          </div>  
        </div>
    )
}