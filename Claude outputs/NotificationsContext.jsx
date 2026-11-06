// context/NotificationsContext.jsx
// Compteurs des actions en attente, partagés entre la barre latérale (bulles) et la cloche du header :
// une seule requête périodique pour les deux.
import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import useSidebarNotifications from "../hooks/useSidebarNotifications";

const NotificationsContext = createContext({
  total: 0,
  parChemin: {},
  details: [],
  rafraichir: () => {},
});

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const notifications = useSidebarNotifications(!!user);
  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
