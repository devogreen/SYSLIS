import axios from "axios";
import urlBase from '../const';

export class Remplacements{
    async getAllTypeParametrage(){
        try{
            const response = await axios.get(`${urlBase}/api/delivery/getAllTypeParametrage`)
            // console.log(response)
            return response.data;
        } catch(error){
            throw error.response.data
        }
    }

    async makeRemplacement(formData){
        try{
            const response = await axios.post(`${urlBase}/api/delivery/makeRemplacement`, formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            )
            return response.data
        } catch(error) {
            throw error.response.data;
        }
    }

    async getAllRemplacements(){
        try{
            const response = await axios.get(`${urlBase}/api/delivery/getAllRemplacements`)
            return response.data
        } catch(error){
            throw error.response.data;
        }
    }

    async getOneRemplacement(id){
        try{
            const response = await axios.get(`${urlBase}/api/delivery/getOneRemplacement/${id}`)
            return response.data
        } catch(error){
            throw error.response.data;
        }
    }

    async validateRemplacement(formData){
        try {
            const response = await axios.post(`${urlBase}/api/delivery/validateRemplacement`, formData, {
                headers: {
                'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (error) {
        throw error.response.data;
        }
    }

    async generateRemplacementsXLSX(listId){
        try{
            const response = await axios.post(`${urlBase}/api/delivery/generateRemplacementsXLSX`,
            {listId},
            {responseType: 'blob',} // important!
            );
            console.log(response)
            return response.data;
        }catch(error){
            throw error.response?.data || error;
        }
    }

    async updateRemplacement(id, payload){
        try{
            const response = await axios.put(`${urlBase}/api/delivery/updateRemplacement/${id}`,payload);
            return response.data;
        } catch(error){
            throw error.response.data
        }
    };

    async returnRemplacement(payload){
        try{
            const response = await axios.post(`${urlBase}/api/delivery/returnRemplacement`,payload)
        console.log(response)
            return response.data;
        } catch (error) {
            throw error.response.data;
        }
    };

    async generateRemplacementPDF(id){
        try{
            const response = await axios.get(`${urlBase}/api/delivery/generateRemplacementPDF/${id}`, {
                responseType: 'blob', // important!
            });
            console.log(response)
            return response.data;
        }catch(error){
            throw error.response.data;
        }
    }

    async regRemplacement(formData){
        try{
            const response = await axios.post(`${urlBase}/api/delivery/regRemplacement`, formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            )
            return response.data
        } catch(error) {
            throw error.response.data;
        }
    }
}