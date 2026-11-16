import axios from 'axios';
import urlBase from '../const';

// const API_URL = urlOnline

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${urlBase}/api/auth/login`, { email, password });
    console.log(response)
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};
// Mot de passe oublié : envoie un lien (valable 1 h) à l'adresse e-mail du compte
export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${urlBase}/api/auth/forgot-password`, { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Erreur réseau." };
  }
};

// Choix du mot de passe à partir du lien reçu par mail (création de compte ou mot de passe oublié)
export const resetPassword = async (token, password) => {
  try {
    const response = await axios.post(`${urlBase}/api/auth/reset-password/${encodeURIComponent(token)}`, { password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Erreur réseau." };
  }
};

// Déconnexion côté serveur : le token en cours (et ceux des autres appareils) n'est plus accepté
export const logout = async () => {
  try {
    await axios.post(`${urlBase}/api/auth/logout`);
  } catch (error) {
    // Session déjà expirée ou serveur injoignable : la déconnexion locale suffit
  }
};
