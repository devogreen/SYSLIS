import axios from "axios";
import urlBase from '../const';

export class FilesHandler {
    async downloadFile(fileId) {
        try {
            const response = await axios.get(`${urlBase}/api/files/downloadFile/${fileId}`,
                {
                    responseType: "blob",
                }
            );

            return response;

        } catch (error) {
            throw error.response?.data || { message: "Download failed" };
        }
    }

    async getAllFormFiles(id) {
        try {
            const response = await axios.get(`${urlBase}/api/demandeQr/getAllFormFiles/${id}`)
            return response.data;
        } catch (error) {
            throw error.response.data
        }
    };
}