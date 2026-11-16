import { Navigate, useLocation } from "react-router";
import { useAuth } from "./context/AuthContext";

// La session est un cookie HttpOnly (illisible ici) : on s'appuie sur /api/auth/me, chargé par AuthContext
const ProtectedRoutes = ({ children }) => {
    const location = useLocation();
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? (
        children ) : (
        <Navigate to="/signin" state={{ from: location }} replace />
    )
};

export default ProtectedRoutes;
