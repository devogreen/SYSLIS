import axios from "axios";
import urlBase from '../const';


export class ProductDeliveries {
  async deliver(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/deliver`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  };

   async regReception(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/regReception`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  };

  async regLivraison(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/regLivraison`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  };
  async deliverOld(commentaire, type_livraison_id, user_id, isAncienne, date_livraison, nom_livreur, nom_validateur, produitsLivre) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/deliverOld`,
        {
          commentaire,
          type_livraison_id,
          user_id,
          isAncienne,
          date_livraison,
          nom_livreur,
          nom_validateur,
          produitsLivre
        });
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  };

  async getAllLivraisons() {
    try {
      const response = await axios.get(`${urlBase}/api/delivery/getAllLivraisons`)
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  async getOneLivraison(id) {
    try {
      const response = await axios.get(`${urlBase}/api/delivery/getOneLivraison/${id}`)
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  async updateLivraison(id, payload) {
    try {
      const response = await axios.put(`${urlBase}/api/delivery/updateLivraison/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  async deliverStock(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/deliverStock`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async getAllTypeLivraisonCommerciale() {
    try {
      const response = await axios.get(`${urlBase}/api/delivery/getAllTypeLivraisonCommerciale`)
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  }

  async getAllStockDeliveries() {
    try {
      const response = await axios.get(`${urlBase}/api/delivery/getAllStockDeliveries`)
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  }

  async getOneLivraisonDemande(id) {
    try {
      const response = await axios.get(`${urlBase}/api/delivery/getOneLivraisonDemande/${id}`)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  }

  async receiveStock(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/receiveStock`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async addDeliveryType(payload) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/addDeliveryType`, payload)
      return response.data
    } catch (error) {
      throw error.response.data
    }
  }

  async getOneTypeLivraison(id) {
    try {
      const response = await axios.get(`${urlBase}/api/delivery/getOneTypeLivraison/${id}`)
      return response.data
    } catch (error) {
      throw error.response.data
    }
  }

  async updateTypeLivraison(id, payload) {
    try {
      const response = await axios.put(`${urlBase}/api/delivery/updateTypeLivraison/${id}`, payload)
      return response.data
    } catch (error) {
      throw error.response.data
    }
  }

  async deleteTypeLivraison(id, payload) {
    try {
      const response = await axios.put(`${urlBase}/api/delivery/deleteTypeLivraison/${id}`, payload)
      return response.data
    } catch (error) {
      throw error.response.data
    }
  }

  async updateDeliveryStock(id, payload) {
    try {
      const response = await axios.put(`${urlBase}/api/delivery/updateDeliveryStock/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  }

  async generateTotalPf(listId) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/totalPdf`,
        { listId },
        { responseType: 'blob', } // important!
      );
      console.log(response)
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async generateDeliveriesXLSX(listId) {
    try {
      const response = await axios.post(`${urlBase}/api/delivery/generateDeliveriesXLSX`,
        { listId },
        { responseType: 'blob', } // important!
      );
      console.log(response)
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}