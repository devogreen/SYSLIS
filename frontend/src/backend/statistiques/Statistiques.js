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

    // ----- Dashboard statistiques parc TPE -----
    async getRepartitionParcTpe(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/parc-tpe/repartition`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getFluxParcTpe(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/parc-tpe/flux`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getTpesParStatut(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/parc-tpe/tpes`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getDureesParcTpe(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/parc-tpe/durees`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getTimelineTpe(sn) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/parc-tpe/timeline/${encodeURIComponent(sn)}`)
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getParcoursTpe(params) {
        try {
            const response = await axios.get(`${urlBase}/api/stats/parc-tpe/parcours`, { params })
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }

    async getModelesParcTpe() {
        try {
            const response = await axios.get(`${urlBase}/api/stats/parc-tpe/modeles`)
            return response.data;
        } catch (error) {
            throw error.response?.data ?? error
        }
    }
}