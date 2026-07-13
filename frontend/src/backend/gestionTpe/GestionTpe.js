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
    async extractSn(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/gestion-tpe/extractSn`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return {
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            throw error.response.data;
        }
    }
    async changeListeStatut(payload) {
        try {
            const response = await axios.post(`${urlBase}/api/gestion-tpe/changeListeStatut`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
    async getTpe(id) {
        try {
            const response = await axios.get(`${urlBase}/api/gestion-tpe/getTpe/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
    async exportTpeToExcel(payload) {
        try {
            const response = await axios.post(`${urlBase}/api/gestion-tpe/exportTpeToExcel`, payload, {
                responseType: "blob",
            });
            return response;
        } catch (error) {
            throw error.response?.data || { message: "Export failed" };
        }
    }
}