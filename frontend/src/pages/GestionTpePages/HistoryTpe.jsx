import PageBreadcrumb from "../../components/common/PageBreadCrumb"
import HistoryTpeList from "../../components/gestionTpe/historyTpeList"

export default function HistoryTpe() {
    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Historique TPE" />
                <div className="">
                    < HistoryTpeList/>
                </div>
            </div>
        </>
    )
}