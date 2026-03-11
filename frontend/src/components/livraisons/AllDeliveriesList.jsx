import { useState, useEffect } from "react";
import { Link } from "react-router";

import { ProductDeliveries } from "../../backend/livraisons/productDeliveries"
import { generatePdf } from "../../backend/receptions/GeneratePDF";
import { Users } from "../../backend/users/Users";
import { Stock } from "../../backend/stock/Stock";

import Input from "../form/input/InputField";
import Label from "../form/Label";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";
import DatePicker from "../../components/form/date-picker";

import 'primeicons/primeicons.css';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from "primereact/multiselect";

import Swal from "sweetalert2";

export default function AllDeliveriesList({ filterType }) {

    const productDeliveries = new ProductDeliveries();
    const userData = new Users();
    const stockData = new Stock();

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationState"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allDeliveriesFilters";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();

    const [deliveryForms, setDeliveryForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [printingId, setPrintingId] = useState(null);
    const [globalFilter, setGlobalFilter] = useState(savedFilters?.globalFilter || "");
    const [selectedStatus, setSelectedStatus] = useState(savedFilters?.selectedStatus || []);
    const statusOptions = [
        { label: 'En cours', value: 'en_cours' },
        { label: 'Livré', value: 'livre' },
        { label: 'Retourné', value: 'en_attente' },
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

    const [datesLivraison, setDatesLivraison] = useState(
        savedFilters?.datesLivraison
            ? savedFilters.datesLivraison.map((d) => new Date(d))
            : null
    );

    const [datesReception, setDatesReception] = useState(
        savedFilters?.datesReception
            ? savedFilters.datesReception.map((d) => new Date(d))
            : null
    );

    addLocale('fr', {
        firstDayOfWeek: 1,
        showMonthAfterYear: false,
        dayNames: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
        dayNamesShort: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
        dayNamesMin: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
        monthNames: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        monthNamesShort: ['janv', 'févr', 'mars', 'avril', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
        today: 'Aujourd\'hui',
        clear: 'Effacer'
    });

    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedStatus,
            selectedType,
            datesLivraison: datesLivraison?.map(d => d?.toISOString()),
            datesReception: datesReception?.map(d => d?.toISOString()),
            selectedService,
            selectedModels,
        });
    }, [globalFilter, selectedStatus, selectedType, datesLivraison, datesReception, selectedService, selectedModels]);
    useEffect(() => {
        const fetchDeliveriesData = async () => {
            setLoading(true);
            try {
                let delivery_data = await productDeliveries.getAllLivraisons();
                console.log(delivery_data)
                setDeliveryForms(delivery_data)

                let type_deliveries_data = await productDeliveries.getAllTypeLivraisonCommerciale();
                let type_deliveries = type_deliveries_data.filter((type) => {
                    return type.is_deleted == false
                })
                setTypesLivraison(type_deliveries)
                const options_type = type_deliveries.map((item) => ({
                    value: item.id_type_livraison,
                    label: item.nom_type_livraison,
                }))
                setOptionsType(options_type)

                let services_data = await userData.getAllServices();
                const options_services = services_data.map((item) => ({
                    value: item.id,
                    label: item.nom_service.toUpperCase()
                }))
                setOptionsServices(options_services)

                let models_data = await stockData.getAllModels();
                const options_models = models_data.map((item) => ({
                    value: item.id_model,
                    label: item.nom_model.toUpperCase()
                }))
                setOptionsModels(options_models)

            } catch (error) {
                console.log('Error fetching data ', error)
            } finally {
                setLoading(false);
            }
        }; fetchDeliveriesData();
    }, [])

    const handlePageChange = (e) => {
        setFirst(e.first);
        setRows(e.rows);
        sessionStorage.setItem("paginationState", JSON.stringify({ first: e.first, rows: e.rows }));
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
    const titleTemplate = (deliveryForms) => {
        let title = '';
        let linkSee = `/formulaire/${deliveryForms.id_livraison}`;
        let titleClass = 'font-bold text-sm'
        let typeLivraison = typesLivraison.find((item) => {
            return item.id_type_livraison == deliveryForms.type_livraison_id
        })
        if (typeLivraison) {
            title = typeLivraison.nom_type_livraison.toUpperCase()
        }

        // if (deliveryForms.type_livraison_id === 1) {
        //     title = 'Livraison TPE GIM';
        //     titleClass = "font-bold text-sm text-fuchsia-400"
        // } else if (deliveryForms.type_livraison_id === 2) {
        //     title = 'Livraison TPE REPARE'; // fallback or other types
        //     titleClass = "font-bold text-sm text-red-400"
        // } else if (deliveryForms.type_livraison_id === 3) {
        //     title = 'Livraison TPE MAJ GIM'; // fallback or other types
        //     titleClass = "font-bold text-sm text-purple-400"
        // } else if (deliveryForms.type_livraison_id === 4) {
        //     title = 'Livraison TPE MOBILE'; // fallback or other types
        //     titleClass = "font-bold text-sm text-green-400"
        // } else if (deliveryForms.type_livraison_id === 5 || deliveryForms.type_livraison_id === 7) {
        //     title = 'Livraison CHARGEUR'; // fallback or other types
        //     titleClass = "font-bold text-sm text-yellow-400"
        //     linkSee = `/formulaire-chargeur/${deliveryForms.id_livraison}`
        // } else if (deliveryForms.type_livraison_id === 6) {
        //     title = 'Livraison TPE ECOBANK'; // fallback or other types
        //     titleClass = "font-bold text-sm text-cyan-400"
        // } else if (deliveryForms.type_livraison_id === 8) {
        //     title = 'Livraison CHARGEUR (DECOM RI NOK)'; // fallback or other types
        //     titleClass = "font-bold text-sm text-yellow-600";
        //     linkSee = `/formulaire-chargeur/${deliveryForms.id_livraison}`;
        // }
        return (
            <span className="flex flex-col">
                <Link key={deliveryForms.id_livraison}
                    to={linkSee} >
                    <span className={titleClass}>{title}</span>
                </Link>
                <span className="text-xs font-extralight">#{deliveryForms.id_livraison}</span>
            </span>
        );
    };
    const deliveryDateTemplate = (deliveryForms) => {
        return (<span className="text-gray-500 text-theme-sm dark:text-gray-400">{formatDate(deliveryForms.date_livraison)}</span>)
    }
    const receiveDateTemplate = (deliveryForms) => {
        if (deliveryForms.validations.length > 0 && deliveryForms.statut_livraison != 'en_cours') {
            let index = deliveryForms.validations.length - 1
            return (<span className="text-gray-500 text-theme-sm dark:text-gray-400">{formatDate(deliveryForms.validations[index].date_validation)}</span>)
        } else {
            return (<></>)
        }
    }
    const statutTemplate = (deliveryForms) => {
        let statutClass = ''
        let statut = ''
        if (deliveryForms.statut_livraison == 'en_cours') {
            statut = 'en cours';
            statutClass = 'grid grid-cols-1 text-center text-xs rounded-xl p-0.5 bg-orange-300'
        } else if (deliveryForms.statut_livraison == 'livre') {
            statut = 'Livré';
            statutClass = 'grid grid-cols-1 text-center text-xs rounded-xl p-0.5 bg-green-300'
        } else if (deliveryForms.statut_livraison == 'en_attente') {
            statut = 'retourné';
            statutClass = 'grid grid-cols-1 text-center text-xs rounded-xl p-0.5 bg-red-300'
        }
        return (
            <div>
                <span className={statutClass}>{statut}</span>
            </div>
        )
    }
    const actionTemplate = (deliveryForms) => {
        let linkSee = `/formulaire/${deliveryForms.id_livraison}`;
        let linkModify = `/form-modify-nouvelle-livraison/${deliveryForms.id_livraison}`

        return (
            <span className="flex items-center">
                <Link to={linkSee}>
                    <button className="mx-1">
                        <i className="pi pi-eye"></i>
                    </button>
                </Link>
                {deliveryForms.statut_livraison == 'livre' ?
                    (
                        <>
                            {printingId === deliveryForms.id_livraison ? (
                                <span className='mx-1'>
                                    <ProgressSpinner style={{ width: '15px', height: '15px' }} strokeWidth="8" animationDuration=".5s" />
                                </span>
                            ) : (
                                <button onClick={() => handleGeneratePdf(deliveryForms.id_livraison)}><span className="mx-1 text-gray-500 text-theme-sm dark:text-gray-400"><i className="pi pi-print"></i></span></button>
                            )}
                        </>
                    ) : (
                        <>
                        </>
                    )}
            </span>
        )
    }

    const handleClearFilters = () => {
        setGlobalFilter("");
        setSelectedStatus([]);
        setselectedService([]);
        setSelectedType([]);
        setSelectedModels([]);
        setDatesLivraison(null);
        setDatesReception(null);
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const filteredDeliveryForms = deliveryForms.filter((item) => {
        const dateLivraison = new Date(item.date_livraison);
        const dayLivraisonPlus = datesLivraison ? new Date(datesLivraison[1]) : null;
        dayLivraisonPlus?.setDate(dayLivraisonPlus.getDate() + 1);
        const nextDayLivraison = dayLivraisonPlus ? new Date(dayLivraisonPlus) : null;

        const dayReceptionPlus = datesReception ? new Date(datesReception[1]) : null;
        dayReceptionPlus?.setDate(dayReceptionPlus.getDate() + 1);
        const nextDayReception = dayReceptionPlus ? new Date(dayReceptionPlus) : null;
        let dateReception = null
        if (item.validations.length > 0) {
            let index = item.validations.length - 1
            const validation = item.validations[index]
            dateReception = new Date(validation.date_validation)
        }
        const matchesStatus = selectedStatus.length > 0 ? selectedStatus.includes(item.statut_livraison) : true;
        const matchesType = selectedType.length > 0 ? selectedType.includes(item.type_livraison_id) : true;
        const matchesService = selectedService.length > 0 ? selectedService.includes(item.service_id) : true;
        const matchesModel = selectedModels.length > 0 ? selectedModels.includes(item.model_id) : true;
        const matchesDatesLivraison = datesLivraison ? (datesLivraison[0] <= dateLivraison && nextDayLivraison >= dateLivraison) : true;
        const matchesDatesReception = datesReception ? (datesReception[0] <= dateReception && nextDayReception >= dateReception) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesStatus && matchesType && matchesService && matchesDatesLivraison && matchesDatesReception && matchesModel && matchesGlobalFilter;
    });

    const handleGlobalDownload = async () => {
        console.log(filteredDeliveryForms)
        try {
            setLoadingDownload(true)
            const listId = filteredDeliveryForms.map((f) => f.id_livraison);
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
        console.log(filteredDeliveryForms)
        try {
            setLoadingExtract(true)
            const listId = filteredDeliveryForms.map((f) => f.id_livraison);
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

    const totalProduit = filteredDeliveryForms.reduce((sum, item) => sum + Number(item.qte_totale_livraison || 0), 0);

    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="px-6 pt-6 flex items-center">
                    <div className="relative w-full">
                        <Input
                            className="pl-10"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder="Rechercher un formulaire..."
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
                    {/* <Dropdown
                        value={selectedStatus}
                        options={statusOptions}
                        onChange={(e) => setSelectedStatus(e.value)}
                        placeholder="Filtrer par statut"
                        showClear
                        className=""
                    /> */}
                    <MultiSelect
                        value={selectedStatus}
                        options={statusOptions}
                        display="chip"
                        optionLabel="label"
                        maxSelectedLabels={2}
                        onChange={(e) => setSelectedStatus(e.value)}
                        placeholder="Filtrer par statut"
                        className=""
                    />
                    <MultiSelect
                        value={selectedType}
                        options={optionsType}
                        display="chip"
                        optionLabel="label"
                        maxSelectedLabels={2}
                        onChange={(e) => setSelectedType(e.value)}
                        placeholder="Filtrer par type de livraison"
                        className=""
                    />
                    {/* <Dropdown
                        value={selectedType}
                        options={optionsType}
                        onChange={(e) => setSelectedType(e.value)}
                        placeholder="Filtrer par type de livraison"
                        showClear
                        className=""
                    /> */}
                    <MultiSelect
                        value={selectedService}
                        options={optionsServices}
                        display="chip"
                        optionLabel="label"
                        maxSelectedLabels={2}
                        onChange={(e) => setselectedService(e.value)}
                        placeholder="Filtrer par service"
                        className=""
                    />
                    <MultiSelect
                        value={selectedModels}
                        options={optionsModels}
                        display="chip"
                        optionLabel="label"
                        maxSelectedLabels={2}
                        onChange={(e) => setSelectedModels(e.value)}
                        placeholder="Filtrer par model de TPE"
                        className=""
                    />
                    {/* <Dropdown
                        value={selectedService}
                        options={optionsServices}
                        onChange={(e) => setselectedService(e.value)}
                        placeholder="Filtrer par service"
                        showClear
                        className=""
                    /> */}

                </div>
                <div className="flex justify-normal flex-wrap gap-3 mb-3 p-6">
                    {/* <div className="flex gap-2">
                        <DatePicker
                            id="date-picker-debut"
                            label="Date de début"
                            placeholder="Date de début"
                            value={startDate}
                            onChange={(dates, currentDateString) => {
                                setStartDate(dates[0])
                            }}
                            dateFormat="dd/mm/yy" />
                        <DatePicker
                            id="date-picker-fin"
                            label="Date de fin"
                            placeholder="Date de fin"
                            value={endDate}
                            onChange={(dates, currentDateString) => {
                                if (dates && dates[0]) {
                                    let selectedDate = new Date(dates[0]);
                                    let nextDay = new Date(selectedDate);
                                    nextDay.setDate(selectedDate.getDate() + 1);
                                    setEndDate(nextDay);
                                }
                            }}
                            dateFormat="dd/mm/yy" />
                    </div> */}
                    <div>
                        <Label>Dates Livraison</Label>
                        <Calendar
                            value={datesLivraison}
                            onChange={(e) => {
                                setDatesLivraison(e.value)
                                console.log(e.value)
                            }}
                            selectionMode="range"
                            readOnlyInput
                            hideOnRangeSelection
                            locale="fr"
                            dateFormat="dd/mm/yy"
                            placeholder="dd/mm/yyyy"
                        />
                    </div>
                    <div>
                        <Label>Dates Réception</Label>
                        <Calendar
                            value={datesReception}
                            onChange={(e) => setDatesReception(e.value)}
                            selectionMode="range"
                            readOnlyInput
                            hideOnRangeSelection
                            locale="fr"
                            dateFormat="dd/mm/yy"
                            placeholder="dd/mm/yyyy"
                        />
                    </div>
                </div>
                <div className="flex justify-between p-6 pt-0 items-center">
                    <div className="flex space-x-3 items-center">
                        <span className="text-md text-gray-600 dark:text-gray-300">
                            {filteredDeliveryForms.length} formulaire(s) trouvé(s)
                        </span>
                        <span className="text-sm text-blue-700 dark:text-gray-300">
                            {totalProduit} produit(s) trouvé(s)
                        </span>
                    </div>
                    <div className="flex space-x-3">
                        {loadingDownload ?
                            (
                                <span className='flex items-center justify-center'>
                                    <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                </span>
                            ) : (
                                <>
                                    {filteredDeliveryForms.length > 0 ?
                                        (
                                            <>
                                                <button className="flex items-center justify-center border rounded-full h-5 w-5 p-5 hover:text-white hover:bg-gray-dark hover:border-black transition-colors"
                                                    onClick={handleGlobalDownload}
                                                >
                                                    <span className="">
                                                        <i className="pi pi-folder"></i>
                                                    </span>
                                                </button>
                                            </>
                                        ) : (
                                            <></>
                                        )
                                    }
                                </>
                            )}
                        {loadingExtract ?
                            (
                                <span className='flex items-center justify-center'>
                                    <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                                </span>
                            ) : (
                                <>
                                    {filteredDeliveryForms.length > 0 ?
                                        (
                                            <>
                                                <button className="flex items-center justify-center border rounded-full h-5 w-5 p-5 hover:text-white hover:bg-gray-dark hover:border-black transition-colors"
                                                    onClick={handleExtractXLSX}
                                                >
                                                    <span className="">
                                                        <i className="pi pi-download"></i>
                                                    </span>
                                                </button>
                                            </>
                                        ) : (
                                            <></>
                                        )
                                    }
                                </>
                            )}
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredDeliveryForms}
                        loading={loading}
                        removableSort
                        paginator
                        rows={rows}
                        first={first}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                        tableStyle={{ minWidth: '50rem' }}
                        emptyMessage="Aucune livraison trouvée"
                        className="p-datatable-sm">

                        <Column field="id_livraison" header="Formulaire" body={titleTemplate} sortable></Column>
                        <Column field="qte_totale_livraison" header="Nbre produit" sortable></Column>
                        <Column field="date_livraison" header="Date Livraison" body={deliveryDateTemplate} sortable></Column>
                        <Column header="Date Réception" body={receiveDateTemplate}></Column>
                        <Column field="statut_livraison" header="Statut" body={statutTemplate}></Column>
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}