import { useState, useEffect } from "react";
import { Link } from "react-router";

import { DemandeQr } from "../../backend/demandeQr/DemandeQr";
import { Users } from "../../backend/users/Users";

import Input from "../form/input/InputField";
import { Calendar } from 'primereact/calendar';
import DatePicker from "../../components/form/date-picker";

import 'primeicons/primeicons.css';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from "primereact/multiselect";

import Swal from "sweetalert2";

export default function AllDemandesQrList() {

    const demandeData = new DemandeQr()
    const userData = new Users();

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateDemandesQr"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allDemandesQrFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();

    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [printingId, setPrintingId] = useState(null);
    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");
    const [selectedStatus, setSelectedStatus] = useState(savedFilters?.selectedStatus || []);
    const statusOptions = [
        { label: 'Soumise', value: 'soumise' },
        { label: 'Générée', value: 'generee' },
        { label: 'Imprimée', value: 'imprimee' },
        { label: 'Livrée', value: 'livree' },
        { label: 'Reçue', value: 'recue' },
    ];
    const [startDate, setStartDate] = useState(savedFilters?.startDate ? new Date(savedFilters.startDate) : null);
    const [endDate, setEndDate] = useState(savedFilters?.endDate ? new Date(savedFilters.endDate) : null);

    const [optionsServices, setOptionsServices] = useState([])
    const [selectedService, setselectedService] = useState(savedFilters?.selectedService || [])

    const [optionsType, setOptionsType] = useState([])
    const [selectedType, setSelectedType] = useState(savedFilters?.selectedType || [])

    const [typesLivraison, setTypesLivraison] = useState([])

    const [optionsModels, setOptionsModels] = useState([])
    const [selectedModels, setSelectedModels] = useState(savedFilters?.selectedModels || [])

    const [loadingDownload, setLoadingDownload] = useState(false)

    const [loadingExtract, setLoadingExtract] = useState(false)

    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedStatus,
            selectedType,
            startDate,
            endDate,
            selectedService,
            selectedModels,
        });
    }, [globalFilter, selectedStatus, selectedType, startDate, endDate, selectedService, selectedModels]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const AllDemandesQrData = await demandeData.getAllDemandesQr()
                console.log(AllDemandesQrData)
                const demandesQrData = AllDemandesQrData.filter((item) => {
                    return item.forms.is_deleted == false
                })
                setDemandes(demandesQrData)

            } catch (error) {
                console.log('Error fetching data ', error)
            } finally {
                setLoading(false);
            }
        }; fetchData();
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationStateDemandesQr", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };
    const handleGeneratePdf = async (id) => {
        setPrintingId(id);
        try {
            const blob = await generatePdf(id);
            const fileURL = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            window.open(fileURL, '_blank');
        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors de la génération du pdf",
                icon: "warning"
            });
        } finally {
            setPrintingId(null);
        }
    }
    const statutTemplate = (demande) => {
        let statutClass = ''
        let statut = ''
        if (demande.statut == 'soumise') {
            statut = 'soumise';
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-blue-50 text-blue-300'
        } else if (demande.statut == 'generee') {
            statut = 'générée';
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-blue-100 text-blue-500'
        } else if (demande.statut == 'imprimee') {
            statut = 'imprimée';
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-blue-200 text-blue-500'
        } else if (demande.statut == 'livree') {
            statut = 'livrée';
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-blue-300 text-blue-600'
        } else if (demande.statut == 'recue') {
            statut = 'reçue';
            statutClass = 'grid grid-cols-1 text-center text-xs font-semibold rounded-xl p-0.5 bg-green-100 text-green-500'
        }
        return (
            <div>
                <span className={statutClass}>{statut}</span>
            </div>
        )
    }
    const quantiteQrTemplate = (demande) => {
        return (
            <div className="">
                <span className="font-semibold">{demande.quantite_qr}</span>
            </div>
        )
    }
    const quantiteMarchandTemplate = (demande) => {
        return (
            <div className="">
                <span className="font-semibold">{demande.quantite_marchand}</span>
            </div>
        )
    }
    const dateDetmandeTemplate = (demande) => {
        return (
            <div className="">
                <span className="font-medium">{formatDate(demande.forms.last_modified_at)}</span>
            </div>
        )
    }
    const dateGenerationTemplate = (demande) => {
        const index = demande.generation_qr.length - 1
        const generation = demande.generation_qr[index]
        const dateValue = generation ? formatDate(generation.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const dateImpressionTemplate = (demande) => {
        const index = demande.impression_qr.length - 1
        const impression = demande.impression_qr[index]
        const dateValue = impression ? formatDate(impression.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const dateLivraisonTemplate = (demande) => {
        const index = demande.livraison_qr.length - 1
        const livraison = demande.livraison_qr[index]
        const dateValue = livraison ? formatDate(livraison.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const dateReceptionTemplate = (demande) => {
        const index = demande.reception_qr.length - 1
        const reception = demande.reception_qr[index]
        const dateValue = reception ? formatDate(reception.forms.last_modified_at) : 'N/A'
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const actionTemplate = (demande) => {
        const linkSee = `/demande-qr-details/${demande.id}`

        return (
            <>
                <div>
                    <span>
                        <Link to={linkSee}>
                            <button className="mx-1">
                                <i className="pi pi-eye" style={{fontSize: '13px'}}></i>
                            </button>
                        </Link>
                    </span>
                    {/* {demande.statut == 'recue' ? (
                        <>
                            <span>
                                {printingId === demande.id ? (
                                    <span className='mx-1'>
                                        <ProgressSpinner style={{ width: '15px', height: '15px' }} strokeWidth="8" animationDuration=".5s" />
                                    </span>
                                ) : (
                                    <button onClick={() => handleGeneratePdf(demande.id)}><span className="mx-1 text-gray-500 text-theme-sm dark:text-gray-400"><i className="pi pi-print"></i></span></button>
                                )}
                            </span>
                        </>
                    ) : (
                        <></>
                    )} */}
                </div>
            </>
        )
    }

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedStatus([]);
        setStartDate(null);
        setEndDate(null);
        sessionStorage.removeItem(FILTERS_KEY);
    }


    const filteredDemandes = demandes.filter((item) => {
        const form = item.forms
        const itemDate = new Date(form.last_modified_at);
        const matchesStatus = selectedStatus.length > 0 ? selectedStatus.includes(item.statut) : true;
        const matchesStartDate = startDate ? itemDate >= startDate : true;
        const matchesEndDate = endDate ? itemDate <= endDate : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesStatus && matchesStartDate && matchesEndDate && matchesGlobalFilter;
    });

    const totalQr = filteredDemandes.reduce((sum, item) => sum + Number(item.quantite_qr || 0), 0);


    const handleGlobalDownload = async () => {
        console.log(filteredDemandes)
        try {
            setLoadingDownload(true)
            const listId = filteredDemandes.map((f) => f.id_livraison);
            if (listId.length == 0) {
                Swal.fire({
                    title: "Attention",
                    text: "Aucune livraison enregistrée",
                    icon: "warning"
                });
                return
            }
            const blob = await productDeliveries.generateTotalPf(listId)

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            a.download = `livraisons_${timestamp}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors du téléchargement",
                icon: "warning"
            });
        } finally {
            setLoadingDownload(false);
        }
    }

    const handleExtractXLSX = async () => {
        console.log(filteredDemandes)
        try {
            setLoadingExtract(true)
            const listId = filteredDemandes.map((f) => f.id_livraison);
            if (listId.length == 0) {
                Swal.fire({
                    title: "Attention",
                    text: "Aucune livraison enregistrée",
                    icon: "warning"
                });
                return
            }
            const blob = await productDeliveries.generateDeliveriesXLSX(listId)

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            a.download = `livraisons_${timestamp}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.log(error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite lors du téléchargement",
                icon: "warning"
            });
        } finally {
            setLoadingExtract(false);
        }
    }

    // const totalProduit = filteredDemandes.reduce((sum, item) => sum + Number(item.qte_totale_livraison || 0), 0);

    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="px-6 pt-6 flex items-center">
                    <div className="relative w-full">
                        <Input
                            className="pl-10"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder="Rechercher une demande..."
                        />
                        <span className="absolute top-1/4 left-3"><i className="pi pi-search"></i></span>
                    </div>
                    <span className="pl-4">
                        <button onClick={handleClearFilters}>
                            <i className="pi pi-refresh"></i>
                        </button>
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-6 pb-0">
                    <MultiSelect
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.value)}
                        options={statusOptions}
                        display="chip"
                        optionLabel="label"
                        maxSelectedLabels={2}
                        placeholder="Filtrer par statut demande"
                        className=""
                    />
                </div>
                <div className="flex justify-normal flex-wrap gap-3 mb-3 p-6">
                    <div className="flex gap-2">
                        <DatePicker
                            id="date-picker-debut"
                            label="Date de début"
                            placeholder={startDate ? formatDate(startDate) : 'Date de début'}
                            value={startDate}
                            onChange={(dates) => {
                                setStartDate(dates[0])
                            }}
                            dateFormat="dd/mm/yy" />
                        <DatePicker
                            id="date-picker-fin"
                            label="Date de fin"
                            placeholder={endDate ? formatDate(endDate) : 'Date de fin'}
                            value={endDate}
                            onChange={(dates) => {
                                if (dates && dates[0]) {
                                    let selectedDate = new Date(dates[0]);
                                    let nextDay = new Date(selectedDate);
                                    nextDay.setDate(selectedDate.getDate() + 1);
                                    setEndDate(nextDay);
                                }
                            }}
                            dateFormat="dd/mm/yy" />
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-between">
                    <div className="flex space-x-3 items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {filteredDemandes.length} demande(s) trouvée(s)
                        </span>
                        <span className="text-xs text-gray-700 font-semibold dark:text-gray-300">
                            {totalQr} QR Codes(s)
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredDemandes}
                        loading={loading}
                        removableSort
                        paginator
                        rows={rows}
                        first={first}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                        tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                        emptyMessage="Aucune demande trouvée"
                        className="p-datatable-sm">

                        <Column field="id" header="ID" sortable></Column>
                        <Column field="statut" header="Statut" body={statutTemplate} sortable></Column>
                        <Column field="quantite_qr" header="Quantité QRC" body={quantiteQrTemplate} sortable></Column>
                        <Column field="quantite_marchand" header="Quantité Marchand" body={quantiteMarchandTemplate} sortable></Column>
                        <Column field="forms.last_modified_at" header="Date demande" body={dateDetmandeTemplate} sortable></Column>
                        <Column header="Date Génération" body={dateGenerationTemplate}></Column>
                        <Column header="Date Impression" body={dateImpressionTemplate}></Column>
                        <Column header="Date Livraison" body={dateLivraisonTemplate}></Column>
                        <Column header="Date Réception" body={dateReceptionTemplate}></Column>
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}