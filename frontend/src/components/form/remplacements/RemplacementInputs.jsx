import { useEffect, useState, useRef } from "react";
import ComponentCard from "../../common/ComponentCard.tsx";
import Label from "../Label.tsx";
import Input from "../input/InputField.tsx";
import Checkbox from "../input/Checkbox.tsx";
import Select from "../Select.tsx";
import TextArea from "../input/TextArea.tsx";
import FileInput from "../input/FileInput.tsx"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table/index.tsx";
import { PlusIcon } from "../../../icons/index.ts";
import { ListIcon } from "../../../icons/index.ts";
import 'primeicons/primeicons.css';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useNavigate } from "react-router";
import { Merchants } from "../../../backend/livraisons/Merchants.js";
import { ProductDeliveries } from "../../../backend/livraisons/ProductDeliveries.js";
import Swal from 'sweetalert2'
import { Modal } from "../../ui/modal/index.tsx";
import SignatureCanvas from 'react-signature-canvas'
import { Users } from "../../../backend/users/Users.js"
import { Stock } from "../../../backend/stock/Stock.js"
import { Remplacements } from "../../../backend/livraisons/Remplacements.js";
import { GestionTpe } from "../../../backend/gestionTpe/GestionTpe.js";

export default function RemplacementInputs() {

  const merchants = new Merchants();
  const productDeliveries = new ProductDeliveries();
  const usersData = new Users()
  const stockData = new Stock()
  const remplacements = new Remplacements()
  const gestionTpeData = new GestionTpe()
  const userId = localStorage.getItem('id');
  const navigate = useNavigate();


  const [isOrangeChecked, setOrangeChecked] = useState(false);
  const [isMTNChecked, setMTNChecked] = useState(false);
  const [isMOOVChecked, setMOOVChecked] = useState(false);
  const [terminals, setTerminals] = useState([]);
  const [terminalSN, setTerminalSN] = useState('');
  const [terminalName, setTerminalName] = useState('');
  const [terminalBanque, setTerminalBanque] = useState('');
  const [terminalCaisse, setTerminalCaisse] = useState('');
  const [loadingMerchant, setLoadingMerchant] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [typeLivraison, setTypeLivraison] = useState('');
  const [livraisonID, setLivraisonID] = useState(null);
  const [message, setMessage] = useState("");
  const [mobileMoney, setMobileMoney] = useState([]);
  const [produitsLivreTable, setProduitsLivresTable] = useState([]);
  const [produitsLivre, setProduitsLivres] = useState([]);
  const [error, setError] = useState(null);
  const [errorFrom, setErrorForm] = useState(null);
  const [errorAjout, setErrorAjout] = useState(null);
  const [errorDeliver, setErrorDeliver] = useState(null);
  const [messageTPE, setMessageTPE] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signature, setSignature] = useState();
  const [signUrl, setSignUrl] = useState();
  const [errorSign, setErrorSign] = useState('');

  const [optionLivraisons, setOptionLivraisons] = useState([])
  const [listTypeLivraison, setListTypeLivraison] = useState([])

  const [optionServices, setOptionServices] = useState([])
  const [listServices, setListService] = useState([])
  const [serviceRecepteur, setServiceRecepteur] = useState('')

  const [optionsRoles, setOptionsRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState([])
  const [listRoles, setListRoles] = useState([])

  const [serviceId, setServiceId] = useState(null)

  const [quantiteLivraison, setQuantiteLivraison] = useState(0)

  const [optionsModels, setOptionsModels] = useState([])
  const [listModels, setListModels] = useState([])
  const [newModel, setNewModel] = useState(2)
  const [nomNouveauModel, setNomNouveauModel] = useState('A8900')
  const [oldModel, setOldModel] = useState(1)
  const [nomAncienModel, setNomAncienModel] = useState('A920')
  const [ancienSN, setAncienSN] = useState('')

  const [optionsParametrages, setOptionsParametrages] = useState([])
  const [listParametrages, setListParametrages] = useState([])
  const [parametrageTPE, setParametrageTPE] = useState(null)
  const [nomParametrage, setNomParametrage] = useState('')
  const [detailsParametrage, setDetailsParametrage] = useState([])

  const [selectedFiles, setSelectedFiles] = useState([])

  const [isRneChecked, setRneChecked] = useState(false)

  const [statutTpeOld, setStatutTpeOld] = useState('')
  const [statutTpeNew, setStatutTpeNew] = useState('')

  useEffect(() => {
    const fetchTerminalInfos = async () => {
      setLoadingMerchant(true)
      try {
        let data;
        data = await merchants.findMerchant();
        setTerminals(data)

        let type_delivery_data = await productDeliveries.getAllTypeLivraisonCommerciale()
        let type_delivery = type_delivery_data.filter((type) => {
          return type.is_deleted == false
        })
        setListTypeLivraison(type_delivery)
        const optionsType = type_delivery.map((item) => ({
          value: item.id_type_livraison,
          label: item.nom_type_livraison,
        }))
        setOptionLivraisons(optionsType);

        let services_data = await usersData.getAllServices()
        setListService(services_data)
        const optionsServices = services_data.map((item) => ({
          value: item.id,
          label: item.nom_service,
        }))
        setOptionServices(optionsServices)

        let roles_data = await usersData.getAllRoles()
        setListRoles(roles_data)
        const optionsRoles = roles_data.map((item) => ({
          value: item.id_role,
          label: item.nom_role.split('_').join(' ').toLowerCase(),
        }))
        setOptionsRoles(optionsRoles)

        let models_data = await stockData.getAllModels()
        setListModels(models_data)
        const option_models = models_data.map((item) => ({
          value: item.id_model,
          label: item.nom_model.toUpperCase(),
        }))
        setOptionsModels(option_models)

        let parametrages_data = await remplacements.getAllTypeParametrage()
        setListParametrages(parametrages_data)
        const options_parametrage = parametrages_data.map((item) => ({
          value: item.id,
          label: item.nom_parametrage,
        }))
        setOptionsParametrages(options_parametrage)
        const details_parametrage = parametrages_data.map((item) => ({
          id: item.id,
          nom: item.nom_parametrage.toLowerCase(),
          quantite: 0,
        }))
        setDetailsParametrage(details_parametrage)

      } catch (error) {
        console.log('Error fetching data ', error)
        setErrorForm('Erreur lors de la génération du formulaire')

      } finally {
        setLoadingMerchant(false)
      }
    }; fetchTerminalInfos();
  }, [])

  const filteredPointMarchand = terminalSN ?
    terminals.filter((terminal) =>
      terminal.SERIAL_NUMBER.includes(terminalSN)) : [];

  const ChangeNewModel = (value) => {
    console.log("Selected new value (model) : ", value)
    setNewModel(value)
    const model = listModels.find((item) => {
      return item.id_model == parseInt(value)
    })
    if (model) {
      setNomNouveauModel(model.nom_model.toUpperCase())
    }
  }

  const ChangeOldModel = (value) => {
    console.log("Selected old value (model) : ", value)
    setOldModel(value)
    const model = listModels.find((item) => {
      return item.id_model == parseInt(value)
    })
    if (model) {
      setNomAncienModel(model.nom_model.toUpperCase())
    }
  }

  const ChangeRole = (value) => {
    console.log("Selected value : ", value)
    setSelectedRole(value);
  }

  const ChangeTypeLivraison = (value) => {
    console.log("Selected value:", value);
    setLivraisonID(value);

    const selectedTypeLivraison = listTypeLivraison.find(
      (item) => {
        return item.id_type_livraison == parseInt(value)
      }
    );

    if (selectedTypeLivraison) {
      const nomType = selectedTypeLivraison.nom_type_livraison.toUpperCase()
      setTypeLivraison(nomType)
    } else {
      setTypeLivraison('');
    }
  };

  const ChangeService = (value) => {
    console.log("Selected value:", value);
    setServiceId(value);

    const selectedService = listServices.find(
      (item) => {
        return item.id == parseInt(value)
      }
    );

    if (selectedService) {
      const nomService = selectedService.nom_service.toUpperCase()
      setServiceRecepteur(nomService)
    } else {
      setServiceRecepteur('');
    }
  }

  const ChangeParametrage = (value) => {
    console.log("Selected parametrage: ", value)
    setParametrageTPE(value)
    const param = listParametrages.find((item) => {
      return item.id == parseInt(value)
    })
    if (param) {
      setNomParametrage(param.nom_parametrage.toUpperCase())
    }
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

  const handleChangeSn = async (value) => {
    setTerminalName('')
    setTerminalBanque('')
    setTerminalCaisse('')
    setOrangeChecked(false)
    setMTNChecked(false)
    setMOOVChecked(false)
    setStatutTpeNew('')
    setTerminalSN(value)
    const pointMarchand = terminals.find((terminal) => {
      return terminal.SERIAL_NUMBER == value
    })
    try {
      if (pointMarchand) {
        setTerminalName(pointMarchand.POINT_MARCHAND)
        setTerminalBanque(pointMarchand.BANQUE)
        setTerminalCaisse(pointMarchand.TPE)
        if (pointMarchand.NUM_ORANGE.startsWith("07")) {
          setOrangeChecked(true)
        }
        if (pointMarchand.NUM_MTN.startsWith("05")) {
          setMTNChecked(true)
        }
        if (pointMarchand.NUM_MOOV.startsWith("01")) {
          setMOOVChecked(true)
        }
      }
      if (value.length == 10) {
        const tpeData = await gestionTpeData.getTpeInfos(value)
        if (tpeData) {
          const statutTpe = tpeData.statut_tpe.statut
          setStatutTpeNew(statutTpe)
        } else {
          setStatutTpeNew('non enregistré')
        }
      }
    } catch (error) {
      console.log('Error fetching data ', error)
    }
  }

  const handleChangeOldSn = async (value) => {
    setStatutTpeOld('')
    setAncienSN(value)
    try {
      if (value.length == 10) {
        const tpeData = await gestionTpeData.getTpeInfos(value)
        if (tpeData) {
          const statutTpe = tpeData.statut_tpe.statut
          setStatutTpeOld(statutTpe)
        } else {
          setStatutTpeOld('non enregistré')
        }
      }
    } catch (error) {
      console.log('Error fetching data ', error)
    }
  }

  const handleConfirm = () => {

    if (!serviceId) {
      setErrorAjout("Vous devez choisir le service réceptionneur !");
      return;
    }
    if (!oldModel) {
      setErrorAjout("Vous devez choisir le model du TPE à remplacer !");
      return;
    }
    if (!newModel) {
      setErrorAjout("Vous devez choisir le model du TPE remplaçant !");
      return;
    }
    if (terminalSN.length < 10 || !terminalName || !terminalCaisse) {
      setErrorAjout("S/N du TPE remplaçant invalide !");
      return;
    }
    if (ancienSN.length < 10) {
      setErrorAjout("S/N du TPE à remplacer invalide !")
      return
    }
    const isDuplicateNew = produitsLivre.some(prod => prod.nouvelSN === terminalSN || prod.nouvelSN === ancienSN);
    if (isDuplicateNew) {
      setErrorAjout("Le nouvel SN a déjà été ajouté !");
      return;
    }
    const isDuplicateOld = produitsLivre.some(prod => prod.ancienSN === ancienSN || prod.ancienSN === terminalSN);
    if (isDuplicateOld) {
      setErrorAjout("L'ancien SN a déjà été ajouté !");
      return;
    }
    if (terminalSN == ancienSN) {
      setErrorAjout("Les SN sont identiques !")
      return
    }

    if (!parametrageTPE) {
      setErrorAjout("Vous devez choisir le paramétrage du TPE !")
      return
    }

    setErrorAjout('')
    setIsConfirmModalOpen(true)
  }

  const handleAjout = (e) => {
    e.preventDefault(); // prevent page reload

    console.log('Trying to ADD.....')
    const localMobileMoney = [];
    if (isOrangeChecked) {
      localMobileMoney.push("OM")
    };
    if (isMTNChecked) {
      localMobileMoney.push("MTN")
    };
    if (isMOOVChecked) {
      localMobileMoney.push("MOOV")
    };
    if (isRneChecked) {
      localMobileMoney.push("RNE");
    }

    const newProduit = {
      pointMarchand: terminalName,
      caisse: terminalCaisse,
      parametrageTPE: nomParametrage,
      nouvelSN: terminalSN,
      ancienSN: ancienSN,
      banque: terminalBanque,
      mobile_money: localMobileMoney,
      commentaireTPE: messageTPE,
    };

    setDetailsParametrage((prev) =>
      prev.map((param) =>
        param.id === parseInt(parametrageTPE)
          ? { ...param, quantite: param.quantite + 1 }
          : param
      )
    );

    setProduitsLivresTable((prev) => [...prev, newProduit]);
    setProduitsLivres((prev) => [...prev, newProduit]);
    setQuantiteLivraison(quantiteLivraison + 1)

    // Optional: Reset form fields
    setTerminalSN('');
    setTerminalName('');
    setTerminalBanque('')
    setTerminalCaisse('')
    setAncienSN('')
    setMessageTPE('')
    setOrangeChecked(false);
    setMTNChecked(false);
    setMOOVChecked(false);
    setRneChecked(false);
    setMobileMoney([]);
    setStatutTpeNew('')
    setStatutTpeOld('')

    setErrorAjout('')
    setIsConfirmModalOpen(false)
  }

  const handleDeliver = async (e) => {
    e.preventDefault();

    if (produitsLivre.length == 0) {
      Swal.fire({
        title: "Error",
        text: "Vous devez ajouter au moins un TPE.",
        icon: "error"
      });
      return;
    }

    if (signature.isEmpty()) {
      setErrorSign('Vous devez signer pour valider !')
      return;
    }
    setLoadingDelivery(true);
    setIsSignatureModalOpen(false)
    // setSignUrl(signature.toDataURL('image/png'))
    const sign = signature.toDataURL('image/png')
    const fd = new FormData();
    const commentaire = message;

    fd.append('commentaire', commentaire);
    fd.append('user_id', userId);
    fd.append('detailsRemplacement', JSON.stringify(produitsLivre))
    fd.append('service_recepteur', serviceId)
    fd.append('role_recepteur', selectedRole)
    fd.append('ancien_model', oldModel)
    fd.append('nouveau_model', newModel)
    fd.append('detailsParametrage', JSON.stringify(detailsParametrage))
    if (sign) {
      const blob = await fetch(sign).then(res => res.blob());
      fd.append('signature_expediteur', blob, 'signature.png');
    }

    try {
      const response = await remplacements.makeRemplacement(fd)

      console.log(response);
      console.log('Formulaire créé')
      Swal.fire({
        title: "Succès",
        text: "Formulaire créé avec succès",
        icon: "success"
      });
      navigate('/tous-les-remplacements');
    } catch (error) {
      setLoadingDelivery(false)
      console.log('error')
      setError('Erreur lors de la génération du formulaire');
      Swal.fire({
        title: "Attention",
        text: "Une erreur s'est produite lors de la génération du formulaire.",
        icon: "warning"
      });
      navigate('/tous-les-remplacements');
    } finally {
      setProduitsLivres([])
      setProduitsLivresTable([])
      setLoadingDelivery(false)
    }
  }

  const handleDelete = (indexToRemove) => {
    setProduitsLivresTable((prev) => {
      const produitToRemove = prev[indexToRemove];

      setDetailsParametrage((prevParams) =>
        prevParams.map((param) =>
          param.nom === produitToRemove.parametrageTPE
            ? { ...param, quantite: Math.max(0, param.quantite - 1) }
            : param
        )
      );

      return prev.filter((_, index) => index !== indexToRemove);
    });
    setProduitsLivres((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
    setQuantiteLivraison(quantiteLivraison - 1)
  };

  const handleValidate = () => {
    if (produitsLivre.length == 0) {
      Swal.fire({
        title: "Error",
        text: "Vous devez ajouter au moins un TPE.",
        icon: "error"
      });
      return;
    }
    setIsSignatureModalOpen(true)
  }

  const handleClear = () => {
    console.log(signUrl)
    signature.clear()
  }

  return (
    <>
      <div className="flex justify-center mb-6">
        {loadingMerchant ? (<>Loading...</>) :
          (
            errorFrom ? (
              <div className="text-error-600 bg-error-300 font-medium flex items-center justify-center rounded-3xl text-sm p-4">
                {errorFrom}
              </div>
            ) : (
              <>
                <ComponentCard className="md:w-1/2 w-full" title="Livraison TPE remplacés">
                  <div className="pb-3 text-center">
                    <span className="text-sm font-semibold">Informations générales</span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <Label>Service recepteur <span className="text-red-700">*</span></Label>
                      <Select
                        options={optionServices}
                        placeholder="Choisir une option"
                        onChange={ChangeService}
                        className="dark:bg-dark-900"
                      />
                    </div>
                    <div>
                      <Label>Associer un rôle</Label>
                      <Select
                        options={optionsRoles}
                        placeholder="Choisir un rôle"
                        onChange={ChangeRole}
                        className="dark:bg-dark-900"
                      />
                    </div>
                    <div>
                      <Label>Ancien Model TPE <span className="text-red-700">*</span></Label>
                      <Select
                        options={optionsModels}
                        placeholder="Choisir une option"
                        defaultValue={1}
                        onChange={ChangeOldModel}
                        className="dark:bg-dark-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="input">Ancien S/N <span className="text-red-700">*</span></Label>
                      <span className="text-xs text-blue-500 text-center">{statutTpeOld}</span>
                      <Input type="text" id="input" value={ancienSN} onChange={(e) => {
                        const value = e.target.value
                        if (/^\d*$/.test(value)) {
                          if (value.length <= 10) {
                            handleChangeOldSn(value);
                          }
                        }
                      }} />
                    </div>
                    <div>
                      <Label>Nouveau Model TPE <span className="text-red-700">*</span></Label>
                      <Select
                        options={optionsModels}
                        defaultValue={2}
                        placeholder="Choisir une option"
                        onChange={ChangeNewModel}
                        className="dark:bg-dark-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="input">Nouvel S/N <span className="text-red-700">*</span></Label>
                      <span className="text-xs text-blue-500 text-center">{statutTpeNew}</span>
                      <Input type="text" id="input" value={terminalSN} onChange={(e) => {
                        const value = e.target.value
                        // Allow only digits
                        if (/^\d*$/.test(value)) {
                          // Only allow up to 10 characters
                          if (value.length <= 10) {
                            // setTerminalSN(value);
                            handleChangeSn(value)
                          }
                        }
                      }} />
                    </div>
                    <div>
                      <Label>Commentaire</Label>
                      <TextArea
                        value={message}
                        onChange={(value) => setMessage(value)}
                        rows={4}
                        placeholder="Ajoutez un commentaire"
                      />
                    </div>
                    {/* <div>
                      <Label>Importer des fichiers</Label>
                      <FileInput className="curstom-class"
                        onChange={handleFileChange}
                        multiple
                      />
                      {selectedFiles.length > 0 ? (
                        <div className="mt-3">
                          {selectedFiles.map((selectedFile, index) => (
                            <div key={index} className="bg-gray-100 px-1 flex justify-between items-center rounded-sm my-1">
                              <span>
                                <i className="pi pi-file-check"></i>
                              </span>
                              <span className=" text-gray-500" style={{ fontSize: '9px' }}>
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
                    </div> */}
                    <div className="pb-3 text-center">
                      <span className="text-sm font-semibold">Informations sur produits</span>
                    </div>
                    <div>
                      <Label>Commentaire pour terminal</Label>
                      <TextArea
                        value={messageTPE}
                        onChange={(value) => setMessageTPE(value)}
                        rows={2}
                        placeholder="Ajoutez un commentaire"
                      />
                    </div>
                    <div>
                      <Label>Point Marchand <span className="text-red-700">*</span></Label>
                      <Input type="text" id="input"
                        className=""
                        value={terminalName}
                        onChange={(e) => {
                          const value = e.target.value
                          setTerminalName(value)
                        }}
                      />
                    </div>
                    <div>
                      <Label>Banque</Label>
                      <Input type="text" id="input"
                        className=""
                        value={terminalBanque}
                        onChange={(e) => {
                          const value = e.target.value
                          setTerminalBanque(value)
                        }}
                      />
                    </div>
                    <div>
                      <Label>Caisse <span className="text-red-700">*</span></Label>
                      <Input type="text" id="input"
                        className=""
                        value={terminalCaisse}
                        onChange={(e) => {
                          const value = e.target.value
                          setTerminalCaisse(value)
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="input">Parametrage <span className="text-red-700">*</span></Label>
                      <Select
                        options={optionsParametrages}
                        value={parametrageTPE}
                        placeholder="Choisir une option"
                        onChange={ChangeParametrage}
                        className="dark:bg-dark-900"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 my-2">
                        <Checkbox
                          checked={isOrangeChecked}
                          onChange={(e) => {
                            if (isOrangeChecked) {
                              setOrangeChecked(false)
                            } else {
                              setOrangeChecked(true)
                            }
                          }}
                          label="Orange Money" />
                      </div>
                      <div className="flex items-center gap-3 my-2">
                        <Checkbox
                          checked={isMTNChecked}
                          onChange={(e) => {
                            if (isMTNChecked) {
                              setMTNChecked(false)
                            } else {
                              setMTNChecked(true)
                            }
                          }}
                          label="MTN Money" />
                      </div>
                      <div className="flex items-center gap-3 my-2">
                        <Checkbox
                          checked={isMOOVChecked}
                          onChange={(e) => {
                            if (isMOOVChecked) {
                              setMOOVChecked(false)
                            } else {
                              setMOOVChecked(true)
                            }
                          }}
                          label="MOOV Money" />
                      </div>
                      <div className="flex items-center gap-3 my-2">
                        <Checkbox
                          checked={isRneChecked}
                          onChange={(e) => {
                            if (isRneChecked) {
                              setRneChecked(false)
                            } else {
                              setRneChecked(true)
                            }
                          }}
                          label="RNE" />
                      </div>
                      {/* <div className="flex items-center gap-3 my-2">
                        <Checkbox
                          checked={isMOOVChecked}
                          onChange={(e) => {
                            if (isMOOVChecked) {
                              setMOOVChecked(false)
                            } else {
                              setMOOVChecked(true)
                            }
                          }}
                          label="RNE" />
                      </div> */}
                    </div>
                    <div>
                      <button onClick={handleConfirm} className="w-full bg-green-400 rounded-2xl h-10 flex items-center justify-center">
                        <span>Ajouter</span>
                        <span className="text-2xl"><PlusIcon /></span>
                      </button>
                      <div>
                        <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1 mt-4">
                          {errorAjout}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-gray-500">
                    <span className="text-xs font-medium">
                      Les champs suivis par un <span className="text-red-700">*</span> sont obligatoires
                    </span>
                  </div>
                </ComponentCard>
              </>
            )
          )
        }
      </div>
      <div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className='p-4 text-xs text-gray-600 flex'>
            <span>Quantité : {quantiteLivraison}</span>
            <div className="ms-6 flex">
              {detailsParametrage.map((param) => {

                let classQuantite = param.quantite > 0 ? "text-blue-700 font-medium" : "text-gray-600 font-medium"

                return (
                  <>
                    <div key={param.id} className="mx-6">
                      <span className="text-xs text-gray-600">{param.nom} : <span className={classQuantite}>{param.quantite}</span></span>
                    </div>
                  </>
                )
              })}
            </div>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Point Marchand
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Remplacement S/N
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Parametrage
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Banque
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    OM
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    MTN
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    MOOV
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    RNE
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
                {produitsLivreTable.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {item.pointMarchand}
                      </span>
                      <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                        {item.caisse}
                      </span>
                      {item.commentaireTPE ? (
                        <span className="block text-gray-700 text-theme-xs dark:text-gray-400">
                          « {item.commentaireTPE} »
                        </span>
                      ) : (
                        <></>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start dark:text-gray-400">
                      <span className="block">
                        <span className="text-xs text-gray-400">
                          Ancien S/N : <span className="text-theme-sm text-gray-600">{item.ancienSN}</span>
                        </span>
                      </span>
                      <span className="block">
                        <span className="text-xs text-gray-400">
                          Nouvel S/N : <span className="text-theme-sm text-gray-600">{item.nouvelSN}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {item.parametrageTPE}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {item.banque}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {item.mobile_money.includes("OM") ?
                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {item.mobile_money.includes("MTN") ?
                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {item.mobile_money.includes("MOOV") ?
                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {item.mobile_money.includes("RNE") ?
                        (<i className="pi pi-check" style={{ color: 'green' }}></i>) : ""}
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
        <div className="w-full flex flex-col justify-center items-center mt-6">
          {loadingDelivery ?
            <span className="">
              <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" animationDuration=".5s" />
            </span>
            :
            <button onClick={handleValidate} className="w-1/4 bg-green-400 rounded-2xl h-10 flex justify-center items-center">
              <span>Valider formulaire</span>
              <span className="text-2xl"><ListIcon /></span>
            </button>
          }
          {errorDeliver ?
            <span className="text-error-600 font-medium flex items-center justify-center text-sm p-1">
              {errorDeliver}
            </span>
            :
            <></>
          }
        </div>
      </div>
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} className="p-4 max-w-xl">
        <div className="p-6 mt-5 space-y-5">
          <div className="w-full text-center">
            <span className="p-3 rounded bg-blue-200 text-blue-500 font-medium">Remplacement TPE</span>
          </div>
          <div>
            <div>
              <span>Ancien model : <span className="font-bold text-red-700">{nomAncienModel}</span></span>
            </div>
            <div>
              <span>Nouveau model : <span className="font-bold text-red-700">{nomNouveauModel}</span></span>
            </div>
            <div>
              <span>Service : <span className="font-bold text-red-700">{serviceRecepteur}</span></span>
            </div>
            <div>
              <span>S/N terminal à remplacer : <span className="font-bold text-red-700">{ancienSN}</span></span>
            </div>
            <div>
              <span>S/N terminal remplaçant : <span className="font-bold text-red-700">{terminalSN}</span></span>
            </div>
            <div>
              <span>Point Marchand : <span className="font-bold text-red-700">{terminalName}</span></span>
            </div>
            <div>
              <span>Parametrage : <span className="font-bold text-red-700">{nomParametrage}</span></span>
            </div>
            <div>
              <span> Banque : <span className="font-bold text-red-700">{terminalBanque}</span></span>
            </div>
            <div className="flex flex-col">
              <span>Mobile Money : </span>
              <ul>
                <li className="font-bold text-red-700">
                  {isOrangeChecked ?
                    (<> Orange Money </>) :
                    (<></>)
                  }
                </li>
                <li className="font-bold text-red-700">
                  {isMTNChecked ?
                    (<> MTN Money </>) :
                    (<></>)
                  }
                </li>
                <li className="font-bold text-red-700">
                  {isMOOVChecked ?
                    (<> MOOV Money </>) :
                    (<></>)
                  }
                </li>
                <li className="font-bold text-red-700">
                  {isRneChecked ?
                    (<> RNE </>) :
                    (<></>)
                  }
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className='w-full mt-6 flex justify-center items-center'>
          <button
            onClick={handleAjout}
            className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
            Valider
          </button>
        </div>
      </Modal>
      <Modal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} className="p-4 max-w-md">
        <div className='p-1'>
          <div className='text-center mb-3 text-sm'>
            <span>Signez manuellement pour valider la livraison</span>
          </div>
          <div className='flex flex-col justify-center items-center'>
            <SignatureCanvas
              ref={data => setSignature(data)}
              canvasProps={{ width: 300, height: 250, className: 'sigCanvas border border-gray-300 rounded' }}
            />
            <div className='w-full mt-6 flex justify-center items-center'>
              <button
                onClick={handleClear}
                className='w-1/4 mx-3 bg-green-400 rounded-2xl h-10 flex justify-center items-center'>
                Clear
              </button>
              <button
                onClick={handleDeliver}
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
  );
}
