import { useState, useEffect } from "react";
import { Link } from "react-router";

import { DemandeQr } from "../../backend/demandeQr/DemandeQr";
import { Users } from "../../backend/users/Users";

import Input from "../form/input/InputField";
import DatePicker from "../../components/form/date-picker";

import 'primeicons/primeicons.css';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from "primereact/multiselect";
import Checkbox from "../form/input/Checkbox";

import Swal from "sweetalert2";

import Label from "../form/Label";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";

export default function AllMarchandsQrList() {

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

    const demandeData = new DemandeQr()
    const userData = new Users();

    const savedPagination = JSON.parse(sessionStorage.getItem("paginationStateMarchandsQr"));

    const [first, setFirst] = useState(savedPagination?.first || 0);
    const [rows, setRows] = useState(savedPagination?.rows || 5);

    const FILTERS_KEY = "allMarchandsQrList";

    const saveFilters = (filters) => {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    };

    const loadFilters = () => {
        const stored = sessionStorage.getItem(FILTERS_KEY);
        return stored ? JSON.parse(stored) : null;
    };

    const savedFilters = loadFilters();

    const [marchandsQr, setMarchandsQr] = useState([]);
    const [demandesQr, setDemandesQr] = useState([]);
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

    const [typesLivraison, setTypesLivraison] = useState([])

    const [optionsModels, setOptionsModels] = useState([])
    const [selectedModels, setSelectedModels] = useState(savedFilters?.selectedModels || [])

    const [loadingDownload, setLoadingDownload] = useState(false)

    const [loadingExtract, setLoadingExtract] = useState(false)

    const [typesQr, setTypesQr] = useState([])
    const [optionsType, setOptionsType] = useState([])
    const [selectedTypes, setSelectedTypes] = useState(savedFilters?.selectedTypes || [])

    const [formatsQr, setFormatsQr] = useState([])
    const [optionsFormat, setOptionsFormat] = useState([])
    const [selectedFormats, setSelectedFormats] = useState(savedFilters?.selectedFormats || [])

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

    const [optionsDemandes, setOptionsDemandes] = useState([])
    const [selectedDemandes, setSelectedDemandes] = useState(savedFilters?.selectedDemandes || [])

    useEffect(() => {
        saveFilters({
            globalFilter,
            selectedStatus,
            selectedTypes,
            datesLivraison: datesLivraison?.map(d => d?.toISOString()),
            datesReception: datesReception?.map(d => d?.toISOString()),
            selectedFormats,
            selectedDemandes,
        });
    }, [globalFilter, selectedStatus, selectedTypes, datesLivraison, datesReception, selectedFormats, selectedDemandes]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const allMarchandsQrData = await demandeData.getAllMarchandsQr()
                // console.log(allMarchandsQrData)
                const marchandsQr = allMarchandsQrData.filter((item) => {
                    return item.is_deleted == false
                })
                setMarchandsQr(marchandsQr)

                const AllDemandesQrData = await demandeData.getAllDemandesQr()
                // console.log(AllDemandesQrData)
                const demandesQrData = AllDemandesQrData.filter((item) => {
                    return item.forms.is_deleted == false
                })
                setDemandesQr(demandesQrData)
                const demandesLivrees = demandesQrData.filter((item) => {
                    return item.statut == 'recue'
                })
                const optionsDemandes = demandesLivrees.map((item) => ({
                    label: `Demande #${item.id} - ${item.quantite_qr} QR Codes`,
                    value: item.id,
                }))
                setOptionsDemandes(optionsDemandes)

                const typesQrData = await demandeData.getAllTypePaiement()
                setTypesQr(typesQrData)
                const optionsType = typesQrData.map((item) => ({
                    label: item.nom,
                    value: item.id,
                }))
                setOptionsType(optionsType)

                const formatsQrData = await demandeData.getAllFormatsQr()
                setFormatsQr(formatsQrData)
                const optionsFormat = formatsQrData.map((item) => ({
                    label: item.format,
                    value: item.id,
                }))
                setOptionsFormat(optionsFormat)

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
        sessionStorage.setItem("paginationStateMarchandsQr", JSON.stringify({ first: e.first, rows: e.rows }));
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
    const quantiteQrTemplate = (marchand) => {
        return (
            <div className="">
                <span className="font-semibold">{marchand.quantite_qr}</span>
            </div>
        )
    }
    const typeQrTemplate = (marchand) => {
        const typeId = marchand.type_id
        const type = typesQr.find((item) => {
            return item.id == typeId
        })
        let nom = 'N/A'
        if (type) {
            nom = type.nom
        }
        return (
            <div className="">
                <span className="font-medium">{nom}</span>
            </div>
        )
    }
    const formatQrTemplate = (marchand) => {
        const formatId = marchand.format_id
        const format = formatsQr.find((item) => {
            return item.id == formatId
        })
        let nom = 'N/A'
        if (format) {
            nom = format.format
        }
        return (
            <div className="">
                <span className="font-medium">{nom}</span>
            </div>
        )
    }
    const dateLivraisonTemplate = (marchand) => {
        let dateValue = 'N/A'
        const demandeId = marchand.demande_id
        const demande = demandesQr.find((item) => {
            return item.id == demandeId
        })
        if (demande) {
            const index = demande.livraison_qr.length - 1
            const livraison = demande.livraison_qr[index]
            dateValue = livraison ? formatDate(livraison.forms.last_modified_at) : 'N/A'
        }
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }
    const dateReceptionTemplate = (marchand) => {
        let dateValue = 'N/A'
        const demandeId = marchand.demande_id
        const demande = demandesQr.find((item) => {
            return item.id == demandeId
        })
        if (demande) {
            const index = demande.reception_qr.length - 1
            const reception = demande.reception_qr[index] || null
            dateValue = reception ? formatDate(reception.forms.last_modified_at) : 'N/A'
        }
        return (
            <div className="">
                <span className="font-medium">{dateValue}</span>
            </div>
        )
    }

    const actionTemplate = (marchand) => {
        const linkSee = `/demande-qr-details/${marchand.demande_id}`
        return (
            <>
                <div>
                    <span>
                        <Link to={linkSee}>
                            <button className="mx-1">
                                <i className="pi pi-eye" style={{ fontSize: '13px' }}></i>
                            </button>
                        </Link>
                    </span>
                    {/* {marchand.statut == 'recue' ? (
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
        setSelectedTypes([]);
        setSelectedFormats([]);
        setDatesLivraison(null);
        setDatesReception(null);
        setSelectedDemandes([]);
        sessionStorage.removeItem(FILTERS_KEY);
    }


    const filteredMarchandsQr = marchandsQr.filter((item) => {

        let dateReception = null
        let dateLivraison = null

        const demandeId = item.demande_id
        const demande = demandesQr.find((item) => {
            return item.id == demandeId
        })
        if (demande) {
            const indexLivraison = demande.livraison_qr.length - 1
            const livraison = demande.livraison_qr[indexLivraison]
            dateLivraison = new Date(livraison.forms.last_modified_at)

            const indexReception = demande.reception_qr.length - 1
            const reception = demande.reception_qr[indexReception] || null
            dateReception = new Date(reception.forms.last_modified_at)
        }

        const dayReceptionPlus = datesReception ? new Date(datesReception[1]) : null;
        dayReceptionPlus?.setDate(dayReceptionPlus.getDate() + 1);
        const nextDayReception = dayReceptionPlus ? new Date(dayReceptionPlus) : null;

        const dayLivraisonPlus = datesLivraison ? new Date(datesLivraison[1]) : null;
        dayLivraisonPlus?.setDate(dayLivraisonPlus.getDate() + 1);
        const nextDayLivraison = dayLivraisonPlus ? new Date(dayLivraisonPlus) : null

        const matchesDemande = selectedDemandes.length > 0 ? selectedDemandes.includes(item.demande_id) : true;
        const matchesDatesLivraison = datesLivraison ? (datesLivraison[0] <= dateLivraison && nextDayLivraison >= dateLivraison) : true;
        const matchesDatesReception = datesReception ? (datesReception[0] <= dateReception && nextDayReception >= dateReception) : true;
        const matchesType = selectedTypes.length > 0 ? selectedTypes.includes(item.type_id) : true;
        const matchesFormat = selectedFormats.length > 0 ? selectedFormats.includes(item.format_id) : true;
        const matchesGlobalFilter = globalFilter
            ? JSON.stringify(item).toLowerCase().includes(globalFilter.toLowerCase())
            : true;
        return matchesDatesLivraison && matchesDatesReception && matchesType && matchesFormat && matchesDemande && matchesGlobalFilter ;
    });

    const totalQr = filteredMarchandsQr.reduce((sum, item) => sum + Number(item.quantite_qr || 0), 0);
    const totalTpe = filteredMarchandsQr.reduce((sum, item) => sum + Number(item.quantite_sn || 0), 0);

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
                                placeholder="Rechercher un marchand..."
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
                            value={selectedTypes}
                            options={optionsType}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedTypes(e.value)}
                            placeholder="Filtrer par type"
                            className=""
                        />
                        <MultiSelect
                            value={selectedFormats}
                            options={optionsFormat}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedFormats(e.value)}
                            placeholder="Filtrer par format"
                            className=""
                        />
                        <MultiSelect
                            value={selectedDemandes}
                            options={optionsDemandes}
                            display="chip"
                            optionLabel="label"
                            maxSelectedLabels={2}
                            onChange={(e) => setSelectedDemandes(e.value)}
                            placeholder="Filtrer par demande"
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
                                }}
                                selectionMode="range"
                                readOnlyInput
                                hideOnRangeSelection
                                locale="fr"
                                dateFormat="dd/mm/yy"
                                placeholder="jj/mm/aaaa - jj/mm/aaaa"
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
                                placeholder="jj/mm/aaaa - jj/mm/aaaa"
                            />
                        </div>
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-between">
                    <div className="flex space-x-3 items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {filteredMarchandsQr.length} marchand(s) trouvé(s)
                        </span>
                        <span className="text-xs text-gray-700 font-semibold dark:text-gray-300">
                            {totalTpe} TPE(s)
                        </span>
                        <span className="text-xs text-cyan-700 font-bold dark:text-gray-300">
                            {totalQr} QR Codes(s)
                        </span>
                    </div>
                </div>
                <div className="card">
                    <DataTable
                        value={filteredMarchandsQr}
                        loading={loading}
                        removableSort
                        paginator
                        rows={rows}
                        first={first}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 200, 300, 500, 1000]}
                        tableStyle={{ minWidth: '50rem', fontSize: '11px' }}
                        emptyMessage="Aucun marchand trouvé"
                        className="p-datatable-sm">

                        <Column field="id" header="ID" sortable></Column>
                        <Column field="nom_marchand" header="Marchand" sortable></Column>
                        <Column field="quantite_sn" header="Quantité TPE" body={''} sortable></Column>
                        <Column field="quantite_qr" header="Quantité QRC" body={quantiteQrTemplate} sortable></Column>
                        <Column field="type_id" header="Type" body={typeQrTemplate} sortable></Column>
                        <Column field="format_id" header="Format" body={formatQrTemplate} sortable></Column>
                        <Column header="Date Livraison" body={dateLivraisonTemplate}></Column>
                        <Column header="Date Réception" body={dateReceptionTemplate}></Column>
                        <Column header="Actions" body={actionTemplate}></Column>
                    </DataTable>
                </div>
            </div>
        </>
    )
}