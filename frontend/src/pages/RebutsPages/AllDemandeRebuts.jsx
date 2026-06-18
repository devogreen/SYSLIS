import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllDemandeRebutsList from "../../components/rebut/AllDemandeRebutsList"

export default function AllDemandeRebuts() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les demandes de mise au rebut" />
                <div className="">
                    <AllDemandeRebutsList />
                </div>
            </div>
        </>
    )
}