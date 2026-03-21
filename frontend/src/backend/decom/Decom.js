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
}