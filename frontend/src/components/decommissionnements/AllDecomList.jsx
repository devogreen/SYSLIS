import { useEffect, useState } from "react"
import { Decom } from "../../backend/decom/decom"

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

export default function AllDecomList() {

    const decomData = new Decom()


    const [decomList, setDecomList] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            const AllDecoms = await decomData.getAllDecoms()
            const decoms = AllDecoms.filter((item) => {
                return item.forms.is_deleted == false
            })
            setDecomList(decoms)
        }
        fetchData()
    }, [])

    return (
        <>

            <div className="card">
                <DataTable
                    value={decomList}
                    // loading={loading}
                    removableSort
                    paginator
                    rows={1}
                    // first={first}
                    // onPage={handlePageChange}
                    rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                    tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                    emptyMessage="Aucun decommissionnement trouvé"
                    className="p-datatable-sm">

                    <Column field="id" header="ID" sortable></Column>
                    <Column field="statut" header="Statut" sortable></Column>
                    <Column field="quantite" header="Quantité" sortable></Column>
                    <Column field="forms.last_modified_at" header="Date" sortable></Column>
                </DataTable>
            </div>
        </>
    )
}