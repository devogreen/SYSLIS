import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllDecomList from "../../components/decommissionnements/allDecomList";

export default function AllDecom() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les décommissionnements" />
                <div className="">
                    <AllDecomList />
                </div>
            </div>
        </>
    )
}