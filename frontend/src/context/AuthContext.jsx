import React, { createContext, useContext, useEffect, useState } from "react";
import { Users } from "../backend/users/Users"; // Adjust path if needed

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // ⬅️ Use this to store full user info with roles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const users = new Users();

  const fetchUserAndRoles = async () => {
    setLoading(true);

    try {
      const id = localStorage.getItem("id");
      const email = localStorage.getItem("email");
      const username = localStorage.getItem("username");

      if (!id) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch roles using your API function
      const roles = await users.getAllUserRoles();
      const rolesData = await users.getUserRoles(id)
      // console.log('User Roles :', rolesData)
      // console.log("ROLES : ",roles)
      const userRoles = roles.filter(item =>{
        return item.user_id == id
      })
      const roleList = userRoles.map(item =>{
        return item.role_id
      })

      console.log("ROLE LIST ", roleList)
      setUser({
        id,
        email,
        username,
        roleList, // include roles here
        rolesData,
      });
    } catch (err) {
      console.error("Error fetching user roles:", err);
      setError("Failed to load user roles.");
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
