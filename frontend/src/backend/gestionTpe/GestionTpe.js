import axios from "axios";
import urlBase from '../const';

export class GestionTpe {

    async getParcTpe() {
        try {
            const response = await axios.get(`${urlBase}/api/gestion-tpe/getParcTpe`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
    async getAllStatut() {
        try {
            const response = await axios.get(`${urlBase}/api/gestion-tpe/getAllStatut`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
    async getTpeHistory(id) {
        try {
            const response = await axios.get(`${urlBase}/api/gestion-tpe/getTpeHistory/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
}