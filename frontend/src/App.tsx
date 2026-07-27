import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
// import AppLayout from "./layouts/deliveryAdminLayout/AppLayoutDelivery";
import { ScrollToTop } from "./components/common/ScrollToTop";
//  import DeliveryDashboard from "./pages/Dashboards/DeliveryDashboard";

// @ts-ignore
import DashboardRedirector from "./DashboardRedirector";
// @ts-ignore
import AdminRenderer from "./AdminRenderer";
// @ts-ignore
import LivraisonForm from "./pages/Forms/LivraisonForms/LivraisonForm";
// @ts-ignore
import AncienneLivraisonForm from "./pages/Forms/LivraisonForms/AncienneLivraisonForm";
// @ts-ignore
import ModifyLivraisonForm from "./pages/Forms/LivraisonForms/ModifyLivraisonForm";
// @ts-ignore
import LivraisonChargeurForm from "./pages/Forms/LivraisonForms/LivraisonChargeurForm";
// @ts-ignore
import ModifyLivraisonChargeurForm from "./pages/Forms/LivraisonForms/ModifyLivraisonChargeurForm";
// @ts-ignore
import AllDeliveries from "./pages/DeliveryPages/AllDeliveries";
// @ts-ignore
import DeliveryDetails from "./pages/DeliveryPages/DeliveryDetails";
// @ts-ignore
import DeliveryChargeurDetails from "./pages/DeliveryPages/DeliveryChargeurDetails"
// @ts-ignore
import ProtectedRoutes from "./ProtectedRoutes";
// @ts-ignore
import AllReceptions from "./pages/ReceivePages/AllReceptions";
// @ts-ignore
import ReceptionDetails from "./pages/ReceivePages/ReceptionDetails";
// @ts-ignore
import ReceptionChargeurDetails from "./pages/ReceivePages/ReceptionChargeurDetails"
// @ts-ignore
import StatistiquesLivraisons from "./components/livraisons/StatistiquesLivraisons"
// @ts-ignore
import AllItems from "./pages/GestionStock/AllItems";
// @ts-ignore
import AllDeliveriesVue from "./pages/VueOnlyPages/AllDeliveriesVue";
// @ts-ignore
import DeliveryDetailsVue from "./pages/VueOnlyPages/DeliveryDetailsVue";
// @ts-ignore
import DeliveryChargeurDetailsVue from "./pages/VueOnlyPages/DeliveryChargeurDetailsVue";
// @ts-ignore
import AllMaintenanceDeliveries from "./pages/MaintenancePages/AllMaintenanceDeliveries";
// @ts-ignore
import DonneeGenerales from "./pages/DeliveryPages/DonneeGenerales"
// @ts-ignore
import ResetPassword from "./pages/AuthPages/ResetPassword"
// @ts-ignore
import ReceptionMaintenanceDetails from "./pages/MaintenancePages/ReceptionMaintenanceDetails"



// @ts-ignore
import DemandeForm from "./pages/Forms/DemandesForms/DemandeForm"
// @ts-ignore
import DemandeTerminalForm from "./pages/Forms/DemandesForms/DemandeTerminalForm"
// @ts-ignore
import AllDemandes from "./pages/DemandesPages/AllDemandes"
// @ts-ignore
import DemandeDetails from "./pages/DemandesPages/DemandeDetails"
// @ts-ignore
import ModifyDemandeForm from "./pages/Forms/DemandesForms/ModifyDemandeForm"

// @ts-ignore
import AllDemandesSupervision from "./pages/SuperviseurPages/AllDemandesSupervision"
// @ts-ignore
import DemandeSupervisionDetails from "./pages/SuperviseurPages/DemandeSupervisionDetails"
// @ts-ignore
import AllDemandesSupport from "./pages/SupportPages/AllDemandesSupport"
// @ts-ignore
import AllDemandesMaintenance from "./pages/MaintenancePages/AllDemandesMaintenance"


// @ts-ignore
import AllDemandesDeliveries from "./pages/DeliveryPages/AllDemandesDeliveries"
// @ts-ignore
import DemandeDeliveryDetails from "./pages/DeliveryPages/DemandeDeliveryDetails"
// @ts-ignore
import LivraisonPiecesForm from "./pages/Forms/LivraisonForms/LivraisonPiecesForm"
// @ts-ignore
import DeliveryChargeurDecomDetails from "./pages/DeliveryPages/DeliveryChargeurDecomDetails"

// @ts-ignore
import AllSupportDeliveries from "./pages/SupportPages/AllSupportDeliveries"
// @ts-ignore
import ReceptionSupportDetails from "./pages/SupportPages/ReceptionSupportDetails"

// @ts-ignore
import ModifyStockForm from "./pages/Forms/StockForms/ModifyStockForm"
// @ts-ignore
import AjouterPieceForm from "./pages/Forms/StockForms/AjouterPieceForm"
// @ts-ignore
import ModifyPieceForm from "./pages/Forms/StockForms/ModifyPieceForm"
// @ts-ignore
import AjouterTerminalForm from "./pages/Forms/StockForms/AjouterTerminalForm"


// @ts-ignore
import Dashboard from "./pages/Dashboards/Dashboard";
// @ts-ignore
import AppLayout from "./layouts/AdminLayout/AppLayout";

// @ts-ignore
import AllUsersPage from "./pages/Accounts/AllUsersPage"
// @ts-ignore
import ModifyProfilForm from "./pages/Forms/UserForms/ModifyProfilForm"
// @ts-ignore
import CreateUserForm from "./pages/Forms/UserForms/CreateUserForm"

// @ts-ignore
import TypesLivraisonsPage from "./pages/Admin/AdminLivraisons/TypesLivraisonsPage"
// @ts-ignore
import AjouterTypeLivraisonForm from "./pages/Forms/AdminForms/AjouterTypeLivraisonForm"
// @ts-ignore
import ModifyTypeLivraisonForm from "./pages/Forms/AdminForms/ModifyTypeLivraisonForm"

// @ts-ignore
import ModifyLivraisonPiecesForm from "./pages/Forms/LivraisonForms/ModifyLivraisonPiecesForm"

// @ts-ignore
import ModifyDemandeAdminForm from "./pages/Forms/AdminForms/ModifyDemandeAdminForm"

// @ts-ignore
import RemplacementForm from "./pages/Forms/RemplacementForms/RemplacementForm"
// @ts-ignore
import AllRemplacements from "./pages/RemplacementPages/AllRemplacements"
// @ts-ignore
import RemplacementDetails from "./pages/RemplacementPages/RemplacementDetails"
// @ts-ignore
import ModifyRemplacementForm from "./pages/Forms/RemplacementForms/ModifyRemplacementForm"

// @ts-ignore
import EntreeSortie from "./pages/GestionStock/EntreeSortie"

// @ts-ignore
import CreateStockForm from "./pages/Forms/StockForms/CreateStockForm"

// @ts-ignore
import AjouterStockForm from "./pages/Forms/StockForms/AjouterStockForm"

// @ts-ignore
import DetailsMouvement from "./pages/GestionStock/DetailsMouvement"

// @ts-ignore
import AllStocks from "./pages/GestionStock/AllStocks"

// @ts-ignore
import StockDetails from "./pages/GestionStock/StockDetails"

// @ts-ignore
import UserDetails from "./pages/Accounts/UserDetails"

// @ts-ignore
import ItemDetails from "./pages/GestionStock/ItemDetails"

// @ts-ignore
import ValidateDemandeForm from "./pages/Forms/DemandesForms/ValidateDemandeForm"

// @ts-ignore
import RegularisationDemandeForm from "./pages/Forms/DemandesForms/RegularisationDemandeForm"

// @ts-ignore
import LivraisonDemandeForm from "./pages/Forms/DemandesForms/LivraisonDemandeForm"

// @ts-ignore
import RegularisationDemandeQrForm from "./pages/Forms/DemandesQrForms/RegularisationDemandeQrForm"
// @ts-ignore
import DemandeQrForm from "./pages/Forms/DemandesQrForms/DemandeQrForm"
// @ts-ignore
import AllDemandesQr from "./pages/DemandesQrPages/AllDemandesQr"
// @ts-ignore
import DemandeQrDetails from "./pages/DemandesQrPages/DemandeQrDetails"
// @ts-ignore
import ModifyDemandeQrForm from "./pages/Forms/DemandesQrForms/ModifyDemandeQrForm"
// @ts-ignore
import AllMarchandsQr from "./pages/DemandesQrPages/AllMarchandsQr"
// @ts-ignore
import RegularisationLivraisonForm from "./pages/Forms/LivraisonForms/RegularisationLivraisonForm"
// @ts-ignore
import SousDashboardLivraison from "./pages/Dashboards/SousDashboardLivraison"
import SousDashboardRemplacement from "./pages/Dashboards/SousDashboardRemplacement";
import SousDashboardQRcode from "./pages/Dashboards/SousDashboardQRcode";
import SousDashboardStocks from "./pages/Dashboards/SousDashboardStocks";

// @ts-ignore
import DecomForm from "./pages/Forms/DecomForms/DecomForm"
// @ts-ignore
import AllDecom from "./pages/DecomPages/AllDecom"
// @ts-ignore
import DecomDetails from "./pages/DecomPages/DecomDetails"
// @ts-ignore
import ModifyDecomForm from "./pages/Forms/DecomForms/ModifyDecomForm"
// @ts-ignore
import VerificationDecomForm from "./pages/Forms/DecomForms/VerificationDecomForm"

// @ts-ignore
import AllParcTpe from "./pages/GestionTpePages/AllParcTpe"
// @ts-ignore
import HistoryTpe from "./pages/GestionTpePages/HistoryTpe"
// @ts-ignore
import ManipulationTpeForm from "./pages/Forms/GestionTpeForms/ManipulationTpeForm"

// @ts-ignore
import RegRemplacementForm from "./pages/Forms/RemplacementForms/RegRemplacementForm"

// @ts-ignore
import RegDecomForm from "./pages/Forms/DecomForms/RegDecomForm"
// @ts-ignore
import RegVerificationForm from "./pages/Forms/DecomForms/RegVerificationForm"

// @ts-ignore
import RebutForm from "./pages/Forms/RebutForms/RebutForm"
// @ts-ignore
import AllDemandeRebuts from "./pages/RebutsPages/AllDemandeRebuts"
// @ts-ignore
import AllTpeRebuts from "./pages/RebutsPages/AllTpeRebuts"
// @ts-ignore
import TpeRebutDetails from "./pages/RebutsPages/TpeRebutDetails"
// @ts-ignore
import AllPiecesRebuts from "./pages/RebutsPages/AllPiecesRebuts"
// @ts-ignore
import DemandeRebutDetails from "./pages/RebutsPages/DemandeRebutDetails"
// @ts-ignore
import ModifyRebutForm from "./pages/Forms/RebutForms/ModifyRebutForm"
// @ts-ignore
import ValiderRebutForm from "./pages/Forms/RebutForms/ValiderRebutForm"

// @ts-ignore
import AllTpeRepare from "./pages/ReparationPages/AllTpeRepare"
// @ts-ignore
import ReparationTpeForm from "./pages/Forms/ReparationTpeForms/ReparationTpeForm"
// @ts-ignore
import AllLivraisonReparation from "./pages/ReparationPages/AllLivraisonReparation"
// @ts-ignore
import LivraisonReparationDetails from "./pages/ReparationPages/LivraisonReparationDetails"
// @ts-ignore
import UpdateReparationTpeForm from "./pages/Forms/ReparationTpeForms/UpdateReparationTpeForm"
// @ts-ignore
import ReceptionLivraisonReparationForm from "./pages/Forms/ReparationTpeForms/ReceptionLivraisonReparationInputs"
// @ts-ignore
import MiseEnReparationForm from "./pages/Forms/ReparationTpeForms/MiseEnReparationForm"

// @ts-ignore
import LiaisonTpePiecesForm from "./pages/Forms/MaintenanceTpeForms/LiaisonTpePiecesForm"

// @ts-ignore
import DashboardChargeurs from "./pages/Dashboards/DashboardChargeurs"

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
            <Route element={<ProtectedRoutes><AppLayout /></ProtectedRoutes>}>

              {/* Dashboard */}
              <Route index element={<Dashboard />} />
              <Route path="/sous-dashboard-livraison" element={<SousDashboardLivraison />} />
              {/* <Route path="/sous-dashboard-mvt-stock" element={<SousDashboardDemande />} /> */}
              <Route path="/sous-dashboard-remplacement" element={<SousDashboardRemplacement />} />
              <Route path="/sous-dashboard-qrcode" element={<SousDashboardQRcode />} />
              <Route path="/sous-dashboard-mvt-stock" element={<SousDashboardStocks />} />
              <Route path="/sous-dashboard-chargeurs" element={<DashboardChargeurs />} />
              {/* Others Page */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />
              <Route path="/form-livraison" element={<LivraisonForm />} />
              <Route path="/modifier-livraison/:id" element={<ModifyLivraisonForm />} />

              {/* Livraisons */}
              <Route path="/toutes-les-livraisons" element={<AllDeliveries/>} />
              <Route path="/formulaire/:id" element={<DeliveryDetails/>} />
              <Route path="/toutes-les-demandes-livraison" element={<AllDemandesDeliveries />} />
              <Route path="/demande-livraison/:id" element={<DemandeDeliveryDetails />} />
              <Route path="/livraison-pieces/:id" element={<LivraisonPiecesForm />} />
              <Route path="/modifier-livraison-pieces/:id" element={<ModifyLivraisonPiecesForm />} />
              <Route path="/regularisation-livraison" element={<RegularisationLivraisonForm />} />

              {/* Demandes QR CODE */}
              <Route path="/regularisation-demande-qr" element={<RegularisationDemandeQrForm />} />
              <Route path="/demande-qr" element={<DemandeQrForm />} />
              <Route path="/toutes-les-demandes-qr" element={<AllDemandesQr />} />
              <Route path="/demande-qr-details/:id" element={<DemandeQrDetails />} />
              <Route path="/modifier-demande-qr/:id" element={<ModifyDemandeQrForm />} />
              <Route path="/tous-les-marchands-qr" element={<AllMarchandsQr />} />

              {/* Stock */}
              <Route path="/voir-items" element={<AllItems />} />
              <Route path="/voir-piece/:id" element={<ItemDetails />} />
              <Route path="/modifier-stock/:id" element={<ModifyStockForm />} />
              <Route path="/ajouter-stock" element={<AjouterStockForm />} />
              <Route path="/ajouter-piece" element={<AjouterPieceForm />} />
              <Route path="/ajouter-terminal" element={<AjouterTerminalForm />} />
              <Route path="/modifier-piece/:id" element={<ModifyPieceForm />} />
              <Route path="/entree-sortie-stock" element={<EntreeSortie />} />
              <Route path="/creer-stock" element={<CreateStockForm />} />
              <Route path="/details-mouvement/:id" element={<DetailsMouvement />} />
              <Route path="/voir-stocks" element={<AllStocks />} />
              <Route path="/details-stock/:id" element={<StockDetails />} />


              {/* Demandes */}
              <Route path="/nouvelle-demande" element={<DemandeForm />} />
              <Route path="/nouvelle-demande-terminal" element={<DemandeTerminalForm />} />
              <Route path="/toutes-les-demandes" element={<AllDemandes />} />
              <Route path="/demande-details/:id" element={<DemandeDetails />} />
              <Route path="/modifier-demande/:id" element={<ModifyDemandeForm />} />
              <Route path="/valider-demande/:id" element={<ValidateDemandeForm />} />
              <Route path="/regularisation-demande" element={<RegularisationDemandeForm />} />
              <Route path="/livraison-demande/:id" element={<LivraisonDemandeForm />} />

              {/* Remplacement */}
              <Route path="/nouveau-remplacement" element={<RemplacementForm />} />
              <Route path="/tous-les-remplacements" element={<AllRemplacements />} />
              <Route path="/remplacement-details/:id" element={<RemplacementDetails />} />
              <Route path="/modifier-remplacement/:id" element={<ModifyRemplacementForm />} />
              <Route path="/regularisation-remplacement" element={<RegRemplacementForm />} />

              {/* Décommissionnement */}
              <Route path="/nouveau-decommissionnement" element={<DecomForm />} />
              <Route path="/tous-les-decommissionnements" element={<AllDecom />} />
              <Route path="/decom-details/:id" element={<DecomDetails />} />
              <Route path="/modifier-decom/:id" element={<ModifyDecomForm />} />
              <Route path="/verification-decom/:id" element={<VerificationDecomForm />} />
              <Route path="/regularisation-decom" element={<RegDecomForm />} />
              <Route path="/reg-verification-decom/:id" element={<RegVerificationForm />} />

              {/* Gestion des rebuts */}
              <Route path="/nouveau-rebut" element={<RebutForm />} />
              <Route path="/toutes-les-demandes-rebut" element={<AllDemandeRebuts />} />
              <Route path="/tpe-rebuts" element={<AllTpeRebuts />} />
              <Route path="/tpe-rebut-details/:id" element={<TpeRebutDetails />} />
              <Route path="/pieces-rebuts" element={<AllPiecesRebuts />} />
              <Route path="/demande-rebut-details/:id" element={<DemandeRebutDetails />} />
              <Route path="/modifier-rebut/:id" element={<ModifyRebutForm />} />
              <Route path="/valider-rebut/:id" element={<ValiderRebutForm />} />

              {/* Gestion des TPE à réparer */}
              <Route path="/tpe-a-reparer" element={<AllTpeRepare />} />
              <Route path="/reparation-tpe" element={<ReparationTpeForm />} />
              <Route path="/toutes-livraisons-reparation" element={<AllLivraisonReparation />} />
              <Route path="/livraison-reparation-details/:id" element={<LivraisonReparationDetails />} />
              <Route path="/update-reparation-tpe/:id" element={<UpdateReparationTpeForm />} />
              <Route path="/reception-livraison-reparation/:id" element={<ReceptionLivraisonReparationForm />} />
              <Route path="/mise-en-reparation" element={<MiseEnReparationForm />} />

              {/* Gestion Maintenance TPE */}
              <Route path="/liaison-tpe-pieces" element={<LiaisonTpePiecesForm />} />

              {/* Gestion Parc TPE */}
              <Route path="/parc-tpe" element={<AllParcTpe />} />
              <Route path="/historique-tpe/:id" element={<HistoryTpe />} />
              <Route path="/manipulation-tpe" element={<ManipulationTpeForm />} />

              {/* User */}
              <Route path="/user-profil" element={<UserDetails />} />


              {/****** Gestion *******/}

              {/* Utilisateurs */}
              <Route path="/tous-les-utilisateurs" element={<AllUsersPage />} />
              <Route path="/modifier-profil/:id" element={<ModifyProfilForm />} />
              <Route path="/créer-utilisateur" element={<CreateUserForm />} />
              {/* Types Livraisons */}
              <Route path="/types-livraison" element={<TypesLivraisonsPage />} />
              <Route path="/ajouter-type-livraison" element={<AjouterTypeLivraisonForm />} />
              <Route path="/modifier-type-livraison/:id" element={<ModifyTypeLivraisonForm />} />
              {/* Formulaire mouvement de stock */}
              <Route path="/modification-admin-demande/:id" element={<ModifyDemandeAdminForm />} />



              {/* Reset Password */}
              <Route path="/modifier-mot-de-passe" element={<ResetPassword />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
