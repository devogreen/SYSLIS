import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { ProgressSpinner } from 'primereact/progressspinner';

// import { login } from '../../backend/services/authService';
import { changePassword } from "../../backend/services/resetPassword";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Swal from 'sweetalert2'


export default function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [errorOld, setErrorOld] = useState(null);
  const [errorNew, setErrorNew] = useState(null);
  const navigate = useNavigate();

  const handleReset = async (event) => {
    event.preventDefault();
    // setLoading(true);
    try {
        if(!currentPassword){
            setError("Veuillez fournir votre mot de passe actuel !")
            setErrorOld(true)
            return;
        }
        if(newPassword != confirmPassword){
            setError("Nouveau mot de passe incorrect !")
            setErrorNew(true)
            return;
        }
        // Même règle que l'API : 10 caractères minimum, au moins une lettre et un chiffre
        if(newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)){
            setError("Le mot de passe doit contenir au moins 10 caractères, dont une lettre et un chiffre.")
            setErrorNew(true)
            return;
        }
        setLoading(true)
        const response = await changePassword(currentPassword, newPassword);
        console.log('API Response:', response);
        ['token', 'username', 'id', 'email'].forEach((cle) => localStorage.removeItem(cle));
        // Toutes les sessions sont fermées par l'API : reconnexion avec le nouveau mot de passe
        await Swal.fire({
            title: "Succès",
            text: "Mot de passe modifié avec succès. Reconnectez-vous avec votre nouveau mot de passe.",
            icon: "success"
        });
        window.location.assign('/signin');
        } catch (err) {
        // changePassword renvoie le corps de la réponse de l'API ({ message })
        const msg = err?.message || "Une erreur s'est produite.";
        setError(msg);
        if (/actuel/i.test(msg)) setErrorOld(true)
        else setErrorNew(true)
        }
        finally{
        setLoading(false)
        }
    };

  return (
    <div className="flex flex-col flex-1 border bg-white rounded-3xl p-3">
      {/* <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div> */}
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Modifier mot de passe
            </h1>
            {error ?(
                <>
                <p className="text-sm text-error-600 dark:text-gray-400">
                  {error}
                </p>
              </>
            ) : 
            (
              <>
                {/* <p className="text-sm text-gray-500 dark:text-gray-400">
                 Entrez votre email et mot de passe pour vous connecter!
                </p> */}
              </>
            )}
          </div>
          <div>
            <form onSubmit={handleReset}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Ancien mot de passe <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mot de passe"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      error={errorOld}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>
                    Nouveau mot de passe <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type="password"
                      placeholder="Nouveau mot de passe"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      error={errorNew}
                    />
                    {/* <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span> */}
                  </div>
                </div>
                <div>
                  <Label>
                    Confirmer mot de passe <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type="password"
                      placeholder="Confirmer mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      error={errorNew}
                    />
                    {/* <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span> */}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {/* <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div> */}
                  {/* <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link> */}
                </div>
                <div>
                  {loading? 
                    (<span className="mt-20">
                      <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="8" animationDuration=".5s" />
                    </span>)
                    :
                    (<Button type="submit" className="w-full" size="sm">
                      Modifier
                    </Button>)
                    }
                </div>
              </div>
            </form>

            {/* <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Don&apos;t have an account? {""}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign Up
                </Link>
              </p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
