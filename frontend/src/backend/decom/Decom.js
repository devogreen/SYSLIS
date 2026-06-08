import axios from "axios";
import urlBase from '../const';

export class Decom {
    async faireDecom(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/faireDecom`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async getAllDecoms() {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getAllDecoms`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getOneDecom(id) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getOneDecom/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async modifyDecom(id, formData) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/modifyDecom/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async cancelDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/cancelDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async receptionDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/receptionDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async returnDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/returnDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async getSnDecom(id) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getSnDecom/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async verifyDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/verifyDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async clotureDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/clotureDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async regVerifyDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/regVerifyDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async extractDecom(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/extractDecom`, formData, {
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

    async downloadTemplateDecom() {
        try {
            const response = await axios.get(`${urlBase}/api/decom/downloadTemplateDecom`, {
                responseType: "blob",
            })
            return response;
        } catch (error) {
            throw error.response?.data || { message: "Download failed" };
        }
    }

    async exportOneDecomToExcel(id) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/exportOneDecomToExcel/${id}`, {
                responseType: "blob",
            });
            return response;
        } catch (error) {
            throw error.response?.data || { message: "Export failed" };
        }
    }
    
}