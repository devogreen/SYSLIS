import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllDemandesQrList from "../../components/demandeQr/AllDemandesQrList";

export default function AllDemandesQr() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez vos demandes" />
                <div className="">
                    <AllDemandesQrList />
                </div>
            </div>
        </>
    )
}