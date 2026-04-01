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
    async getTpeInfos(sn) {
        try {
            const response = await axios.get(`${urlBase}/api/gestion-tpe/getTpeInfos/${sn}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
    async changeTpeStatut(sn, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/gestion-tpe/changeTpeStatut/${sn}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
}