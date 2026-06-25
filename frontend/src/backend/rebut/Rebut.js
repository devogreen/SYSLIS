import axios from "axios";
import urlBase from '../const';

export class Rebut {

    async downloadTemplateRebut(userId) {
        try {
            const response = await axios.post(`${urlBase}/api/rebut/downloadTemplateRebut`,
            {userId},
            {
                responseType: "blob",
            });
            return response;
        } catch (error) {
            throw error.response?.data || { message: "Download failed" };
        }
    }

    async extractRebut(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/rebut/extractRebut`, formData, {
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

    async demandeRebut(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/rebut/demandeRebut`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async getAllDemandesRebut() {
        try {
            const response = await axios.get(`${urlBase}/api/rebut/getAllDemandesRebut`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getAllTpeRebuts() {
        try {
            const response = await axios.get(`${urlBase}/api/rebut/getAllTpeRebuts`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getTpeRebutDetails(id) {
        try {
            const response = await axios.get(`${urlBase}/api/rebut/getTpeRebutDetails/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async changeLotPiece(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/rebut/changeLotPiece/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async recupPieceFonc(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/rebut/recupPieceFonc/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getAllPiecesRebut() {
        try {
            const response = await axios.get(`${urlBase}/api/rebut/getAllPiecesRebut`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getOneDemandeRebut(id) {
        try {
            const response = await axios.get(`${urlBase}/api/rebut/getOneDemandeRebut/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async updateDemandeRebut(id, formData) {
        try {
            const response = await axios.put(`${urlBase}/api/rebut/updateDemandeRebut/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async validateDemandeRebut(id, formData) {
        try {
            const response = await axios.put(`${urlBase}/api/rebut/validateDemandeRebut/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async cloturerDemandeRebut(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/rebut/cloturerDemandeRebut/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
}