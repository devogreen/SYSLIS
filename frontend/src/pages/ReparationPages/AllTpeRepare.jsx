import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllTpeRepareList from "../../components/reparation/AllTpeRepareList";

export default function AllTpeRepare() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les TPE réparés et à réparer" />
                <div className="">
                    <AllTpeRepareList />
                </div>
            </div>
        </>
    )
}