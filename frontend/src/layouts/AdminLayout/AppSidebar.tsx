import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
// @ts-ignore
import { useAuth } from "../../context/AuthContext"
// @ts-ignore
import LoadingPage from "../../components/common/LoadingPage"

import {
  ChevronDownIcon,
  HorizontaLDots,
  ListIcon,
  GridIcon,
  UserCircleIcon,
  StockBox,
  DeliveryAdd,
  QrCodeIcon,
  RefreshTimeIcon,
  BaseLinePhoneIcon,
  TrashBinIcon,
} from "../../icons";
import { useSidebar } from "../../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles?: number[];
  subItems?: { name: string; path: string; roles?: number[]; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [
      { name: "Semaine en cours", path: "/", pro: false },
      { name: " Livraison TPE", path: "/sous-dashboard-livraison", roles: [1], pro: false },
      { name: " Remplacement TPE", path: "/sous-dashboard-remplacement", roles: [1], pro: false },
      { name: " QRcode", path: "/sous-dashboard-qrcode", pro: false },
      { name: " Mouvement Stock", path: "/sous-dashboard-mvt-stock", pro: false },
      // { name: " Dashboard Stock", path: "/sous-dashboard-stock", pro: false },
      // { name: "Données Générales", path:"/donnees-generales", pro: false},
      // { name: "Statistiques livraisons", path: "/statistiques-livraisons", pro: false },
      // { name: "Stock chargeur", path: "/gestion-stock-chargeur", pro: false },
    ],
  },
  {
    name: "Gestion des Livraisons",
    icon: <ListIcon />,
    subItems: [
      { name: "Nouvelle Livraison", path: "/form-livraison", roles: [1], pro: false },
      { name: "Toutes les livraisons", path: "/toutes-les-livraisons", pro: false },
      { name: "Nouveau Remplacement", path: "/nouveau-remplacement", roles: [1], pro: false },
      { name: "Tous les remplacements", path: "/tous-les-remplacements", pro: false },
    ],

  },
  {
    name: "Gestion des QRcodes",
    icon: <QrCodeIcon />,
    roles: [15, 16, 17, 18, 19, 20, 21, 22],
    subItems: [
      // { name: "REG Demande QRC", path: "/regularisation-demande-qr",roles:[21], pro: false },
      { name: "Nouvelle Demande QRC", path: "/demande-qr", roles: [15], pro: false },
      { name: "Toutes les demandes QRC", path: "/toutes-les-demandes-qr", roles: [15, 16, 17, 18, 19, 20, 21, 22], pro: false },
      { name: "Tous les Marchands QRC", path: "/tous-les-marchands-qr", roles: [15, 16, 17, 18, 19, 20, 21, 22], pro: false },
    ],

  },
  {
    icon: <StockBox />,
    name: "Gestion des Stocks",
    roles: [3, 4, 7, 11, 12],
    subItems: [
      // { name: "Ajouter Element Stock", path: "/ajouter-stock", pro: false },
      { name: "Nouvelle Demande Stock", path: "/nouvelle-demande", roles: [3], pro: false },
      { name: "Toutes les demandes Stock", path: "/toutes-les-demandes", roles: [3, 11], pro: false },
      { name: "Voir Elements Stock", path: "/voir-items", roles: [7], pro: false },
      { name: "Créer Nouveau Stock", path: "/creer-stock", roles: [7], pro: false },
      { name: "Voir tous les Stocks", path: "/voir-stocks", roles: [7], pro: false },
      { name: "Entrées Sorties", path: "/entree-sortie-stock", roles: [7], pro: false },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "Gestion des Profils",
    roles: [5],
    subItems: [
      { name: "Ajouter utilisateur", path: "/créer-utilisateur", pro: false },
      { name: "Tous les utilisateurs", path: "/tous-les-utilisateurs", pro: false },
    ],
  },
  {
    icon: <DeliveryAdd />,
    name: "Parametrage Livraison",
    roles: [14],
    subItems: [
      { name: "Ajouter type livraison", path: "/ajouter-type-livraison", pro: false },
      { name: "Voir types livraison", path: "/types-livraison", pro: false },
    ],
  },
  {
    name: "Gestion des décomm",
    icon: <TrashBinIcon />,
    roles: [23, 24, 25, 26],
    subItems: [
      { name: "Nouveau décomm", path: "/nouveau-decommissionnement", roles: [23], pro: false },
      { name: "Tous les décomm", path: "/tous-les-decommissionnements", roles: [23, 24, 25, 26], pro: false },
    ],
  },
  {
    icon: <BaseLinePhoneIcon />,
    name: "Gestion Parc TPE",
    roles: [27, 28],
    subItems: [
      { name: "Voir Parc", path: "/parc-tpe", roles: [27, 28], pro: false },
      { name: "Manipulation TPE", path: "/manipulation-tpe", roles: [27], pro: false },
    ],
  },
  {
    icon: <RefreshTimeIcon />,
    name: "Gestion Régularisation",
    roles: [1, 3, 21],
    subItems: [
      { name: "REG Livraison", path: "/regularisation-livraison", roles: [1], pro: false },
      { name: "REG Demande Stock", path: "/regularisation-demande", roles: [3], pro: false },
      { name: "REG Demande QRC", path: "/regularisation-demande-qr", roles: [21], pro: false },
    ],
  },

];


const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {

  const { user, loading } = useAuth();

  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const hasRoleAccess = (roles = []) => {
    if (roles.length === 0) return true;
    // @ts-ignore
    return user?.roleList?.some((role) => roles.includes(role));
  };

  // @ts-ignore
  const filterNavItems = (items) =>
    // @ts-ignore
    items.map((item) => {
      // Filter subItems
      const filteredSubItems = item.subItems
        // @ts-ignore
        ? item.subItems.filter((sub) => hasRoleAccess(sub.roles))
        : [];

      // Include item if:
      // - It has no roles restriction OR user has access
      // - It has at least one visible subItem
      if (hasRoleAccess(item.roles)) {
        return { ...item, subItems: filteredSubItems };
      }

      return null;
    }).filter(Boolean);


  const filteredNavItems = filterNavItems(navItems);

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  if (loading) return (<LoadingPage />);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link to="/" className="flex justify-center items-center w-full">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <div className="flex flex-col text-center">
                <span className="font-semibold text-gray-700 tracking-widest text-xl mb-2">SYSLIS</span>
                <div>
                  <img
                    className="dark:hidden"
                    src="/images/logo/greenpay.jpeg"
                    alt="Logo"
                    width={90}
                    height={40}
                  />
                  <img
                    className="hidden dark:block"
                    src="/images/logo/greenpay.jpeg"
                    alt="Logo"
                    width={150}
                    height={40}
                  />
                </div>
              </div>
            </>
          ) : (
            <img
              src="/images/logo/greenpay.jpeg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(filteredNavItems, "main")}
            </div>
          </div>
        </nav>
        <div className="text-center text-xs font-bold text-gray-500">
          <span>
            v.1.12.1
          </span>
        </div>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
