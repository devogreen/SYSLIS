import axios from "axios";
import urlBase from '../const';

// L'utilisateur est lu dans le token côté serveur.
export class Notifications {

    // Nombre d'éléments en attente d'une action de l'utilisateur connecté, par lien du menu.
    async getSidebar() {
        try {
            const response = await axios.get(`${urlBase}/api/notifications/sidebar`)
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: "Erreur lors du chargement des notifications" }
        }
    }

    // Actions en attente regroupées par étape : { total, groupes: [{ cle, libelle, chemin, nombre, elements }] }
    async getListe(limite = 10) {
        try {
            const response = await axios.get(`${urlBase}/api/notifications/liste`, { params: { limite } })
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: "Erreur lors du chargement des notifications" }
        }
    }
}
