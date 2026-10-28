import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import DecomStats from "../../components/decommissionnements/DecomStats";

export default function DecomDashboard() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Tableau de bord des décommissionnements" />
                <div className="">
                    <DecomStats />
                </div>
            </div>
        </>
    )
}