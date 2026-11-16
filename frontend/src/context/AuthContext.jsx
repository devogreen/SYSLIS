import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import urlBase from "../backend/const";
import { effacerIdentiteLocale } from "../backend/authHttp";

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
});

// Pages accessibles sans être connecté : on n'y interroge pas la session
const estPagePublique = () => {
  const chemin = window.location.pathname;
  return chemin === "/mot-de-passe-oublie" || chemin.startsWith("/password/");
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // ⬅️ Use this to store full user info with roles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // L'utilisateur et ses rôles viennent de la session (cookie HttpOnly) via /api/auth/me :
  // on ne télécharge plus les rôles de tous les utilisateurs.
  const fetchUserAndRoles = async () => {
    setLoading(true);
    if (estPagePublique()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await axios.get(`${urlBase}/api/auth/me`);
      const id = String(data.id_user);
      // Identité gardée en localStorage pour les écrans qui la lisent (aucune valeur secrète)
      localStorage.setItem("id", id);
      localStorage.setItem("email", data.email || "");
      localStorage.setItem("username", data.username || "");
      const roles = Array.isArray(data.roles) ? data.roles : [];
      setUser({
        id,
        email: data.email,
        username: data.username,
        fullname: data.fullname,
        roleList: roles.map((r) => r.id_role),
        rolesData: { roles },
        services: data.services || [],
      });
      setError(null);
    } catch (err) {
      // 401 : pas de session (l'intercepteur renvoie vers /signin si la page est protégée)
      if (err?.response?.status !== 401) {
        console.error("Error fetching user roles:", err);
        setError("Failed to load user roles.");
      }
      effacerIdentiteLocale();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUserAndRoles();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refreshUser: fetchUserAndRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
