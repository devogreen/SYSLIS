import axios from 'axios';
import urlBase from '../const';

// La session (cookie HttpOnly) est envoyée automatiquement par l'intercepteur (backend/authHttp.js)
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await axios.post(`${urlBase}/api/auth/change-password`, {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Impossible de se connecter au serveur." };
  }
};
