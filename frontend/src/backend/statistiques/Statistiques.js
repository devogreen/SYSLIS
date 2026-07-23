import axios from "axios";
import urlBase from '../const';


export class Statistiques {

    async getChargerWithdrawalsTimeSeries(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/getChargerWithdrawalsTimeSeries`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getChargerMovementServiceOptions() {
        try {
            const response = await axios.get(`${urlBase}/api/stats/getChargerMovementServiceOptions`)
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getChargerLivraisonWithdrawals(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/getChargerLivraisonWithdrawals`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getChargerStockWithdrawals(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/getChargerStockWithdrawals`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }
}