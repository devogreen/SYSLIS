import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import AllPiecesRebutsList from "../../components/rebut/AllPiecesRebutsList"

export default function AllPiecesRebut() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Retrouvez les pièces rebuts" />
                <div className="">
                    <AllPiecesRebutsList />
                </div>
            </div>
        </>
    )
}