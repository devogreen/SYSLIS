import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { forgotPassword } from "../../backend/services/authService";

// Demande d'un lien de réinitialisation du mot de passe (valable 1 h)
export default function MotDePasseOublieForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErreur(null);
    setMessage(null);
    if (!email.trim()) {
      setErreur("Saisissez votre adresse e-mail.");
      return;
    }
    try {
      setLoading(true);
      await forgotPassword(email.trim());
      setMessage("Un e-mail contenant un lien pour choisir un nouveau mot de passe vient de vous être envoyé. Le lien est valable 1 heure.");
    } catch (error) {
      setErreur(error?.message || "Une erreur est survenue, réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link to="/signin" className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          <ChevronLeftIcon className="size-5" />
          Retour à la connexion
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Mot de passe oublié
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Saisissez l'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.
          </p>
        </div>
        {message ? (
          <p className="text-sm text-success-600">{message}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>Email <span className="text-error-500">*</span></Label>
                <Input type="email" placeholder="prenom.nom@greenpayci.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} error={Boolean(erreur)} />
              </div>
              {erreur && <p className="text-sm text-error-600">{erreur}</p>}
              <Button type="submit" className="w-full" size="sm" disabled={loading}>
                {loading ? "Envoi..." : "Recevoir le lien"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
