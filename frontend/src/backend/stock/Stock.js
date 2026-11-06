import axios from "axios";
import urlBase from '../const';

export class Stock {

    async getAllItems() {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllItems`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async getAllModels() {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllModels`)
            console.log(response)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async addPiece(payload) {
        try {
            const response = await axios.post(`${urlBase}/api/stock/addPiece`, payload)
            return response.data
        } catch (error) {
            throw error.response.data
        }
    }

    async getAllMouvementStock() {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllMouvementStock`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async getPiece(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getPiece/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async modifyPiece(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/stock/modifyPiece/${id}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async getLotPiece(item_id, model_id, service_id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getLotPiece/${item_id}/${model_id}/${service_id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getCartonLot(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getCartonLot/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getCartonPiece(item_id, model_id, service_id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getCartonPiece/${item_id}/${model_id}/${service_id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getItemModels(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getItemModels/${id}`)
            console.log(response)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async getItemServices(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getItemServices/${id}`)
            console.log(response)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async getAllTypeMouvementStock() {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllTypeMouvementStock`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async getOneMouvement(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getOneMouvement/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async createStock(payload) {
        try {
            const response = await axios.put(`${urlBase}/api/stock/createStock`, payload)
            return response.data
        } catch (error) {
            throw error.response.data
        }
    }

    async getAllStocks() {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllStocks`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async getAllItemModels() {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllItemModels`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getAllItemServices() {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllItemServices`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getOneStock(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getOneStock/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getCartonStock(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getCartonStock/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getLotStock(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getLotStock/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getOneStockMouvements(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getOneStockMouvements/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async getStockParPiece(id) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getStockParPiece/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    async setStockSn(formData) {
        try {
            const response = await axios.post(`${urlBase}/api/stock/setStockSn`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    }

    async getAllUserTypeStocks(itemId, modelId, serviceId) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllUserTypeStocks/${itemId}/${modelId}/${serviceId}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };

    async modifyStock(id, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/stock/modifyStock/${id}`, payload)
            return response.data
        } catch (error) {
            throw error.response.data
        }
    }

    async createMouvementStock(stockId, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/stock/createMouvementStock/${stockId}`, payload)
            return response.data
        } catch (error) {
            throw error.response.data
        }
    }

    async getAllStockSubOwners(stockId) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getAllStockSubOwners/${stockId}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    // Stocks que l'utilisateur peut associer (fusionner) à ce stock
    async getStocksFusionnables(stockId, userId) {
        try {
            const response = await axios.get(`${urlBase}/api/stock/getStocksFusionnables/${stockId}/${userId}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    // payload : { userId, sourceIds: [], motif, commentaire }
    async associerStocks(stockId, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/stock/associerStocks/${stockId}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }

    // payload : { userId, motif, confirmerSortie }
    async supprimerStock(stockId, payload) {
        try {
            const response = await axios.put(`${urlBase}/api/stock/supprimerStock/${stockId}`, payload)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    }
}
