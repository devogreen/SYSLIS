import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";

import { Remplacements } from "../../backend/livraisons/Remplacements";
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

import Checkbox from "../form/input/Checkbox";

export default function AllRemplacementsList() {

    const remplacements = new Remplacements();
    const userData = new Users();
    const stockData = new Stock();

    const savedPagination = JSON.parse(sessionStorage.getItem("remplacementPaginationState"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allRemplacementsFilters";

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

    const [optionsModels, setOptionsModels] = useState([])
    const [selectedOldModels, setSelectedOldModels] = useState(savedFilters?.selectedOldModels || [])
    const [selectedNewModels, setSelectedNewModels] = useState(savedFilters?.selectedNewModels || [])
    const [listModels, setListModels] = useState([])

    const [listParametrages, setListParametrages] = useState([])

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

    const [isReg, setIsReg] = useState(savedFilters?.isReg || false)
    const [isNotReg, setIsNotReg] = useState(savedFilters?.isNotReg || false)

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
            selectedOldModels,
            selectedNewModels,
            isReg,
            isNotReg,
        });
    }, [globalFilter, selectedStatus, datesLivraison, datesReception, selectedService, selectedOldModels, selectedNewModels, isReg, isNotReg]);

    useEffect(() => {
        const fetchDeliveriesData = async () => {
            setLoading(true);
            try {
                let delivery_data = await remplacements.getAllRemplacements();
                console.log(delivery_data)
                setDeliveryForms(delivery_data)

                let services_data = await userData.getAllServices();
                const options_services = services_data.map((item) => ({
                    value: item.id,
                    label: item.nom_service.toUpperCase()
                }))
                setOptionsServices(options_services)

                let models_data = await stockData.getAllModels();
                setListModels(models_data)
                const options_models = models_data.map((item) => ({
                    value: item.id_model,
                    label: item.nom_model.toUpperCase()
                }))
                setOptionsModels(options_models)

                let parametrages_data = await remplacements.getAllTypeParametrage()
                setListParametrages(parametrages_data)

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
        sessionStorage.setItem("remplacementPaginationState", JSON.stringify({ first: e.first, rows: e.rows }));
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR'); // or use any locale you want
    };
    const handleGeneratePdf = async (id) => {
        setPrintingId(id);
        try {
            const blob = await remplacements.generateRemplacementPDF(id);
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
        let linkSee = `/remplacement-details/${deliveryForms.id}`;
        let titleClass = 'font-bold text-sm'
        const model = listModels.find((item) => {
            return item.id_model == deliveryForms.old_model_id
        })
        if (model) {
            title = `Remplacement TPE ${model.nom_model.toUpperCase()}`
        }
        return (
            <span className="flex flex-col">
                <Link key={deliveryForms.id}
                    to={linkSee} >
                    <span className={titleClass}>{title}</span>
                </Link>
                <span className="text-xs font-extralight">#{deliveryForms.id}</span>
            </span>
        );
    };
    const newModelTemplate = (deliveryForms) => {
        const model = listModels.find((item) => {
            return item.id_model == deliveryForms.new_model_id
        })
        let nomModel = ''
        if (model) {
            nomModel = model.nom_model.toUpperCase()
        }

        return (
            <>
                <span className="font-bold text-sm">{nomModel}</span>
            </>
        )
    }
    const deliveryDateTemplate = (deliveryForms) => {
        return (<span className="text-gray-500 text-theme-sm dark:text-gray-400">{formatDate(deliveryForms.date_remplacement)}</span>)
    }
    const receiveDateTemplate = (deliveryForms) => {
        if (deliveryForms.validation_remplacement.length > 0 && deliveryForms.statut != 'en_cours') {
            let index = deliveryForms.validation_remplacement.length - 1
            return (<span className="text-gray-500 text-theme-sm dark:text-gray-400">{formatDate(deliveryForms.validation_remplacement[index].date_validation)}</span>)
        } else {
            return (<></>)
        }
    }
    const statutTemplate = (deliveryForms) => {
        let statutClass = ''
        let statut = ''
        if (deliveryForms.statut == 'en_cours') {
            statut = 'en cours';
            statutClass = 'grid grid-cols-1 text-center text-xs rounded-xl p-0.5 bg-orange-300'
        } else if (deliveryForms.statut == 'livre') {
            statut = 'Livré';
            statutClass = 'grid grid-cols-1 text-center text-xs rounded-xl p-0.5 bg-green-300'
        } else if (deliveryForms.statut == 'en_attente') {
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
        let linkSee = `/remplacement-details/${deliveryForms.id}`;

        return (
            <span className="flex items-center">
                <Link to={linkSee}>
                    <button className="mx-1">
                        <i className="pi pi-eye"></i>
                    </button>
                </Link>
                {deliveryForms.statut == 'livre' ?
                    (
                        <>
                            {printingId === deliveryForms.id ? (
                                <span className='mx-1'>
                                    <ProgressSpinner style={{ width: '15px', height: '15px' }} strokeWidth="8" animationDuration=".5s" />
                                </span>
                            ) : (
                                <button onClick={() => handleGeneratePdf(deliveryForms.id)}><span className="mx-1 text-gray-500 text-theme-sm dark:text-gray-400"><i className="pi pi-print"></i></span></button>
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
        setDatesLivraison(null);
        setDatesReception(null);
        setSelectedNewModels([]);
        setSelectedOldModels([]);
        sessionStorage.removeItem(FILTERS_KEY);
    }

    const filteredDeliveryForms = deliveryForms.filter((item) => {
        const dateLivraison = new Date(item.date_remplacement);
        const dayLivraisonPlus = datesLivraison ? new Date(datesLivraison[1]) : null;
        dayLivraisonPlus?.setDate(dayLivraisonPlus.getDate() + 1);
        const nextDayLivraison = dayLivraisonPlus ? new Date(dayLivraisonPlus) : null;

        const dayReceptionPlus = datesReception ? new Date(datesReception[1]) : null;
        dayReceptionPlus?.setDate(dayReceptionPlus.getDate() + 1);
        const nextDayReception = dayReceptionPlus ? new Date(dayReceptionPlus) : null;
        let dateReception = null
        if (item.validation_remplacement.length > 0) {
            let index = item.validation_remplacement.length - 1
            const validation = item.validation_remplacement[index]
            dateReception = new Date(validation.date_validation)
        }

        const form = item.forms

        const matchesReg = isReg ? form?.is_reg : true;
        const matchesNotReg = isNotReg ? !form?.is_reg : true;
        const matchesStatus = selectedStatus.length > 0 ? selectedStatus.includes(item.statut) : true;
        const matchesService = selectedService.length > 0 ? selectedService.includes(item.service_id) : true;
        const matchesOldModel = selectedOldModels.length > 0 ? selectedOldModels.includes(item.old_model_id) : true;
        const matchesNewModel = selectedNewModels.length > 0 ? selectedNewModels.includes(item.new_model_id) : true;
        const matchesDatesLivraison = datesLivraison ? (datesLivraison[0] <= dateLivraison && nextDayLivraison >= dateLivraison) : true;
        const matchesDatesReception = datesReception ? (datesReception[0] <= dateReception && nextDayReception >= dateReception) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesStatus && matchesService && matchesOldModel && matchesNewModel && matchesDatesLivraison && matchesDatesReception && matchesReg && matchesNotReg && matchesGlobalFilter;
    });

    const totalProduit = filteredDeliveryForms.reduce((sum, item) => sum + Number(item.quantite || 0), 0);

    const detailsParametrage = useMemo(() => {
        let totals = listParametrages.map((param) => ({
            id: param.id,
            nom: param.nom_parametrage.toLowerCase(),
            quantite: 0,
        }));

        filteredDeliveryForms.forEach((delivery) => {
            if (delivery.details_parametrage) {
                let parsedDetails;
                try {
                    parsedDetails = JSON.parse(delivery.details_parametrage);
                } catch {
                    parsedDetails = [];
                }

                if (Array.isArray(parsedDetails)) {
                    parsedDetails.forEach((detail) => {
                        let match = totals.find((p) => p.id === detail.id);
                        if (match) {
                            match.quantite += detail.quantite || 0;
                        }
                    });
                }
            }
        });

        return totals;
    }, [filteredDeliveryForms, listParametrages]);

    const handleExtractXLSX = async () => {
        console.log(filteredDeliveryForms)
        try {
            setLoadingExtract(true)
            const listId = filteredDeliveryForms.map((f) => f.id);
            if (listId.length == 0) {
                Swal.fire({
                    title: "Attention",
                    text: "Aucun remplacement enregistré",
                    icon: "warning"
                });
                return
            }
            const blob = await remplacements.generateRemplacementsXLSX(listId)

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            a.download = `remplacements_${timestamp}.xlsx`;
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

    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="p-6 space-y-7">
                    <div className="flex items-center">
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
                    <div className="grid grid-cols-3 gap-3 pb-0">
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
                            value={selectedOldModels}
                            options={optionsModels}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedOldModels(e.value)}
                            placeholder="Filtrer par model remplaçé"
                            className=""
                        />
                        <MultiSelect
                            value={selectedNewModels}
                            options={optionsModels}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedNewModels(e.value)}
                            placeholder="Filtrer par model remplaçant"
                            className=""
                        />
                    </div>
                    <div className="flex justify-normal flex-wrap gap-3">
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
                    <div className="flex items-center gap-3 my-2">
                        <Checkbox
                            checked={isReg}
                            onChange={(e) => {
                                if (isReg) {
                                    setIsReg(false)
                                } else {
                                    setIsReg(true)
                                    setIsNotReg(false)
                                }
                            }}
                            label="Régularisations" />
                    </div>
                    <div className="flex items-center gap-3 my-2">
                        <Checkbox
                            checked={isNotReg}
                            onChange={(e) => {
                                if (isNotReg) {
                                    setIsNotReg(false)
                                } else {
                                    setIsNotReg(true)
                                    setIsReg(false)
                                }
                            }}
                            label="Sans Régularisations" />
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex space-x-3 items-center">
                            <span className="text-md text-gray-600 dark:text-gray-300">
                                {filteredDeliveryForms.length} formulaire(s) trouvé(s)
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {totalProduit} TPE(s) remplacé(s)
                            </span>
                            <div className="flex space-x-2">
                                {detailsParametrage.map((param) => {

                                    let classQuantite = param.quantite > 0 ? "text-blue-700 font-medium" : "text-gray-600 font-medium"

                                    return (
                                        <>
                                            <div key={param.id} className="">
                                                <span className="text-xs text-gray-600">{param.nom} : <span className={classQuantite}>{param.quantite}</span></span>
                                            </div>
                                        </>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            {/* {loadingDownload ? 
                            (
                                <span className='flex items-center justify-center'>
                                    <ProgressSpinner style={{width: '20px', height: '20px'}} strokeWidth="8" animationDuration=".5s" />
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
                            )} */}
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
                        emptyMessage="Aucun remplacement trouvé"
                        className="p-datatable-sm">

                        <Column field="id" header="Formulaire" body={titleTemplate} sortable></Column>
                        <Column field="new_model_id" header="Model remplaçant" body={newModelTemplate} sortable></Column>
                        <Column field="quantite" header="Nbre produit" sortable></Column>
                        <Column field="date_remplacement" header="Date Livraison" body={deliveryDateTemplate} sortable></Column>
                        <Column header="Date Réception" body={receiveDateTemplate}></Column>
                        <Column field="statut" header="Statut" body={statutTemplate}></Column>
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}