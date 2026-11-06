// hooks/useSidebarNotifications.js
// Compteurs des bulles de la barre latérale : rechargés au montage, à chaque changement de page,
// au retour sur l'onglet, toutes les 60 s (onglet visible) et sur l'événement EVENEMENT_RAFRAICHIR.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Notifications } from "../backend/notifications/Notifications";

const INTERVALLE_MS = 60000;
const VIDE = { total: 0, parChemin: {}, details: [] };

// Une page peut forcer la mise à jour après une action : window.dispatchEvent(new Event(EVENEMENT_RAFRAICHIR))
export const EVENEMENT_RAFRAICHIR = "syslis:notifications-refresh";

const api = new Notifications();

const lireToken = () => {
    try {
        return localStorage.getItem("token");
    } catch (e) {
        return null;
    }
};

export default function useSidebarNotifications(actif = true) {
    const [notifications, setNotifications] = useState(VIDE);
    const enCours = useRef(false);
    const dernier = useRef("");
    const location = useLocation();

    const rafraichir = useCallback(async () => {
        if (!actif || enCours.current || !lireToken()) return;
        enCours.current = true;
        try {
            const data = await api.getSidebar();
            const suivant = {
                total: Number(data?.total) || 0,
                parChemin: data?.parChemin || {},
                details: Array.isArray(data?.details) ? data.details : [],
            };
            // Pas de nouveau rendu si rien n'a changé
            const empreinte = JSON.stringify(suivant);
            if (empreinte !== dernier.current) {
                dernier.current = empreinte;
                setNotifications(suivant);
            }
        } catch (error) {
            // Les bulles sont secondaires : une erreur ne doit pas gêner la navigation
            console.log("Notifications indisponibles :", error?.message || error);
        } finally {
            enCours.current = false;
        }
    }, [actif]);

    // Montage et changement de page (une action se termine en général par une redirection)
    useEffect(() => {
        rafraichir();
    }, [location.pathname, rafraichir]);

    useEffect(() => {
        if (!actif) return undefined;
        const intervalle = setInterval(() => {
            if (document.visibilityState === "visible") rafraichir();
        }, INTERVALLE_MS);
        const surVisibilite = () => {
            if (document.visibilityState === "visible") rafraichir();
        };
        document.addEventListener("visibilitychange", surVisibilite);
        window.addEventListener(EVENEMENT_RAFRAICHIR, rafraichir);
        return () => {
            clearInterval(intervalle);
            document.removeEventListener("visibilitychange", surVisibilite);
            window.removeEventListener(EVENEMENT_RAFRAICHIR, rafraichir);
        };
    }, [actif, rafraichir]);

    // Déconnexion : on vide les compteurs
    useEffect(() => {
        if (!actif) {
            dernier.current = "";
            setNotifications(VIDE);
        }
    }, [actif]);

    return { ...notifications, rafraichir };
}
