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
}