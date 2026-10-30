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

    async validationListeDecom(id, formData) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/validationListeDecom/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
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

    async downloadTemplateDecom(userId) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/downloadTemplateDecom`,{userId}, {
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

    async getAllTpeRepare() {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getAllTpeRepare`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async reparerTpe(sn, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/reparerTpe/${sn}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async extractSnReparation(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/extractSnReparation`, formData, {
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

    async reparerListeTpe(payload) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/reparerListeTpe`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getAllLivraisonReparation() {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getAllLivraisonReparation`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getOneLivraisonReparation(id) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getOneLivraisonReparation/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async receptionLivraisonReparation(id, formData) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/receptionLivraisonReparation/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async cloturerLivraisonReparation(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/cloturerLivraisonReparation/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async miseEnReparationTpe(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/miseEnReparationTpe`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async extractMiseEnReparation(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/extractMiseEnReparation`, formData, {
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

    async downloadTemplateLiaisonTpePieces(userId) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/downloadTemplateLiaisonTpePieces`,
                { userId },
                {
                    responseType: "blob",
                });
            return response;
        } catch (error) {
            throw error.response?.data || { message: "Download failed" };
        }
    }

    async extractLiaisonTpePiecesData(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/extractLiaisonTpePiecesData`, formData, {
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

    async liaisonTpePieces(payload) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/liaisonTpePieces`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async exportAllDecomToExcel(listId) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/exportAllDecomToExcel`, { listId },
                {
                    responseType: "blob",
                });
            return response;
        } catch (error) {
            throw error.response?.data || { message: "Export failed" };
        }
    }

    async getPieceDefectueuseTpe(serial) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getPieceDefectueuseTpe/${serial}`)
            return {
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            throw error.response.data
        }
    }

    async getPieceDefectueuseListeTpe(listeSn) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getPieceDefectueuseListeTpe/${listeSn}`)
            return response.data;
        } catch (error) {
            throw error.response.data
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

    async transmisDecomMaintenance(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/transmisDecomMaintenance/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async validationTransmissionDecom(id, formData) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/validationTransmissionDecom/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async confirmDiagnosticDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/confirmDiagnosticDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async cancelDiagnosticDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/cancelDiagnosticDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    /*********  Livraisons des TPE en param maintenance  *********/

    async getTpeParamMaintenance(decomId = null) {
        try {
            const query = decomId ? `?decomId=${decomId}` : ''
            const response = await axios.get(`${urlBase}/api/decom/getTpeParamMaintenance${query}`)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async livrerParamDecom(payload) {
        try {
            const response = await axios.post(`${urlBase}/api/decom/livrerParamDecom`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async getAllLivraisonParamDecom() {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getAllLivraisonParamDecom`)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async getOneLivraisonParamDecom(id) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getOneLivraisonParamDecom/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async receptionLivraisonParamDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/receptionLivraisonParamDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async cloturerLivraisonParamDecom(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/cloturerLivraisonParamDecom/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    /*********  Réparation des TPE par lots  *********/

    async getAllReparationTpe() {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getAllReparationTpe`)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async getOneReparationTpe(id) {
        try {
            const response = await axios.get(`${urlBase}/api/decom/getOneReparationTpe/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async validerReparationTpe(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/validerReparationTpe/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async livrerReparationTpe(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/decom/livrerReparationTpe/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

}