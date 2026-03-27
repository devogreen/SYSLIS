import PageBreadcrumb from "../../components/common/PageBreadCrumb"
import AllParcTpeList from "../../components/gestionTpe/AllParcTpeList"

export default function AllParcTpe() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Parc TPE" />
                <div className="">
                    <AllParcTpeList />
                </div>
            </div>
        </>
    )
}