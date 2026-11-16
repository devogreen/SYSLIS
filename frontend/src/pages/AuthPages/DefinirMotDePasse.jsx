import AuthLayout from "./AuthPageLayout";
import DefinirMotDePasseForm from "../../components/auth/DefinirMotDePasseForm";

// Page ouverte depuis le lien reçu par mail : /password/reset-password/:token
export default function DefinirMotDePasse() {
  return (
    <AuthLayout>
      <DefinirMotDePasseForm />
    </AuthLayout>
  );
}
