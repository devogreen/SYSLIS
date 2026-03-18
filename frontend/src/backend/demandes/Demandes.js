import axios from "axios";
import urlBase from '../const';

export class Demandes {
  async faireDemande(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/faireDemande`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data
    } catch (error) {
      throw error.response.data;
    }
  }

  async getAllDemandes() {
    try {
      const response = await axios.get(`${urlBase}/api/demandes/getAllDemandes`)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  async getOneDemande(id) {
    try {
      const response = await axios.get(`${urlBase}/api/demandes/getOneDemande/${id}`)
      // console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  async livraisonDemande(payload) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/livraisonDemande`, payload)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async validateDemande(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/validateDemande`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async returnDemande(payload) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/returnDemande`, payload)
      console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  };

  async cancelDemande(payload) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/cancelDemande`, payload)
      console.log(response)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  };

  async updateDemande(id, formData) {
    try {
      const response = await axios.put(`${urlBase}/api/demandes/updateDemande/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }}
      )
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  async getPdf(idDemande) {
    try {
      const response = await axios.get(`${urlBase}/api/demandes/getPdf/${idDemande}`, {
        responseType: 'blob', // important!
      });
      console.log(response)

      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async receivePiece(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/receivePiece`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async getAllDemandeFiles(idDemande) {
    try {
      const response = await axios.get(`${urlBase}/api/demandes/getAllDemandeFiles/${idDemande}`)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  // Récupérer les demandes en attente (statut: en_cours)
  async getDemandesEnAttente() {
    try {
      const response = await axios.get(`${urlBase}/api/demandes/getDemandesEnAttente`)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  // Récupérer les demandes validées (statut: valide)
  async getDemandesValidees() {
    try {
      const response = await axios.get(`${urlBase}/api/demandes/getDemandesValidees`)
      return response.data;
    } catch (error) {
      throw error.response.data
    }
  };

  async regularisationDemande(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/regularisationDemande`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data
    } catch (error) {
      throw error.response.data;
    }
  }

  async regValidateDemande(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/regValidateDemande`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async regLivraisonDemande(payload) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/regLivraisonDemande`, payload)
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async regReceptionDemande(formData) {
    try {
      const response = await axios.post(`${urlBase}/api/demandes/regReceptionDemande`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }
}

