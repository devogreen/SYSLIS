import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllLivraisonParamDecomList from "../../components/livraisonParam/AllLivraisonParamDecomList";

export default function AllLivraisonParamDecom() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les livraisons des TPE à paramétrer" />
                <div className="">
                    <AllLivraisonParamDecomList />
                </div>
            </div>
        </>
    )
}
