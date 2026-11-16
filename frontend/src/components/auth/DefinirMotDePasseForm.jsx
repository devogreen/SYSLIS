import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Swal from "sweetalert2";
import { resetPassword } from "../../backend/services/authService";

const MOT_DE_PASSE_MIN = 10;

// Choix du mot de passe depuis le lien reçu par mail (nouveau compte : 24 h, mot de passe oublié : 1 h)
export default function DefinirMotDePasseForm() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErreur(null);
    if (password.length < MOT_DE_PASSE_MIN || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErreur(`Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères, dont une lettre et un chiffre.`);
      return;
    }
    if (password !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword(token, password);
      // Les anciennes sessions sont fermées par le serveur : on repart d'une connexion propre
      ["token", "id", "email", "username"].forEach((cle) => localStorage.removeItem(cle));
      await Swal.fire({
        title: "Mot de passe enregistré",
        text: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
        icon: "success",
      });
      navigate("/signin", { replace: true });
    } catch (error) {
      setErreur(error?.message || "Une erreur est survenue, réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const oeil = (
    <span onClick={() => setShowPassword(!showPassword)}
      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
      {showPassword ? (
        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
      ) : (
        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
      )}
    </span>
  );

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Choisir mon mot de passe
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Au moins {MOT_DE_PASSE_MIN} caractères, dont une lettre et un chiffre. Ce lien ne peut être utilisé qu'une fois.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label>Nouveau mot de passe <span className="text-error-500">*</span></Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} error={Boolean(erreur)} />
                {oeil}
              </div>
            </div>
            <div>
              <Label>Confirmer le mot de passe <span className="text-error-500">*</span></Label>
              <Input type={showPassword ? "text" : "password"} value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)} error={Boolean(erreur)} />
            </div>
            {erreur && (
              <p className="text-sm text-error-600">
                {erreur}{" "}
                {/expir|invalide/i.test(erreur) && (
                  <Link to="/mot-de-passe-oublie" className="text-brand-500 hover:text-brand-600">Demander un nouveau lien</Link>
                )}
              </p>
            )}
            <Button type="submit" className="w-full" size="sm" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
