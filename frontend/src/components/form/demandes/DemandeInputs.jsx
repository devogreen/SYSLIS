import { useEffect, useState, useRef, useCallback } from "react"
import ComponentCard from "../../common/ComponentCard.tsx";
import Label from "../Label.tsx";
import Input from "../input/InputField.tsx";
import Checkbox from "../input/Checkbox.tsx";
import Select from "../Select.tsx";
import { MultiSelect } from "primereact/multiselect";
import TextArea from "../input/TextArea.tsx";
import Swal from 'sweetalert2'
import { Modal } from "../../ui/modal/index.tsx";
import { ProgressSpinner } from 'primereact/progressspinner';
import { useNavigate } from "react-router";

import { Stock } from "../../../backend/stock/Stock.js";
import { Users } from "../../../backend/users/Users.js";
import { Demandes } from "../../../backend/demandes/Demandes.js";

import { Dropdown } from "primereact/dropdown";

import FileInput from "../input/FileInput.tsx"
import { useDropzone } from "react-dropzone"

import { Calendar } from "primereact/calendar";

export default function DemandeInputs() {

  const stockData = new Stock()
  const userData = new Users()
  const demandeData = new Demandes()
  const userId = localStorage.getItem('id');
  const role = localStorage.getItem("role_id")
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  const [items, setItems] = useState([])
  const [optionsItems, setOptionsItems] = useState([])

  const [models, setModels] = useState([])
  const [optionsModels, setOptionsModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [nomModel, setNomModel] = useState('')

  const [servicesPiece, setServicesPiece] = useState([])
  const [optionsServicesPiece, setOptionsServicesPieces] = useState([])
  const [selectedServicePiece, setSelectedServicePiece] = useState(null)
  const [nomServicePiece, setNomServicePiece] = useState('')

  const [selectedPiece, setSelectedPiece] = useState(null)
  const [nomPiece, setNomPiece] = useState('')

  const [parLot, setParLot] = useState(false)
  const [parCartonLot, setParCartonLot] = useState(false)
  const [parPieceCarton, setParPieceCarton] = useState(false)
  const [parCarton, setParCarton] = useState(false)
  const [parPiece, setParPiece] = useState(false)

  const [quantitePiece, setQuantitePiece] = useState(null)
  const [newStockPiece, setNewStockPiece] = useState(0)
  const [finalStockPiece, setFinaleStockPiece] = useState(0)
  const [entreeParPieceModalOpen, setEntreeParPieceModalOpen] = useState(false)
  const [sortieParPieceModalOpen, setSortieParPieceModalOpen] = useState(false)

  const [quantiteCarton, setQuantiteCarton] = useState(null)
  const [newStockCarton, setNewStockCarton] = useState(0)
  const [finalStockCarton, setFinalStockCarton] = useState(0)
  const [quantitePieceCarton, setQuantitePieceCarton] = useState(0)
  const [entreeParCartonModalOpen, setEntreeParCartonModalOpen] = useState(false)
  const [sortieParCartonModalOpen, setSortieParCartonModalOpen] = useState(false)
  const [selectedCartons, setSelectedCartons] = useState([])
  const [listeCartons, setListeCartons] = useState([])

  const [stockPieceCarton, setStockPieceCarton] = useState(0)
  const [finalStockPieceCarton, setFinalStockPieceCarton] = useState(0)
  const [selectedCarton, setSelectedCarton] = useState(null)
  const [entreeParPieceCartonModalOpen, setEntreeParPieceCartonModalOpen] = useState(false)
  const [sortieParPieceCartonModalOpen, setSortieParPieceCartonModalOpen] = useState(false)
  const [nomCarton, setNomCarton] = useState('')

  const [stockCartonLot, setStockCartonLot] = useState(0)
  const [finalStockCartonLot, setFinalStockCartonLot] = useState(0)
  const [selectedLot, setSelectedLot] = useState(null)
  const [nomLot, setNomLot] = useState('')
  const [entreeParCartonLotModalOpen, setEntreeParCartonLotModalOpen] = useState(false)
  const [sortieParCartonLotModalOpen, setSortieParCartonLotModalOpen] = useState(false)
  const [stockPieceLot, setStockPieceLot] = useState(0)
  const [finalStockPieceLot, setFinalStockPieceLot] = useState(0)

  const [quantiteLot, setQuantiteLot] = useState(null)
  const [newStockLot, setNewStockLot] = useState(0)
  const [finalStockLot, setFinalStockLot] = useState(0)
  const [quantiteCartonLot, setQuantiteCartonLot] = useState(0)
  const [selectedLots, setSelectedLots] = useState([])
  const [listeLots, setListeLots] = useState([])
  const [entreeParLotModalOpen, setEntreeParLotModalOpen] = useState(false)
  const [sortieParLotModalOpen, setSortieParLotModalOpen] = useState(false)

  const [optionsLot, setOptionsLot] = useState([])
  const [optionsCartons, setOptionsCartons] = useState([])

  const [servicesUsers, setServicesUsers] = useState([])
  const [serviceUser, setServiceUser] = useState(null)
  const [nomServiceUser, setNomServiceUser] = useState('')
  const [optionsServicesUsers, setOptionsServicesUsers] = useState([])

  const [userList, setUserList] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [nomUser, setNomUser] = useState('')
  const [optionsUsers, setOptionsUsers] = useState([])

  const [motif, setMotif] = useState('')

  const [commentaire, setCommentaire] = useState('')

  const [nomenclature, setNomenclature] = useState('')

  const [fields, setFields] = useState([])
  const [otherFields, setOtherFields] = useState([])

  const [error, setError] = useState('')

  const [loadingValidation, setLoadingValidation] = useState(false)

  const [detailsDemande, setDetailsDemande] = useState([])
  const [detailsDemandeur, setDetailsDemandeur] = useState([])

  const [quantite, setQuantite] = useState(0)

  const [quantitePieceDemandeur, setQuantitePieceDemandeur] = useState(0)
  const [quantiteCartonDemandeur, setQuantiteCartonDemandeur] = useState(0)
  const [quantiteLotDemandeur, setQuantiteLotDemandeur] = useState(0)

  const [stocks, setStocks] = useState([])
  const [optionsStocks, setOptionsStocks] = useState([])
  const [selectedStock, setSelectedStock] = useState([])
  const [nomStock, setNomStock] = useState('')

  const [hasLot, setHasLot] = useState(false)
  const [hasCarton, setHasCarton] = useState(false)

  const [selectedType, setSelectedType] = useState(false)

  const [validationModalOpen, setValidationModalOpen] = useState(false)

  const [pieceLoading, setPieceLoading] = useState(false)
  const [stockInitial, setStockInitial] = useState(0)

  const [selectedFiles, setSelectedFiles] = useState([])

  const [parSn, setParSn] = useState(false)

  const [selectedExcelFile, setSelectedExcelFile] = useState(null)

  const [loadingDownloadTemplate, setLoadingDownloadTemplate] = useState(false)

  const [listeSn, setListeSn] = useState([])

  const [loadingExtract, setLoadingExtract] = useState(false)

  const [isModalStatutsOpen, setIsModalStatutsOpen] = useState(false)

  const [isReg, setIsReg] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)

  const [errorValidation, setErrorValidation] = useState('')

  const isOnlyDigits = (str) => /^\d+$/.test(str);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const items_data = await stockData.getAllItems()
        setItems(items_data)
        const options_items = items_data.map((item) => ({
          value: item.id_piece,
          label: item.nom_piece.toUpperCase(),
        }))
        setOptionsItems(options_items)

        const services_data = await userData.getAllServices()
        setServicesUsers(services_data)
        // setServicesPiece(services_data)

        const users_data = await userData.getAllUsers()
        setUserList(users_data)
        const options_users = users_data.map((item) => ({
          value: item.id_user,
          label: item.fullname,
        }))
        setOptionsUsers(options_users)

        const stocks_data_all = await stockData.getAllStocks()
        const stocks_data = stocks_data_all.filter((item) => {
          return item.is_deleted == false
        })
        setStocks(stocks_data)
        const options_stocks = stocks_data.map((item) => {
          const serviceStock = services_data.find((s) => {
            return s.id == item.service_id
          })
          const nomService = serviceStock ? serviceStock.nom_service : ''
          return ({
            value: item.id,
            label: `${item.code_stock} - ${nomService}`
          })
        })

        setOptionsStocks(options_stocks)

        // const models_data = await stockData.getAllModels()
        // setModels(models_data)

        const user = await userData.getOneUser(userId)
        console.log(user)
        setNomUser(user.fullname)
        if (user.user_services.length > 1) {
          const options_services = user.user_services.map((item) => ({
            value: item.services.id,
            label: item.services.nom_service.toUpperCase()
          }))
          setOptionsServicesUsers(options_services)
        } else {
          setServiceUser(user.user_services[0].service_id)
        }

      } catch (error) {
        console.log(error)
        setErrorForm('Une erreur est survenue lors de la génération du formulaire.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  const onDropExcel = useCallback(async (acceptedFiles) => {
    setSelectedExcelFile(acceptedFiles[0])
  }, [selectedExcelFile]);

  const { getRootProps: getFilesRootProps,
    getInputProps: getFilesInputProps,
  } = useDropzone({
    onDrop,
    multiple: true,
  });

  const {
    getRootProps: getExcelRootProps,
    getInputProps: getExcelInputProps,
  } = useDropzone({
    onDrop: onDropExcel,
    multiple: false,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
    }
  });

  const handleSelectServiceUser = (value) => {
    console.log("Selected value:", value);
    setServiceUser(value)
    const service = servicesUsers.find(
      (item) => {
        return item.id == parseInt(value)
      }
    )
    const nom = service ? service.nom_service.toUpperCase() : ''
    setNomServiceUser(nom)
  };

  const handleSelectUser = (value) => {
    console.log("Selected value:", value);
    setSelectedUser(value)
    const user = userList.find(
      (item) => {
        return item.id_user == parseInt(value)
      }
    )
    const nom = user ? user.fullname : ''
    setNomUser(nom)
  }

  const handleSelectPiece = async (value) => {
    setPieceLoading(true)
    setSelectedModel(null)
    setSelectedServicePiece(null)
    setSelectedPiece(value)
    const piece = items.find((item) => {
      return item.id_piece == value
    })
    const nom = piece ? piece.nom_piece : ''
    setNomPiece(nom)
    try {
      const itemModels_data = await stockData.getItemModels(value)
      const options_models = itemModels_data.model_piece.map((item) => ({
        value: item.id_model,
        label: item.nom_model.toUpperCase()
      }))
      setOptionsModels(options_models)
      setModels(itemModels_data.model_piece)
      const listModels = itemModels_data.model_piece.map((item) => {
        return item.id_model
      })
      if (listModels.length == 1) {
        setSelectedModel(listModels[0])
        const model = itemModels_data.model_piece.find((item) => {
          return item.id_model == listModels[0]
        })
        const nomModel = model ? model.nom_model : ''
        setNomModel(nomModel)
      }

      const itemService_data = await stockData.getItemServices(value)
      const options_services = itemService_data.services.map((item) => ({
        value: item.id,
        label: item.nom_service.toUpperCase()
      }))
      setOptionsServicesPieces(options_services)
      setServicesPiece(itemService_data.services)
      const listServices = itemService_data.services.map((item) => {
        return item.id
      })
      if (listServices.length == 1) {
        setSelectedServicePiece(listServices[0])
        const service = itemService_data.services.find((item) => {
          return item.id == listServices[0]
        })
        const nomService = service ? service.nom_service : ''
        setNomServicePiece(nomService)
      }
    } catch (error) {
      console.log('Erreur avec la pièce : ', error)
    } finally {
      setPieceLoading(false)
    }
  }

  const handleSelectModel = (value) => {
    console.log('Selected model value: ', value)
    const model = models.find((item) => {
      return item.id_model == value
    })
    const nomModel = model ? model.nom_model : ''
    setNomModel(nomModel)
    setSelectedModel(value)
  }

  const handleSelectService = (value) => {
    console.log('Selected service value: ', value)
    const service = servicesPiece.find((item) => {
      return item.id == value
    })
    const nomService = service ? service.nom_service : ''
    setNomServicePiece(nomService)
    setSelectedServicePiece(value)
  }

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);

      // Avoid adding duplicate files (optional)
      const updatedFiles = [...selectedFiles];

      newFiles.forEach(file => {
        if (!updatedFiles.find(f => f.name === file.name && f.size === file.size)) {
          updatedFiles.push(file);
        }
      });

      setSelectedFiles(updatedFiles);
    }
  };

  const handleDeleteFile = (indexToRemove) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  }

  const handleSelectLotCarton = async (id) => {
    setSelectedLot(id)
    const cartons_data_all = await stockData.getCartonLot(id)
    const cartons_data = cartons_data_all.filter((item) => {
      return item.is_deleted == false
    })
    const options_cartons = cartons_data.map((item) => ({
      value: item.id,
      label: `Carton ${item.numero_carton} - ${item.quantite_totale_piece} pièces`
    }))
    setOptionsCartons(options_cartons)

    const lot = listeLots.find((item) => {
      return item.id == id
    })
    const nom = lot ? `Lot ${lot.numero_lot}` : ''
    setNomLot(nom)
    const totalCarton = lot ? lot.quantite_carton_lot : 0
    setQuantiteCartonLot(totalCarton)
    const stockCarton = lot ? lot.quantite_carton : 0
    setStockCartonLot(stockCarton)
    const stockPiece = lot ? lot.quantite_piece : 0
    setStockPieceLot(stockPiece)
  }

  const handleSelectCarton = (value) => {
    setSelectedCarton(value)
    const carton = listeCartons.find((item) => {
      return item.id == value
    })
    const nom = carton ? (carton.lot_id ? `Lot ${carton.numero_lot} - Carton ${carton.numero_carton}` : `Carton ${carton.numero_carton}`) : ('')
    setNomCarton(nom)
    const totalPiece = carton ? carton.quantite_piece_carton : 0
    setQuantitePieceCarton(totalPiece)
    const stock = carton ? carton.quantite_totale_piece : 0
    setStockPieceCarton(stock)
  }

  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      { id: Date.now(), titre: "", information: "" }
    ]);
  };

  const handleFieldChange = (id, fieldName, value) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, [fieldName]: value } : f
      )
    );
  };

  const handleRemoveField = (id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const checkValidate = () => {
    if (!selectedPiece) {
      setError("Vous devez choisir la pièce !")
      return false
    }
    if (!serviceUser) {
      setError("Vous devez choisir le service demandeur")
      return false
    }
    if (!motif) {
      setError("Vous devez précisier le motif !")
      return false
    }
    if (!selectedServicePiece) {
      setError("Vous devez choisir le service !")
      return false
    }
    if (!selectedModel) {
      setError("Vous devez choisir le modèle !")
      return false
    }
    setError('')
    return true
  }

  const handleSortie = () => {
    if (!checkValidate()) {
      return
    }

    if (stockInitial <= 0) {
      setError("Quantité initiale invalide !")
    }

    if (quantite <= 0 || isNaN(quantite) || quantite == "") {
      setError("Quantité demandée invalide !")
      return
    }

    setValidationModalOpen(true)
    setError('')
  }

  const handleValidate = async () => {
    if (isReg && !selectedDate) {
      setErrorValidation("Vous devez choisir une date en cas de régularisation !")
      return
    }
    setValidationModalOpen(false)
    setErrorValidation('')

    const typeDemande = parPiece ? 'Par pièce' : parCarton ? 'Par carton' : parLot ? 'Par lot' : parSn ? 'Par Sn' : ''
    const details = {
      selectedPiece,
      selectedModel,
      selectedServicePiece,
      typeDemande,
      quantite,
      listeSn: JSON.stringify(listeSn),
    }

    const fd = new FormData();

    fd.append('detailsDemande', JSON.stringify(details))
    fd.append('userId', userId)
    fd.append('quantite', quantite)
    fd.append('serviceUser', serviceUser)
    fd.append('selectedUser', userId)
    fd.append('nomUser', nomUser)
    fd.append('motif', motif)
    fd.append('commentaire', commentaire)
    fd.append('otherFields', JSON.stringify(fields))
    fd.append("dateDemande", selectedDate?.toISOString())
    fd.append("isReg", isReg)

    selectedFiles.forEach((file) => {
      fd.append("files", file);
    });

    try {
      setLoadingValidation(true)
      const response = await demandeData.faireDemande(fd)
      Swal.fire({
        title: "Succès",
        text: "Demande effectuée avec succès !",
        icon: "success"
      })
      navigate('/toutes-les-demandes')

    } catch (error) {
      Swal.fire({
        title: "Attention",
        text: "Une erreur est survenue lors de la demande !",
        icon: "warning"
      })
      navigate('/toutes-les-demandes')
    } finally {
      setLoadingValidation(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setLoadingDownloadTemplate(true)
    try {
      const response = await demandeData.downloadTemplateDemandeSn(userId);

      const url = window.URL.createObjectURL(response.data);

      const a = document.createElement("a");
      a.href = url;

      let fileName = "template_demande_sn";

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Download error:", error);
      Swal.fire({
        title: "Attention",
        text: "Une erreur s'est produite lors du téléchargement !",
        icon: "warning"
      });
    } finally {
      setLoadingDownloadTemplate(false)
    }
  }

  const handleExtractSn = async () => {
    try {
      setError('')
      setListeSn([])

      if (!selectedExcelFile) {
        Swal.fire({
          title: "Attention",
          text: "Veuillez sélectionner un fichier Excel !",
          icon: "warning"
        })
        return
      }
      setLoadingExtract(true)

      const fd = new FormData()
      fd.append('file', selectedExcelFile)
      fd.append('userId', userId)

      const response = await demandeData.extractSnFromDemande(fd)
      const serials = response.data
      console.log(serials)

      setListeSn(serials)
      setQuantite(serials.length)
      Swal.fire({
        title: "Succès",
        text: `Données Excel extraites avec succès : ${serials.length} SN trouvés !`,
        icon: "success"
      })
    } catch (error) {
      console.error("Erreur lors de l'extraction des données Excel:", error);
      Swal.fire({
        title: "Attention",
        text: error.message,
        icon: "warning"
      })
    } finally {
      setLoadingExtract(false)
    }
  }

  return (
    <>
      <div className="flex justify-center">
        {loading ? (
          <>
            <span className="">Loading...</span>
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
                <ComponentCard className="md:w-1/2 w-full" title={`Demande`}>
                  <div className="space-y-6">
                    <div className="space-y-5">
                      <div className="text-center">
                        <span className="text-sm font-semibold">Informations générales</span>
                      </div>
                      <div>
                        <Label>Pièce <span className="text-red-700">*</span></Label>
                        <Select
                          options={optionsItems}
                          placeholder="Choisir une option"
                          onChange={handleSelectPiece}
                          className="dark:bg-dark-900"
                        />
                      </div>
                      <div>
                        {pieceLoading ? (
                          <>
                            <div>
                              <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="8" animationDuration=".5s" />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-5">
                              <div>
                                {models.length > 1 ? (
                                  <>
                                    <div>
                                      <Label>Choisir le model <span className="text-red-700">*</span></Label>
                                      <Select
                                        options={optionsModels}
                                        onChange={handleSelectModel}
                                        className="dark:bg-dark-900"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <></>
                                )}
                              </div>
                              <div>
                                {servicesPiece.length > 1 ? (
                                  <>
                                    <div>
                                      <Label>Choisir le service pièce <span className="text-red-700">*</span></Label>
                                      <Select
                                        options={optionsServicesPiece}
                                        placeholder="Choisir une option"
                                        onChange={handleSelectService}
                                        className="dark:bg-dark-900"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <></>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {optionsServicesUsers && optionsServicesUsers.length > 0 ? (
                        <>
                          <div>
                            <Label>Service Demandeur <span className="text-red-700">*</span></Label>
                            <Select
                              options={optionsServicesUsers}
                              placeholder="Choisir une option"
                              onChange={handleSelectServiceUser}
                              className="dark:bg-dark-900"
                            />
                          </div>
                        </>
                      ) : (
                        <></>
                      )}
                      <div>
                        <Label>Motif <span className="text-red-700">*</span></Label>
                        <Input
                          type="text"
                          value={motif}
                          onChange={(e) => {
                            const value = e.target.value
                            setMotif(value)
                          }}
                        />
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
                        <Label>Importer des fichiers</Label>
                        <div
                          {...getFilesRootProps()}
                          className="border-2 border-dashed p-2 rounded-lg text-center cursor-pointer"
                        >
                          <input {...getFilesInputProps()} />
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
                    <div className="space-y-5">
                      <div className="text-center">
                        <span className="text-sm font-semibold">Informations sur stock</span>
                      </div>
                      <div className="space-y-6">
                        <span>Faire une demande  : </span>
                        <div>
                          <div>
                            <div className="flex items-center gap-3 my-2">
                              {/* Demande par lot */}
                              <Checkbox
                                checked={parLot}
                                onChange={() => {
                                  if (parLot) {
                                    setParLot(false)
                                    setSelectedType(false)
                                  } else {
                                    setParLot(true)
                                    setParCarton(false)
                                    setParCartonLot(false)
                                    setParPiece(false)
                                    setParPieceCarton(false)
                                    setSelectedType(true)
                                    setParSn(false)
                                  }
                                }}
                                label="Par Lot"
                              />
                            </div>
                            <div className="flex items-center gap-3 my-2">
                              {/* Demande par carton */}
                              <Checkbox
                                checked={parCarton}
                                onChange={() => {
                                  if (parCarton) {
                                    setParCarton(false)
                                    setSelectedType(false)
                                  } else {
                                    setParLot(false)
                                    setParCarton(true)
                                    setParCartonLot(false)
                                    setParPiece(false)
                                    setParPieceCarton(false)
                                    setSelectedType(true)
                                    setParSn(false)
                                  }
                                }}
                                label="Par carton"
                              />
                            </div>
                            <div className="flex items-center gap-3 my-2">
                              {/* Demande par pièce */}
                              <Checkbox
                                checked={parPiece}
                                onChange={() => {
                                  if (parPiece) {
                                    setParPiece(false)
                                    setSelectedType(false)
                                  } else {
                                    setParLot(false)
                                    setParCarton(false)
                                    setParCartonLot(false)
                                    setParPiece(true)
                                    setParPieceCarton(false)
                                    setSelectedType(true)
                                    setParSn(false)
                                  }
                                }}
                                label="Par pièce"
                              />
                            </div>
                            <div className="flex items-center gap-3 my-2">
                              {/* Demande par SN */}
                              <Checkbox
                                checked={parSn}
                                onChange={() => {
                                  if (parSn) {
                                    setParSn(false)
                                    setSelectedType(false)
                                  } else {
                                    setParLot(false)
                                    setParCarton(false)
                                    setParCartonLot(false)
                                    setParPiece(false)
                                    setParPieceCarton(false)
                                    setSelectedType(true)
                                    setParSn(true)
                                  }
                                }}
                                label="Par SN"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          {selectedType && !parSn ? (
                            <>
                              <div className="space-y-3 mt-3">
                                <div>
                                  <Label>Quantité demandée</Label>
                                  <Input
                                    type="text"
                                    id="input"
                                    value={quantite}
                                    onChange={(e) => {
                                      if (isOnlyDigits(e.target.value) || e.target.value === '') {
                                        const value = e.target.value
                                        setQuantite(value)
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <></>
                          )}
                        </div>
                        <div>
                          {selectedType && parSn ? (
                            <>
                              <div className="space-y-5">
                                <div>
                                  {loadingDownloadTemplate ? (
                                    <>
                                      <div>
                                        <ProgressSpinner style={{ width: '25px', height: '25px' }} strokeWidth="8" animationDuration=".5s" />
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <button className="space-x-1.5 text-cyan-500" onClick={handleDownloadTemplate}>
                                        <span className="text-sm font-medium">
                                          Télécharger template
                                        </span>
                                        <span className="">
                                          <i className="pi pi-download"></i>
                                        </span>
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <Label>Fichier Excel</Label>
                                    <div className="flex space-x-1.5">
                                      <div
                                        {...getExcelRootProps()}
                                        className="border-2 border-dashed p-2 rounded-lg text-center cursor-pointer w-full"
                                      >
                                        <input {...getExcelInputProps()} />
                                        <p className="text-xs font-light">Faites glisser le fichier ici, ou cliquer pour le sélectionner.</p>
                                      </div>
                                      {selectedExcelFile ? (
                                        <>
                                          {loadingExtract ? (
                                            <>
                                              <div>
                                                <ProgressSpinner style={{ width: '10px', height: '10px' }} strokeWidth="8" animationDuration=".5s" />
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                onClick={handleExtractSn}
                                                className="border rounded-lg text-center p-1.5 hover:text-cyan-600 hover:border-cyan-500"
                                              >
                                                <span>
                                                  <i className="pi pi-external-link"></i>
                                                </span>
                                              </button>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <></>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    {listeSn.length > 0 ? (
                                      <>
                                        <div className="">
                                          <div className="w-full flex items-center">
                                            <button className="w-1/5 flex items-center justify-center bg-blue-400 p-1 rounded text-xs"
                                              onClick={() => {
                                                setIsModalStatutsOpen(true)
                                              }}
                                            >
                                              Voir statuts
                                            </button>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-xs text-green-700">
                                              {listeSn.length} S/N.
                                            </span>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                      </>
                                    )}
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
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex justify-center items-center relative mb-2 rounded"
                          >
                            {/* Remove button */}
                            <div className="absolute right-0 top-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveField(field.id)}
                                className="text-red-500"
                              >
                                <i className="pi pi-times"></i>
                              </button>
                            </div>

                            {/* First input */}
                            <div className="me-1">
                              <Label htmlFor={`titre-${field.id}`}>
                                Titre champ {index + 1}
                              </Label>
                              <Input
                                type="text"
                                id={`titre-${field.id}`}
                                value={field.titre}
                                onChange={(e) =>
                                  handleFieldChange(field.id, "titre", e.target.value)
                                }
                                className="border rounded px-2 py-1"
                              />
                            </div>

                            {/* Second input */}
                            <div className="ms-1">
                              <Label htmlFor={`info-${field.id}`}>Information</Label>
                              <Input
                                type="text"
                                id={`info-${field.id}`}
                                value={field.information}
                                onChange={(e) =>
                                  handleFieldChange(field.id, "information", e.target.value)
                                }
                                className="border rounded px-2 py-1"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={handleAddField}
                        >
                          <span className="text-xs text-gray-500 font-medium"> <span className="underline">Ajouter un champ </span><span className="text-xl">+</span></span>
                        </button>
                      </div>
                    </div>
                    {selectedType ? (
                      <>
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
                                <button className="w-1/2 flex items-center justify-center bg-green-400 p-2 rounded-2xl"
                                  onClick={handleSortie}
                                >
                                  Faire demande
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                    <div>
                      <span className="text-error-600 font-medium flex items-center justify-center text-sm">
                        {error}
                      </span>
                    </div>
                    <div className="text-right text-gray-500">
                      <span className="text-xs font-medium">
                        Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                      </span>
                    </div>
                  </div>
                </ComponentCard>
              </>
            )}
          </>
        )}
      </div>
      <Modal isOpen={validationModalOpen} onClose={() => setValidationModalOpen(false)} className="p-4 max-w-md">
        <div className="space-y-5">
          <div className="w-full text-center">
            <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Demande</span>
          </div>
          <div className="text-center flex flex-col">
            <span>
              <span className="text-sm text-gray-800 font-medium">{nomPiece} </span>
              -
              <span className="font-semibold"> {nomModel}</span> |
              <span className="font-medium text-gray-700"> {nomServicePiece}</span>
            </span>
          </div>
          <div className="ms-5 text-center">
            <span className="text-sm text-gray-800 underline">Motif: {motif}</span>
          </div>
          <div className="space-y-5 ms-5">
            <div>
              <span>Demande : {parPiece ? 'par pièce' : parCarton ? 'par carton' : parLot ? 'par lot' : parSn ? 'par Sn' : '?'}</span>
            </div>
            <div>
              <span>Quantité demandée : {quantite}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 my-2">
                <Checkbox
                  checked={isReg}
                  onChange={(e) => {
                    if (isReg) {
                      setIsReg(false)
                    } else {
                      setIsReg(true)
                    }
                  }}
                  label="Régularisation"
                />
              </div>
            </div>
            {isReg ? (
              <>
                <div>
                  <Label>Date <span className="text-red-700">*</span></Label>
                  <Calendar
                    value={selectedDate}
                    locale="fr"
                    onChange={(e) => setSelectedDate(e.value)}
                    dateFormat="dd/mm/yy"
                    placeholder="dd/mm/yyyy"
                    maxDate={new Date()}
                    className="w-full"
                  />
                </div>
              </>
            ) : (
              <></>
            )}
          </div>
          <div>
            <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">
              {errorValidation}
            </span>
          </div>
          <div className='w-full mt-6 flex justify-center items-center'>
            <button
              onClick={handleValidate}
              className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
              Valider
            </button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isModalStatutsOpen} onClose={() => setIsModalStatutsOpen(false)} className="p-4 max-w-md">
        <div className="space-y-6 pb-2">
          <div className="w-full text-center">
            <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Statuts</span>
          </div>
          <div>
            <div className="space-y-2 flex flex-col justify-center items-center w-full">
              <div className="text-md font-semibold text-center">
                <span>S/N extraits</span>
              </div>
              <div className="h-80 overflow-y-auto w-full">
                <table className="border w-full">
                  <tbody>
                    <tr className="border-2 border-black">
                      <th>Marchand</th>
                      <th>Serial Number</th>
                      <th>Statut</th>
                    </tr>
                    {listeSn.map((item) => {
                      return (
                        <>
                          <tr className="border border-black">
                            <th className="text-sm font-normal">{item.marchand}</th>
                            <th className="text-sm font-normal">{item.sn}</th>
                            <th className="text-sm font-normal">{item.statut}</th>
                          </tr>
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}