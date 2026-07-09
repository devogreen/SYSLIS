import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllLivraisonReparationList from "../../components/reparation/AllLivraisonReparationList";

export default function AllLivraisonReparation() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les livraisons des TPE réparés" />
                <div className="">
                    <AllLivraisonReparationList />
                </div>
            </div>
        </>
    )
}