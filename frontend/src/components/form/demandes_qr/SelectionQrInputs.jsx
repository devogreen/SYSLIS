import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router";
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

import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../ui/table";
import { format, set } from "date-fns";
import { Calendar } from 'primereact/calendar';
import { addLocale } from "primereact/api";
import Swal from "sweetalert2";
import { ProgressSpinner } from "primereact/progressspinner";

import JSZip from "jszip";
import { useDropzone } from "react-dropzone"

export default function SelectionQrInputs() {

    const merchantsData = new Merchants();
    const demandeData = new DemandeQr()
    const userId = localStorage.getItem('id');
    const navigate = useNavigate()
    const { id: idDemande } = useParams();

    const [loadingData, setLoadingData] = useState(false)
    const [loadingValidation, setLoadingValidation] = useState(false)

    const [errorForm, setErrorForm] = useState('')
    const [errorAjout, setErrorAjout] = useState('')

    const [selectedMarchand, setSelectedMarchand] = useState(null)

    const [listeDemande, setListeDemande] = useState([])
    // const [totalQr, setTotalQr] = useState(0)
    const [totalMarchand, setTotalMarchand] = useState(0)
    const [totalListe, setTotalListe] = useState(0)

    const [quantiteTpe, setQuantiteTpe] = useState(0)
    const [quantiteQr, setQuantiteQr] = useState(0)

    const [typeQr, setTypeQr] = useState('')
    const [formatQr, setFormatQr] = useState('')

    const [indexMarchand, setIndexMarchand] = useState(null)

    const [isAllChecked, setIsAllChecked] = useState(false)

    const [statutDemande, setStatutDemande] = useState('')

    const [isModalConfirmModifOpen, setIsModalConfirmModifOpen] = useState(false)
    const [isModalConfirmValidateOpen, setIsModalConfirmValidateOpen] = useState(false)
    const [isModalConfirmGenerateOpen, setIsModalConfirmGenerateOpen] = useState(false)


    const isOnlyDigits = (str) => /^\d+$/.test(str);

    const selectedMarchands = listeDemande.filter(item => item.is_selected);
    const totalQr = selectedMarchands.reduce((sum, item) => sum + Number(item.quantiteQr || 0), 0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true)

                const demande = await demandeData.getOneDemandeQr(idDemande)
                const formDemande = demande.forms

                if (formDemande.is_deleted) {
                    Swal.fire({
                        title: "Demande supprimée",
                        text: "Cette demande a été supprimée.",
                        icon: "warning",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "OK"
                    });
                    navigate('/toutes-les-demandes-qr')
                    return;
                }
                let listeDemande = []

                if (demande.statut == 'soumise') {
                    setStatutDemande('soumise')
                    listeDemande = JSON.parse(demande.liste_demande)
                }

                setListeDemande(listeDemande)
                setTotalListe(listeDemande.length)
                // setTotalQr(Number(demande.quantite_qr))
                const quantiteMarchand = demande.quantite_marchand
                setTotalMarchand(quantiteMarchand)

            } catch (error) {
                console.log('Error fetching data ', error)
                setErrorForm("Une erreur s'est produite lors de la génération du formulaire !")
            } finally {
                setLoadingData(false)
            }
        }
        fetchData()
    }, [])

    const handleSelectMarchand = (value) => {
        if (selectedMarchand) {
            setSelectedMarchand(null)
            return
        }

        const marchandQr = listeDemande.at(value)
        if (marchandQr) {
            listeDemande[value].is_selected = true
            setSelectedMarchand(marchandQr)
            setQuantiteTpe(marchandQr.quantiteTerminal)
            setQuantiteQr(marchandQr.quantiteQr)
            setTypeQr(marchandQr.typeQr)
            setFormatQr(marchandQr.format)
            setIndexMarchand(value)
        }
    }

    const checkModif = () => {
        if (quantiteQr < 1) {
            setErrorAjout('Quantité de QR codes invalide !')
            return false
        }
        return true
    }

    const handleConfirmModif = () => {
        if (!checkModif()) {
            return
        }
        setIsModalConfirmModifOpen(true)
    }

    const handleValidateModif = () => {
        setIsModalConfirmModifOpen(false)

        const idMarchand = listeDemande[indexMarchand].id

        listeDemande[indexMarchand].quantiteQr = quantiteQr

    }

    const handleConfirmValidate = () => {
        setErrorAjout('')
        // setIsModalConfirmValidateOpen(true)
        if (statutDemande == 'soumise') {
            setIsModalConfirmGenerateOpen(true)
        }
    }

    const handleValidate = async () => {
        setIsModalConfirmValidateOpen(false)
        try {
            setLoadingValidation(true)
            console.log('Liste validée: ', listeDemande)
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
                                <>
                                    <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                                        {errorForm}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {selectedMarchand ? (
                                        <>
                                            <ComponentCard className="md:w-1/2 w-full" title="Sélection QR">
                                                <div className="space-y-3">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label>Marchand</Label>
                                                            <span className="border border-black  rounded p-1">
                                                                {selectedMarchand.pointMarchand}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <Label>Type QR</Label>
                                                            <span className="border border-black  rounded p-1">
                                                                {selectedMarchand.typeQr}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <Label>Format QR</Label>
                                                            <span className="border border-black  rounded p-1">
                                                                {selectedMarchand.format}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="text-center">
                                                            <span className="text-sm font-semibold">QR CODES</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Label>Quantité TPE</Label>
                                                                <Input
                                                                    type="text"
                                                                    className="dark:bg-dark-900 cursor-not-allowed"
                                                                    value={selectedMarchand.quantiteTerminal}
                                                                    readOnly
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label>Nbr QR CODE(s) <span className="text-red-700">*</span></Label>
                                                                <Input
                                                                    type="text"
                                                                    className="dark:bg-dark-900"
                                                                    value={quantiteQr}
                                                                    onChange={(e) => {
                                                                        if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                                                            const value = e.target.value
                                                                            setQuantiteQr(value)
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div>
                                                            <div className="w-full flex justify-center items-center mt-10">
                                                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                                                    onClick={handleConfirmModif}
                                                                >
                                                                    Confirmer
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">
                                                                {errorAjout}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-gray-500">
                                                        <span className="text-xs font-medium">
                                                            Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                                                        </span>
                                                    </div>
                                                </div>
                                            </ComponentCard>
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
                <div>
                    <div>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                            <div className='p-4 pb-0 text-xs text-gray-600 flex space-x-4 font-semibold'>
                                <span>Nombre élément : {totalListe}</span>
                                <span>Total Marchand : {totalMarchand}</span>
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
                                                Index
                                            </TableCell>
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
                                                Modifier
                                            </TableCell>
                                            <TableCell
                                                isHeader
                                                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                <Checkbox
                                                    checked={isAllChecked}
                                                    onChange={() => {
                                                        const newValue = !isAllChecked;

                                                        const updatedList = listeDemande.map(item => ({
                                                            ...item,
                                                            is_selected: newValue
                                                        }));

                                                        setListeDemande(updatedList);
                                                        setIsAllChecked(newValue);
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    {/* Table Body */}
                                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {listeDemande.map((item, index) => (
                                            <TableRow>
                                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                    {index + 1}
                                                </TableCell>
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
                                                <TableCell
                                                    className="px-4 py-3 text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                    <button
                                                        className="text-black hover:text-blue-700"
                                                        onClick={() => handleSelectMarchand(index)}
                                                    >
                                                        <i className="pi pi-pen-to-square"></i>
                                                    </button>
                                                </TableCell>
                                                <TableCell
                                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                                    <Checkbox
                                                        checked={item.is_selected}
                                                        onChange={() => {
                                                            const updatedList = listeDemande.map((item, i) =>
                                                                i === index
                                                                    ? { ...item, is_selected: !item.is_selected }
                                                                    : item
                                                            );

                                                            setListeDemande(updatedList);

                                                            // Update "select all" checkbox
                                                            const allChecked = updatedList.every(item => item.is_selected);
                                                            setIsAllChecked(allChecked);
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        {selectedMarchands.length > 0 ? (
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
                                                        onClick={handleConfirmValidate}
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
            <Modal isOpen={isModalConfirmModifOpen} onClose={() => setIsModalConfirmModifOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Confirmation</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-1">
                            <div>
                                <span>Type QR CODE: </span>
                                <span className="font-bold text-sm">{selectedMarchand?.typeQr}</span>
                            </div>
                            <div>
                                <span>Format: </span>
                                <span className="font-bold text-sm">{selectedMarchand?.format}</span>
                            </div>
                            <div>
                                <span className="text-sm font-bold" style={{ fontSize: '15px' }}>{selectedMarchand?.pointMarchand}</span>
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
                                onClick={handleValidateModif}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalConfirmGenerateOpen} onClose={() => setIsModalConfirmGenerateOpen(false)} className="p-4 max-w-md">
                <div className="space-y-3">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Upload</span>
                    </div>
                    <div>
                        <Label>Commentaire</Label>
                        <TextArea
                            value={commentaireGenerator}
                            onChange={(value) => setCommentaireGenerator(value)}
                            rows={3}
                            placeholder="Ajoutez un commentaire"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs">
                            Total marchand par type QR: <span className="font-semibold">{marchandsParType.length}</span>
                        </span>
                        <span className="text-xs">
                            QR Codes files uploaded: <span className="font-semibold">{selectedFiles.length}</span>
                        </span>
                    </div>
                    <div>
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
                    </div>
                    <div className="text-center">
                        <span className="text-error-500 text-xs">
                            {errorGenerate}
                        </span>
                    </div>
                    <div>
                        <div className="w-full flex justify-center items-center">
                            <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                onClick={handleUploadQr}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isModalConfirmValidateOpen} onClose={() => setIsModalConfirmValidateOpen(false)} className="p-4 max-w-md">
                <div className="space-y-5">
                    <div className="w-full text-center">
                        <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Validation</span>
                    </div>
                    <div className="">
                        <div className="text-xs text-center space-y-1">
                            <div>
                                <span>Total validation : </span>
                                <span className="font-bold text-sm">{selectedMarchands.length} sur {listeDemande.length}</span>
                            </div>
                            {/* <div>
                                <span>Marchands : </span>
                                <span className="font-bold text-sm">{nbreMarchand}</span>
                            </div> */}
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

        </>
    )
}