import PageBreadcrumb from "../../../components/common/PageBreadCrumb"
import RebutInputs from "../../../components/form/rebut/RebutInputs"

export default function RebutForm() {
    return (
        <div>
          <PageBreadcrumb pageTitle="Mise au rebut" />
          <div className="grid grid-cols-1 xl:grid-cols-1">
            <RebutInputs />
          </div>  
        </div>
    )
}