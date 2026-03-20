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
}