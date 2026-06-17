import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllTpeRebutsList from "../../components/rebut/AllTpeRebutsList"

export default function AllTpeRebuts() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les TPE au rebut" />
                <div className="">
                    <AllTpeRebutsList />
                </div>
            </div>
        </>
    )
}