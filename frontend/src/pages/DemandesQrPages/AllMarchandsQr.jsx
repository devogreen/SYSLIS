import PageBreadcrumb from "../../components/common/PageBreadCrumb"
import AllMarchandsQrList from "../../components/demandeQr/AllMarchandsQrList"


export default function AllMarchandsQr() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez Les Marchands QRC" />
                <div className="">
                    <AllMarchandsQrList />
                </div>
            </div>
        </>
    )
}