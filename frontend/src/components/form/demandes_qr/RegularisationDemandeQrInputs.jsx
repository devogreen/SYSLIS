import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router";
import { Merchants } from "../../../backend/livraisons/Merchants"
import { DemandeQr } from "../../../backend/demandeQr/DemandeQr";
import ComponentCard from "../../common/ComponentCard";

import { Dropdown } from "primereact/dropdown";
import Select from "../Select";
import DatePicker from "../date-picker";
import Label from "../Label";
import Input from "../input/InputField";
import Checkbox from "../input/Checkbox";
import TextArea from "../input/TextArea";

import { Modal } from "../../ui/modal";
import SignatureCanvas from "react-signature-canvas";
import JSZip from "jszip";
import { useDropzone } from "react-dropzone"

import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../ui/table";
import { format } from "date-fns";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";
import Swal from "sweetalert2";
import { ProgressSpinner } from "primereact/progressspinner";


export default function RegularisationDemandeQrInputs() {

    const merchantsData = new Merchants();
    const demandeData = new DemandeQr()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()

    const [loadingData, setLoadingData] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)

    const [errorForm, setErrorForm] = useState('')
    const [errorAjout, setErrorAjout] = useState('')
    const [pointsMarchands, setPointsMarchands] = useState([])
    const [optionsMarchands, setOptionsMarchands] = useState([])
    const [quantiteTerminal, setQuantiteTerminal] = useState(0)
    const [quantiteQr, setQuantiteQr] = useState(0)
    const [quantite, setQuantite] = useState(1)

    const [selectedTypeQr, setSelectedTypeQr] = useState('')
    const [selectedChaine, setSelectedChaine] = useState('')
    const [selectedMarchand, setSelectedMarchand] = useState('')

    const [quantiteTotale, setQuantiteTotale] = useState(0)
    const [totalQr, setTotalQr] = useState(0)

    const [listeLivraison, setListeLivraison] = useState([])

    const [isModalParMarchand, setIsModalParMarchand] = useState(false)
    const [isModalParChaineOpen, setIsModalParChaineOpen] = useState(false)

    const [chaineGroup, setChaineGroup] = useState([])

    const [optionsChaine, setOptionsChaines] = useState([])

    const [marchandFields, setMarchandsFields] = useState([])

    const [parChaine, setParChaine] = useState(false)
    const [parMarchand, setParMarchand] = useState(false)

    const [selectedDateDemande, setSelectedDateDemande] = useState()
    const [selectedDateGeneration, setSelectedDateGeneration] = useState()
    const [selectedDateImpression, setSelectedDateImpression] = useState()
    const [selectedDateLivraison, setSelectedDateLivraison] = useState()
    const [selectedDateReception, setSelectedDateReception] = useState()

    const [commentaire, setCommentaire] = useState('')

    const [isSignModalOpen, setIsSignModalOpen] = useState(false)
    const [signature, setSignature] = useState();
    const [errorSign, setErrorSign] = useState('')

    const [listeQr, setListeQr] = useState([])
    const [optionsQr, setOptionsQr] = useState([])
    const [selectedNomQr, setSelectedNomQr] = useState('')

    const [listeFormats, setListeForms] = useState([])
    const [optionsFormats, setOptionsFormats] = useState([])
    const [selectedFormat, setSelectedFormat] = useState(null)
    const [format, setFormat] = useState('')

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [nbreMarchand, setNbreMarchand] = useState(0)

    const [selectedFiles, setSelectedFiles] = useState([])

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

    const getFormattedDate = (date) => format(date, 'yyyy-MM-dd');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)
                const merchantList = await merchantsData.findMerchant()
                // console.log(merchantList)

                // Fonction pour avoir une liste des marchands individuellement et leur chaîne ainsi que le nombre de leur TPE
                const countByPointMarchand = merchantList.reduce((acc, { CHAINE, POINT_MARCHAND }) => {
                    const key = `${CHAINE}__${POINT_MARCHAND}`
                    if (!acc[key]) {
                        acc[key] = {
                            CHAINE,
                            POINT_MARCHAND,
                            count: 0
                        }
                    }
                    acc[key].count += 1
                    return acc
                }, {})
                const countPm = Object.values(countByPointMarchand)
                setPointsMarchands(countPm)
                // console.log(countPm)
                const optionsPm = countPm.map((item) => ({
                    label: item.POINT_MARCHAND,
                    value: item.POINT_MARCHAND
                }))
                setOptionsMarchands(optionsPm)

                // Fonction pour avoir la liste des marchands + nbr de TPE, groupés par chaîne
                const groupedChaine = merchantList.reduce((acc, item) => {
                    const { CHAINE, POINT_MARCHAND } = item

                    // 1️⃣ Create group if it doesn't exist
                    if (!acc[CHAINE]) {
                        acc[CHAINE] = {}
                    }

                    // 2️⃣ Create point marchand inside group if not exists
                    if (!acc[CHAINE][POINT_MARCHAND]) {
                        acc[CHAINE][POINT_MARCHAND] = 0
                    }

                    // 3️⃣ Increment serial count
                    acc[CHAINE][POINT_MARCHAND] += 1

                    return acc
                }, {})
                // 4️⃣ Convert object to desired array structure
                const listeChaine = Object.entries(groupedChaine).map(
                    ([CHAINE, points]) => ({
                        CHAINE,
                        POINT_MARCHAND: Object.entries(points).map(
                            ([POINT_MARCHAND, sn_count]) => ({
                                POINT_MARCHAND,
                                sn_count
                            })
                        )
                    })
                )
                setChaineGroup(listeChaine)
                // console.log(listeChaine)
                const optionsC = listeChaine.map((item) => ({
                    label: item.CHAINE,
                    value: item.CHAINE
                }))
                setOptionsChaines(optionsC)

                const allPaiementType = await demandeData.getAllTypePaiement()
                const qrTypes = allPaiementType.filter((item) => {
                    return item.qr_code == true
                })
                setListeQr(qrTypes)
                const optionsQr = qrTypes.map((item) => ({
                    label: item.nom,
                    value: item.id
                }))
                setOptionsQr(optionsQr)

                const formatQrData = await demandeData.getAllFormatsQr()
                setListeForms(formatQrData)
                const optionsFormats = formatQrData.map((item) => ({
                    label: item.format,
                    value: item.id,
                }))
                setOptionsFormats(optionsFormats)

            } catch (error) {
                console.log('Error fetching data ', error)
                setErrorForm("Une erreur s'est produite lors de la génération du formulaire !")
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    // const optionsTypeQr = [
    //     { label: 'Orange Money', value: 'Orange Money' },
    //     { label: 'MTN Money', value: 'MTN Money' },
    //     { label: 'MOOV Money', value: 'MOOV Money' },
    // ]

    // const optionsFormat = [
    //     { label: 'Orange Money', value: 'Orange Money' },
    //     { label: 'MTN Money', value: 'MTN Money' },
    //     { label: 'MOOV Money', value: 'MOOV Money' },
    // ]
    const onDrop = useCallback(async (acceptedFiles) => {
        const updatedFiles = [...selectedFiles];

        for (const file of acceptedFiles) {

            // Handle ZIP files
            if (file.type === "application/zip" || file.name.endsWith(".zip")) {
                try {
                    const zip = await JSZip.loadAsync(file);

                    const extractedFiles = await Promise.all(
                        Object.keys(zip.files).map(async (filename) => {
                            const zipEntry = zip.files[filename];

                            if (!zipEntry.dir) {
                                const blob = await zipEntry.async("blob");

                                return new File([blob], filename, {
                                    type: blob.type,
                                });
                            }
                            return null;
                        })
                    );

                    extractedFiles.forEach((extractedFile) => {
                        if (
                            extractedFile &&
                            !updatedFiles.find(
                                (f) =>
                                    f.name === extractedFile.name &&
                                    f.size === extractedFile.size
                            )
                        ) {
                            updatedFiles.push(extractedFile);
                        }
                    });

                } catch (error) {
                    console.error("ZIP extraction error:", error);
                    Swal.fire({
                        title: "Attention",
                        text: "Erreur d'exctraction de fichiers !",
                        icon: "warining"
                    })
                }
            } else {
                // Normal file
                if (
                    !updatedFiles.find(
                        (f) => f.name === file.name && f.size === file.size
                    )
                ) {
                    updatedFiles.push(file);
                }
            }
        }

        setSelectedFiles(updatedFiles);
    }, [selectedFiles]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        multiple: true,
    });

    const handleDeleteFile = (indexToRemove) => {
        setSelectedFiles((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
    };

    const handleChangeNumberQr = (id, value) => {
        console.log(id)
        setMarchandsFields((prev) =>
            prev.map((item) =>
                item.id === id
                    ? { ...item, nbreQr: value, quantiteQr: value * item.sn_count }
                    : item
            )
        )
    }
    const handleNumberChange = (value) => {
        setQuantite(value)
        setQuantiteQr(value * quantiteTerminal)
        setMarchandsFields((prev) =>
            prev.map((item) => ({
                ...item,
                nbreQr: value,
                quantiteQr: value * item.sn_count
            }))
        )
    }

    const chaineTemplate = (chaine) => {
        return (
            <>
                <span className="text-sm font-semibold">{chaine.label}</span>
            </>
        )
    }
    const selectedChaineTemplate = (option, props) => {
        if (option) {
            return (
                <>
                    <span className="text-sm font-semibold">{option.label}</span>
                </>
            )
        }
        return <span>{props.placeholder}</span>;
    }

    const marchandsTemplate = (marchand) => {
        return (
            <>
                <span className="text-sm font-semibold">{marchand.label}</span>
            </>
        )
    }
    const selectedMarchandTemplate = (option, props) => {
        if (option) {
            return (
                <>
                    <span className="text-sm font-semibold">{option.label}</span>
                </>
            )
        }
        return <span>{props.placeholder}</span>;
    }

    const handleSelectChaine = (e) => {
        const value = e.value
        setSelectedChaine(value)
        const chaine = chaineGroup.find((item) => {
            return item.CHAINE == value
        })
        if (chaine) {
            const listMarchands = chaine.POINT_MARCHAND.map((item, index) => ({
                id: index,
                POINT_MARCHAND: item.POINT_MARCHAND,
                sn_count: item.sn_count,
                nbreQr: quantite,
                quantiteQr: quantite * item.sn_count,
            }))
            setMarchandsFields(listMarchands)
        }
    }

    const handleSelectType = (value) => {
        setSelectedTypeQr(value)
        const qrCode = listeQr.find((item) => {
            return item.id == value
        })
        if (qrCode) {
            setSelectedNomQr(qrCode.nom)
        }
    }

    const handleSelectFormat = (value) => {
        setSelectedFormat(value)
        const format = listeFormats.find((item) => {
            return item.id == value
        })
        if (format) {
            setFormat(format.format)
        }
    }

    const handleSelectMarchand = (e) => {
        const value = e.value
        setSelectedMarchand(value)
        const marchand = pointsMarchands.find((item) => {
            return value == item.POINT_MARCHAND
        })
        if (marchand) {
            setSelectedChaine(marchand.CHAINE)
            setQuantiteTerminal(marchand.count)
            setQuantiteQr(marchand.count)
        }
    }

    const checkValidate = () => {
        if (!selectedDateDemande) {
            setErrorAjout('Vous devez choisir la date de la demande !')
            return false
        }
        if (!selectedDateGeneration) {
            setErrorAjout('Vous devez choisir la date de la génération !')
            return false
        }
        if (!selectedDateImpression) {
            setErrorAjout("Vous devez choisir la date de l'impression !")
            return false
        }
        if (!selectedDateLivraison) {
            setErrorAjout('Vous devez choisir la date de la livraison !')
            return false
        }
        if (!selectedDateReception) {
            setErrorAjout('Vous devez choisir la date de la réception !')
            return false
        }
        if (selectedDateLivraison.getDate() < selectedDateDemande.getDate()) {
            setErrorAjout('La date de la livraison ne peut pas être avant la date de la demande !')
            return false
        }
        if (!selectedTypeQr) {
            setErrorAjout('Vous devez sélectionner le type du QR Code !')
            return false
        }
        if (!selectedFormat) {
            setErrorAjout('Vous devez sélectionner le format !')
            return false
        }

        return true
    }

    const handleCheckAjoutParMarchand = () => {
        if (!checkValidate()) {
            return
        }
        if (!selectedMarchand) {
            setErrorAjout('Vous devez sélectionner le Point Marchand !')
            return
        }
        // console.log(selectedMarchand)
        // console.log(selectedTypeQr)
        // for(let m of listeLivraison){
        //     console.log(m.pointMarchand)
        //     console.log(m.typeQrId)
        // }
        const isDuplicate = listeLivraison.some(item => {
            return item.pointMarchand == selectedMarchand && item.typeQrId == selectedTypeQr && item.formatId == selectedFormat
        });
        if (isDuplicate) {
            setErrorAjout("Vous avez déjà ajouté ce type de QR avec ce format pour ce marchand !");
            return;
        }
        setIsModalParMarchand(true)
    }

    const handleCheckAjoutParChaine = () => {
        if (!checkValidate()) {
            return
        }
        if (!selectedChaine) {
            setErrorAjout('Vous devez sélectionner la chaîne !')
            return
        }
        for (let m of marchandFields) {
            const isDuplicate = listeLivraison.some(item => {
                return item.pointMarchand == m.POINT_MARCHAND && item.typeQrId == selectedTypeQr && item.formatId == selectedFormat
            });
            if (isDuplicate) {
                setErrorAjout("Vous avez déjà ajouté ce type de QR avec ce format pour ce marchand !");
                return;
            }
        }
        setIsModalParChaineOpen(true)
    }

    const handleAjoutParMarchand = (value) => {
        setErrorAjout('')
        setIsModalParMarchand(false)
        const newElement = {
            typeQrId: Number(selectedTypeQr),
            typeQr: selectedNomQr,
            formatId: Number(selectedFormat),
            format,
            chaine: selectedChaine,
            pointMarchand: selectedMarchand,
            quantiteTerminal,
            quantiteQr,
        }

        setListeLivraison((prev) => [...prev, newElement]);
        setQuantiteTotale((prev) => prev + 1);
        setTotalQr((prev) => prev + quantiteQr);
    }

    const handleAjoutParChaine = () => {
        setErrorAjout('')
        setIsModalParChaineOpen(false)
        const liste = marchandFields.map((item) => ({
            typeQrId: Number(selectedTypeQr),
            typeQr: selectedNomQr,
            formatId: selectedFormat,
            format,
            chaine: selectedChaine,
            pointMarchand: item.POINT_MARCHAND,
            quantiteTerminal: item.sn_count,
            quantiteQr: item.quantiteQr,
        }))
        let listeQr = 0
        for (let item of liste) {
            listeQr += item.quantiteQr
        }

        setListeLivraison((prev) => [...prev, ...liste]);
        setQuantiteTotale((prev) => prev + liste.length);
        setTotalQr((prev) => prev + listeQr);
    }

    const handleDelete = (indexToRemove) => {
        setListeLivraison((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
        setQuantiteTotale((prev) => prev - 1);
        const element = listeLivraison.at(indexToRemove)
        setTotalQr((prev) => prev - element.quantiteQr)
    };

    const handleConfirmSign = () => {
        if (listeLivraison.length < 0) {
            Swal.fire({
                title: "Attention",
                text: "Aucun marchand sélectionné !",
                icon: "warning"
            })
            return
        }
        const listeMarchand = [
            ...new Set(listeLivraison.map(item => item.pointMarchand))
        ]
        setNbreMarchand(listeMarchand.length)
        setIsSignModalOpen(true)
    };

    const handleClear = () => {
        signature.clear()
    }

    const handleConfirmValidate = () => {
        if (listeLivraison.length < 0) {
            Swal.fire({
                title: "Attention",
                text: "Aucun marchand sélectionné !",
                icon: "warning"
            })
            return
        }
        const listeMarchand = [
            ...new Set(listeLivraison.map(item => item.pointMarchand))
        ]
        setNbreMarchand(listeMarchand.length)
        setIsConfirmModalOpen(true)
    }

    const handleValidate = async () => {
        if (signature.isEmpty()) {
            setErrorSign('Vous devez signer pour valider !')
            return;
        }
        setIsSignModalOpen(false)
        setIsConfirmModalOpen(false)
        setLoadingValidation(true)
        try {
            console.log(listeLivraison)
            const listeMarchand = [
                ...new Set(listeLivraison.map(item => item.pointMarchand))
            ]
            // console.log(listeMarchand)
            const sign = signature.toDataURL('image/png')
            const fd = new FormData();
            if (sign) {
                const blob = await fetch(sign).then(res => res.blob());
                fd.append('signature', blob, 'signature.png');
            }
            selectedFiles.forEach((file) => {
                fd.append("files", file);
            });
            fd.append("commentaire", commentaire)
            fd.append("liste_demande", JSON.stringify(listeLivraison))
            fd.append("quantite_marchand", listeMarchand.length)
            fd.append("quantite_qr", Number(totalQr))
            fd.append("userId", Number(userId))
            fd.append("date_demande", new Date(selectedDateDemande))
            fd.append("date_generation", new Date(selectedDateGeneration))
            fd.append("date_impression", new Date(selectedDateImpression))
            fd.append("date_livraison", new Date(selectedDateLivraison))
            fd.append("date_reception", new Date(selectedDateReception))

            console.log("Sending data : ")
            // for (let pair of fd.entries()) {
            //     console.log(pair[0] + ' = ' + pair[1]);
            // }

            const payload = {
                commentaire,
                liste_demande: JSON.stringify(listeLivraison),
                quantite_marchand: listeMarchand.length,
                quantite_qr: Number(totalQr),
                userId: Number(userId),
            }
            console.log(payload)

            await demandeData.regularisationDemandeQr(fd)

            Swal.fire({
                title: "Succès",
                text: "Régularisation créée avec succès !",
                icon: "success"
            })
            navigate('/toutes-les-demandes-qr')
        } catch (error) {
            console.log("Erreur de demande : ", error)
            Swal.fire({
                title: "Attention",
                text: "Une erreur s'est produite !",
                icon: "warning"
            })
            navigate('/toutes-les-demandes-qr')
        } finally {
            setLoadingValidation(false)
        }
    }

    return (
        <>
            <div className="space-y-3">
                <div className="flex justify-center">
                    {loadingData ? (
                        <>
                            <span>Loading...</span>
                        </>
                    ) : (
                        <>
                            {errorForm ? (
                                <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                    {errorForm}
                                </div>
                            ) : (
                                <>
                                    <ComponentCard className="md:w-1/2 w-full">
                                        <div className="space-y-3">
                                            <div className="space-y-4">
                                                <div className="pb-3 text-center">
                                                    <span className="text-sm font-semibold">Informations générales</span>
                                                </div>
                                                <div>
                                                    <Label>Date Demande <span className="text-red-700">*</span></Label>
                                                    <Calendar
                                                        value={selectedDateDemande}
                                                        locale="fr"
                                                        onChange={(e) => setSelectedDateDemande(e.value)}
                                                        dateFormat="dd/mm/yy"
                                                        placeholder="dd/mm/yyyy"
                                                        maxDate={new Date()}
                                                        className="w-full"
                                                    />
                                                </div>
                                                {selectedDateDemande ? (
                                                    <>
                                                        <div>
                                                            <Label>Date Génération <span className="text-red-700">*</span></Label>
                                                            <Calendar
                                                                value={selectedDateGeneration}
                                                                locale="fr"
                                                                onChange={(e) => setSelectedDateGeneration(e.value)}
                                                                dateFormat="dd/mm/yy"
                                                                placeholder="dd/mm/yyyy"
                                                                maxDate={new Date()}
                                                                minDate={new Date(selectedDateDemande)}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {selectedDateGeneration ? (
                                                    <>
                                                        <div>
                                                            <Label>Date Impression <span className="text-red-700">*</span></Label>
                                                            <Calendar
                                                                value={selectedDateImpression}
                                                                locale="fr"
                                                                onChange={(e) => setSelectedDateImpression(e.value)}
                                                                dateFormat="dd/mm/yy"
                                                                placeholder="dd/mm/yyyy"
                                                                maxDate={new Date()}
                                                                minDate={new Date(selectedDateGeneration)}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {selectedDateImpression ? (
                                                    <>
                                                        <div>
                                                            <Label>Date Livraison <span className="text-red-700">*</span></Label>
                                                            <Calendar
                                                                value={selectedDateLivraison}
                                                                locale="fr"
                                                                onChange={(e) => setSelectedDateLivraison(e.value)}
                                                                dateFormat="dd/mm/yy"
                                                                placeholder="dd/mm/yyyy"
                                                                maxDate={new Date()}
                                                                minDate={new Date(selectedDateImpression)}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <></>
                                                )}
                                                {selectedDateLivraison ? (
                                                    <>
                                                        <div>
                                                            <Label>Date Réception <span className="text-red-700">*</span></Label>
                                                            <Calendar
                                                                value={selectedDateReception}
                                                                locale="fr"
                                                                onChange={(e) => setSelectedDateReception(e.value)}
                                                                dateFormat="dd/mm/yy"
                                                                placeholder="dd/mm/yyyy"
                                                                maxDate={new Date()}
                                                                minDate={new Date(selectedDateLivraison)}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                    </>
                                                )}
                                                <div>
                                                    <Label>Importer des fichiers <span className="text-red-700">*</span></Label>
                                                    <div
                                                        {...getRootProps()}
                                                        className="border-2 border-dashed p-2 rounded-lg text-center cursor-pointer"
                                                    >
                                                        <input {...getInputProps()} />
                                                        <p className="text-xs">Faites glisser les fichiers ici, ou cliquer pour les sélectionner.</p>
                                                    </div>
                                                    <div className="max-h-38 overflow-y-auto">
                                                        {selectedFiles.length > 0 ? (
                                                            <div className="mt-3">
                                                                {selectedFiles.map((selectedFile, index) => (
                                                                    <div key={index} className="bg-gray-100 px-1 flex justify-between items-center rounded-sm my-1">
                                                                        <span>
                                                                            <i className="pi pi-file-check"></i>
                                                                        </span>
                                                                        <span className=" text-center" style={{ fontSize: '9px' }}>
                                                                            {selectedFile.name}
                                                                        </span>
                                                                        <button onClick={() => handleDeleteFile(index)}>
                                                                            <span className="text-error-600"><i className="pi pi-times"></i></span>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <></>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label>Commentaire</Label>
                                                    <TextArea
                                                        type="text"
                                                        placeholder="Ajoutez un commentaire"
                                                        value={commentaire}
                                                        onChange={(value) => setCommentaire(value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Type QR Code <span className="text-red-700">*</span></Label>
                                                    <Select
                                                        options={optionsQr}
                                                        placeholder="Choisir une option"
                                                        className="dark:bg-dark-900"
                                                        onChange={handleSelectType}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Format <span className="text-red-700">*</span></Label>
                                                    <Select
                                                        options={optionsFormats}
                                                        placeholder="Choisir une option"
                                                        className="dark:bg-dark-900"
                                                        onChange={handleSelectFormat}
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-3 my-2">
                                                        <Checkbox
                                                            checked={parChaine}
                                                            onChange={(e) => {
                                                                if (parChaine) {
                                                                    setParChaine(false)
                                                                } else {
                                                                    setParChaine(true)
                                                                    setParMarchand(false)
                                                                }
                                                            }}
                                                            label="Par Chaîne" />
                                                    </div>
                                                    <div className="flex items-center gap-3 my-2">
                                                        <Checkbox
                                                            checked={parMarchand}
                                                            onChange={(e) => {
                                                                if (parMarchand) {
                                                                    setParMarchand(false)
                                                                } else {
                                                                    setParMarchand(true)
                                                                    setParChaine(false)
                                                                }
                                                            }}
                                                            label="Par Marchand" />
                                                    </div>
                                                </div>
                                                <div>
                                                    {parChaine ? (
                                                        <>
                                                            <div className="space-y-5">
                                                                <div>
                                                                    <Label>Chaîne </Label>
                                                                    <Dropdown
                                                                        options={optionsChaine}
                                                                        optionLabel="Label"
                                                                        placeholder="Choisir chaîne"
                                                                        filter
                                                                        filterBy="label"
                                                                        itemTemplate={chaineTemplate}
                                                                        className="w-full"
                                                                        onChange={handleSelectChaine}
                                                                        value={selectedChaine}
                                                                        valueTemplate={selectedChaineTemplate}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label>Quantité / TPE</Label>
                                                                    <Input
                                                                        type="number"
                                                                        className="dark:bg-dark-900"
                                                                        value={quantite}
                                                                        onChange={(e) => {
                                                                            const value = Number(e.target.value)
                                                                            if (value >= 1) {
                                                                                handleNumberChange(value)
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {marchandFields.map((item, index) => {
                                                                        return (
                                                                            <>
                                                                                <div className="space-y-3" key={index}>
                                                                                    <div>
                                                                                        <Label>Point Marchand <span className="font-bold">{index + 1}</span></Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            className="cursor-not-allowed"
                                                                                            readOnly
                                                                                            value={item.POINT_MARCHAND}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <Label>Quantité / TPE <span className="text-red-700">*</span></Label>
                                                                                            <Input
                                                                                                type="number"
                                                                                                className="dark:bg-dark-900"
                                                                                                value={item.nbreQr}
                                                                                                onChange={(e) => {
                                                                                                    const value = Number(e.target.value)
                                                                                                    if (value >= 1) {
                                                                                                        handleChangeNumberQr(item.id, value)
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <Label>Nbr QR CODE(s)</Label>
                                                                                            <Input
                                                                                                type="number"
                                                                                                className="dark:bg-dark-900 cursor-not-allowed"
                                                                                                readOnly
                                                                                                value={item.sn_count * item.nbreQr}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </>
                                                                        )
                                                                    })}
                                                                </div>
                                                                <div>
                                                                    <div className="w-full flex justify-center items-center">
                                                                        <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                            onClick={handleCheckAjoutParChaine}
                                                                        >
                                                                            Ajouter
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                        </>
                                                    )}
                                                </div>
                                                <div>
                                                    {parMarchand ? (
                                                        <>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <Label>Point Marchand <span className="text-red-700">*</span></Label>
                                                                    <Dropdown
                                                                        options={optionsMarchands}
                                                                        optionLabel="Label"
                                                                        placeholder="Choisir marchand"
                                                                        filter
                                                                        filterBy="label"
                                                                        itemTemplate={marchandsTemplate}
                                                                        className="w-full"
                                                                        onChange={handleSelectMarchand}
                                                                        value={selectedMarchand}
                                                                        valueTemplate={selectedMarchandTemplate}
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <Label>Quantité / TPE <span className="text-red-700">*</span></Label>
                                                                        <Input
                                                                            type="number"
                                                                            className="dark:bg-dark-900"
                                                                            value={quantite}
                                                                            onChange={(e) => {
                                                                                const value = Number(e.target.value)
                                                                                if (value >= 1) {
                                                                                    handleNumberChange(value)
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label>Nbr QR CODE(s)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            className="dark:bg-dark-900 cursor-not-allowed"
                                                                            value={quantiteTerminal * quantite}
                                                                            readOnly
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="w-full flex justify-center items-center">
                                                                        <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                            onClick={handleCheckAjoutParMarchand}
                                                                        >
                                                                            Ajouter
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-center">
                                                    <span className="text-error-600 font-medium flex items-center justify-center text-sm">
                                                        {errorAjout}
                                                    </span>
                                                </div>
                                                <div className="text-right text-gray-500">
                                                    <span className="text-xs font-medium">
                                                        Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </ComponentCard>
                                </>
                            )}
                        </>
                    )}
                </div>
                <div>
                    <div>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className='p-4 pb-0 text-xs text-gray-600 flex flex-col'>
                                <span>Nombre élément : {quantiteTotale}</span>
                                <span>Total QR Code : {totalQr}</span>
                            </div>
                            <div className="max-w-full overflow-x-auto">
                                <Table>
                                    {/* Table Header */}
                                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                        <TableRow>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Type QR
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Format
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Chaîne
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Point Marchand
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Nbre TPE
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Nbre de copie
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                Supprimer
                                            </TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    {/* Table Body */}
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {listeLivraison.map((item, index) => (
                                            <TableRow>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.typeQr}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.format}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.chaine}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.pointMarchand}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.quantiteTerminal}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {item.quantiteQr}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    <button
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => handleDelete(index)}
                                                    >
                                                        <i className="pi pi-trash" style={{ color: 'black' }}></i>
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        {listeLivraison.length > 0 ? (
                            <>
                                <div className="mt-3">
                                    <div className="text-center">
                                        {loadingValidation ? (
                                            <>
                                                <div>
                                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-full flex justify-center items-center">
                                                    <button className="w-1/5 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                        onClick={handleConfirmSign}
                                                    >
                                                        Valider
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <></>
                        )}
                    </div>
                </div>
            </div>
            <Modal isOpen={isModalParMarchand} onClose={() => setIsModalParMarchand(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Confirmation</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-1">
                            <div>
                                <span>Type QR CODE: </span>
                                <span className="font-bold text-sm">{selectedNomQr}</span>
                            </div>
                            <div>
                                <span>Format: </span>
                                <span className="font-bold text-sm">{format}</span>
                            </div>
                            <div>
                                <span className="text-sm font-bold" style={{ fontSize: '15px' }}>{selectedMarchand}</span>
                            </div>
                            <div>
                                <span>QR Code(s): </span>
                                <span className="text-sm font-bold">{quantiteQr} </span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleAjoutParMarchand}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalParChaineOpen} onClose={() => setIsModalParChaineOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Confirmation</span>
                    </div>
                    <div>
                        <div className="text-xs text-center space-y-5">
                            <div>
                                <span>Type QR CODE: </span>
                                <span className="font-bold text-sm">{selectedNomQr}</span>
                            </div>
                            <div>
                                <span>Format: </span>
                                <span className="font-bold text-sm">{format}</span>
                            </div>
                            <div className="h-44 overflow-y-auto space-y-5">
                                {marchandFields.map((item) => {
                                    return (
                                        <>
                                            <div>
                                                <div>
                                                    <span className="text-sm font-bold" style={{ fontSize: '15px' }}>{item.POINT_MARCHAND}</span>
                                                </div>
                                                <div>
                                                    <span>QR Code(s): </span>
                                                    <span className="text-sm font-bold">{item.quantiteQr} </span>
                                                </div>
                                            </div>
                                        </>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleAjoutParChaine}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Validation</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-1">
                            <div>
                                <span>Total demande : </span>
                                <span className="font-bold text-sm">{quantiteTotale}</span>
                            </div>
                            <div>
                                <span>Marchands : </span>
                                <span className="font-bold text-sm">{nbreMarchand}</span>
                            </div>
                            <div>
                                <span>Total QR Codes : </span>
                                <span className="font-bold text-sm">{totalQr}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleValidate}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} className="p-4 max-w-md">
                <div className='p-1'>
                    <div className="w-full text-center mb-3">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium text-sm">Validation</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-1">
                            <div>
                                <span>Total demande : </span>
                                <span className="font-bold text-sm">{quantiteTotale}</span>
                            </div>
                            <div>
                                <span>Marchands : </span>
                                <span className="font-bold text-sm">{nbreMarchand}</span>
                            </div>
                            <div>
                                <span>Total QR Codes : </span>
                                <span className="font-bold text-sm">{totalQr}</span>
                            </div>
                        </div>
                    </div>
                    <div className='text-center mb-3 text-xs'>
                        <span>Signez manuellement pour valider la régularisation</span>
                    </div>
                    <div className='flex flex-col justify-center items-center'>
                        <SignatureCanvas
                            ref={data => setSignature(data)}
                            canvasProps={{ width: 300, height: 150, className: 'sigCanvas border border-gray-300 rounded' }}
                        />
                        <div className='w-full mt-6 flex justify-center items-center'>
                            <button
                                onClick={handleClear}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Clear
                            </button>
                            <button
                                onClick={handleValidate}
                                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                                Valider
                            </button>
                        </div>
                    </div>
                    <div className="text-center">
                        <span className="text-error-500 text-xs">
                            {errorSign}
                        </span>
                    </div>
                </div>
            </Modal>
        </>
    )
}