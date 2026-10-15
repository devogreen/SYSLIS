import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllReparationTpeList from "../../components/reparation/AllReparationTpeList";

export default function AllReparationTpe() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les lots de TPE en réparation" />
                <div className="">
                    <AllReparationTpeList />
                </div>
            </div>
        </>
    )
}
