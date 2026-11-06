import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Dropdown } from "../../ui/dropdown/Dropdown";
import { DropdownItem } from "../../ui/dropdown/DropdownItem";
// @ts-ignore
import { Notifications } from "../../../backend/notifications/Notifications";
// @ts-ignore
import { useNotifications } from "../../../context/NotificationsContext";

// Actions en attente de l'utilisateur connecté (mêmes règles que les bulles de la barre latérale).
// Chaque ligne mène à la page où l'action se fait.

type Element = { id: number | string; titre: string; detail?: string; date?: string | null; lien: string };
type Groupe = { cle: string; libelle: string; chemin: string; nombre: number; elements: Element[]; tronque?: boolean };

const LIMITE_PAR_GROUPE = 10;
const api = new Notifications();

// Icône (primeicons) selon le module de la page
const ICONES: Record<string, string> = {
  "/toutes-les-demandes": "pi-box",
  "/tous-les-decommissionnements": "pi-trash",
  "/livraison-param-decom": "pi-cog",
  "/livraisons-param-decom": "pi-truck",
  "/reparation-tpe": "pi-wrench",
  "/reparations-tpe": "pi-wrench",
  "/toutes-livraisons-reparation": "pi-truck",
  "/toutes-les-demandes-rebut": "pi-ban",
  "/toutes-les-demandes-qr": "pi-qrcode",
};

const formatDate = (date?: string | null) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [totalListe, setTotalListe] = useState<number | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const requete = useRef(0);
  const synchroFaite = useRef(false);
  const navigate = useNavigate();

  // Compteur partagé avec la barre latérale (rechargé à chaque page et toutes les 60 s)
  const { total, rafraichir } = useNotifications() as { total: number; rafraichir: () => void };
  const totalRef = useRef(total);
  totalRef.current = total;

  const chargerListe = useCallback(async () => {
    const numero = ++requete.current;
    setChargement(true);
    setErreur("");
    try {
      const data = await api.getListe(LIMITE_PAR_GROUPE);
      if (numero !== requete.current) return; // une requête plus récente a été lancée
      const totalRecu = Number(data?.total) || 0;
      setGroupes(Array.isArray(data?.groupes) ? data.groupes : []);
      setTotalListe(totalRecu);
      // La liste est plus récente que le compteur : on resynchronise les bulles (une fois par ouverture)
      if (totalRecu !== totalRef.current && !synchroFaite.current) {
        synchroFaite.current = true;
        rafraichir();
      }
    } catch (error: any) {
      if (numero !== requete.current) return;
      setErreur(error?.message || "Impossible de charger les notifications.");
    } finally {
      if (numero === requete.current) setChargement(false);
    }
  }, [rafraichir]);

  // Liste chargée à l'ouverture, et rechargée si le compteur change pendant qu'elle est ouverte
  useEffect(() => {
    if (isOpen) chargerListe();
  }, [isOpen, total, chargerListe]);

  useEffect(() => {
    if (!isOpen) synchroFaite.current = false;
  }, [isOpen]);

  // En-tête : total de la liste affichée (sinon celui des bulles en attendant le chargement)
  const totalAffiche = totalListe ?? total;

  const toggleDropdown = () => setIsOpen((ouvert) => !ouvert);
  const closeDropdown = useCallback(() => setIsOpen(false), []);

  const ouvrir = (lien: string) => {
    closeDropdown();
    navigate(lien);
  };

  const actualiser = () => {
    rafraichir();
    chargerListe();
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
        title={total > 0 ? `${total} action(s) en attente` : "Aucune action en attente"}
      >
        {total > 0 && (
          <span className="absolute -right-1 -top-1 z-10 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-error-500 text-white text-[10px] font-semibold leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex max-h-[520px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[380px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Actions en attente
            {totalAffiche > 0 && (
              <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">({totalAffiche})</span>
            )}
          </h5>
          <div className="flex items-center gap-3">
            <button
              onClick={actualiser}
              title="Actualiser"
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <i className={`pi pi-refresh ${chargement ? "pi-spin" : ""}`} style={{ fontSize: "14px" }}></i>
            </button>
            <button
              onClick={closeDropdown}
              title="Fermer"
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <i className="pi pi-times" style={{ fontSize: "14px" }}></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {erreur ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p className="mb-3">{erreur}</p>
              <button onClick={chargerListe} className="text-brand-500 hover:underline">Réessayer</button>
            </div>
          ) : chargement && groupes.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <i className="pi pi-spin pi-spinner mr-2"></i>Chargement…
            </div>
          ) : groupes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
              <i className="pi pi-check-circle text-green-500" style={{ fontSize: "24px" }}></i>
              <span>Aucune action en attente</span>
            </div>
          ) : (
            groupes.map((groupe) => (
              <div key={groupe.cle} className="mb-3">
                <div className="flex items-center justify-between px-1 mb-1">
                  <h6 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                    {groupe.libelle}
                  </h6>
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-error-500 text-white text-[10px] font-semibold leading-none">
                    {groupe.nombre}
                  </span>
                </div>
                <ul className="flex flex-col">
                  {groupe.elements.map((element) => (
                    <li key={`${groupe.cle}-${element.id}`}>
                      <DropdownItem
                        onItemClick={() => ouvrir(element.lien)}
                        className="flex gap-3 rounded-lg border-b border-gray-100 px-3 py-2.5 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                      >
                        <span className="flex justify-center items-center shrink-0 bg-gray-100 w-9 h-9 rounded-full dark:bg-gray-800">
                          <i className={`pi ${ICONES[groupe.chemin] || "pi-bell"} text-gray-600 dark:text-gray-300`} style={{ fontSize: "14px" }}></i>
                        </span>
                        <span className="block min-w-0">
                          <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90 truncate">
                            {element.titre}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 text-theme-xs text-gray-500 dark:text-gray-400">
                            {element.detail && <span>{element.detail}</span>}
                            {element.detail && element.date && <span className="w-1 h-1 bg-gray-400 rounded-full"></span>}
                            {element.date && <span>{formatDate(element.date)}</span>}
                          </span>
                        </span>
                      </DropdownItem>
                    </li>
                  ))}
                </ul>
                {groupe.tronque && (
                  <button
                    onClick={() => ouvrir(groupe.chemin)}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-brand-500 hover:underline"
                  >
                    Voir la liste complète →
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </Dropdown>
    </div>
  );
}
